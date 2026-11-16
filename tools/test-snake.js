// 贪吃蛇：演示精灵逐句改，改完的游戏在假画布里跑，检查蛇身长度变化
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const Mock = require('../app/lib/mock-genie.js');
const start = fs.readFileSync(path.join(__dirname, '..', 'app', 'games', '贪吃蛇.html'), 'utf8');
function load(code) {
  const js = code.match(/<script>([\s\S]*)<\/script>/)[1];
  const noop = () => {}; const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const canvas = { width: 960, height: 540, getContext: () => ctx2d, addEventListener: noop, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) };
  const sb = { document: { getElementById: () => canvas, addEventListener: noop }, requestAnimationFrame: noop, Math, console };
  vm.createContext(sb); vm.runInContext(js, sb);
  return sb;
}
// 把蛇放在第 5 行、食物放在头的右边，走一步，看长度
function eatOnce(sb, foodName) {
  vm.runInContext(`蛇身 = [{行:5,列:3},{行:5,列:2},{行:5,列:1}]; 方向 = "右"; 下一个方向 = "右"; 状态 = "玩";
    食物 = { 行: 5, 列: 4, 东西: 食物们.find(x => x.名字 === ${JSON.stringify(foodName)}) };`, sb);
  const before = vm.runInContext('蛇身.length', sb);
  vm.runInContext('走一步()', sb);
  const after1 = vm.runInContext('蛇身.length', sb);
  vm.runInContext('食物 = null; 走一步(); 走一步(); 走一步();', sb);
  return { before, after1, after4: vm.runInContext('蛇身.length', sb), score: vm.runInContext('分数', sb) };
}
let code = start;
const spells = ['让蛇吃了变长', '吃到苹果的那一步，尾巴不去掉，蛇长一格', '加金苹果：吃到长 3 格', '加辣椒：吃到以后 5 秒内走得更快', '加剪刀：吃到以后尾巴剪掉 2 格，分数 +3', '加一个西瓜', '撞到自己不会死，咬掉尾巴', '可以穿墙，从另一边出来'];
console.log('起始：吃苹果', JSON.stringify(eatOnce(load(code), '苹果')));
for (const p of spells) {
  const r = Mock.run({ code, prompt: p, mode: 'make' });
  console.log(`\n【${p}】→ ${r.reply}${r.code ? '（改了代码）' : '（没改）'}`);
  if (r.code) {
    code = r.code;
    const sb = load(code);
    for (const f of vm.runInContext('食物们.map(x => x.名字)', sb)) console.log('   吃', f, JSON.stringify(eatOnce(load(code), f)));
  }
}
const out = path.join(__dirname, '..', '.tmp');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, '贪吃蛇-精灵改完.html'), code);
