// 第 18 课《游戏只有一个画面吗？》：接星星 + 演示精灵（流程图、一句话加画面、商店卖东西）
// 用法：node tools/test-flow.js
'use strict';
const H = require('./s2-harness');
const { check, get, run, frames, tap, fire, key } = H;
const P = H.loadPart('18-flow');
const START = H.starter('接星星.html');

// ---- 小工具 ----
function runs(code, n) {   // 跑 n 帧，出错返回 null
  try { const g = H.loadGame(code); frames(g, n == null ? 400 : n); return g; } catch (e) { console.log('   出错：' + e.message); return null; }
}
const say = (code, p, mode) => P.run(code, p, mode || 'make');
function info(code) {   // 读设置和表格
  const g = H.loadGame(code);
  return JSON.parse(get(g, 'JSON.stringify({ 设置, 流程, 商品们 })'));
}
const has = (rows, 从, 按, 到) => rows.some(r => r && r.从 === 从 && r.按 === 按 && r.到 === 到);
const 画面 = g => get(g, '现在的画面');
const 按钮字 = g => get(g, `这个画面的按钮(${JSON.stringify(画面(g))})`).map(b => b.按);
function 点按钮(g, 字) {   // 在画布上点这个画面里写着「字」的按钮
  const 在 = 画面(g), list = get(g, `这个画面的按钮(${JSON.stringify(在)})`);
  const i = list.findIndex(b => b.按 === 字);
  if (i < 0) return false;
  const b = get(g, `按钮位置(${JSON.stringify(在)}, ${i}, ${list.length})`);
  tap(g, b.x, b.y); frames(g, 1);
  return true;
}
function 点商品(g, 名字) {
  const 表 = get(g, '商品表()'), i = 表.findIndex(x => x.名字 === 名字);
  const 卡 = get(g, `商品位置(${i}, ${表.length})`);
  tap(g, 卡.x + 卡.宽 / 2, 卡.y + 卡.高 / 2); frames(g, 1);
}
function 时间到(g) { run(g, '剩余帧数 = 1'); frames(g, 65); }   // 时间到，再等 1 秒（看流程去哪）
function 放(g, dx, dy, 石头) { run(g, `天上.push({ 图案: "${石头 ? '🪨' : '⭐'}", 是石头: ${!!石头}, x: 篮子X + ${dx || 0}, y: 篮子Y - ${dy == null ? 4 : dy}, 速度: 3 })`); }
function 接一颗(g, dx) { run(g, '天上 = []'); 放(g, dx); frames(g, 3); }
const 好代码 = (code, msg) => check(!!code && P.is(code) && /\n开始\(\);\n游戏循环\(\);\n<\/script>/.test(code) && !!runs(code, 400), msg + '：改完还能跑 400 帧');

// ================= 起始游戏 =================
console.log('\n【起始游戏】');
check(P.is(START) && H.helpers.gameOf(START) === '接星星', 'is() 认得接星星，标题是「接星星」');
check(/\n开始\(\);\n游戏循环\(\);\n<\/script>/.test(START), '最后两行是 开始(); 游戏循环();');
const setLines = START.match(/const 设置 = \{\n([\s\S]*?)\n\};/)[1].split('\n');
check(setLines.length === 5 && setLines.every(l => /^  [一-龥A-Za-z]+: [^,\n]+,\s+\/\/ \S/.test(l)), '设置每项一行：「  键: 值,   // 注释」');
check(['一局几秒', '有开始画面', '有结束画面', '有商店', '背景颜色'].every(k => START.split(k + ':').length === 2), '设置的键名在整个文件里只出现一次「键:」');
check(/const 流程 = \[\n\];/.test(START), '流程起始是空表');
check(!/\bwindow\b|performance|setTimeout|setInterval|localStorage|new Image|new Audio/.test(START.match(/<script>([\s\S]*)<\/script>/)[1]), '没用 window / performance / setTimeout / localStorage / Image / Audio');

