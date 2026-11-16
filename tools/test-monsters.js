// 守护狗窝（第二季第 14 课「怎么一下做出 5 种怪？」）：起始游戏 + 演示精灵规则
// 用法：node tools/test-monsters.js
'use strict';
const H = require('./s2-harness');
const { check } = H;
const start = H.starter('守护狗窝.html');
const P = H.loadPart('14-monsters');

// ---------- 小工具 ----------
const scriptOf = code => code.match(/<script>([\s\S]*)<\/script>/)[1];
function runs(code, n) {   // 能加载、能跑 n 帧不出错：返回沙盒，出错返回 null
  try { const g = H.loadGame(code); H.frames(g, n || 600); return g; } catch (e) { console.log('   出错：', e.message); return null; }
}
// 自动玩：每帧把看得见的怪都点一下；until(g) 为真就停，返回跑了几帧（没停住返回 -1）
function autoPlay(g, max, until) {
  for (let f = 1; f <= max; f++) {
    H.frames(g, 1);
    if (until && until(g)) return f;
    for (const [x, y] of H.get(g, '场上的怪.map(m => [m.x, m.y])')) if (x < 930) H.tap(g, x, y);
  }
  return -1;
}
// 记下每只怪是第几波出来的
function spy(g) { H.run(g, 'var 出场记录 = []; const 原来的出一只怪 = 出一只怪; 出一只怪 = function (种类) { 出场记录.push([第几波, 种类.名字]); return 原来的出一只怪(种类); };'); }
function formatOK(code) {   // 设置、表格的格式没被改坏，最后两行还是 开始(); 游戏循环();
  const js = scriptOf(code);
  const set = js.match(/const 设置 = \{\n([\s\S]*?)\n\};/);
  const setOK = !!set && set[1].split('\n').every(l => /^  [一-龥A-Za-z]+: [^,\n]+,\s+\/\/ \S/.test(l));
  const tables = ['怪物们', '波次们'].every(t => { const m = js.match(new RegExp('const ' + t + ' = \\[\\n?([\\s\\S]*?)\\n\\];')); return m && (m[1].trim() === '' || m[1].split('\n').every(l => /^  \{.*\},$/.test(l))); });
  return setOK && tables && /开始\(\);\n游戏循环\(\);\s*$/.test(js);
}
const monsters = code => { const g = H.loadGame(code); return H.get(g, '怪物图鉴.map(m => ({ 名字: m.名字, 图案: m.图案, 血量: m.血量, 速度: m.速度, 速度名: m.速度名, 分: m.分 }))'); };
let code;
function say(prompt, mode) {
  const r = P.run(code, prompt, mode || 'make');
  console.log(`   【${prompt.split('\n')[0]}${prompt.includes('\n') ? '…' : ''}】→ ${r ? r.reply + (r.code ? '（改了）' : '（没改）') : 'null'}`);
  return r;
}

const MON_TABLE = '照这张怪物表做怪物：\n| 名字 | 图案 | 血量 | 速度 | 打倒得几分 |\n| 小怪兽 | 👾 | 2 | 慢 | 1 |\n| 大块头 | 🦏 | 5 | 慢 | 3 |\n| 闪电鼠 | 🐭 | 1 | 快 | 2 |';
const WAVE_TABLE = '照这张波次表出怪：\n| 第几波 | 出场 |\n| 1 | 小怪兽×5 |\n| 2 | 小怪兽×5、闪电鼠×3 |\n| 3 | 大块头×2、闪电鼠×6 |';

