// 一次跑完所有测试：node tools/test-all.js
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const tests = ['test-s2', 'test-snake', 'test-s2b', 'test-monsters', 'test-maze', 'test-breakout', 'test-boss', 'test-flow', 'test-coins'];
let bad = 0;
for (const t of tests) {
  const r = spawnSync(process.execPath, [path.join(__dirname, t + '.js')], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const fails = (out.match(/✗/g) || []).length;
  const ok = r.status === 0 && !fails;
  if (!ok) bad++;
  console.log((ok ? '✓ ' : '✗ ') + t + (ok ? '' : `（退出码 ${r.status}，${fails} 项没通过）`));
  if (!ok) console.log(out.split('\n').filter(l => /✗|Error|错/.test(l)).slice(0, 8).map(l => '    ' + l).join('\n'));
}
console.log(bad ? `\n${bad} 组没通过` : '\n全部通过');
process.exitCode = bad ? 1 : 0;
