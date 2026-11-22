import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findComments, kindOf, commentDrift, commentCounts, COMMENT_DEBT } from './comments.mjs';
import { ROOT } from './harness.mjs';

const lines = (src, kind) => findComments(src, kind).map((c) => c.line);
const texts = (src, kind) => findComments(src, kind).map((c) => c.text);

test('kindOf maps each file to the comment syntax it uses', () => {
  assert.equal(kindOf('js/site.js'), 'js');
  assert.equal(kindOf('tools/verify-content.mjs'), 'js');
  assert.equal(kindOf('css/site.css'), 'css');
  assert.equal(kindOf('enrollment/index.html'), 'html');
  assert.equal(kindOf('sitemap.xml'), 'html');
  assert.equal(kindOf('_headers'), 'hash');
  assert.equal(kindOf('_redirects'), 'hash');
  assert.equal(kindOf('.github/workflows/verify.yml'), 'yaml');
  assert.equal(kindOf('netlify.toml'), 'toml');
  assert.equal(kindOf('features/signup.feature'), 'hash');
  assert.equal(kindOf('package.json'), null);
  assert.equal(kindOf('CLAUDE.md'), null);
  assert.equal(kindOf('assets/logos/x.svg'), null);
});

test('line and block comments in JS', () => {
  assert.deepEqual(texts('a(); // one\n/* two\n   lines */ b();', 'js'), ['// one', '/* two\n   lines */']);
  assert.deepEqual(findComments('x;\n/* a\nb */', 'js').map((c) => [c.line, c.endLine]), [[2, 3]]);
});

test('comment markers inside strings are not comments', () => {
  assert.deepEqual(lines(`const a = 'http://x'; const b = "/* no */"; const c = '<!-- no -->';`, 'js'), []);
  assert.deepEqual(lines(`const s = 'it\\'s // fine';`, 'js'), []);
});

test('template literals, nested ${} included', () => {
  assert.deepEqual(lines('const u = `https://${host}/a//b ${ f({ x: `//${y}` }) } /* no */`;', 'js'), []);
  assert.deepEqual(lines('const u = `${a}`; // yes', 'js'), [1]);
  assert.deepEqual(lines('const u = `${ /* yes */ a}`;', 'js'), [1]);
  assert.deepEqual(lines('const s = `${/[/*]/.test(v)}`;', 'js'), []);
  assert.deepEqual(lines('const s = `a${x}b${/[/*]/.test(v)}`;', 'js'), []);
  assert.deepEqual(lines('const s = `${a}` / 2; // yes', 'js'), [1]);
});

test('regex literals are not comments, division is not a regex', () => {
  assert.deepEqual(lines(`s.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');`, 'js'), []);
  assert.deepEqual(lines(`const re = /[/]/; x.split(/\\/\\//);`, 'js'), []);
  assert.deepEqual(lines('return /a\\/\\/b/.test(s);', 'js'), []);
  assert.deepEqual(lines('const half = a / 2; // yes', 'js'), [1]);
  assert.deepEqual(lines('const r = (a) / (b) / c; /* yes */', 'js'), [1]);
});

test('a regex after a control-flow condition is not a comment', () => {
  assert.deepEqual(lines('if (ok) /[/*]/.test(value);', 'js'), []);
  assert.deepEqual(lines('while (f(x)) /a\\/\\/b/.test(s);', 'js'), []);
  assert.deepEqual(lines('for (const a of b) /[/*]/.exec(a);', 'js'), []);
  assert.deepEqual(lines('const r = (a) / 2; // yes', 'js'), [1]);
});

test('a regex after a statement block, division after an object literal', () => {
  assert.deepEqual(lines('if (ok) {} /[/*]/.test(value);', 'js'), []);
  assert.deepEqual(lines('function a() {} /[/*]/.test(v);', 'js'), []);
  assert.deepEqual(lines('const f = () => {}\n/[/*]/.test(v);', 'js'), []);
  assert.deepEqual(lines('const r = {} / 2; // yes', 'js'), [1]);
  assert.deepEqual(lines('const r = f({ a: 1 }.a / 2); // yes', 'js'), [1]);
  assert.deepEqual(lines('const ratio = function () {} / 2; // explanation', 'js'), [1]);
  assert.deepEqual(lines('const k = class {} / 2; // explanation', 'js'), [1]);
  assert.deepEqual(lines('const f = function (a = {}) { return 1; } / 2; // yes', 'js'), [1]);
  assert.deepEqual(lines('function g() {}\n/[/*]/.test(v);', 'js'), []);
});

test('postfix ++ and -- end a value, so a slash after them divides', () => {
  assert.deepEqual(lines('let n = 4; const result = n++ / 2; // explanation', 'js'), [1]);
  assert.deepEqual(lines('const r = n-- / 2; /* yes */', 'js'), [1]);
  assert.deepEqual(lines('const r = x + ++n; /[/*]/.test(v);', 'js'), []);
});

test('a keyword used as a property name ends a value', () => {
  assert.deepEqual(lines('const ratio = metrics.in / metrics.out; // explanation', 'js'), [1]);
  assert.deepEqual(lines('const r = a?.return / 2; /* yes */', 'js'), [1]);
  assert.deepEqual(lines('if (x in y) /[/*]/.test(v);', 'js'), []);
});