let g = runs(START, 300);
check(!!g && 画面(g) === '游戏', '没有开始画面：一打开就直接进游戏');
check(get(g, '剩余帧数') === 30 * 60 - 301, '一局 30 秒（加载时先跑了 1 帧），倒计时在走（还剩 ' + Math.ceil(get(g, '剩余帧数') / 60) + ' 秒）');
fire(g, 'pointerdown', 300, 300); fire(g, 'pointermove', 700, 300);
check(get(g, '篮子X') === 700, '手指按住往右拖：篮子跟到 x=700');
fire(g, 'pointermove', 200, 300);
check(get(g, '篮子X') === 200, '往左拖：篮子跟到 x=200');
fire(g, 'pointerup', 200, 300); fire(g, 'pointermove', 800, 300);
check(get(g, '篮子X') === 200, '手指松开以后，篮子不跟着动');
key(g, 'ArrowRight'); frames(g, 10); key(g, 'ArrowRight', 'keyup'); frames(g, 5);
check(get(g, '篮子X') === 320, '按住方向键 → 10 帧，篮子往右 120（x=' + get(g, '篮子X') + '）');
const s0 = get(g, '分数'), c0 = get(g, '金币');
接一颗(g);
check(get(g, '分数') === s0 + 1 && get(g, '金币') === c0 + 1, '接到星星：+1 分、+1 金币');
run(g, '天上 = []'); 放(g, 0, 4, true); frames(g, 3);
check(get(g, '分数') === s0 && get(g, '金币') === c0 + 1, '接到石头：-1 分，金币不变');
接一颗(g, 90);
check(get(g, '分数') === s0, '星星离篮子 90：普通篮子接不到');
run(g, '天上 = []'); 放(g, 0, 170); frames(g, 10);
check(get(g, '天上[0].y') === get(g, '篮子Y') - 170 + 30, '星星一帧掉 3（没买慢动作）');
run(g, '天上 = []'); 放(g, 200, 170); frames(g, 70);
check(get(g, '分数') === s0, '星星在旁边 200：没有磁铁，不会飞过来');
frames(g, 1800);
check(get(g, '时间到了') && 画面(g) === '游戏', '30 秒到了：显示"时间到！"，停在游戏画面');
frames(g, 300);
check(画面(g) === '游戏' && 按钮字(g).length === 0, '流程里没有「时间到」那一行：一直停在这里，一个按钮都没有（走不通）');
tap(g, 480, 270); frames(g, 1);
check(画面(g) === '游戏' && /没有按钮/.test(get(g, '话')), '点哪都没用，提示：' + get(g, '话'));

