// 第 20 课《有虫的接金币》：起始游戏能玩；三只"极端情况"虫子能复现；演示精灵按孩子的话（或报错）只修那一只
// 用法：node tools/test-coins.js
'use strict';
const H = require('./s2-harness');
const { check } = H;
const P = H.loadPart('20-coins');
const START = H.starter('有虫的接金币.html');
const SNAKE = H.starter('贪吃蛇.html');
const SCRIPT = START.match(/<script>([\s\S]*)<\/script>/)[1];

// ---------- 小工具 ----------
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// 跑一个游戏：随机数固定下来；数一数游戏排了几次下一帧
function load(code, seed) {
  const g = H.loadGame(code);
  g.Math = Object.create(Math); g.Math.random = seeded(seed || 7);
  g.__raf = 0; g.requestAnimationFrame = () => { g.__raf++; return 0; };
  return g;
}
const tryFrames = (g, n) => { try { H.frames(g, n); return null; } catch (e) { return e; } };
const 左键 = [174, 494], 右键 = [786, 494], 护盾键 = [815, 42], 再来键 = [480, 341], 中间 = [480, 300];
const down = (g, [x, y], id) => H.fire(g, 'pointerdown', x, y, id);
const up = (g, [x, y], id) => H.fire(g, 'pointerup', x, y, id);
const tap = (g, [x, y], id) => H.tap(g, x, y, id);
const x = g => H.get(g, '比特.x');
// 在比特头上放一个金币或炸弹（不再随机掉炸弹）
const 放一个 = (g, 是炸弹, 在哪) => H.run(g, `设置.炸弹出现机会 = 0; 天上的东西.push({ 是炸弹: ${是炸弹}, x: ${在哪 == null ? '比特.x' : 在哪}, y: 比特.y - 8, 速度: 4 })`);
const 加心 = (g, n) => H.run(g, `for (let i = 0; i < ${n}; i++) 心们.push({ 图案: "❤️", 跳一下: 0 })`);

// 三只虫的复现步骤
function 试0条命(code) {   // 只剩一颗心时碰到炸弹
  const g = load(code);
  H.run(g, '心们 = [{ 图案: "❤️", 跳一下: 0 }]; 有护盾 = false;');
  放一个(g, true);
  const raf0 = g.__raf;
  const err = tryFrames(g, 1);
  return { err, 停住了: g.__raf === raf0, 状态: H.get(g, '状态'), 心: H.get(g, '心们.length'), g };
}
function 试没钱买(code) {   // 0 个金币时点「买护盾」
  const g = load(code);
  H.run(g, '金币 = 0; 有护盾 = false;');
  tap(g, 护盾键);
  H.frames(g, 2);
  return { 金币: H.get(g, '金币'), 有护盾: H.get(g, '有护盾'), 话: H.get(g, '话'), g };
}
function 试一起按(code) {   // 两根手指同时按住 ◀ 和 ▶
  const g = load(code);
  const x0 = x(g);
  down(g, 左键, 1); down(g, 右键, 2);
  H.frames(g, 10);
  const x1 = x(g);
  up(g, 左键, 1); up(g, 右键, 2);
  H.frames(g, 5);
  return { x0, x1, x2: x(g), g };
}
const 虫1在 = c => { const r = 试0条命(c); return !!r.err && /跳一下/.test(r.err.message); };
const 虫2在 = c => 试没钱买(c).金币 < 0;
const 虫3在 = c => Number.isNaN(试一起按(c).x1);
const 虫们 = c => [虫1在(c), 虫2在(c), 虫3在(c)].map(b => (b ? '有' : '无')).join('');
// 跑很多帧：多给几颗心，比特左右来回走
function 跑得动(code, n) {
  const g = load(code, 11);
  加心(g, 8);
  let e = null, 见过 = 0;
  for (let i = 0; i < n && !e; i += 60) {
    const k = (i / 60) % 2 ? 左键 : 右键;
    down(g, k, 5); e = tryFrames(g, 60); up(g, k, 5);
    见过 = Math.max(见过, H.get(g, '天上的东西.length'));
  }
  return { e, g, 见过 };
}
const 回复短 = r => r && r.reply && r.reply.length <= 60 && !/小朋友/.test(r.reply);

