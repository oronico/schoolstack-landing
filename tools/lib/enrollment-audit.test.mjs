import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const A = require('../../js/enrollment-audit.js');

const example = () => A.clean(A.EXAMPLE);
const allIds = A.ITEMS.map((i) => i.id);

test('the example audit scores what the home page scorecard shows', () => {
  const s = example();
  const sc = A.scored(s);
  assert.equal(A.pct(s, sc), 27);
  const stages = Object.fromEntries(A.STAGES.map((st) => [st.name, A.pct(s, sc.filter((i) => i.st === st.id))]));
  assert.deepEqual(stages, { Awareness: 29, Consideration: 36, Application: 33, Yield: 21, Retention: 10 });
  assert.deepEqual(A.ranked(s).slice(0, 3).map((i) => i.s), ['Make cost and aid plain', 'A commute and care sheet', 'Next-day welcome call']);
});

test('the score waits until four in five practices are answered', () => {
  const s = A.BLANK();
  allIds.slice(0, 25).forEach((id) => { s.ans[id] = 'yes'; });
  assert.deepEqual(A.progress(s), { all: 32, done: 25, need: 26, ready: false });
  s.ans[allIds[25]] = 'yes';
  assert.equal(A.progress(s).ready, true);
});

test('N/A drops a practice out of the score instead of counting as zero', () => {
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
  assert.equal(ids.includes('c7'), false);
  assert.equal(ids.includes('y7'), false);
  const hidden = A.FORCES.flatMap((f) => f.opts).filter((o) => !A.optShown(s, o)).map((o) => o.id);
  assert.deepEqual(hidden, ['pl5']);
});

test('grade-specific practices show only for those grades, and for a school that picked none', () => {
  const high = A.clean({ ...A.EXAMPLE, grades: ['9-12'] });
  assert.equal(A.visible(high).some((i) => i.id === 'p1'), false);
  assert.equal(A.visible(high).some((i) => i.id === 'p2'), true);
  const none = A.clean({ ...A.EXAMPLE, grades: [] });
  assert.equal(A.visible(none).length, A.ITEMS.length);
});

test('a Not yet counts double a Partly, and wins a tie', () => {
  const order = (ans) => {
    const s = A.BLANK();
    Object.assign(s.ans, ans);
    return A.ranked(s).map((i) => i.id);
  };
  assert.deepEqual(order({ a2: 'partly', a3: 'no' }), ['a3', 'a2']);
  assert.deepEqual(order({ a2: 'partly', a5: 'no' }), ['a5', 'a2']);
  assert.deepEqual(order({ a1: 'partly', a5: 'no' }), ['a1', 'a5']);
});

test('the plan holds nine steps, and a marked force brings its practice in ahead of rank', () => {
  const { plan, rest } = A.planned(example());
  assert.equal(plan.length, A.PLAN_SIZE);
  assert.equal(plan.length + rest.length, A.ranked(example()).length);
  const ids = plan.map((i) => i.id);
  assert.ok(ids.includes('c2') && ids.includes('c3'));
  assert.equal(ids.includes('a2'), false);
});

test('seat math for the example school, worked by hand', () => {
  const m = A.seatMath(example());
  assert.equal(m.back, 61);
  const seats = m.fill(m.target);
  assert.equal(seats, 35);
  assert.deepEqual(m.funnel(seats), { seats: 35, offers: 54, apps: 68, inq: 136 });
  assert.equal(m.fill(m.drv), 19);
});

test('every step of the funnel rounds up, even where rounding off would round down', () => {
  const m = A.seatMath(A.clean({ ...A.EXAMPLE, current: '0', reRate: '0', goal: '10' }));
  assert.deepEqual(m.funnel(m.fill(m.target)), { seats: 10, offers: 16, apps: 20, inq: 40 });
});

test('a division that comes out even is not pushed up a step by binary fractions', () => {
  const at = (o) => A.seatMath(A.clean({ ...A.EXAMPLE, current: '0', reRate: '0', ...o }));
  assert.equal(at({ goal: '21', rYield: '70' }).funnel(21).offers, 30, '21 / 0.7 is 30.000000000000004 in floating point');
  assert.equal(at({ rApp: '70' }).funnel(84, 1).apps, 120);
  assert.equal(at({ rInq: '35', rApp: '100' }).funnel(700, 1).inq, 2000);
});

test('a half rounds up, though 0.58 and 0.575 are stored just under', () => {
  assert.equal(A.seatMath(A.clean({ ...A.EXAMPLE, current: '25', reRate: '58' })).back, 15);
  assert.deepEqual(A.ratesFromCount({ lInq: '40', lApp: '23' }, 'lApp'), [['rInq', 58]]);
});

test('the levers land on whole steps too', () => {
  const m = A.seatMath(A.clean({ ...A.EXAMPLE, current: '20', reRate: '50', driver: '', goal: '40', rInq: '35', rApp: '50', rYield: '70' }));
  assert.deepEqual(A.levers(m), { reenroll: 6, yield: 28 });
});

test('the two levers, worked by hand', () => {
  assert.deepEqual(A.levers(A.seatMath(example())), { reenroll: 16, yield: 18 });
});

test('the levers wait for the funnel and the re-enrollment rate', () => {
  assert.deepEqual(A.levers(A.seatMath(A.clean({ ...A.EXAMPLE, rInq: '' }))), { reenroll: null, yield: null });
  assert.deepEqual(A.levers(A.seatMath(A.clean({ ...A.EXAMPLE, reRate: '' }))), { reenroll: null, yield: null });
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
  assert.equal(A.clampRate('rYield', '0'), 1);
  assert.equal(A.clampRate('rInq', 'abc'), null);
  assert.equal(A.seatMath(A.clean({ ...A.EXAMPLE, rYield: '0' })).ry, 0.01);
});

test('counts fill the rates they are part of, rounded to a whole percent', () => {
  const s = { ...A.BLANK(), lInq: '120', lApp: '54', lOff: '40', lEnr: '30' };
  assert.deepEqual(A.ratesFromCount(s, 'lApp'), [['rInq', 45], ['rApp', 74]]);
  assert.deepEqual(A.ratesFromCount(s, 'lEnr'), [['rYield', 75]]);
});

test('a count leaves alone the rates it is not part of (Codex on #63)', () => {
  const s = { ...A.BLANK(), lInq: '120', lApp: '54', lOff: '40', lEnr: '30' };
  assert.equal(A.ratesFromCount(s, 'lEnr').some(([rate]) => rate === 'rInq'), false);
});

test('a count of zero below a rate fills nothing rather than dividing by zero', () => {
  const s = { ...A.BLANK(), lInq: '0', lApp: '10' };
  assert.deepEqual(A.ratesFromCount(s, 'lInq'), []);
});

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
  assert.equal(A.seatMath(s).back, 36);
});

test('anything that is not a saved audit is refused', () => {
  assert.equal(A.readFile('not json'), null);
  assert.equal(A.readFile('{"tool":"something-else","audit":{"ans":{}}}'), null);
  assert.equal(A.readFile('{"tool":"schoolstack-enrollment-path","audit":"nope"}'), null);
});

test('the storage key and file tag keep their first names', () => {
  assert.equal(A.KEY, 'ss-enrollment-path-v2');
  assert.equal(A.FILE_TOOL, 'schoolstack-enrollment-path');
});