// ======================================================
console.log('一、起始游戏的格式');
{
  const js = scriptOf(start);
  check(/<title>守护狗窝<\/title>/.test(start) && /<canvas id="game" width="960" height="540">/.test(start), '标题、960×540 画布');
  check(formatOK(start), '设置每项一行带注释；表格每行以 }, 结尾；最后两行是 开始(); 游戏循环();');
  const keys = js.match(/const 设置 = \{\n([\s\S]*?)\n\};/)[1].split('\n').map(l => l.trim().split(':')[0]);
  check(keys.every(k => (js.match(new RegExp('\\n\\s*' + k + ':', 'g')) || []).length === 1), '设置的键名在文件里只出现一次「键:」：' + keys.join('、'));
  check(js.indexOf('// ===== 游戏设置') < js.indexOf('const 怪物们 = [') && js.indexOf('const 波次们 = [') < js.indexOf('// ===== 下面是游戏程序 ====='), '设置 → 怪物表 → 波次表 → 游戏程序');
  check(!/\b(window|performance|setTimeout|setInterval|localStorage|Image|Audio)\b/.test(js), '没用 window、performance、setTimeout、setInterval、localStorage、Image、Audio');
  check(P.key === 'monsters' && P.is(start) && !P.is(H.starter('贪吃蛇.html')), 'is() 只认守护狗窝');
}