// ---------- 1. 文件格式 ----------
console.log('【文件格式】');
check(START.includes('<title>有虫的接金币</title>'), '标题是「有虫的接金币」');
check(START.includes('<canvas id="game" width="960" height="540">'), '960×540 的画布');
const 设置块 = START.match(/const 设置 = \{\n([\s\S]*?)\n\};\n/);
const 设置行 = 设置块 ? 设置块[1].split('\n') : [];
check(设置行.length === 5 && 设置行.every(l => /^  \S+: [^,\n]+,\s+\/\/ \S/.test(l)), '设置每项一行「  键: 值,   // 注释」，一共 5 项');
const 键们 = 设置行.map(l => l.trim().split(':')[0]);
check(键们.join() === '一开始几条命,护盾价钱,移动速度,掉东西间隔帧,炸弹出现机会', '设置的键：' + 键们.join('、'));
check(键们.every(k => START.split(k + ':').length === 2), '每个设置的「键:」在文件里只出现一次');
const 尾 = SCRIPT.trim().split('\n').slice(-2).map(s => s.trim());
check(尾[0] === '开始();' && 尾[1] === '游戏循环();', '最后两行是 开始(); 游戏循环();');
check(!/\b(window|performance|setTimeout|setInterval|localStorage|Image|Audio|fetch)\b/.test(SCRIPT), '没用 window/performance/setTimeout/setInterval/localStorage/Image/Audio');
const 虫1段 = '// 碰到炸弹：掉一条命\nfunction 掉一条命() {\n  心们.pop();                           // 去掉一颗心\n  心们[心们.length - 1].跳一下 = 20;     // 剩下的最后一颗心跳一下，提醒你\n  if (心们.length === 0) 输了();\n}';
const 虫2段 = 'function 买护盾() {\n  金币 = 金币 - 设置.护盾价钱;   // 付钱\n  有护盾 = true;\n  说一句("买到护盾了！");\n}';
const 虫3段a = 'const 方向表 = { 左: -1, 右: 1 };';
const 虫3段b = '  let 按着的键 = "";\n  if (按着.左) 按着的键 += "左";\n  if (按着.右) 按着的键 += "右";\n  if (按着的键) 比特.x += 设置.移动速度 * 方向表[按着的键];';
check(START.includes(虫1段) && START.includes(虫2段) && START.includes(虫3段a) && START.includes(虫3段b), '三只虫的代码一字不差');
check(!/\/\/[^\n]*(虫|bug|BUG|故意|NaN|负数|undefined)/.test(SCRIPT), '注释里没有暗示虫子');
check(P.key === 'coins' && P.is(START) && !P.is(SNAKE), '精灵规则认得这个游戏（key=coins），不会认错贪吃蛇');
check(typeof P.CAN === 'string' && /0 条命/.test(P.CAN) && /护盾/.test(P.CAN) && /一起按/.test(P.CAN), 'CAN：' + P.CAN);