// ================= 流程图 =================
console.log('\n【流程图：开始 → 游戏 → 时间到 → 结束 → 商店 → 回去】');
const CHART = `照这张流程图做画面：
| 从 | 怎么过去 | 到 |
| 开始画面 | 按「开始」 | 游戏 |
| 游戏 | 时间到 | 结束画面 |
| 结束画面 | 按「再玩一次」 | 游戏 |
| 结束画面 | 按「商店」 | 商店 |
| 商店 | 按「回去」 | 结束画面 |`;
let r = say(START, CHART);
console.log('   精灵：' + (r && r.reply));
let full = r && r.code;
let d = full && info(full);
check(!!d && d.流程.length === 5 && has(d.流程, '开始画面', '开始', '游戏') && has(d.流程, '游戏', '时间到', '结束画面') && has(d.流程, '结束画面', '再玩一次', '游戏') && has(d.流程, '结束画面', '商店', '商店') && has(d.流程, '商店', '回去', '结束画面'), '流程表换成这 5 行（按「开始」存成 按: "开始"）');
check(!!d && d.设置.有开始画面 === true && d.设置.有结束画面 === true && d.设置.有商店 === true, '表里出现的画面都打开了');
check(/开始画面、游戏、结束画面、商店/.test(r.reply) && /走得通/.test(r.reply), '回复说做好了哪几个画面、都走得通');
check(full.includes('  { 从: "商店", 按: "回去", 到: "结束画面" },\n];'), '流程每行一行，以 }, 结尾');
好代码(full, '照流程图做');
g = runs(full, 30);
check(画面(g) === '开始画面' && 按钮字(g).join() === '开始', '一打开是开始画面，上面有「开始」按钮');
点按钮(g, '开始');
check(画面(g) === '游戏' && get(g, '剩余帧数') === 1800 - 1, '点「开始」→ 游戏，新的一局');
for (let i = 0; i < 6; i++) 接一颗(g);
check(get(g, '分数') === 6 && get(g, '金币') === 6, '接了 6 颗星星：6 分、6 个金币');
时间到(g);
check(画面(g) === '结束画面' && get(g, '分数') === 6, '时间到 → 结束画面，显示这局 6 分');
check(按钮字(g).join() === '再玩一次,商店', '结束画面上有「再玩一次」「商店」');
点按钮(g, '商店');
check(画面(g) === '商店' && 按钮字(g).join() === '回去', '点「商店」→ 商店，上面有「回去」');
点按钮(g, '回去');
check(画面(g) === '结束画面', '点「回去」→ 结束画面');
点按钮(g, '商店');
点商品(g, '磁铁');
check(get(g, '金币') === 6 && get(g, '已买').length === 0 && get(g, '话') === '钱不够，还差 2 个金币', '6 个金币买磁铁（8）：买不了，提示：' + get(g, '话'));
点商品(g, '大篮子');
check(get(g, '金币') === 1 && get(g, '已买').includes('大篮子') && get(g, '篮子宽()') === 220, '买大篮子（5）：扣钱、标上已买、篮子宽一倍');
点商品(g, '大篮子');
check(get(g, '金币') === 1 && /已经买过/.test(get(g, '话')), '已买的不会再扣钱');
点按钮(g, '回去'); 点按钮(g, '再玩一次');
check(画面(g) === '游戏' && get(g, '分数') === 0 && get(g, '金币') === 1, '「再玩一次」→ 游戏：分数清零，金币留着');
接一颗(g, 90);
check(get(g, '分数') === 1, '大篮子生效：离篮子 90 的星星也接到了');
run(g, '金币 = 20'); 时间到(g); 点按钮(g, '商店'); 点商品(g, '慢动作'); 点商品(g, '磁铁');
check(get(g, '已买').length === 3 && get(g, '金币') === 9, '钱够了：慢动作、磁铁都买到了');
点按钮(g, '回去'); 点按钮(g, '再玩一次');
run(g, '天上 = []'); 放(g, 0, 170); frames(g, 10);
check(get(g, '天上[0].y') === get(g, '篮子Y') - 170 + 15, '慢动作生效：星星一帧只掉 1.5');
run(g, '天上 = []'); 放(g, 200, 170); frames(g, 130);
check(get(g, '分数') === 1, '磁铁生效：旁边 200 的星星自己飞进篮子');
run(g, '现在的画面 = "商店"; 金币 = 3'); frames(g, 200); run(g, '现在的画面 = "结束画面"'); frames(g, 200); run(g, '现在的画面 = "开始画面"'); frames(g, 200);
check(画面(g) === '开始画面', '开始画面、结束画面、商店都能画几百帧');
const pl = P.plan(START, CHART);
check(!!pl && pl.plan.length === 6 && /开始画面：按「开始」 → 游戏/.test(pl.plan.join('|')), '先说计划：一行流程一步');

// ================= 去没打开的画面 =================
console.log('\n【去没打开的画面】');
let c = H.helpers.addItem(START, '流程', '{ 从: "游戏", 按: "商店", 到: "商店" },');
c = H.helpers.addItem(c, '流程', '{ 从: "游戏", 按: "时间到", 到: "结束画面" },');
g = runs(c, 30);
check(按钮字(g).join() === '商店', '游戏画面照样画「商店」按钮');
点按钮(g, '商店');
check(画面(g) === '游戏' && get(g, '话') === '还没有商店画面', '商店没打开：点了不跳，说「还没有商店画面」');
时间到(g);
check(画面(g) === '游戏' && get(g, '话') === '还没有结束画面', '时间到要去结束画面，可结束画面没打开：不跳');

// ================= 只说一句话 =================
console.log('\n【只说一句话：一步一步加】');
let code = START;
r = say(code, '加一个开始画面'); console.log('   加一个开始画面 → ' + r.reply);
check(r.code && r.reply === '加好了开始画面，按「开始」进游戏。', '回复：' + r.reply);
code = r.code; d = info(code);
check(d.设置.有开始画面 === true && d.流程.length === 1 && has(d.流程, '开始画面', '开始', '游戏'), '打开有开始画面，加了 开始画面 →「开始」→ 游戏');
好代码(code, '加开始画面');
g = runs(code, 20); check(画面(g) === '开始画面', '一打开是开始画面'); 点按钮(g, '开始'); check(画面(g) === '游戏', '点「开始」进游戏');
check(say(code, '加一个开始画面').code === null, '再说一遍：已经有了，不重复加');