console.log('二、起始游戏能玩');
{
  const g = runs(start, 60);
  check(!!g, '能加载、跑 60 帧');
  check(H.get(g, '第几波') === 1 && H.get(g, '阶段') === '出怪' && H.get(g, '大字') === '第 1 波来了！', '开局就是第 1 波，大字「第 1 波来了！」');
  check(JSON.stringify(H.get(g, '[一共几波, 心, 分数, 设置.显示血条]')) === '[3,3,0,true]', '共 3 波、3 颗心、0 分、有血条');
  const m0 = monsters(start)[0];
  check(m0.名字 === '小怪兽' && m0.图案 === '👾' && m0.血量 === 2 && m0.速度名 === '慢' && m0.分 === 1, '怪物图鉴照怪物表：小怪兽 👾 2 血 慢 1 分');
  const 慢 = H.get(g, '(出生X - 狗窝线) / 速度表.慢 / 60'), 快 = H.get(g, '(出生X - 狗窝线) / 速度表.快 / 60');
  check(慢 > 10 && 慢 < 13 && 快 > 4 && 快 < 6, `走完全程：慢 ${慢.toFixed(1)} 秒，快 ${快.toFixed(1)} 秒`);

  // 点怪物
  H.frames(g, 120);
  const before = H.get(g, '场上的怪.length');
  const [x, y] = H.get(g, '[场上的怪[0].x, 场上的怪[0].y]');
  H.tap(g, 480, 30);
  check(H.get(g, '场上的怪[0].血') === 2, '点空的地方：怪物不掉血');
  H.tap(g, x, y);
  check(H.get(g, '场上的怪[0].血') === 1 && H.get(g, '分数') === 0, '点怪物一下：血 2 → 1');
  H.tap(g, H.get(g, '场上的怪[0].x'), y);
  check(H.get(g, '场上的怪.length') === before - 1 && H.get(g, '分数') === 1 && H.get(g, '打倒几只') === 1, '再点一下：打倒了，分数 +1');
  H.frames(g, 400);
}
{
  // 怪走到狗窝会掉心；心没了就输；点「再来一局」重开
  const g = H.loadGame(start);
  let f = 0; while (H.get(g, '心') === 3 && f < 2000) { H.frames(g, 1); f++; }
  check(H.get(g, '心') === 2 && f > 600 && f < 900, `没人打：第 ${f} 帧第一只怪进狗窝，心 3 → 2`);
  while (H.get(g, '状态') === '玩' && f < 3000) { H.frames(g, 1); f++; }
  check(H.get(g, '状态') === '输了' && H.get(g, '心') === 0 && H.get(g, '第几波') === 1, `心没了就输：守到了第 ${H.get(g, '第几波')} 波`);
  const xs = H.get(g, 'JSON.stringify(场上的怪.map(m => m.x))'); H.frames(g, 60);
  check(H.get(g, 'JSON.stringify(场上的怪.map(m => m.x))') === xs, '输了以后怪物不再走');
  H.tap(g, 100, 100);
  check(H.get(g, '状态') === '输了', '点别处不会重开');
  H.tap(g, 480, 330);
  check(H.get(g, '状态') === '玩' && H.get(g, '心') === 3 && H.get(g, '分数') === 0 && H.get(g, '场上的怪.length') === 0 && H.get(g, '第几波') === 0, '点「再来一局」：重开，3 颗心、0 分');
  H.frames(g, 100);
  check(H.get(g, '第几波') === 1 && H.get(g, '场上的怪.length') > 0, '重开以后第 1 波又来了');
}
{
  // 打完三波就赢
  const g = H.loadGame(start); spy(g);
  let rest = 0, 大字们 = [];
  const f = autoPlay(g, 6000, g => {
    if (H.get(g, '阶段') === '休息' && H.get(g, '第几波') === 1) rest++;
    const 字 = H.get(g, '大字'); if (!大字们.includes(字)) 大字们.push(字);
    return H.get(g, '状态') !== '玩';
  });
  const 记录 = H.get(g, '出场记录');
  check(f > 0 && H.get(g, '状态') === '赢了', `一直点怪物：第 ${f} 帧打完三波，赢了「守住了！」`);
  check(H.get(g, '打倒几只') === 25 && H.get(g, '分数') === 25 && H.get(g, '心') === 3 && H.get(g, '第几波') === 3, '5 + 8 + 12 = 25 只全打倒，25 分，一颗心没少');
  check([1, 2, 3].map(w => 记录.filter(r => r[0] === w).length).join() === '5,8,12', '每波出怪 5、8、12 只');
  check(rest >= 175 && rest <= 185, `两波之间休息 ${rest} 帧（3 秒）`);
  check(大字们.includes('第 2 波来了！') && 大字们.includes('第 3 波来了！'), '每波开始有大字「第 N 波来了！」');
  H.key(g, 'Enter');
  check(H.get(g, '状态') === '玩' && H.get(g, '分数') === 0, '赢了以后按回车也能再来一局');
  H.run(g, '状态 = "赢了"'); H.tap(g, 480, 330);
  check(H.get(g, '状态') === '玩', '赢了以后点「再来一局」重开');
}
{
  // 波次表改小：很快就赢
  const g = H.loadGame(start);
  H.run(g, '波次们.length = 0; 波次们.push({ 第几波: 1, 出场: "小怪兽×2" }); 开始();');
  const f = autoPlay(g, 2000, g => H.get(g, '状态') !== '玩');
  check(H.get(g, '状态') === '赢了' && H.get(g, '打倒几只') === 2 && H.get(g, '一共几波') === 1, `波次表只剩一波 2 只：第 ${f} 帧就赢了`);
}
{
  // 出场的写法、轮流出、找不到的名字
  const g = H.loadGame(start);
  H.run(g, '怪物们.push({ 名字: "大块头", 图案: "🦏", 血量: 5, 速度: "慢", 打倒得几分: 3 }, { 名字: "闪电鼠", 图案: "🐭", 血量: 1, 速度: "快", 打倒得几分: 2 }); 开始();');
  check(H.get(g, '排队("小怪兽×3、大块头×1").map(m => m.名字).join()') === '小怪兽,大块头,小怪兽,小怪兽', '一波里几种怪轮流出：小怪兽、大块头、小怪兽、小怪兽');
  check(H.get(g, 'JSON.stringify(拆出场("小怪兽x2，大块头X1+闪电鼠*3"))') === '[{"名字":"小怪兽","几只":2},{"名字":"大块头","几只":1},{"名字":"闪电鼠","几只":3}]', '× 也认 x X *，分隔也认 ，, +');
  check(H.get(g, '拆出场("小怪兽×三、大块头 2只、闪电鼠").map(x => x.几只).join()') === '3,2,1', '「×三」「2只」、不写几只当 1 只');
  check(H.get(g, '排队("火龙×2、小怪兽×1").length') === 1 && H.get(g, '话') === '没有叫「火龙」的怪物', '名字找不到就跳过，说「没有叫「火龙」的怪物」');
  check(H.get(g, '怪物图鉴.map(m => m.速度).join()') === '1.2,1.2,2.8', '速度：慢 1.2、快 2.8 像素/帧');
  // 波次表里全是找不到的名字：不崩，几波过去也能结束
  H.run(g, '波次们.length = 0; 波次们.push({ 第几波: 1, 出场: "火龙×3" }, { 第几波: 2, 出场: 123 }, null); 开始();');
  H.frames(g, 1200);
  check(H.get(g, '场上的怪.length') === 0 && ['玩', '赢了'].includes(H.get(g, '状态')), '波次表里名字全找不到、填了数字、空行：不出怪也不崩');
}
{
  // 波次表是空的：无尽模式
  const g = H.loadGame(start); spy(g);
  H.run(g, '怪物们.push({ 名字: "闪电鼠", 图案: "🐭", 血量: 1, 速度: "快", 打倒得几分: 2 }); 波次们.length = 0; 开始();');
  autoPlay(g, 5000);
  const 记录 = H.get(g, '出场记录');
  check(H.get(g, '一共几波') === 0 && H.get(g, '第几波') > 3 && H.get(g, '状态') === '玩', `波次表空着：一直来，已经到第 ${H.get(g, '第几波')} 波还没完`);
  check(记录.some(r => r[1] === '小怪兽') && 记录.some(r => r[1] === '闪电鼠'), '无尽模式里怪物表的每种怪都会出来');
}
{
  // 怪物表是空的
  const g = H.loadGame(start);
  H.run(g, '怪物们.length = 0; 开始();');
  H.frames(g, 900);
  check(H.get(g, '阶段') === '没有怪' && H.get(g, '场上的怪.length') === 0 && H.get(g, '状态') === '玩', '怪物表是空的：不出怪、不崩');
  H.run(g, '开始();');
  check(H.get(g, '话') === '怪物表是空的', '说一句「怪物表是空的」');
  H.tap(g, 500, 200); H.frames(g, 10);
  check(H.get(g, '状态') === '玩', '空表时乱点也没事');
}
{
  // 乱填的怪物表、乱填的设置
  const g = H.loadGame(start);
  H.run(g, `怪物们.length = 0;
    怪物们.push({ 名字: "乱填怪", 血量: "很多", 速度: "飞", 打倒得几分: "x" }, { 图案: "🐸" }, null, "一句话", { 名字: "数字怪", 图案: "", 血量: 0, 速度: 3, 打倒得几分: -2 }, { 名字: "中文怪", 血量: "十二", 速度: "快" });
    波次们.length = 0; 波次们.push({ 第几波: 1, 出场: "乱填怪×2、怪物2×2、数字怪×2、中文怪×1" }); 开始();`);
  const ms = H.get(g, 'JSON.stringify(怪物图鉴.map(m => [m.名字, m.图案, m.血量, m.速度, m.分]))');
  check(ms === JSON.stringify([['乱填怪', '👾', 1, 1.8, 1], ['怪物2', '🐸', 1, 1.8, 1], ['数字怪', '👾', 1, 3, 1], ['中文怪', '👾', 12, 2.8, 1]]), '填错、漏填的格子用默认值：' + ms);
  check(/看不懂/.test(H.get(g, '话')), '速度看不懂会说一句：' + H.get(g, '话'));
  const f = autoPlay(g, 3000, g => H.get(g, '状态') !== '玩');
  check(H.get(g, '状态') === '赢了' && H.get(g, '打倒几只') === 7, `乱填的表也能玩到赢（第 ${f} 帧）`);
  H.run(g, '设置.狗窝有几颗心 = "很多"; 设置.每只怪间隔几秒 = -1; 设置.每波之间休息几秒 = "x"; 设置.怪物大小 = "大"; 设置.显示血条 = false; 开始();');
  check(H.get(g, '心') === 3 && H.get(g, '每只怪的间隔()') === 72 && H.get(g, '怪物大小()') === 64, '设置乱填：心按 3 颗、间隔按 1.2 秒、大小按 64');
  check((() => { try { H.frames(g, 900); return true; } catch (e) { console.log(e); return false; } })(), '设置乱填也不崩');
  H.run(g, 'for (let i = 0; i < 20; i++) 怪物们.push({ 名字: "怪" + i, 图案: "👻", 血量: 1, 速度: "中", 打倒得几分: 1 }); 设置.狗窝有几颗心 = 12; 开始();');
  H.frames(g, 300);
  check(H.get(g, '怪物图鉴.length') === 24 && H.get(g, '心') === 12, '24 种怪（图鉴画成两排加「还有几种」）、12 颗心也能画');
}