// ---------- 2. 起始游戏能玩 ----------
console.log('\n【起始游戏】');
{
  const r = 跑得动(START, 900);
  check(!r.e && r.见过 > 0, `跑 900 帧不出错，天上掉过东西（最多同时 ${r.见过} 个）` + (r.e ? '：' + r.e.message : ''));
  check(H.get(r.g, '心们.length') >= 1 && H.get(r.g, '金币') >= 0, `来回走 900 帧：还有 ${H.get(r.g, '心们.length')} 颗心，接到 ${H.get(r.g, '金币')} 个金币`);
}
{
  const g = load(START);
  check(x(g) === 480 && H.get(g, '心们.length') === 3 && H.get(g, '金币') === 0 && H.get(g, '有护盾') === false && H.get(g, '状态') === '玩', '开局：比特在中间，3 颗心，0 金币，没护盾');
  down(g, 右键, 1); H.frames(g, 20);
  check(x(g) === 640 && H.get(g, '按着.右') === true, `按住 ▶ 20 帧：比特往右走到 ${x(g)}`);
  up(g, 右键, 1); H.frames(g, 10);
  check(x(g) === 640 && H.get(g, '按着.右') === false, '松开就停下');
  down(g, 左键, 3); H.frames(g, 10); up(g, 左键, 3);
  check(x(g) === 560, `换一根手指按住 ◀ 10 帧：往左走到 ${x(g)}`);
  H.key(g, 'ArrowLeft'); H.frames(g, 10); H.key(g, 'ArrowLeft', 'keyup'); H.frames(g, 5);
  check(x(g) === 480, `方向键 ← 也能走，松开就停（到 ${x(g)}）`);
  down(g, 右键, 4); H.frames(g, 200);
  check(x(g) === 920, '一直按 ▶ 走到右边就停住，不出画面');
  H.fire(g, 'pointermove', ...中间, 4); H.frames(g, 5);
  check(x(g) === 920 && H.get(g, '按着.右') === false, '手指滑出按钮就不走了');
  H.fire(g, 'pointermove', ...左键, 4); H.frames(g, 5);
  check(x(g) === 880, '手指再滑到 ◀ 上，往左走');
  H.fire(g, 'pointercancel', ...左键, 4); H.frames(g, 5);
  check(x(g) === 880, 'pointercancel 也算松开');
  down(g, 左键, 6); H.fire(g, 'pointerleave', 0, 0, 6); H.frames(g, 5);
  check(x(g) === 880, '手指移出画布（pointerleave）也算松开');
  H.fire(g, 'pointermove', ...右键, 9); H.frames(g, 5);
  check(x(g) === 880, '鼠标没按下、只是晃过按钮，不走');
}
{
  const g = load(START);
  放一个(g, false); H.frames(g, 1);
  check(H.get(g, '金币') === 1 && H.get(g, '天上的东西.length') === 0, '接到金币：金币 +1，金币消失');
  放一个(g, false, 100); H.frames(g, 120);
  check(H.get(g, '金币') === 1, '离得远的金币接不到，落到地上就没了');
  放一个(g, true); H.frames(g, 1);
  check(H.get(g, '心们.length') === 2 && H.get(g, '心们[1].跳一下') > 0, '碰到炸弹：少一颗心，剩下的最后一颗跳一下');
  H.run(g, '金币 = 5;'); tap(g, 护盾键);
  check(H.get(g, '金币') === 0 && H.get(g, '有护盾') === true && H.get(g, '话') === '买到护盾了！', '5 个金币买护盾：金币 0，有护盾');
  放一个(g, true); H.frames(g, 1);
  check(H.get(g, '心们.length') === 2 && H.get(g, '有护盾') === false, '有护盾时碰到炸弹：不掉命，护盾没了');
  H.run(g, '金币 = 7;'); tap(g, 再来键);
  check(H.get(g, '状态') === '玩' && H.get(g, '金币') === 7, '还在玩的时候点「再来一局」那块地方没反应');
}