r = say(code, '加一个结束画面'); console.log('   加一个结束画面 → ' + r.reply);
check(r.code && r.reply === '加好了结束画面，时间到就显示分数。', '回复：' + r.reply);
code = r.code; d = info(code);
check(d.设置.有结束画面 === true && has(d.流程, '游戏', '时间到', '结束画面') && !d.流程.some(x => x.从 === '结束画面'), '打开有结束画面，加了「时间到 → 结束画面」，没加「再玩一次」');
好代码(code, '加结束画面');
g = runs(code, 20); 点按钮(g, '开始'); 时间到(g);
check(画面(g) === '结束画面' && 按钮字(g).length === 0, '时间到 → 结束画面，可结束画面上一个按钮都没有');
tap(g, 480, 470); tap(g, 300, 300); frames(g, 100);
check(画面(g) === '结束画面' && /没有按钮/.test(get(g, '话')), '点哪都出不去（走不通）：' + get(g, '话'));

r = say(code, '加一个商店'); console.log('   加一个商店 → ' + r.reply);
check(r.code && r.reply === '加了商店：结束画面上有「商店」按钮，钱够才能买。', '回复：' + r.reply);
code = r.code; d = info(code);
check(d.设置.有商店 === true && has(d.流程, '结束画面', '商店', '商店') && !d.流程.some(x => x.从 === '商店'), '打开有商店，结束画面加「商店」按钮，没加从商店回去的按钮');
好代码(code, '加商店');
g = runs(code, 20); 点按钮(g, '开始'); 时间到(g); 点按钮(g, '商店');
check(画面(g) === '商店' && 按钮字(g).length === 0, '进了商店，出不来（走不通）');

r = say(code, '商店里加一个回去的按钮'); console.log('   商店里加一个回去的按钮 → ' + r.reply);
code = r.code; d = info(code);
check(!!code && has(d.流程, '商店', '回去', '结束画面'), '加了 商店 →「回去」→ 结束画面');
好代码(code, '商店加回去');
g = runs(code, 20); 点按钮(g, '开始'); 时间到(g); 点按钮(g, '商店'); 点按钮(g, '回去');
check(画面(g) === '结束画面', '商店 →「回去」→ 结束画面');

r = say(code, '加一个再玩一次的按钮'); console.log('   加一个再玩一次的按钮 → ' + r.reply);
code = r.code; d = info(code);
check(!!code && has(d.流程, '结束画面', '再玩一次', '游戏'), '加了 结束画面 →「再玩一次」→ 游戏');
好代码(code, '加再玩一次');
g = runs(code, 20); 点按钮(g, '开始'); 时间到(g); 点按钮(g, '再玩一次');
check(画面(g) === '游戏' && !get(g, '时间到了'), '结束画面 →「再玩一次」→ 新的一局');
check(info(code).流程.length === 5, '一句一句加完，流程表也是 5 行，和那张流程图一样');

console.log('\n【只说一句话：从起始游戏直接说】');
r = say(START, '加一个商店'); d = r.code && info(r.code);
check(!!d && d.设置.有商店 && d.设置.有结束画面 && has(d.流程, '游戏', '时间到', '结束画面') && has(d.流程, '结束画面', '商店', '商店'), '没有结束画面时说「加一个商店」：结束画面一起打开，加上时间到那行');
g = runs(r.code, 20); 时间到(g); 点按钮(g, '商店'); check(画面(g) === '商店', '游戏 → 时间到 → 结束画面 →「商店」→ 商店');
r = say(START, '加一个再玩一次的按钮'); d = r.code && info(r.code);
check(!!d && d.设置.有结束画面 && has(d.流程, '游戏', '时间到', '结束画面') && has(d.流程, '结束画面', '再玩一次', '游戏'), '没有结束画面时说「加一个再玩一次的按钮」：一起打开结束画面 → ' + r.reply);
g = runs(r.code, 20); 时间到(g); 点按钮(g, '再玩一次'); check(画面(g) === '游戏' && !get(g, '时间到了'), '时间到 → 结束画面 →「再玩一次」→ 游戏');
r = say(START, '商店里加一个回去的按钮');
check(r && r.code === null, '还没有商店时说「商店里加一个回去的按钮」：不改，反问 → ' + r.reply);
r = say(START, '加一个开始画面和结束画面'); d = r.code && info(r.code);
check(!!d && d.设置.有开始画面 && d.设置.有结束画面 && d.流程.length === 2, '一句话要两个画面：都加上 → ' + r.reply);

