/**
 * Tests for Enrollment Audit's scoring, plan and seat math.
 *
 * They load js/enrollment-audit.js, the file the page runs, so the numbers
 * under test are the ones a visitor sees. Each figure below was worked out
 * by hand first; the comment beside it shows the sum.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const A = require('../../js/enrollment-audit.js');

const example = () => A.clean(A.EXAMPLE);
// Every practice the tool shows a tuition school with no grade filter.
const allIds = A.ITEMS.map((i) => i.id);

/* Scoring */

test('the example audit scores what the home page scorecard shows', () => {
  // images/enrollment-scorecard.webp is a picture of this result. If a change
  // moves these numbers, that picture is out of date too.
  const s = example();
  const sc = A.scored(s);
  assert.equal(A.pct(s, sc), 27);
  const stages = Object.fromEntries(A.STAGES.map((st) => [st.name, A.pct(s, sc.filter((i) => i.st === st.id))]));
  assert.deepEqual(stages, { Awareness: 29, Consideration: 36, Application: 33, Yield: 21, Retention: 10 });
  assert.deepEqual(A.ranked(s).slice(0, 3).map((i) => i.s), ['Make cost and aid plain', 'A commute and care sheet', 'Next-day welcome call']);
});

test('the score waits until four in five practices are answered', () => {
  // 32 practices, so the score shows at ceil(32 x 0.8) = 26 answers.
  const s = A.BLANK();
  allIds.slice(0, 25).forEach((id) => { s.ans[id] = 'yes'; });
  assert.deepEqual(A.progress(s), { all: 32, done: 25, need: 26, ready: false });
  s.ans[allIds[25]] = 'yes';
  assert.equal(A.progress(s).ready, true);
});

test('N/A drops a practice out of the score instead of counting as zero', () => {
  // One Yes (2 points) and one N/A: 2 of 2 possible, so 100, not 50.
  const s = A.BLANK();
  s.ans.a1 = 'yes';
  s.ans.a2 = 'na';
  assert.equal(A.pct(s, A.scored(s).filter((i) => s.ans[i.id])), 100);
  assert.equal(A.scored(s).some((i) => i.id === 'a2'), false);
});

test('a charter school does not see the tuition-only practices, or forces that point only to them', () => {
  const s = A.clean({ ...A.EXAMPLE, type: 'charter' });
  const ids = A.visible(s).map((i) => i.id);
  assert.equal(ids.length, 30);
  assert.equal(ids.includes('c7'), false); // cost and aid
  assert.equal(ids.includes('y7'), false); // contract and aid
  // "ESA or scholarship makes it affordable" points only at c7 and y7.
  const hidden = A.FORCES.flatMap((f) => f.opts).filter((o) => !A.optShown(s, o)).map((o) => o.id);
  assert.deepEqual(hidden, ['pl5']);
});

test('grade-specific practices show only for those grades, and for a school that picked none', () => {
  const high = A.clean({ ...A.EXAMPLE, grades: ['9-12'] });
  assert.equal(A.visible(high).some((i) => i.id === 'p1'), false); // PreK and K path
  assert.equal(A.visible(high).some((i) => i.id === 'p2'), true); // before a transition
  const none = A.clean({ ...A.EXAMPLE, grades: [] });
  assert.equal(A.visible(none).length, A.ITEMS.length);
});

/* The plan */

test('the plan holds nine steps, and a marked force brings its practice in ahead of rank', () => {
  const { plan, rest } = A.planned(example());
  assert.equal(plan.length, A.PLAN_SIZE);
  assert.equal(plan.length + rest.length, A.ranked(example()).length);
  // c2 and c3 score 4, below seven practices that score 4.5, but the example
  // marks "Small classes" (first open practice c2) and "Is this a real
  // school" (first open practice c3), so both are in the plan.
  const ids = plan.map((i) => i.id);
  assert.ok(ids.includes('c2') && ids.includes('c3'));
  assert.equal(ids.includes('a2'), false);
});

/* Seat math */

test('seat math for the example school, worked by hand', () => {
  const m = A.seatMath(example());
  assert.equal(m.back, 61); // 72 students x 85% = 61.2, so 61 return
  const seats = m.fill(m.target);
  assert.equal(seats, 35); // goal 96 - 61 = 35 new students
  // Offers 35 / 65% = 53.8, so 54. Applications 54 / 80% = 67.5, so 68.
  // Inquiries 68 / 50% = 136. Each rounds UP: a part family cannot enroll.
  assert.deepEqual(m.funnel(seats), { seats: 35, offers: 54, apps: 68, inq: 136 });
  assert.equal(m.fill(m.drv), 19); // budget driver 80 - 61
});

test('every step of the funnel rounds up, even where rounding off would round down', () => {
  // 10 new students at 65% yield is 15.4 offers: 16, not 15. Then
  // 16 / 80% = 20 applications and 20 / 50% = 40 inquiries.
  const m = A.seatMath(A.clean({ ...A.EXAMPLE, current: '0', reRate: '0', goal: '10' }));
  assert.deepEqual(m.funnel(m.fill(m.target)), { seats: 10, offers: 16, apps: 20, inq: 40 });
});

test('the two levers, worked by hand', () => {
  // Re-enrollment 90%: 72 x 0.9 = 64.8, so 65 return and 31 are new;
  // 31 / 65% = 48 offers, 60 applications, 120 inquiries: 136 - 120 = 16.
  // Yield 75%: 35 / 75% = 47 offers, 59 applications, 118 inquiries: 18.
  assert.deepEqual(A.levers(A.seatMath(example())), { reenroll: 16, yield: 18 });
});