// ======================================================
console.log('三、演示精灵');
code = start;
{
  // 1. 怪物表
  let r = say(MON_TABLE);
  check(r && r.code && formatOK(r.code), '照怪物表改了代码，格式没坏');
  code = r.code;
  const ms = monsters(code);
  check(ms.map(m => m.名字).join() === '小怪兽,大块头,闪电鼠' && ms[1].血量 === 5 && ms[1].分 === 3 && ms[1].图案 === '🦏' && ms[2].速度 === 2.8 && ms[2].分 === 2, '怪物表换成 3 种：大块头 5 血 3 分，闪电鼠快');
  check(r.reply.startsWith('照表做好了 3 种怪：大块头最难打，闪电鼠最快。'), '回复「照表做好了 3 种怪：大块头最难打，闪电鼠最快。」');
  check(/还没写进波次表/.test(r.reply), '提醒新怪还没写进波次表');
  check(!!runs(code, 600), '改完能跑');

  // 列的顺序不同、少列、全角｜、分隔线、空格
  r = say('照这张怪物表做怪物：\n｜ 血量 ｜ 名字 ｜  速度 ｜\n|---|---|---|\n｜ 3 ｜ 石头人 ｜ 慢 ｜\n｜  1 ｜ 小飞虫｜快｜');
  let m2 = r && r.code && monsters(r.code);
  check(m2 && m2.length === 2 && m2[0].名字 === '石头人' && m2[0].血量 === 3 && m2[0].速度名 === '慢' && m2[0].图案 === '👾' && m2[0].分 === 1 && m2[1].速度名 === '快', '列的顺序不同、少列、全角｜：照样做，少的列用默认值');
  check(/没有「图案」「打倒得几分」/.test(r.reply), '回复点出少了哪几列');
  check(!!runs(r.code, 600), '改完能跑');

  // 填不懂的格子
  r = say('照这张怪物表做怪物：\n| 名字 | 图案 | 血量 | 速度 | 打倒得几分 |\n| 乱乱 | 老虎 | 很多 | 飞 | 好多 |\n| 巨人 | ab | 50 | 3 | 30 |\n|  | 🐸 | 1 | 慢 | 1 |\n| 巨人 | 🐸 | 1 | 慢 | 1 |');
  m2 = r && r.code && monsters(r.code);
  check(m2 && m2.length === 2 && m2[0].图案 === '🐯' && m2[0].血量 === 1 && m2[0].速度名 === '中' && m2[0].分 === 1, '看不懂的格子用默认值：乱乱 1 血、中速、1 分（「老虎」换成 🐯）');
  check(m2 && m2[1].图案 === '👾' && m2[1].血量 === 20 && m2[1].速度 === 3 && m2[1].分 === 20, '血量、分数最多 20；速度写数字也认');
  check(/看不懂/.test(r.reply), '回复点出看不懂的格子：' + r.reply);
  check(!!runs(r.code, 600), '改完能跑');

  r = say('照这张怪物表做怪物：\n| 名字 | 图案 | 血量 | 速度 | 打倒得几分 |');
  check(r && !r.code, '只有表头的空表：不改，让孩子先填');
  r = say('| a | b |\n| 1 | 2 |');
  check(r && !r.code, '看不懂的表：不改，说清表头要写什么');
  r = say('照这张怪物表做怪物');
  check(r && !r.code, '说了「怪物表」却没贴表：不改，让孩子把表发来');
}
{
  // 2. 波次表
  let r = say(WAVE_TABLE);
  check(r && r.code && formatOK(r.code), '照波次表改了代码');
  code = r.code;
  const g = H.loadGame(code); spy(g);
  check(H.get(g, '波次们.map(w => w.出场).join("|")') === '小怪兽×5|小怪兽×5、闪电鼠×3|大块头×2、闪电鼠×6', '波次表整张换掉');
  check(/照表排好了 3 波，一共 21 只怪/.test(r.reply) && !/没有/.test(r.reply), '回复：排好了 3 波、21 只');
  autoPlay(g, 6000, g => H.get(g, '状态') !== '玩');
  const 记录 = H.get(g, '出场记录');
  const w2 = 记录.filter(x => x[0] === 2).map(x => x[1]);
  check(H.get(g, '状态') === '赢了' && 记录.length === 21, '照新波次表玩：21 只打完就赢');
  check(w2.filter(n => n === '闪电鼠').length === 3 && w2.slice(0, 4).join() === '小怪兽,闪电鼠,小怪兽,闪电鼠', '第 2 波：小怪兽和闪电鼠轮流出，闪电鼠 3 只');
  check(记录.filter(x => x[0] === 3).map(x => x[1]).slice(0, 3).join() === '大块头,闪电鼠,大块头', '第 3 波：大块头、闪电鼠轮流出');

  r = say('照这张波次表出怪：\n| 出场 | 第几波 |\n| 小怪兽×2、火龙×2 | 1 |\n| 喷火龙x3 | 2 |');
  check(r && r.code && /「火龙」「喷火龙」在怪物表里没有，那几只不会出来/.test(r.reply), '波次表里有怪物表里没有的名字：照做，但提醒');
  const g2 = runs(r.code, 10);
  check(g2 && H.get(g2, '波次们[0].出场') === '小怪兽×2、火龙×2' && autoPlay(g2, 3000, g => H.get(g, '状态') !== '玩') > 0 && H.get(g2, '打倒几只') === 2, '列的顺序反过来也认；找不到的怪跳过，照样能玩完');

  r = say('照这张波次表出怪：\n| 第几波 | 出场 |');
  check(r && !r.code, '空的波次表：不改');
  // 两张表一起给
  const both = P.run(start, MON_TABLE + '\n照这张波次表出怪：\n| 第几波 | 出场 |\n| 1 | 大块头×1、闪电鼠×2 |', 'make');
  const g3 = both && both.code && runs(both.code, 10);
  check(g3 && H.get(g3, '怪物图鉴.length') === 3 && H.get(g3, '一共几波') === 1 && /照表做好了 3 种怪/.test(both.reply) && /排好了 1 波/.test(both.reply), '怪物表、波次表一起给：两张都换掉');
  // 默认怪物表只有小怪兽，直接给波次表
  const only = P.run(start, WAVE_TABLE, 'make');
  check(only && only.code && /「闪电鼠」「大块头」在怪物表里没有/.test(only.reply) && !!runs(only.code, 600), '先给波次表：提醒闪电鼠、大块头还没做');
}
{
  // 3. 给样例，照着做一批
  const base = code;
  let r = say('照着小怪兽的样子，再做 4 种怪，一种比一种难打');
  let ms = r && r.code && monsters(r.code);
  const neu = ms ? ms.slice(3) : [];
  check(neu.length === 4 && formatOK(r.code), '加了 4 种新怪');
  check(neu.every((m, i) => m.血量 === 3 + i && m.分 === 2 + i && m.速度名 === '慢'), '一种比一种难打：血量 3、4、5、6，分数也递增，速度照样例');
  check(new Set(ms.map(m => m.名字)).size === ms.length && new Set(ms.map(m => m.图案)).size === ms.length, '名字、图案都不重复');
  check(/^照着小怪兽做了 4 种：🐙章鱼怪 3 血、🦂蝎子怪 4 血/.test(r.reply), '回复列出新怪');
  check(!!runs(r.code, 600), '改完能跑');
  code = r.code;

  r = say('像大块头那样，再做三种怪');
  ms = r && r.code && monsters(r.code).slice(7);
  check(ms && ms.length === 3 && new Set(ms.map(m => m.速度名)).size > 1 && new Set(ms.map(m => m.血量)).size > 1 && ms.every(m => m.分 >= 1), '像大块头那样做 3 种：有快有慢、血量有高有低');
  check(!!runs(r.code, 600), '改完能跑');

  r = P.run(base, '仿照小怪兽，做 5 种不一样的怪物', 'make');
  console.log('   【仿照小怪兽，做 5 种不一样的怪物】→ ' + r.reply);
  ms = r && r.code && monsters(r.code).slice(3);
  check(ms && ms.length === 5 && new Set(ms.map(m => m.速度名)).size === 3, '仿照小怪兽做 5 种：慢中快都有');

  r = P.run(base, '照着闪电鼠，再做 2 种跑得快的怪', 'make');
  ms = r && r.code && monsters(r.code).slice(3);
  check(ms && ms.length === 2 && ms.every(m => m.速度名 === '快'), '话里有「快」：做出来的怪都偏快');

  r = P.run(base, '照着小怪兽再做 20 种怪', 'make');
  check(r && r.code && monsters(r.code).length === 11 && /最多做 8 种/.test(r.reply), '一次最多做 8 种');

  // 波次表加上新怪，新怪真的会出来
  const g = runs(code, 1);
  const r2 = P.run(code, '照这张波次表出怪：\n| 第几波 | 出场 |\n| 1 | 章鱼怪×1、幽灵×1 |', 'make');
  const g2 = H.loadGame(r2.code); spy(g2);
  autoPlay(g2, 3000, g => H.get(g, '状态') !== '玩');
  check(g && H.get(g2, '出场记录').map(x => x[1]).join() === '章鱼怪,幽灵' && H.get(g2, '分数') === 2 + 5, '新怪写进波次表就会出场：打倒章鱼怪 2 分 + 幽灵 5 分');
}
{
  // 4. 只说一句：照做，但全抄第一种
  const base = code;
  let r = say('再加 5 种怪');
  check(r && r.reply === '加了 5 种怪，都是照小怪兽做的，血量、速度都一样。是你想要的吗？', '回复「加了 5 种怪，都是照小怪兽做的，血量、速度都一样。是你想要的吗？」');
  const all = r.code && monsters(r.code), first = all[0], neu = all.slice(-5);
  check(neu.length === 5 && new Set(neu.map(m => m.名字)).size === 5 && neu.every(m => m.名字 !== first.名字), '5 种新怪，名字都不同');
  check(neu.every(m => m.图案 === first.图案 && m.血量 === first.血量 && m.速度 === first.速度 && m.分 === first.分), '图案、血量、速度、分数全照抄第一种怪');
  check(!!runs(r.code, 600) && formatOK(r.code), '改完能跑');
  r = P.run(base, '多做几种怪物', 'make');
  check(r && r.code && monsters(r.code).length === monsters(base).length + 3 && /是你想要的吗/.test(r.reply), '「多做几种怪物」：加 3 种，一样平庸');
  const empty = start.replace(/const 怪物们 = \[[\s\S]*?\n\];/, 'const 怪物们 = [\n];');
  r = P.run(empty, '再加 2 种怪', 'make');
  check(r && r.code && monsters(r.code).length === 2 && !!runs(r.code, 300), '怪物表是空的时候也能加（用默认的 👾）');
}
{
  // 5. 改一种怪的一个属性
  const line = (c, n) => c.split('\n').find(l => l.includes('名字: "' + n + '"'));
  const others = (a, b, n) => a.split('\n').filter(l => /名字:/.test(l) && !l.includes('名字: "' + n + '"')).join() === b.split('\n').filter(l => /名字:/.test(l) && !l.includes('名字: "' + n + '"')).join();
  let r = say('大块头的血量改成 8');
  check(r && r.code && /血量: 8/.test(line(r.code, '大块头')) && others(code, r.code, '大块头') && !!runs(r.code, 300), '大块头的血量 5 → 8，别的行不动');
  code = r.code;
  r = say('把闪电鼠变慢');
  check(r && r.code && /速度: "中"/.test(line(r.code, '闪电鼠')) && others(code, r.code, '闪电鼠'), '把闪电鼠变慢：快 → 中');
  code = r.code;
  r = say('小怪兽打倒得 3 分');
  check(r && r.code && /打倒得几分: 3/.test(line(r.code, '小怪兽')) && others(code, r.code, '小怪兽'), '小怪兽打倒得 3 分');
  code = r.code;
  r = say('把小怪兽的图案换成 🐸');
  check(r && r.code && /图案: "🐸"/.test(line(r.code, '小怪兽')) && others(code, r.code, '小怪兽'), '小怪兽的图案换成 🐸');
  code = r.code;
  {
    const g = H.loadGame(code);
    H.frames(g, 120);
    const m = H.get(g, '场上的怪[0]');
    check(m.种类.图案 === '🐸' && m.满血 === 2, '游戏里出来的小怪兽是 🐸');
    for (let i = 0; i < 2; i++) H.tap(g, H.get(g, '场上的怪[0].x'), m.y);
    check(H.get(g, '分数') === 3, '打倒小怪兽得 3 分');
  }
  r = say('闪电鼠速度改成 3');
  check(r && r.code && /速度: 3/.test(line(r.code, '闪电鼠')) && monsters(r.code)[2].速度 === 3, '速度也能写数字');
  r = say('大块头要打 30 下');
  check(r && r.code && /血量: 20/.test(line(r.code, '大块头')) && /最多 20/.test(r.reply), '血量最多 20');
  const ghost = P.run(start, '大块头的血量改成 8', 'make');
  check(ghost && !ghost.code && /没有「大块头」/.test(ghost.reply), '说了表里没有的怪（起始游戏里没有大块头）：不改错别的怪 → ' + (ghost && ghost.reply));
  const solo = P.run(start, '怪物走快一点', 'make');
  check(solo && solo.code && monsters(solo.code)[0].速度名 === '中', '只有一种怪时，「怪物走快一点」就改它：慢 → 中');
  r = say('血量改成 5');
  check(r && !r.code && /改哪种怪/.test(r.reply), '没说哪种怪：反问');
  r = say('所有怪的血量都改成 3');
  check(r && r.code && monsters(r.code).every(m => m.血量 === 3) && /种怪血量都改成 3/.test(r.reply), '「所有怪」：每一行都改');
  r = say('不要闪电鼠了');
  check(r && r.code && !monsters(r.code).some(m => m.名字 === '闪电鼠') && /「闪电鼠」在怪物表里没有/.test(r.reply) && !!runs(r.code, 600), '删掉闪电鼠：提醒波次表里还有它，游戏照样能跑');
}
{
  // 6. 设置
  const set = (c, k) => H.get(H.loadGame(c), '设置.' + k);
  let r = say('狗窝有 5 颗心');
  check(r && r.code && set(r.code, '狗窝有几颗心') === 5 && H.get(runs(r.code, 10), '心') === 5, '狗窝有 5 颗心');
  code = r.code;
  r = say('每波之间休息 5 秒');
  check(r && r.code && set(r.code, '每波之间休息几秒') === 5 && H.get(runs(r.code, 1), '休息几帧()') === 300, '每波之间休息 5 秒（300 帧）');
  code = r.code;
  r = say('不要血条');
  check(r && r.code && set(r.code, '显示血条') === false && !!runs(r.code, 600), '不要血条');
  code = r.code;
  r = say('每只怪间隔 2 秒');
  check(r && r.code && set(r.code, '每只怪间隔几秒') === 2 && H.get(runs(r.code, 1), '每只怪的间隔()') === 120, '每只怪间隔 2 秒');
  code = r.code;
  r = say('怪出得快一点');
  check(r && r.code && set(r.code, '每只怪间隔几秒') < 2, '怪出得快一点：间隔变短');
  r = say('把草地换成蓝色');
  check(r && r.code && set(r.code, '背景颜色') === '#BDE6FF', '草地换颜色');
  r = say('把怪物大小改成 80');
  check(r && r.code && set(r.code, '怪物大小') === 80, '怪物大小改成 80');
  check(formatOK(code), '改了几次设置，格式还对');
}
{
  // 7. 认不出的话、抓虫模式
  check(P.run(code, '让怪物会飞', 'make') === null && P.run(code, '你好', 'make') === null && P.run(code, '', 'make') === null, '认不出的话返回 null');
  const r = P.run(start, MON_TABLE, 'bug');
  check(r && r.code && monsters(r.code).length === 3, '抓虫模式：照平常处理');
  console.log('   CAN：' + P.CAN);
}
{
  // 一连串改下来，最后的游戏还能从头玩到尾
  const g = H.loadGame(code);
  H.run(g, '设置.每波之间休息几秒 = 0.5;');
  const f = autoPlay(g, 8000, g => H.get(g, '状态') !== '玩');
  check(f > 0 && H.get(g, '状态') === '赢了', `改了一堆以后，游戏还能玩到赢（第 ${f} 帧，${H.get(g, '分数')} 分）`);
}

console.log(process.exitCode ? '\n有没通过的' : '\n全部通过');