console.log('\n【抓虫：说出哪里走不通】');
const endStuck = say(say(START, '加一个开始画面').code, '加一个结束画面').code;
r = say(endStuck, '结束画面卡住了，出不去', 'bug');
check(!!r.code && has(info(r.code).流程, '结束画面', '再玩一次', '游戏'), '「结束画面卡住了，出不去」→ 加「再玩一次」：' + r.reply);
const shopStuck = say(r.code, '加一个商店').code;
r = say(shopStuck, '商店进去了出不来', 'bug');
check(!!r.code && has(info(r.code).流程, '商店', '回去', '结束画面'), '「商店进去了出不来」→ 加「回去」：' + r.reply);
r = say(START, '时间到了就卡住了', 'bug');
check(!!r.code && has(info(r.code).流程, '游戏', '时间到', '结束画面'), '「时间到了就卡住了」→ 时间到去结束画面：' + r.reply);

// ================= 流程图的走不通检查 =================
console.log('\n【流程图：走不通检查】');
const NOBACK = CHART.split('\n').filter(l => !/回去/.test(l)).join('\n');
r = say(START, NOBACK); console.log('   精灵：' + r.reply);
check(!!r.code && /商店进去了出不来/.test(r.reply) && /回去/.test(r.reply), '没画商店回去的线：照做，但提醒「商店进去了出不来」');
check(r.problems.length === 1, '只有这一处走不通');
d = info(r.code); check(d.设置.有商店 === true && d.流程.length === 4, '还是照做了（4 行，商店打开）');
好代码(r.code, '没回去的流程图');
g = runs(r.code, 20); 点按钮(g, '开始'); 时间到(g); 点按钮(g, '商店');
check(画面(g) === '商店' && 按钮字(g).length === 0, '真的卡在商店了');

const FW = '照这张流程图做画面：\n｜从｜怎么过去｜到｜\n｜开始画面｜开始｜游戏｜\n｜游戏｜时间到｜结束画面｜';
r = say(full, FW); console.log('   精灵：' + r.reply);
d = r.code && info(r.code);
check(!!d && d.流程.length === 2 && has(d.流程, '开始画面', '开始', '游戏') && has(d.流程, '游戏', '时间到', '结束画面'), '全角｜、不写「」也认得；流程整个换掉');
check(!!d && d.设置.有商店 === false && d.设置.有开始画面 === true && d.设置.有结束画面 === true, '表里没出现的商店关掉了');
check(/结束画面没有按钮/.test(r.reply), '提醒结束画面出不去');
好代码(r.code, '全角流程图');