// ---------- 3. 三只虫都能复现 ----------
console.log('\n【三只虫：极端情况】');
const 报错 = 试0条命(START);
check(!!报错.err && /跳一下/.test(报错.err.message), '虫 1：最后一条命没了，游戏循环() 抛错：' + (报错.err && 报错.err.message));
check(报错.停住了 && 报错.状态 === '玩' && 报错.心 === 0, '虫 1：抛错那一帧没排下一帧（画面卡住），也没显示游戏结束');
{
  const g = load(START);
  加心(g, 0); 放一个(g, true); H.frames(g, 1); 放一个(g, true); H.frames(g, 1);
  check(H.get(g, '心们.length') === 1, '虫 1 平时碰不到：3 条命掉到 1 条都正常');
}
const 没钱 = 试没钱买(START);
check(没钱.金币 === -5 && 没钱.有护盾 === true, `虫 2：0 个金币也能买护盾，金币变成 ${没钱.金币}`);
{
  const g = load(START);
  H.run(g, '金币 = 6;'); tap(g, 护盾键);
  check(H.get(g, '金币') === 1, '虫 2 平时碰不到：钱够时买护盾正常');
}
const 一起 = 试一起按(START);
check(一起.x0 === 480 && Number.isNaN(一起.x1) && Number.isNaN(一起.x2), '虫 3：两根手指同时按住左右，比特.x 变成 NaN，松开也回不来');
{
  const g = 一起.g;
  H.run(g, '设置.炸弹出现机会 = 0; 天上的东西 = [{ 是炸弹: false, x: 480, y: 比特.y - 8, 速度: 4 }]'); H.frames(g, 30);
  check(H.get(g, '金币') === 0, '虫 3：比特不见了以后，再也接不到金币');
  const g2 = load(START);
  H.key(g2, 'ArrowLeft'); H.key(g2, 'ArrowRight'); H.frames(g2, 3);
  check(Number.isNaN(x(g2)), '虫 3：键盘两个方向键一起按也一样');
}
check(虫们(START) === '有有有', '起始游戏三只虫都在');

// ---------- 4. 演示精灵：说清楚了才修，只修那一只 ----------
console.log('\n【演示精灵修虫】');
const 修好1 = c => { const r = 试0条命(c); return !r.err && r.状态 === '输了' && r.心 === 0; };
const 修好2 = c => { const r = 试没钱买(c); return r.金币 === 0 && r.有护盾 === false && /还差 5 个金币/.test(r.话); };
const 修好3 = c => { const r = 试一起按(c); return r.x1 === r.x0 && r.x2 === r.x0; };
const 说法 = {
  1: ['最后一条命没了，游戏就卡住了', '0 条命的时候画面不动了', '心都掉光了以后死机了', '游戏卡住了，不动了', '白屏了'],
  2: ['钱不够也能买护盾', '金币变成负数了', '我只有 0 个金币，买了护盾，金币变成 -5', '没钱也能买，金币变成负的了'],
  3: ['两个键一起按，比特不见了', '左右两个按钮同时按，比特就消失了', '比特不见了', '两根手指一起按以后小狗就没了']
};
const 期望 = { 1: '无有有', 2: '有无有', 3: '有有无' };
const 修好 = { 1: 修好1, 2: 修好2, 3: 修好3 };
const 修后代码 = {};
for (const n of [1, 2, 3]) {
  for (const p of 说法[n]) {
    const r = P.run(START, p, 'bug');
    const ok = r && r.code && 回复短(r);
    check(ok && 虫们(r.code) === 期望[n] && 修好[n](r.code), `「${p}」→ 只修虫 ${n}（三只虫：${ok ? 虫们(r.code) : '没改'}）→ ${r && r.reply}`);
    if (ok) 修后代码[n] = r.code;
  }
}
check(修后代码[1] && 修后代码[1].includes('  if (心们.length > 0) 心们[心们.length - 1].跳一下 = 20;'), '虫 1 修法：加 if (心们.length > 0)');
check(修后代码[2] && 修后代码[2].includes('  if (金币 < 设置.护盾价钱) { 说一句("钱不够，还差 " + (设置.护盾价钱 - 金币) + " 个金币"); return; }\n  金币 = 金币 - 设置.护盾价钱;'), '虫 2 修法：付钱前先看钱够不够');
check(修后代码[3] && 修后代码[3].includes('const 方向表 = { 左: -1, 右: 1, 左右: 0 };'), '虫 3 修法：方向表加上 左右: 0');
for (const n of [1, 2, 3]) {
  const r = 跑得动(修后代码[n], 600);
  check(!r.e, `修好虫 ${n} 的游戏跑 600 帧不出错` + (r.e ? '：' + r.e.message : ''));
}
{
  const g = 试0条命(修后代码[1]).g;
  check(H.get(g, '状态') === '输了' && g.__raf > 0, '修好虫 1：0 条命显示游戏结束，游戏没停');
  H.run(g, '金币 = 4; 比特.x = 100;'); tap(g, 再来键); H.frames(g, 1);
  check(H.get(g, '状态') === '玩' && H.get(g, '心们.length') === 3 && H.get(g, '金币') === 0 && x(g) === 480 && H.get(g, '天上的东西.length') === 0, '点「再来一局」：重开，3 颗心、0 金币、比特回到中间');
  H.run(g, '金币 = 5;'); tap(g, 护盾键);
  check(H.get(g, '金币') === 0 && H.get(g, '有护盾'), '重开以后照样能玩、能买护盾');
}
{
  const g = load(修后代码[2]);
  H.run(g, '金币 = 3;'); tap(g, 护盾键);
  check(H.get(g, '金币') === 3 && !H.get(g, '有护盾') && H.get(g, '话') === '钱不够，还差 2 个金币', '修好虫 2：3 个金币买不了，提示还差 2 个');
  H.run(g, '金币 = 5;'); tap(g, 护盾键);
  check(H.get(g, '金币') === 0 && H.get(g, '有护盾'), '修好虫 2：钱够了照样能买');
}
{
  const g = load(修后代码[3]);
  down(g, 左键, 1); down(g, 右键, 2); H.frames(g, 10);
  check(x(g) === 480 && H.get(g, '按着.左') && H.get(g, '按着.右'), '修好虫 3：两个一起按，比特站着不动、还在');
  up(g, 左键, 1); H.frames(g, 10);
  check(x(g) === 560, '松开 ◀、还按着 ▶：往右走');
}