test('the copied plan states the same seat math the page computes', () => {
  const lines = A.planText(example()).split('\n');
  assert.ok(lines.includes('SEAT MATH: about 61 students return. To reach our goal of 96, we need 35 new students: about 54 offers, 68 applications and 136 inquiries.'));
  assert.ok(lines.includes('Budget driver: 80 students (19 new).'));
});

test('seat math invents no rate the visitor has not entered', () => {
  const m = A.seatMath(A.clean({ ...A.EXAMPLE, reRate: '', rInq: '' }));
  assert.equal(m.re, null);
  assert.equal(m.back, null);
  assert.equal(m.funnelReady, false);
  assert.equal(A.planText(A.clean({ ...A.EXAMPLE, reRate: '' })).includes('SEAT MATH'), false);
});

test('rates stay in range: re-enrollment 0 to 100, the funnel rates 1 to 100', () => {
  assert.equal(A.clampRate('reRate', '120'), 100);
  assert.equal(A.clampRate('reRate', '0'), 0);
  assert.equal(A.clampRate('rYield', '0'), 1); // a 0% yield would divide by zero
  assert.equal(A.clampRate('rInq', 'abc'), null);
  assert.equal(A.seatMath(A.clean({ ...A.EXAMPLE, rYield: '0' })).ry, 0.01);
});

/* Rates from last year's counts */

test('counts fill the rates they are part of, rounded to a whole percent', () => {
  const s = { ...A.BLANK(), lInq: '120', lApp: '54', lOff: '40', lEnr: '30' };
  assert.deepEqual(A.ratesFromCount(s, 'lApp'), [['rInq', 45], ['rApp', 74]]); // 54/120, 40/54
  assert.deepEqual(A.ratesFromCount(s, 'lEnr'), [['rYield', 75]]); // 30/40
});

test('a count leaves alone the rates it is not part of (Codex on #63)', () => {
  const s = { ...A.BLANK(), lInq: '120', lApp: '54', lOff: '40', lEnr: '30' };
  assert.equal(A.ratesFromCount(s, 'lEnr').some(([rate]) => rate === 'rInq'), false);
});

test('a count of zero below a rate fills nothing rather than dividing by zero', () => {
  const s = { ...A.BLANK(), lInq: '0', lApp: '10' };
  assert.deepEqual(A.ratesFromCount(s, 'lInq'), []);
});

/* Saved answers */

test('answers saved under the old grade labels open with the same grades', () => {
  const s = A.clean({ ...A.EXAMPLE, grades: ['PreK', 'K to 2', '9 to 12'] });
  assert.deepEqual(s.grades, ['prek', 'k-2', '9-12']);
});

test('clean keeps only what the tool knows', () => {
  assert.equal(A.clean({ foo: 1 }), null);
  assert.equal(A.clean(null), null);
  const s = A.clean({ ...A.EXAMPLE, state: 'ZZ', offer: '99', name: 'x'.repeat(200), ans: { a1: 'yes', zz: 'yes', a2: 'maybe' } });
  assert.equal(s.state, '');
  assert.equal(s.offer, '7');
  assert.equal(s.name.length, 80);
  assert.deepEqual(s.ans, { a1: 'yes' });
  // A rate saved before the fields held their range comes back inside it.
  assert.equal(A.clean({ ...A.EXAMPLE, reRate: '150', rYield: '0' }).reRate, '100');
  assert.equal(A.clean({ ...A.EXAMPLE, reRate: '150', rYield: '0' }).rYield, '1');
});

test('a saved file opens with the same answers', () => {
  const s = example();
  const now = new Date('2026-11-21T12:00:00Z');
  const back = A.readFile(A.fileBody(s, now));
  assert.deepEqual(back, s);
  assert.equal(A.fileName({ ...s, name: "St. Mary's Academy" }, now), 'enrollment-audit-st-mary-s-academy-2026-11-21.json');
});

test('a file saved on 21 November 2026 still opens', () => {
  // Written out by hand and frozen. Visitors keep these files, so a change
  // that fails this test would lock them out of their own audits. Change the
  // tool so this still passes; never edit the file below.
  const saved = `{
  "tool": "schoolstack-enrollment-path",
  "version": 2,
  "saved": "2026-11-21T17:30:00.000Z",
  "audit": {
    "example": false, "name": "Harbor Prep", "state": "FL", "type": "tuition", "offer": "2",
    "grades": ["k-2", "3-5"], "ans": { "a1": "yes", "c7": "no", "y1": "partly" },
    "forces": ["an1"], "current": "40", "reRate": "90", "driver": "50", "goal": "",
    "rInq": "45", "rApp": "74", "rYield": "75", "lInq": "120", "lApp": "54", "lOff": "40", "lEnr": "30"
  }
}`;
  const s = A.readFile(saved);
  assert.ok(s, 'the file did not open');
  assert.equal(s.name, 'Harbor Prep');
  assert.deepEqual(s.grades, ['k-2', '3-5']);
  assert.deepEqual(s.ans, { a1: 'yes', c7: 'no', y1: 'partly' });
  assert.equal(A.seatMath(s).back, 36); // 40 x 90%
});

test('anything that is not a saved audit is refused', () => {
  assert.equal(A.readFile('not json'), null);
  assert.equal(A.readFile('{"tool":"something-else","audit":{"ans":{}}}'), null);
  assert.equal(A.readFile('{"tool":"schoolstack-enrollment-path","audit":"nope"}'), null);
});

test('the storage key and file tag keep their first names', () => {
  // Renaming either loses every saved audit (CLAUDE.md section 9).
  assert.equal(A.KEY, 'ss-enrollment-path-v2');
  assert.equal(A.FILE_TOOL, 'schoolstack-enrollment-path');
});