r = say(START, '照这张流程图做画面：\n| 从 | 怎么过去 | 到 |\n| 开始画面 | 按「开始」 | 游戏 |'); console.log('   精灵：' + r.reply);
check(!!r.code && /时间到了不知道去哪/.test(r.reply), '游戏没写时间到：提醒时间到了不知道去哪');
r = say(START, '照这张流程图做画面：\n| 从 | 怎么过去 | 到 |\n| 游戏 | 时间到 | 结束画面 |\n| 结束画面 | 按「再玩一次」 | 游戏 |\n| 商店 | 按「回去」 | 结束画面 |'); console.log('   精灵：' + r.reply);
check(!!r.code && r.problems.some(x => /商店没有路能走到/.test(x)), '商店没有按钮能进去：报出来');
r = say(START, '照这张流程图做画面：\n| 从 | 怎么过去 | 到 |\n| 开始画面 | 按「开始」 | 游戏 |\n| 天空 | 按「飞」 | 游戏 |\n| 游戏 | 时间到 | 结束画面 |\n| 结束画面 | 按「再玩一次」 | 游戏 |');
check(!!r.code && info(r.code).流程.length === 3 && /1 行没看懂/.test(r.reply), '有一行画面名不对：跳过，其他照做 → ' + r.reply);
r = say(START, '| 从 | 怎么过去 | 到 |\n|---|---|---|\n| 开始 | 按"出发" | 游戏画面 |\n| 游戏 | 时间到了 | 结束 |\n| 结束 | 点击再玩一次按钮 | 游戏 |');
d = r.code && info(r.code);
check(!!d && has(d.流程, '开始画面', '出发', '游戏') && has(d.流程, '游戏', '时间到', '结束画面') && has(d.流程, '结束画面', '再玩一次', '游戏') && /走得通/.test(r.reply), '分隔线、英文引号、「点击…按钮」、简写画面名都认得 → ' + r.reply);
r = say(START, '| 啊 | 哦 | 嗯 |');
check(r && r.code === null && /没看懂/.test(r.reply), '整张看不懂：不改，告诉孩子怎么写');

// ================= 商店卖东西 =================
console.log('\n【商店卖东西】');
r = say(full, '商店里卖一个护盾，5 个金币'); console.log('   精灵：' + r.reply);
check(!!r.code && r.code.includes('  { 名字: "护盾", 图案: "🛡️", 价钱: 5, 效果: "挡一次石头" },\n];'), '商品们加了一行护盾（挡一次石头）');
好代码(r.code, '卖护盾');
g = runs(r.code, 20); 点按钮(g, '开始'); run(g, '金币 = 4'); 时间到(g); 点按钮(g, '商店');
点商品(g, '护盾'); check(get(g, '护盾') === 0 && get(g, '金币') === 4, '4 个金币买不了护盾');
run(g, '金币 = 5'); 点商品(g, '护盾');
check(get(g, '护盾') === 1 && get(g, '金币') === 0 && get(g, '已买').includes('护盾'), '5 个金币买到护盾');
点按钮(g, '回去'); 点按钮(g, '再玩一次'); 接一颗(g); 接一颗(g);
run(g, '天上 = []'); 放(g, 0, 4, true); frames(g, 3);
check(get(g, '分数') === 2 && get(g, '护盾') === 0 && !get(g, '已买').includes('护盾'), '护盾挡住一次石头：不扣分，护盾用掉');
run(g, '天上 = []'); 放(g, 0, 4, true); frames(g, 3);
check(get(g, '分数') === 1, '第二块石头照样 -1');
r = say(START, '商店里卖一个火箭，10 个金币');
check(r && r.code === null && /火箭买了以后会怎样/.test(r.reply), '没说买了会怎样：反问 → ' + r.reply);
r = say(START, '商店里卖一个火箭，买了星星掉得慢，十个金币');
check(!!r.code && r.code.includes('{ 名字: "火箭", 图案: "🚀", 价钱: 10, 效果: "星星掉得慢" },'), '说清楚了：上架火箭 → ' + r.reply);
r = say(START, '商店里的磁铁卖 2 个金币');
check(!!r.code && r.code.split('名字: "磁铁"').length === 2 && r.code.includes('{ 名字: "磁铁", 图案: "🧲", 价钱: 2, 效果: "星星自己飞过来" },'), '已经有的商品：改价钱，不重复加 → ' + r.reply);
r = say(START, '加一个商店，里面卖护盾，6 个金币'); d = r.code && info(r.code);
check(!!d && d.设置.有商店 && has(d.流程, '结束画面', '商店', '商店') && d.商品们.some(x => x.名字 === '护盾' && x.价钱 === 6), '「加一个商店，里面卖护盾」：商店和护盾一起加 → ' + r.reply);
好代码(r.code, '加商店卖护盾');