console.log('\n【带报错来修】');
const 报错们 = [
  ['游戏出错了，帮我修好', 报错.err.message, '测试里真抛出的报错'],
  ['游戏出错了，帮我修好', "Uncaught TypeError: Cannot set properties of undefined (setting '跳一下')", '电脑上的报错'],
  ['', "TypeError: undefined is not an object (evaluating '心们[心们.length - 1].跳一下 = 20')", '平板上的报错，孩子没说话'],
  ["报错了：Cannot set properties of undefined (setting '跳一下')", '', '孩子把报错贴在话里']
];
for (const [p, e, what] of 报错们) {
  const r = P.run(START, p, 'bug', e);
  check(r && r.code && 虫们(r.code) === '无有有' && /最后一颗心/.test(r.reply), `${what} → 修虫 1：${r && r.reply}`);
}
const 第几行 = START.split('\n').findIndex(l => l.includes('心们[心们.length - 1].跳一下 = 20;')) + 1;
{
  const r = P.run(START, `报错说第 ${第几行} 行出错了`, 'bug');
  check(r && r.code && 虫们(r.code) === '无有有', `高龄班读出行号「第 ${第几行} 行」→ 修虫 1`);
  const r2 = P.run(START, '', 'bug', 'ReferenceError: 小猫 is not defined');
  check(r2 && r2.code === null && 回复短(r2), '看不懂的报错：不改代码，反问 → ' + (r2 && r2.reply));
}

console.log('\n【太模糊、已经修过、一次说好几只】');
for (const p of ['游戏坏了', '有 bug，修一下', '不好玩', '游戏出错了，帮我修好']) {
  const r = P.run(START, p, 'bug');
  check(r && r.code === null && /报错/.test(r.reply) && 回复短(r), `「${p}」→ 不改代码，反问：${r && r.reply}`);
}
for (const n of [1, 2, 3]) {
  const r = P.run(修后代码[n], 说法[n][0], 'bug');
  check(r && r.code === null && r.reply === '这个已经修好了，再试一次看看。', `虫 ${n} 修过了再说「${说法[n][0]}」→ ${r && r.reply}`);
}
{
  const r = P.run(修后代码[1], '', 'bug', "Cannot set properties of undefined (setting '跳一下')");
  check(r && r.code === null && /已经修好了/.test(r.reply), '虫 1 修过了又带着同样的报错来 → 已经修好了');
  const r2 = P.run(START, '钱不够也能买护盾，两个键一起按比特还不见了', 'bug');
  check(r2 && r2.code === null && 回复短(r2), '一次说两只虫 → 不改，问先修哪个：' + (r2 && r2.reply));
  const r3 = P.run(START, '比特不见了', 'make');
  check(r3 && r3.code && 虫们(r3.code) === '有有无', '平常模式（make）说「比特不见了」也照样修虫 3');
  check(P.run(START, '加一只猫', 'make') === null, '认不出的话（加一只猫）返回 null');
}
{   // 三只一只一只修完
  let c = START;
  for (const p of ['0 条命卡住了', '钱不够也能买', '两个键一起按比特不见了']) c = P.run(c, p, 'bug').code || c;
  check(虫们(c) === '无无无' && !跑得动(c, 600).e, '一只一只修完：三只虫都没了，跑 600 帧不出错');
}

