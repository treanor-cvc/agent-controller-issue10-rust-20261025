const fs = require('node:fs');
const cp = require('node:child_process');

// The initial selected base predates the normalization requirement. Every PR
// changing its implementation must satisfy the explicit hosted boundary cases.
if (process.env.GITHUB_EVENT_NAME !== 'pull_request') process.exit(0);
const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const base = event.pull_request?.base?.sha;
if (!/^[0-9a-f]{40}$/.test(base || '')) throw new Error('Missing exact PR base identity');
const changed = cp.spawnSync('git', ['diff', '--unified=0', base, 'HEAD', '--', 'src/reference.rs'], { encoding: 'utf8', timeout: 10000 });
if (changed.status !== 0) throw new Error('Cannot identify reference implementation diff');
if (!changed.stdout.trim()) process.exit(0);
const source = fs.readFileSync('src/reference.rs', 'utf8').split(/\r?\n/);
const functionStart = source.findIndex(line => /^pub fn normalize_reference\(/.test(line));
const functionEnd = source.findIndex((line, index) => index > functionStart && /^}$/.test(line));
let line = 0;
let addedImplementationLine;
for (const text of changed.stdout.split(/\r?\n/)) {
  const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(text);
  if (hunk) { line = Number(hunk[1]); continue; }
  if (text.startsWith('+++') || text.startsWith('---')) continue;
  if (text.startsWith('+')) {
    const candidate = text.slice(1).trim();
    if (!addedImplementationLine && functionStart >= 0 && functionEnd > functionStart && line - 1 >= functionStart && line - 1 <= functionEnd && candidate && !candidate.startsWith('//') && candidate !== '{' && candidate !== '}') addedImplementationLine = line;
    line++;
  } else if (!text.startsWith('-') && !text.startsWith('\\')) line++;
}
const file = 'tests/hosted_reference_contract.rs';
fs.writeFileSync(file, `use owned_reference_contract::reference::normalize_reference;
#[test]
fn hosted_vertical_tab_boundary() {
    assert_eq!(normalize_reference("\\u{b}A-12\\u{b}"), "A-12");
    assert_eq!(normalize_reference("\\t\\r\\n\\u{c}\\u{b} "), "");
    assert_eq!(normalize_reference("A\\u{b}B"), "A\\u{b}B");
    assert_eq!(normalize_reference("\\u{a0}A\\u{a0}"), "\\u{a0}A\\u{a0}");
}
`, { flag: 'wx' });
const result = cp.spawnSync('cargo', ['test', '--locked', '--test', 'hosted_reference_contract', '--', '--exact', 'hosted_vertical_tab_boundary'], { encoding: 'utf8', timeout: 180000, maxBuffer: 1024 * 1024 });
const output = `${result.stdout || ''}\n${result.stderr || ''}`;
process.stdout.write(output);
if (result.status !== 0) {
  // Compiler/startup/unrecognized failures do not become attributed repair
  // authority. Only this real named assertion and an added implementation line
  // establish the bounded source diagnostic.
  if (result.status === 101 && addedImplementationLine && /test hosted_vertical_tab_boundary \.\.\. FAILED/.test(output) && /assertion `left == right` failed/.test(output)) {
    console.log(`::error file=src/reference.rs,line=${addedImplementationLine}::OWNED_SOURCE_DEFECT: hosted_vertical_tab_boundary assertion failed. Normalize explicit ASCII VT boundaries and preserve internal VT and Unicode NBSP; inspect the real Rust assertion output.`);
  }
  process.exitCode = 1;
}