test('a Unicode name ends a value too', () => {
  assert.deepEqual(lines('const ratio = quantité / total; // explanation', 'js'), [1]);
  assert.deepEqual(lines('const r = ñ / 2; /* yes */', 'js'), [1]);
});

test('a shebang is not a comment', () => {
  assert.deepEqual(lines('#!/usr/bin/env node\nrun();', 'js'), []);
});

test('CSS comments, but not inside strings', () => {
  assert.deepEqual(texts('a { content: "/* no */"; } /* yes */', 'css'), ['/* yes */']);
  assert.deepEqual(lines('a { background: url(//x.png); }', 'css'), []);
});

test('HTML comments, plus the script and style inside the page', () => {
  const page = [
    '<!-- one -->',
    '<p>// not a comment</p>',
    '<style>/* two */ a { color: red; }</style>',
    '<script>run(); // three</script>',
    '<script type="application/ld+json">{"url": "https://x//y"}</script>',
    '<script>const s = "<!-- not -->";</script>',
  ].join('\n');
  assert.deepEqual(lines(page, 'html'), [1, 3, 4]);
});

test('comment markers in attributes, textarea and title are text', () => {
  const page = '<input placeholder="<!-- example -->" data-x=\'<!-- y -->\'>\n<textarea><!-- x --></textarea>\n<title><!-- t --></title>\n<!-- real -->';
  assert.deepEqual(lines(page, 'html'), [4]);
  assert.deepEqual(lines('<a title="x > y">a</a><!-- yes --><script>f(); // yes</script>', 'html'), [1, 1]);
  assert.deepEqual(texts('<style media="(width > 500px)">/* yes */ p { color: red; }</style>', 'html'), ['/* yes */']);
  assert.deepEqual(texts('<script data-x=\'a>b\'>f(); // yes</script>', 'html'), ['// yes']);
});

test('hash comments only where # opens the line', () => {
  assert.deepEqual(lines('# one\n/go/x https://y.org/#z 302\n  # two\n', 'hash'), [1, 3]);
});

test('YAML comments, trailing ones included', () => {
  assert.deepEqual(texts('name: Verify # explanation\n# own line\n', 'yaml'), ['# explanation', '# own line']);
  assert.deepEqual(lines('url: https://x.org/#frag\nk: "a # b"\nk: \'c # d\'\nv: x#y\n', 'yaml'), []);
  assert.deepEqual(texts('run: echo "a # b"\n', 'yaml'), ['# b"'], 'an unquoted value ends at " #", as YAML reads it');
  assert.deepEqual(texts("name: Don't panic # real\n", 'yaml'), ['# real']);
});

test('YAML strings and block scalars over several lines', () => {
  assert.deepEqual(lines('description: |\n  # Heading\n  text\nname: x # yes\n', 'yaml'), [4]);
  assert.deepEqual(lines('k: "one\n  # two"\nj: 1 # yes\n', 'yaml'), [3]);
  assert.deepEqual(lines('- run: | # yes\n    echo "a # b"\n    # yes, a shell comment\n    ls\n', 'yaml'), [1, 3]);
  assert.deepEqual(lines('run: |\n  echo "first\n  # Heading\n  last"\n  # yes\n', 'yaml'), [5]);
  assert.deepEqual(lines('run: |\n  message="first # Heading"\n  x=a\'b # c\'d\n  ls # yes\n', 'yaml'), [4]);
  assert.deepEqual(lines("run: |\n  cat <<'EOF'\n  # Heading\n  EOF\n  ls # yes\n", 'yaml'), [5]);
  assert.deepEqual(lines('run: |\n  cat <<-END > f\n  # text\n  END\n  # yes\n', 'yaml'), [5]);
  assert.deepEqual(lines('run: |\n  echo \\" # yes\n  echo ok # yes\n', 'yaml'), [2, 3]);
  assert.deepEqual(lines('run: |\n  read -r value <<<EOF\n  # explanation\n', 'yaml'), [3]);
  assert.deepEqual(lines('run: |\n  grep x <<< "$v" # yes\n', 'yaml'), [2]);
});

test('TOML comments, but not inside strings of one line or several', () => {
  assert.deepEqual(texts('[build]\n  publish = "." # yes\n', 'toml'), ['# yes']);
  assert.deepEqual(lines('message = """\n# Heading\n"""\nraw = \'\'\'\n# also text\n\'\'\'\nurl = "https://x/#y"\n', 'toml'), []);
});

test('the ratchet fails a rise and asks for the baseline to drop on a fall', () => {
  assert.deepEqual(commentDrift({ 'a.js': 2 }, { 'a.js': 2 }), []);
  assert.match(commentDrift({ 'a.js': 3 }, { 'a.js': 2 })[0], /up from the recorded 2/);
  assert.match(commentDrift({ 'b.js': 1 }, {})[0], /up from the recorded 0/);
  assert.match(commentDrift({ 'a.js': 1 }, { 'a.js': 2 })[0], /Lower COMMENT_DEBT\['a\.js'\]/);
  assert.match(commentDrift({}, { 'a.js': 2 })[0], /remove the entry/);
});

test('the repo carries exactly the comments COMMENT_DEBT records', () => {
  assert.deepEqual(commentDrift(commentCounts(ROOT)), [], 'run node tools/verify-content.mjs for the list');
  assert.deepEqual(Object.keys(COMMENT_DEBT), Object.keys(COMMENT_DEBT).sort(), 'keep COMMENT_DEBT sorted by path');
});