// ---------- 5. 改设置 ----------
console.log('\n【改设置】');
function 设置后(p, mode) {
  const r = P.run(START, p, mode || 'make');
  if (!r || !r.code) return { r, g: null };
  const g = load(r.code); const e = tryFrames(g, 300);
  return { r, g: e ? null : load(r.code), e };
}
{
  let s = 设置后('一开始 5 条命');
  check(s.g && H.get(s.g, '心们.length') === 5 && 虫们(s.r.code) === '有有有', '「一开始 5 条命」→ 开局 5 颗心，虫还在 → ' + (s.r && s.r.reply));
  s = 设置后('一开始十条命', 'bug');
  check(s.g && H.get(s.g, '心们.length') === 10, '「一开始十条命」（抓虫模式也认）→ 10 颗心');
  s = 设置后('护盾 3 个金币');
  if (s.g) { H.run(s.g, '金币 = 3;'); tap(s.g, 护盾键); }
  check(s.g && H.get(s.g, '设置.护盾价钱') === 3 && H.get(s.g, '金币') === 0 && H.get(s.g, '有护盾'), '「护盾 3 个金币」→ 3 个金币就能买 → ' + (s.r && s.r.reply));
  s = 设置后('比特走快一点');
  if (s.g) { down(s.g, 右键, 1); H.frames(s.g, 10); }
  check(s.g && x(s.g) === 600, '「比特走快一点」→ 移动速度 12，10 帧走 120');
  s = 设置后('炸弹多一点');
  check(s.g && H.get(s.g, '设置.炸弹出现机会') === 0.5, '「炸弹多一点」→ 炸弹出现机会 0.5');
  s = 设置后('不要炸弹');
  check(s.g && H.get(s.g, '设置.炸弹出现机会') === 0, '「不要炸弹」→ 炸弹出现机会 0');
  s = 设置后('东西掉得多一点');
  check(s.g && H.get(s.g, '设置.掉东西间隔帧') === 25, '「东西掉得多一点」→ 掉东西间隔帧 25');
  s = 设置后('把掉东西间隔帧改成 20');
  check(s.g && H.get(s.g, '设置.掉东西间隔帧') === 20, '「把掉东西间隔帧改成 20」→ 20');
}

// ---------- 6. 设置填错不崩 ----------
console.log('\n【设置填错】');
for (const [k, v] of [['掉东西间隔帧', '0'], ['掉东西间隔帧', '"快"'], ['炸弹出现机会', '"很多"'], ['一开始几条命', '500'], ['一开始几条命', '"三"'], ['护盾价钱', '-3']]) {
  const c = H.helpers.setSetting(START, k, v);
  const g = load(c); H.run(g, '设置.炸弹出现机会 = 设置.炸弹出现机会 === "很多" ? 设置.炸弹出现机会 : 0;');
  const e = tryFrames(g, 300);
  check(!e && H.get(g, '天上的东西.length') >= 0 && H.get(g, '心们.length') <= 99, `${k}: ${v} → 跑 300 帧不崩（${H.get(g, '心们.length')} 颗心，天上 ${H.get(g, '天上的东西.length')} 个东西）`);
}

console.log(process.exitCode ? '\n有没通过的' : '\n全部通过');