// ================= 设置 =================
console.log('\n【设置】');
r = say(START, '一局 60 秒');
check(!!r.code && info(r.code).设置.一局几秒 === 60 && /\n  一局几秒: 60,/.test(r.code), '「一局 60 秒」→ 一局几秒: 60 → ' + r.reply);
g = runs(r.code, 0); check(get(g, '剩余帧数') === 3600 - 1, '新的一局 60 秒');
r = say(START, '一局玩四十五秒'); check(!!r.code && info(r.code).设置.一局几秒 === 45, '「一局玩四十五秒」→ 45');
r = say(START, '把一局几秒改成 20'); check(!!r.code && info(r.code).设置.一局几秒 === 20, '「把一局几秒改成 20」→ 20');
好代码(r.code, '改一局几秒');

// ================= 认不出的话 =================
console.log('\n【认不出的话】');
check(['让星星变成彩虹色', '比特会飞', '你好', '星星 3 秒掉一个', '把背景颜色改成 3'].every(p => say(START, p) === null), '认不出的话返回 null（外面说"这句我还不会"）');
check(typeof P.CAN === 'string' && /流程图/.test(P.CAN) && /商店/.test(P.CAN), 'CAN：' + P.CAN);

// ================= 乱填的表格不崩 =================
console.log('\n【乱填的表格】');
let bad = START.replace('const 流程 = [\n];', `const 流程 = [
  { 从: "天空", 按: "飞", 到: "游戏" },
  {},
  { 从: "游戏" },
  null,
  { 从: "开始画面", 到: "游戏" },
  { 从: "游戏", 按: "", 到: "商店" },
  { 从: "游戏", 按: 123, 到: "游戏" },
  "乱写",
  { 从: " 开始画面 ", 按: "开始", 到: "游戏" },
];`).replace(/const 商品们 = \[[\s\S]*?\n\];/, `const 商品们 = [
  { 名字: "火箭" },
  null,
  { 名字: "怪东西", 图案: "👾", 价钱: "很多", 效果: "飞上天" },
  { 价钱: -3 },
];`);
bad = H.helpers.setSetting(bad, '有开始画面', 'true');
bad = H.helpers.setSetting(bad, '有商店', 'true');
bad = H.helpers.setSetting(bad, '一局几秒', '"好久"');
bad = H.helpers.setSetting(bad, '背景颜色', '"紫色"');
g = runs(bad, 300);
check(!!g && 画面(g) === '开始画面' && get(g, '能走的路()').length === 2 && /看不懂/.test(get(g, '话')), '乱填的流程：跳过看不懂的行，还能跑 → ' + (g && get(g, '话')));
点按钮(g, '开始');
check(画面(g) === '游戏' && get(g, '剩余帧数') === 1800 - 1, '一局几秒乱填：用 30 秒');
let ok = true;
try {
  for (const s of ['开始画面', '游戏', '结束画面', '商店']) {
    run(g, `现在的画面 = "${s}"; 金币 = 100;`);
    for (let x = 20; x < 960; x += 60) for (let y = 20; y < 540; y += 60) { tap(g, x, y); frames(g, 1); }
    frames(g, 100);
  }
} catch (e) { ok = false; console.log('   出错：' + e.message); }
check(ok, '每个画面上到处乱点、跑几百帧，不崩');
g = runs(bad, 10); run(g, '现在的画面 = "商店"; 金币 = 100'); 点商品(g, '怪东西');
check(get(g, '已买').includes('怪东西') && /没用/.test(get(g, '话')), '不认识的效果：买了也没用，说一句 → ' + get(g, '话'));
check(get(g, '商品表()').length === 3 && get(g, '商品表()')[2].名字 === '神秘商品', '缺名字、缺价钱、价钱乱写：用默认值');
let empty = H.helpers.setSetting(START, '有开始画面', 'true').replace(/const 商品们 = \[[\s\S]*?\n\];/, 'const 商品们 = [\n];');
g = runs(empty, 100);
check(!!g && 画面(g) === '开始画面' && 按钮字(g).length === 0, '有开始画面但流程空着：停在开始画面，没有按钮（走不通）');
tap(g, 480, 470); frames(g, 1);
check(画面(g) === '开始画面' && /没有按钮/.test(get(g, '话')), '点了出不去：' + get(g, '话'));
run(g, '现在的画面 = "商店"'); frames(g, 100); tap(g, 480, 250);
check(画面(g) === '商店', '商品表空着：商店也能画、能点');

console.log(process.exitCode ? '\n有没通过的' : '\n全部通过');
