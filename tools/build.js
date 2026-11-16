// 把 src/ 里的模块拼回三个页面、服务器用的课程包和大屏单机课件。
// 用法：node tools/build.js          生成
//       node tools/build.js --check  只比较，不写文件（有差异时退出码 1）
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const APP = path.join(ROOT, 'app');
const check = process.argv.includes('--check');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const layout = JSON.parse(read('layout.json'));

// 大屏单机版内嵌的起始游戏：从 app/games 重新生成（格式和原版一致：", " 与 ": " 分隔，</ 写成 <\/）
const GAMES_DIR = path.join(APP, 'games');
const starters = 'const STARTERS = {' + fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.html'))
  .map(f => JSON.stringify(f) + ': ' + JSON.stringify(fs.readFileSync(path.join(GAMES_DIR, f), 'utf8'))).join(', ')
  .replace(/<\//g, '<\\/') + '};';
if (!check) fs.writeFileSync(path.join(SRC, 'screen', 'starters.nomark.js'), starters);
else if (read('screen/starters.nomark.js') !== starters) console.log('有变化  src/screen/starters.nomark.js（起始游戏）');

// 第二季各节课的演示精灵规则：src/shared/mock-s2/*.js 拼成一个模块（服务器和三个页面都用）
const PARTS_DIR = path.join(SRC, 'shared', 'mock-s2');
const parts = fs.existsSync(PARTS_DIR) ? fs.readdirSync(PARTS_DIR).filter(f => f.endsWith('.js')).sort() : [];
const mockS2 = [
  '// ================= 第二季：各节课的演示精灵规则（由 tools/build.js 从 src/shared/mock-s2/ 拼成，不要直接改） =================',
  '(function (root, factory) {',
  "  if (typeof module === 'object' && module.exports) module.exports = factory();",
  '  else root.MockS2 = factory();',
  "})(typeof self !== 'undefined' ? self : this, function () {",
  "  'use strict';",
  '  const S2PARTS = [];'
].concat(parts.map(f => '// ----- mock-s2/' + f + ' -----\n' + fs.readFileSync(path.join(PARTS_DIR, f), 'utf8').replace(/\r\n/g, '\n').trim()))
  .concat(['  return S2PARTS;', '});', '']).join('\n');
if (!check) fs.writeFileSync(path.join(SRC, 'shared', 'mock-s2.js'), mockS2);
else if (read('shared/mock-s2.js') !== mockS2) console.log('有变化  src/shared/mock-s2.js');

// 共用主题：theme-core 三端都有（比特、精灵），theme-kid 只给大屏和平板（场景、糖果按钮）；用函数替换，免得 $ 被当成替换符
const THEME = { '/*@theme-core*/': read('pages/theme-core.css'), '/*@theme-kid*/': read('pages/theme-kid.css') };
function page(key) {
  const { eol, mods } = layout[key];
  const body = mods.map(name => name.endsWith('.nomark.js') ? read(name) : '// ===== ' + name + ' =====\n' + read(name)).join('\n');
  const head = Object.keys(THEME).reduce((h, k) => h.replace(k, () => THEME[k]), read('pages/' + key + '.head.html'));
  const text = head + body + read('pages/' + key + '.tail.html');
  return eol === 'crlf' ? text.split('\n').join('\r\n') : text;
}

const PACK_MODS = ['base', 'icons', 'sprites', 'bit', 'items', 'dance', 'lessons'];
const pack = '// 课程内容（服务器用）\nconst document = undefined;\n'
  + PACK_MODS.map(n => '// ===== shared/' + n + '.js =====\n' + read('shared/' + n + '.js')).join('\n')
  + '\nmodule.exports = { LESSONS, GAMES, ACTS, MOODS, PACK };\n';

const outputs = {
  'public/teacher.html': page('teacher'),
  'public/student.html': page('student'),
  'public/screen.html': page('screen'),
  'lib/lessons-pack.js': pack,
  '../课程资料/驯狗学院-大屏课件（单机版）.html': page('screen')
};
// 服务器用的共享模块：直接从 src/shared 复制，不再两边各改一份
['core-state', 'service', 'mock-s2', 'mock-genie', 'genie-core', 'works'].forEach(n => { outputs['lib/' + n + '.js'] = read('shared/' + n + '.js'); });

let diff = 0;
for (const [rel, text] of Object.entries(outputs)) {
  const file = path.join(APP, rel);
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  const same = old === text;
  if (!same) diff++;
  console.log((same ? '相同  ' : '有变化') + '  ' + rel);
  if (!check && !same) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); }
}
if (check && diff) process.exit(1);
