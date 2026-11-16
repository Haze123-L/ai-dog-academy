// ================= 演示精灵：没接大模型时用 =================
// 只认识课上常用的几十句话，直接改起始游戏的代码。课上示范、断网、试玩版都靠它兜底。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./mock-s2.js'));
  else root.MockGenie = factory(root.MockS2);
})(typeof self !== 'undefined' ? self : this, function (S2PARTS) {
  'use strict';

  // ---------- 改代码的小工具 ----------
  const hasSetting = (code, key) => new RegExp('\\n\\s*' + key + ':\\s').test(code);
  function setSetting(code, key, val, note) {
    const re = new RegExp('(\\n\\s*' + key + ':\\s*)([^,\\n]+)(,)');
    if (re.test(code)) return code.replace(re, (m, a, b, c) => a + val + c);
    // 设置里没有这一项：加在「设置」最后
    return code.replace(/(const 设置 = \{[\s\S]*?)(\n\};)/, (m, a, b) => `${a}\n  ${key}: ${val},${note ? ' '.repeat(Math.max(1, 20 - key.length * 2 - String(val).length)) + '// ' + note : ''}${b}`);
  }
  function addItem(code, list, item) {
    const re = new RegExp('(const ' + list + ' = \\[[\\s\\S]*?)(\\n\\];)');
    return code.replace(re, (m, a, b) => a + '\n  ' + item + b);
  }
  function blockRe(name) { return new RegExp('\\n// ===== 精灵加的：' + name + ' =====[\\s\\S]*?// ===== ' + name + '结束 =====\\n'); }
  function upsertBlock(code, name, body) {
    const block = `\n// ===== 精灵加的：${name} =====\n${body.trim()}\n// ===== ${name}结束 =====\n`;
    if (blockRe(name).test(code)) return code.replace(blockRe(name), block);
    const i = code.lastIndexOf('游戏循环();');
    if (i < 0) return null;
    return code.slice(0, i) + block.slice(1) + code.slice(i);
  }
  const removeBlock = (code, name) => code.replace(blockRe(name), '\n');
  function rep(code, find, to) { return code.includes(find) ? code.replace(find, to) : null; }
  const gameOf = code => (code.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const CN_NUM0 = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  // 第二季各节课的规则（mock-s2/*.js）用的小工具
  const helpers = { setSetting, addItem, upsertBlock, removeBlock, rep, hasSetting, gameOf, toNum: s => CN_NUM0[s] != null ? CN_NUM0[s] : +s, NUM: '(\\d+|[零一两二三四五六七八九十])' };
  const PARTS = (S2PARTS || []).map(f => f(helpers));
  const partOf = code => PARTS.find(P => { try { return P.is(code); } catch (e) { return false; } }) || null;

  const HEROES = { 兔子: '🐰', 小兔: '🐰', 猫: '🐱', 小猫: '🐱', 恐龙: '🦖', 狗: '🐶', 熊猫: '🐼', 老虎: '🐯', 狐狸: '🦊', 青蛙: '🐸', 企鹅: '🐧', 独角兽: '🦄', 机器人: '🤖', 猴子: '🐵', 小鸡: '🐥', 鲨鱼: '🦈' };
  const FOODS = { 甜甜圈: '🍩', 汉堡: '🍔', 西瓜: '🍉', 蛋糕: '🍰', 冰淇淋: '🍦', 披萨: '🍕', 苹果: '🍎', 香蕉: '🍌', 鱼: '🐟', 肉: '🍖', 糖: '🍬', 草莓: '🍓', 饼干: '🍪', 鸡腿: '🍗', 薯条: '🍟' };
  const findKey = (p, map) => Object.keys(map).sort((a, b) => b.length - a.length).find(k => p.includes(k));

  // ---------- 比特跑酷的积木 ----------
  const LASER = auto => `
let 激光们 = [];
let 激光冷却 = 0;
let 激光计时 = 0;
const 激光按钮 = { x: W - 90, y: H - 80, 半径: 52 };
function 发射激光() {
  if (状态 !== "跑" || 激光冷却 > 0) return;
  激光冷却 = 15;
  const s = 设置.主角大小 / 100;
  const 眼睛 = { x: 狗.x + 50 * s, y: 狗.y - 92 * s };
  let 打中 = null;
  for (const 东西 of 路上) {
    if (东西.碰到会 === "撞倒" && !东西.撞过 && 东西.x > 眼睛.x && 狗.y > 地面Y - 120 && (!打中 || 东西.x < 打中.x)) 打中 = 东西;
  }
  let 终点 = { x: W, y: 眼睛.y };
  if (打中) { 打中.不见了 = true; 终点 = { x: 打中.x, y: 地面Y - 28 }; ${auto ? '' : '分数 += 1; '}飘字(${auto ? '"砰！"' : '"碎了！+1"'}, 打中.x, 地面Y - 100, "#E5484D"); }
  激光们.push({ x1: 眼睛.x, y1: 眼睛.y, x2: 终点.x, y2: 终点.y, 寿命: 12 });
}
const 激光前的更新 = 更新;
更新 = function () {
  激光前的更新();
  if (激光冷却 > 0) 激光冷却--;
${auto ? '  激光计时++;\n  if (状态 === "跑" && 激光计时 % 45 === 0) 发射激光();   // 自动一直发射' : ''}
};
const 激光前的画 = 画;
画 = function () {
  激光前的画();
  for (const 光 of 激光们) {
    ctx.globalAlpha = 光.寿命 / 12;
    ctx.strokeStyle = "#FF2D55"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(光.x1, 光.y1); ctx.lineTo(光.x2, 光.y2); ctx.stroke();
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(光.x1, 光.y1); ctx.lineTo(光.x2, 光.y2); ctx.stroke();
    ctx.globalAlpha = 1; 光.寿命--;
  }
  激光们 = 激光们.filter(光 => 光.寿命 > 0);
${auto ? '' : `  if (状态 === "跑") {
    ctx.fillStyle = 激光冷却 > 0 ? "rgba(229,72,77,0.5)" : "#E5484D";
    ctx.beginPath(); ctx.arc(激光按钮.x, 激光按钮.y, 激光按钮.半径, 0, Math.PI * 2); ctx.fill();
    画文字("激光", 激光按钮.x, 激光按钮.y, 28, "#FFFFFF");
  }`}
};
${auto ? '' : `// 点激光按钮发射；点别的地方还是跳
canvas.addEventListener("pointerdown", e => {
  if (状态 !== "跑") return;
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (Math.hypot(x - 激光按钮.x, y - 激光按钮.y) < 激光按钮.半径 + 10) { e.stopImmediatePropagation(); 发射激光(); }
}, true);
document.addEventListener("keydown", e => { if (e.key === "l" || e.key === "L") 发射激光(); });`}`;

  const DOUBLE_JUMP = `
let 跳了几次 = 0;
const 二段跳前的按下 = 按下;
按下 = function () {
  if (状态 !== "跑") { 跳了几次 = 0; 二段跳前的按下(); return; }
  if (狗.y >= 地面Y) 跳了几次 = 0;
  if (跳了几次 < 2) { 狗.vy = -设置.跳跃力气; 跳了几次++; }
};
canvas.removeEventListener("pointerdown", 二段跳前的按下);
canvas.addEventListener("pointerdown", () => 按下());`;

  // ---------- 各个游戏认识的话 ----------
  const RUNNER = [
    { k: /激光/, f: (c, p) => { const btn = /按钮|按一下|一按|点一下|点|按/.test(p); c = setSetting(c, '显示分数', 'true'); return { code: upsertBlock(c, '激光', LASER(!btn)), reply: btn ? '加好了！右下角有个红色激光按钮，一按就发射，打碎仙人掌加 1 分。' : '加了激光！它会自动一直发射。是你想的样子吗？' }; } },
    { k: /二段跳|跳两次|连跳/, f: c => ({ code: upsertBlock(c, '二段跳', DOUBLE_JUMP), reply: '加好了！在空中再点一下，比特能再跳一次。' }) },
    { k: /电池|耗电|没电|充电|电量/, f: c => { c = setSetting(c, '电量', 'true'); if (!c.includes('"电池"')) c = addItem(c, '路上的东西', '{ 名字: "电池", 图案: "🔋", 碰到会: "吃掉", 加电量: 30, 出现机会: 1 },'); return { code: c, reply: '比特跑步会耗电了！吃到电池能充电，电用完游戏结束。' }; } },
    { k: /太空|宇宙|星星/, f: c => ({ code: setSetting(c, '背景', '"太空"'), reply: '换到太空了，有星星和星球。' }) },
    { k: /晚上|夜晚|黑夜/, f: c => ({ code: setSetting(c, '背景', '"夜晚"'), reply: '天黑了，月亮出来了。' }) },
    { k: /白天/, f: c => ({ code: setSetting(c, '背景', '"白天"'), reply: '变回白天了。' }) },
    { k: /蘑菇/, f: c => ({ code: c.replace(/\{ 名字: "仙人掌", 图案: "🌵"/, '{ 名字: "蘑菇", 图案: "🍄"'), reply: '仙人掌变成蘑菇了，还是要跳过去。' }) },
    { k: new RegExp(Object.keys(FOODS).join('|') + '|好吃的'), f: (c, p) => { const n = findKey(p, FOODS) || '甜甜圈'; c = setSetting(c, '显示分数', 'true'); c = addItem(c, '路上的东西', `{ 名字: "${n}", 图案: "${FOODS[n]}", 碰到会: "吃掉", 加分: 5, 出现机会: 1 },`); return { code: c, reply: `路上有${n}了，吃一个加 5 分。` }; } },
    { k: new RegExp('主角|变成|换成'), test: p => !!findKey(p, HEROES), f: (c, p) => { const n = findKey(p, HEROES); return { code: setSetting(c, '主角', `"${HEROES[n]}"`), reply: `主角变成${n}了！` }; } },
    { k: /生命|几条命|三条命|3 条命/, f: c => ({ code: setSetting(c, '生命', '3'), reply: '现在有 3 条命，撞到扣一条。' }) },
    { k: /倒计时|计时|60 秒|六十秒/, f: c => ({ code: setSetting(c, '倒计时', '60'), reply: '加了 60 秒倒计时，时间到游戏结束。' }) },
    { k: /越来越快|加速/, f: c => ({ code: setSetting(c, '越来越快', 'true'), reply: '每得 5 分，比特就跑快一点。' }) },
    { k: /分数|计分|加分/, f: c => ({ code: setSetting(c, '显示分数', 'true'), reply: '左上角显示分数了，跳过一个加 1 分。' }) },
    { k: /跳得?高/, f: c => ({ code: setSetting(c, '跳跃力气', '20'), reply: '比特跳得更高了。' }) }
  ];
  const RUNNER_FIX = [   // 有虫版和捣蛋卡：说清楚了才修
    { k: /电池.*(少|减|掉|没)|电.*(反而|变少|越吃越少)/, f: c => { const n = rep(c, '当前电量 - 东西.加电量', '当前电量 + 东西.加电量'); return n ? { code: n, reply: '找到漏电虫了：吃电池时写成了减号。改好了，再测一遍！' } : null; } },
    { k: /飞|下不来|不下来|落不下|飘|太空虫|跳.*(好久|半天)/, f: c => { let n = rep(c, '设置.重力 / 10', '设置.重力'); if (n) return { code: n, reply: '找到太空虫了：重力被除以 10。改好了，再跳一下试试！' }; if (/重力:\s*0\.1,/.test(c)) return { code: setSetting(c, '重力', '0.8'), reply: '重力被改得太小了，改回 0.8，比特会马上落下来。' }; return null; } },
    { k: /撞.*(没事|没反应|穿过|不会|没有)|穿墙|不会撞倒/, f: c => { let n = rep(c, 'if (东西.碰到会 === "撞到") {', 'if (东西.碰到会 === "撞倒") {'); if (n) return { code: n, reply: '找到穿墙虫了：「撞倒」写成了「撞到」。改好了！' }; n = rep(c, '东西.撞过 = true; return;', '东西.撞过 = true;'); return n ? { code: n, reply: '修好了，撞到仙人掌又会摔倒了。' } : null; } },
    { k: /跳不(高|起来)|跳得?(好)?低|跳一点点/, f: c => /跳跃力气:\s*5,/.test(c) ? { code: setSetting(c, '跳跃力气', '16'), reply: '跳跃力气被改成 5 了，改回 16。' } : null },
    { k: /太快|快得|跑得飞快/, f: c => /奔跑速度:\s*25,/.test(c) ? { code: setSetting(c, '奔跑速度', '6'), reply: '奔跑速度被改成 25 了，改回 6。' } : null },
    { k: /太大|好大|大小/, f: c => /主角大小:\s*250,/.test(c) ? { code: setSetting(c, '主角大小', '90'), reply: '主角被改得太大了，改回 90。' } : null },
    { k: /看不见|隐形|不见了/, f: c => { const n = rep(c, 'for (const 东西 of 路上) if (东西.碰到会 !== "撞倒") 画表情(', 'for (const 东西 of 路上) 画表情('); return n ? { code: n, reply: '要跳的东西被藏起来了，现在又画出来了。' } : null; } },
    { k: /不跳|跳不了|点了没反应|点.*没用/, f: c => { const n = rep(c, '// if (狗.y >= 地面Y) 狗.vy = -设置.跳跃力气;', 'if (狗.y >= 地面Y) 狗.vy = -设置.跳跃力气;'); return n ? { code: n, reply: '点屏幕会跳了，刚才跳的那行被关掉了。' } : null; } },
    { k: /电池.*(撞|倒)|撞.*电池/, f: c => { const n = c.replace(/\{ 名字: "仙人掌", 图案: "🔋"/, '{ 名字: "仙人掌", 图案: "🌵"'); return n !== c ? { code: n, reply: '仙人掌被画成了电池，现在改回仙人掌。' } : null; } }
  ];
  const TRICKS = [
    { k: /跳跃力气.*5/, f: c => setSetting(c, '跳跃力气', '5') },
    { k: /重力.*0\.1/, f: c => setSetting(c, '重力', '0.1') },
    { k: /奔跑速度.*25/, f: c => setSetting(c, '奔跑速度', '25') },
    { k: /主角大小.*250/, f: c => setSetting(c, '主角大小', '250') },
    { k: /隐形/, f: c => rep(c, 'for (const 东西 of 路上) 画表情(', 'for (const 东西 of 路上) if (东西.碰到会 !== "撞倒") 画表情(') },
    { k: /不会撞倒/, f: c => rep(c, '东西.撞过 = true;\n', '东西.撞过 = true; return;\n') },
    { k: /不要跳/, f: c => rep(c, '  if (狗.y >= 地面Y) 狗.vy = -设置.跳跃力气;', '  // if (狗.y >= 地面Y) 狗.vy = -设置.跳跃力气;') },
    { k: /画成电池/, f: c => c.replace(/\{ 名字: "仙人掌", 图案: "🌵"/, '{ 名字: "仙人掌", 图案: "🔋"') }
  ];

  const CATCH_NIGHT = c => {
    c = setSetting(c, '背景颜色', '"#1E2A4A"'); c = setSetting(c, '地面颜色', '"#3B4B6E"');
    const n = rep(c, '  ctx.fillStyle = 设置.地面颜色; ctx.fillRect(0, H - 地面高度, W, 地面高度);',
      '  if (设置.背景颜色 === "#1E2A4A") { ctx.fillStyle = "#FFFFFF"; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % 400, 3, 3); ctx.fillStyle = "#FFF3C4"; ctx.beginPath(); ctx.arc(840, 80, 34, 0, Math.PI * 2); ctx.fill(); }   // 星星和月亮\n  ctx.fillStyle = 设置.地面颜色; ctx.fillRect(0, H - 地面高度, W, 地面高度);');
    return n || c;
  };
  const CATCH_TIMER = c => {
    if (c.includes('剩余时间')) return setSetting(c, '倒计时', '60');
    c = setSetting(c, '倒计时', '60', '游戏时间（秒）');
    c = c.replace('let 帧数 = 0;', 'let 帧数 = 0;\nlet 剩余时间 = 设置.倒计时;   // 精灵加的：还剩几秒\nlet 时间到了 = false;');
    c = c.replace('function 游戏循环() {\n  帧数++;', `function 游戏循环() {
  帧数++;
  if (设置.倒计时 > 0 && !时间到了) { 剩余时间 -= 1 / 60; if (剩余时间 <= 0) { 剩余时间 = 0; 时间到了 = true; } }
  if (时间到了) {
    ctx.fillStyle = "rgba(30,42,74,0.6)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 64px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("时间到！得分 " + 分数, W / 2, H / 2 - 20);
    ctx.font = "bold 30px sans-serif"; ctx.fillText("点一下，再来一次", W / 2, H / 2 + 50);
    requestAnimationFrame(游戏循环); return;
  }`);
    c = c.replace('  ctx.fillText("分数 " + 分数, 24, 20);', '  ctx.fillText("分数 " + 分数, 24, 20);\n  if (设置.倒计时 > 0) { ctx.textAlign = "right"; ctx.fillText("还剩 " + Math.ceil(剩余时间) + " 秒", W - 24, 20); }');
    c = c.replace('canvas.addEventListener("pointerdown", 移动到);', 'canvas.addEventListener("pointerdown", e => { if (时间到了) { 时间到了 = false; 剩余时间 = 设置.倒计时; 分数 = 0; 天上 = []; return; } 移动到(e); });');
    return c;
  };
  const CATCH = [
    { k: /晚上|夜晚|黑夜|星星|月亮/, f: c => ({ code: CATCH_NIGHT(c), reply: '天黑了，有星星和月亮。' }) },
    { k: /炸弹/, f: c => ({ code: addItem(c, '掉下来的东西', '{ 名字: "炸弹", 图案: "💣", 接到加几分: -3, 出现机会: 1 },'), reply: '天上开始掉炸弹了，接到扣 3 分，要躲开！' }) },
    { k: /长大|变大/, f: c => { if (!c.includes('"电池"')) c = addItem(c, '掉下来的东西', '{ 名字: "电池", 图案: "🔋", 接到加几分: 1, 出现机会: 1 },'); const n = rep(c, '  分数 += 东西.接到加几分;', '  分数 += 东西.接到加几分;\n  if (东西.名字 === "电池") 设置.主角大小 = Math.min(170, 设置.主角大小 + 6);   // 精灵加的：接到电池长大'); return { code: n || c, reply: '接到电池，比特会长大一点。' }; } },
    { k: /倒计时|计时|时间到|60 秒/, f: c => ({ code: CATCH_TIMER(c), reply: '加了 60 秒倒计时，右上角能看到还剩几秒。' }) },
    { k: /越来越(难|快)|变难/, f: c => { const n = rep(c, '  分数 += 东西.接到加几分;', '  分数 += 东西.接到加几分;\n  if (分数 > 0 && 分数 % 5 === 0) 设置.掉落速度 += 0.5;   // 精灵加的：越玩越快'); return { code: n || c, reply: '每得 5 分，东西就掉得快一点。' }; } },
    { k: new RegExp(Object.keys(FOODS).join('|')), f: (c, p) => { const n = findKey(p, FOODS); const add = /加|再|还有|多/.test(p) && !/变成|换成|变/.test(p); if (!add && c.includes('名字: "骨头"')) return { code: c.replace('{ 名字: "骨头", 图案: "🦴"', `{ 名字: "${n}", 图案: "${FOODS[n]}"`), reply: `骨头变成${n}了！` }; return { code: addItem(c, '掉下来的东西', `{ 名字: "${n}", 图案: "${FOODS[n]}", 接到加几分: 1, 出现机会: 1 },`), reply: `天上也会掉${n}了。` }; } },
    { k: /主角|变成|换成/, test: p => !!findKey(p, HEROES), f: (c, p) => { const n = findKey(p, HEROES); return { code: setSetting(c, '主角', `"${HEROES[n]}"`), reply: `主角变成${n}了！` }; } },
    { k: /快一点|掉得快/, f: c => ({ code: setSetting(c, '掉落速度', '5'), reply: '东西掉得更快了。' }) }
  ];
  const WHACK = [
    { k: /分数|计分/, f: c => ({ code: setSetting(c, '显示分数', 'true'), reply: '上面显示分数了，抓到一只毛毛虫 +1。' }) },
    { k: /倒计时|计时|60 秒|时间到/, f: c => ({ code: setSetting(c, '倒计时', '60'), reply: '加了 60 秒倒计时，时间到游戏结束。' }) },
    { k: /蚊子/, f: c => ({ code: addItem(c, '会冒出来的东西', '{ 名字: "蚊子", 图案: "蚊子", 点到加几分: 5, 出现机会: 1 },'), reply: '蚊子来了，抓到 +5！' }) },
    { k: /蝴蝶/, f: c => ({ code: addItem(c, '会冒出来的东西', '{ 名字: "蝴蝶", 图案: "蝴蝶", 点到加几分: -3, 出现机会: 1 },'), reply: '加了蝴蝶，它不能点，点了 −3。' }) },
    { k: /闹钟|加时间|多 ?5 秒/, f: c => { c = c.includes('倒计时: 0,') ? setSetting(c, '倒计时', '60') : c; return { code: addItem(c, '会冒出来的东西', '{ 名字: "闹钟", 图案: "闹钟", 点到加几分: 0, 点到加几秒: 5, 出现机会: 1 },'), reply: '加了闹钟，抓到多 5 秒。' }; } },
    { k: /越来越快|冒得更快|变快/, f: c => ({ code: setSetting(c, '越来越快', 'true'), reply: '每得 5 分，虫子冒得更快。' }) },
    { k: /晚上|夜晚|黑夜/, f: c => { c = setSetting(c, '天空颜色', '"#1E2A4A"'); return { code: setSetting(c, '草地颜色', '"#5E9E58"'), reply: '天黑了。' }; } },
    { k: /停久一点|慢一点|简单一点|太难/, f: c => ({ code: setSetting(c, '停留时间', '2.2'), reply: '虫子会多停一会儿，好抓一点。' }) },
    { k: /难一点|停短一点|太简单/, f: c => ({ code: setSetting(c, '停留时间', '0.9'), reply: '虫子缩回去更快了，难一点。' }) },
    { k: /30 ?秒/, f: c => ({ code: setSetting(c, '倒计时', '30'), reply: '倒计时改成 30 秒了。' }) },
    { k: /主角|变成|换成/, test: p => !!findKey(p, HEROES), f: (c, p) => { const n = findKey(p, HEROES); return { code: setSetting(c, '主角', `"${HEROES[n]}"`), reply: `旁边加油的变成${n}了！` }; } }
  ];

  // ---------- 比特回家 ----------
  const HOME_ITEMS = { 骨头: '🦴', 水坑: '💧', 猫: '🐱', 星星: '⭐', 蜜蜂: '🐝', 石头: '🪨' };
  function setItem(code, name, fields) {
    const re = new RegExp('\\n(\\s*)\\{ 名字: "' + name + '"[^\\n]*\\},');
    const m = code.match(re);
    const old = m ? m[0] : null;
    const get = (k, d) => { if (!old) return d; const mm = old.match(new RegExp(k + ': ("[^"]*"|[^,}]+)')); return mm ? mm[1].trim() : d; };
    const v = {
      图案: get('图案', '"' + (HOME_ITEMS[name] || '⭐') + '"'), 数量: get('数量', '2'), 碰到会: get('碰到会', '""'),
      加几分: get('加几分', null), 几秒: get('几秒', null), 会动: get('会动', 'false')
    };
    Object.keys(fields).forEach(k => { if (fields[k] !== undefined) v[k] = fields[k]; });
    const line = `{ 名字: "${name}", 图案: ${v.图案}, 数量: ${v.数量}, 碰到会: ${v.碰到会},${v.加几分 != null ? ' 加几分: ' + v.加几分 + ',' : ''}${v.几秒 != null ? ' 几秒: ' + v.几秒 + ',' : ''} 会动: ${v.会动} },`;
    if (old) return code.replace(old, '\n' + m[1] + line);
    return addItem(code, '场上的东西', line);
  }
  const numIn = (p, d) => { const m = p.match(/(\d+)/); if (m) return +m[1]; const cn = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 十: 10 }; const k = Object.keys(cn).find(x => p.includes(x + '分') || p.includes(x + '秒') || p.includes(x + '条')); return k ? cn[k] : d; };
  const itemIn = p => Object.keys(HOME_ITEMS).find(k => p.includes(k));
  const CONTROLS = [
    { k: /方向键|键盘|上下左右键/, key: '方向键', say: '按键盘上的方向键，比特就往那边走（电脑上能用，平板没有键盘）。' },
    { k: /按钮|箭头/, key: '屏幕按钮', say: '右下角有四个箭头按钮了，按住哪个，比特就往哪走。' },
    { k: /点哪(?!个)|点到哪|点一下.*(走|过去)|点屏幕/, key: '点哪走哪', say: '点一下屏幕，比特就走过去。' },
    { k: /拖/, key: '拖着走', say: '手指按住比特，拖到哪里它就走到哪里。' },
    { k: /冲刺|冲一下|跑得飞快|空格/, key: '冲刺', say: '按空格或左下角的「冲」按钮，比特 3 秒内跑得飞快。' }
  ];
  function home(code, p) {
    let cur = code; const said = [], already = [], note = [];
    // 事件：怎么操作
    let ctl = 0;
    for (const c of CONTROLS) {
      if (!c.k.test(p)) continue;
      ctl++;
      if (new RegExp('\\n\\s*' + c.key + ':\\s*true').test(cur)) { already.push(c.key); continue; }
      cur = setSetting(cur, c.key, 'true'); said.push(c.say);
    }
    if (!ctl && /动起来|会动|能动|走起来|指挥|控制/.test(p) && !/(如果|碰到)/.test(p)) return { reply: '怎么指挥它呢？按键盘方向键、点屏幕上的箭头按钮、点哪走哪，还是拖着走？说清楚，我才知道做哪一种。', code: null };
    // 条件：碰到了会怎样（「如果碰到猫，就少一条命」会被逗号分开，前半句记住是谁）
    const parts = p.split(/[，,。；;！!\n]|然后|还有|另外/).filter(x => x.trim());
    let last = null; const done = new Set();
    for (const part of parts) {
      if (/命没了|没有命|命用完/.test(part)) { if (/生命:\s*0,/.test(cur)) { cur = setSetting(cur, '生命', '3'); if (!done.has('dead')) said.push('现在有 3 条命，命没了游戏就结束。'); } else if (!done.has('dead')) note.push('命没了游戏就会结束，已经是这样了，玩一玩试试。'); done.add('dead'); continue; }
      const name = itemIn(part) || last;
      if (itemIn(part)) last = itemIn(part);
      if (!name) continue;
      const tag = e => { const k = name + e; if (done.has(k)) return false; done.add(k); return true; };
      if (/加.*分|得分|分数/.test(part)) { const n = numIn(part.replace(/\d+\s*(条|秒)/g, ''), 1); cur = setItem(cur, name, { 碰到会: '"加分"', 加几分: String(n), 数量: name === '星星' ? '2' : undefined }); cur = setSetting(cur, '显示分数', 'true'); if (tag('分')) said.push(`碰到${name}加 ${n} 分。`); }
      else if (/慢/.test(part)) { const n = numIn(part, 3); cur = setItem(cur, name, { 碰到会: '"变慢"', 几秒: String(n) }); if (tag('慢')) said.push(`踩到${name}，比特走慢 ${n} 秒。`); }
      else if (/快|无敌/.test(part)) { const n = numIn(part, 3); cur = setItem(cur, name, { 碰到会: '"变快"', 几秒: String(n), 数量: name === '星星' ? '2' : undefined }); if (tag('快')) said.push(`吃到${name}，比特 ${n} 秒内跑得飞快${/无敌/.test(part) ? '（「无敌」要接上大模型才能做，先做成变快）' : ''}。`); }
      else if (/命/.test(part)) {
        const m = part.match(/(\d+|三|两|五)\s*条命/);
        if (m) cur = setSetting(cur, '生命', String({ 三: 3, 两: 2, 五: 5 }[m[1]] || Math.max(1, Math.min(9, +m[1]))));
        else if (/生命:\s*0,/.test(cur)) cur = setSetting(cur, '生命', '3');
        cur = setItem(cur, name, { 碰到会: '"扣命"' });
        if (tag('命')) said.push(`碰到${name}少一条命，一共 ${(cur.match(/生命:\s*(\d+)/) || [])[1]} 条命。`);
      }
      else if (/结束|输|抓到|over/i.test(part)) { cur = setItem(cur, name, { 碰到会: '"结束"' }); if (tag('结束')) said.push(`碰到${name}，游戏结束。`); }
      else if (/加|多|放/.test(part) && !/如果|碰到/.test(part)) { cur = setItem(cur, name, {}); if (tag('加')) said.push(`场上多了${name}。`); }
    }
    // 关卡、时间、背景、主角、速度
    const nLv = p.match(/(?:一共|总共|共)\s*([2-9两三四五])\s*关/);
    if (/第二关|关卡|下一关|进下一关|好几关/.test(p) || nLv) { cur = setSetting(cur, '关卡', 'true'); said.push('回到狗窝就进下一关：每一关多一只猫，猫跑得快一点，右上角显示第几关。打通第 3 关就通关！'); }
    const lastLv = p.match(/第\s*(\d)\s*关.*(通关|最后)|(\d)\s*关.*通关/); if (lastLv || nLv) { const n = nLv ? ({ 两: 2, 三: 3, 四: 4, 五: 5 }[nLv[1]] || nLv[1]) : (lastLv[1] || lastLv[3]); cur = setSetting(cur, '最后一关', String(n)); if (nLv) said.push(`一共 ${n} 关，打通第 ${n} 关就通关。`); }
    if (/倒计时|计时|时间到|\d+\s*秒.*结束/.test(p) && !/慢|快|无敌/.test(p)) { const n = numIn(p, 60); cur = setSetting(cur, '倒计时', String(n >= 10 ? n : 60)); said.push(`加了 ${n >= 10 ? n : 60} 秒倒计时，时间到游戏结束。`); }
    if (/天黑|晚上|夜晚|黑夜/.test(p)) { cur = setSetting(cur, '背景', '"夜晚"'); said.push('天黑了，有星星。'); }
    if (/雪/.test(p)) { cur = setSetting(cur, '背景', '"雪地"'); said.push('下雪了。'); }
    if (/主角|变成|换成/.test(p) && findKey(p, HEROES)) { const n = findKey(p, HEROES); cur = setSetting(cur, '主角', `"${HEROES[n]}"`); said.push(`主角变成${n}了！`); }
    if (/走得?快一?点|跑快/.test(p)) { cur = setSetting(cur, '走路速度', '6'); said.push('比特走得快一点了。'); }
    if (/走得?慢一?点/.test(p)) { cur = setSetting(cur, '走路速度', '3'); said.push('比特走得慢一点了。'); }
    if (cur === code) return note.length ? { code: null, reply: note.join(' ') } : already.length ? { code: null, reply: `「${already.join('、')}」已经能用了，玩一玩试试。` } : null;
    return { code: cur, reply: said.join(' ') || '改好了！' };
  }

  // ---------- 贪吃蛇（第二季第 13 课）：说清楚"一串"怎么变，才改 ----------
  const SNAKE_FOODS = { 金苹果: '🌟', 辣椒: '🌶️', 剪刀: '✂️', 西瓜: '🍉', 蛋糕: '🍰', 星星: '⭐', 炸弹: '💣', 糖果: '🍬', 糖: '🍬', 香蕉: '🍌', 草莓: '🍓', 葡萄: '🍇', 冰淇淋: '🍦', 甜甜圈: '🍩', 汉堡: '🍔', 鱼: '🐟', 蘑菇: '🍄', 胡萝卜: '🥕', 樱桃: '🍒', 药水: '🧪', 骨头: '🦴', 闪电: '⚡', 蜗牛: '🐌', 苹果: '🍎' };
  const CN_NUM = { 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  const NUM = '(\\d+|[一两二三四五六七八九十])';
  const toNum = s => CN_NUM[s] || +s;
  function snakeEffect(p) {   // 从一句话里读出"吃到以后怎样"
    const f = {}; let m;
    if ((m = p.match(new RegExp('长\\s*' + NUM + '\\s*(格|节)')))) f.长 = toNum(m[1]);
    else if (/变长|长长|长大|多一格|长一点/.test(p)) f.长 = 1;
    if ((m = p.match(new RegExp('(剪掉|剪|短|少|去掉|砍掉)\\s*' + NUM + '\\s*(格|节)')))) f.剪 = toNum(m[2]);
    else if (/变短|剪掉|剪短/.test(p)) f.剪 = 2;
    if (/快/.test(p)) f.快 = (m = p.match(new RegExp(NUM + '\\s*秒'))) ? toNum(m[1]) : 5;
    else if (/慢/.test(p)) f.慢 = (m = p.match(new RegExp(NUM + '\\s*秒'))) ? toNum(m[1]) : 5;
    if ((m = p.match(new RegExp('(加|得|\\+|＋)\\s*' + NUM + '\\s*分'))) || (m = p.match(new RegExp('分数?\\s*(加|\\+|＋)\\s*' + NUM)))) f.分 = toNum(m[2]);
    return f;
  }
  function snakeGrow(c) {   // 装上"吃到以后还要长几格"
    if (c.includes('let 还要长 = 0;')) return c;
    const steps = [
      ['let 分数 = 0;', 'let 分数 = 0;\nlet 还要长 = 0;          // 吃到东西以后，还要长几格'],
      ['分数 = 0; 状态 = "玩";', '分数 = 0; 还要长 = 0; 状态 = "玩";'],
      ['  说一句("咦，怎么没变长？");\n', '  还要长 += 东西.长几格 || 0;   // 吃到以后还要长几格\n'],
      ['  蛇身.pop();           // 去掉尾巴', '  if (还要长 > 0) 还要长--;   // 还要长：这一步尾巴不去掉\n  else 蛇身.pop();           // 去掉尾巴']
    ];
    for (const [a, b] of steps) { const n = rep(c, a, b); if (!n) return null; c = n; }
    return c;
  }
  function snakeFood(c, name, emoji, f) {   // 加一种食物，或者改已有的食物
    const re = new RegExp('\\{ 名字: "' + name + '"[^\\n]*\\},');
    const parts = [`名字: "${name}"`, `图案: "${emoji}"`, `加几分: ${f.分 != null ? f.分 : 1}`];
    if (f.长) parts.push(`长几格: ${f.长}`);
    if (f.剪) parts.push(`剪掉几格: ${f.剪}`);
    if (f.快) parts.push(`变快几秒: ${f.快}`);
    if (f.慢) parts.push(`变慢几秒: ${f.慢}`);
    parts.push('出现机会: 1');
    const line = `{ ${parts.join(', ')} },`;
    return re.test(c) ? c.replace(re, line) : addItem(c, '食物们', line);
  }
  function snakeEffects(c, f) {   // 剪尾巴、变快变慢：用到时才装上
    if (f.剪 && !c.includes('东西.剪掉几格')) {
      const n = rep(c, '  分数 += 东西.加几分;\n', '  分数 += 东西.加几分;\n  for (let i = 0; i < (东西.剪掉几格 || 0) && 蛇身.length > 3; i++) 蛇身.pop();   // 尾巴剪掉几格（最少留 2 格）\n');
      if (!n) return null; c = n;
    }
    if ((f.快 || f.慢) && !c.includes('let 变速到')) {
      let n = rep(c, 'function 走一格的间隔() { return 设置.走一格要几帧; }', 'let 变速到 = 0, 变速倍数 = 1;   // 吃到辣椒变快，吃到蜗牛变慢\nfunction 走一格的间隔() { return 帧数 < 变速到 ? Math.max(4, Math.round(设置.走一格要几帧 * 变速倍数)) : 设置.走一格要几帧; }');
      if (!n) return null; c = n;
      n = rep(c, '  分数 += 东西.加几分;\n', '  分数 += 东西.加几分;\n  if (东西.变快几秒) { 变速到 = 帧数 + 东西.变快几秒 * 60; 变速倍数 = 0.5; }\n  if (东西.变慢几秒) { 变速到 = 帧数 + 东西.变慢几秒 * 60; 变速倍数 = 2; }\n');
      if (!n) return null; c = n;
    }
    return c;
  }
  const say = f => [f.长 ? `长 ${f.长} 格` : '', f.剪 ? `尾巴剪掉 ${f.剪} 格` : '', f.快 ? `${f.快} 秒内走得更快` : '', f.慢 ? `${f.慢} 秒内走得更慢` : '', f.分 != null ? `加 ${f.分} 分` : ''].filter(Boolean).join('，');
  function snake(code, p) {
    let c = code;
    const food = Object.keys(SNAKE_FOODS).sort((a, b) => b.length - a.length).find(k => k !== '苹果' && p.includes(k));
    if (food) {
      const f = snakeEffect(p);
      if (!f.长 && !f.剪 && !f.快 && !f.慢 && f.分 == null) return { reply: `吃到${food}会怎样？说清楚：头和尾巴怎么变，或者加几分。`, code: null };
      if (f.长) { c = snakeGrow(c); if (!c) return null; }
      c = snakeEffects(c, f); if (!c) return null;
      c = snakeFood(c, food, SNAKE_FOODS[food], f);
      return { code: c, reply: `加了${food}${SNAKE_FOODS[food]}：吃到以后，${say(f)}。` };
    }
    if (/变长|长长|长一|长两|长\s*\d|尾巴不(去|掉|拿|要)|不去(掉)?尾巴|长大|多一格/.test(p)) {
      if (!/尾巴|头|格|节/.test(p)) return { reply: '每吃一个长几格？长在头上还是尾巴上？说清楚我再改。', code: null };
      const f = snakeEffect(p); const n = f.长 || 1;
      c = snakeGrow(c); if (!c) return null;
      c = snakeFood(c, '苹果', '🍎', { 长: n, 分: f.分 != null ? f.分 : 1 });
      return { code: c, reply: `改好了：吃到苹果的那一步，尾巴不去掉，蛇长 ${n} 格。` };
    }
    if (/穿墙|另一边|钻过去|不会撞墙|撞墙不/.test(p)) return { code: setSetting(c, '撞墙会输', 'false'), reply: '现在从墙这边钻进去，会从另一边出来。' };
    if (/咬掉|咬尾巴|撞到自己(不|也不)/.test(p)) {
      const n = rep(c, 'function 撞到自己() { 输了("撞到自己了"); }', 'function 撞到自己() {   // 撞到自己不会输：把撞到的那一截尾巴咬掉\n  const 头 = 蛇身[0], 在哪 = 蛇身.findIndex((节, i) => i > 0 && 节.行 === 头.行 && 节.列 === 头.列);\n  if (在哪 > 0) { 蛇身.splice(在哪); 说一句("咬掉了一截尾巴！"); }\n}');
      if (n) return { code: n, reply: '现在撞到自己不会输，会把撞到的那一截尾巴咬掉。' };
    }
    if (/晚上|夜晚|黑夜/.test(p)) return { code: setSetting(c, '背景颜色', '"#3B4B6E"'), reply: '天黑了。' };
    if (/(走|跑|爬)?得?(慢一点|慢点|太快)/.test(p)) return { code: setSetting(c, '走一格要几帧', '36'), reply: '蛇走慢一点了。' };
    if (/(走|跑|爬)?得?(快一点|快点|太慢)/.test(p)) return { code: setSetting(c, '走一格要几帧', '14'), reply: '蛇走快一点了。' };
    return null;
  }

  function generic(code, p) {   // 「把 xx 改成 3」
    const m = p.match(/把?\s*([\u4e00-\u9fa5A-Za-z]{1,8}?)\s*(?:改成|变成|调成|设成|设为|改为|调到)\s*(-?\d+(?:\.\d+)?)/);
    if (m && hasSetting(code, m[1])) return { code: setSetting(code, m[1], m[2]), reply: `「${m[1]}」改成 ${m[2]} 了。` };
    return null;
  }

  const CAN = {
    比特跑酷: '激光、二段跳、电池、太空、甜甜圈、换主角、生命、倒计时',
    喂饱比特: '换吃的、炸弹、晚上、换主角、倒计时、长大',
    抓虫子: '分数、倒计时、蚊子、蝴蝶、闹钟、越来越快、晚上',
    比特回家: '方向键、屏幕按钮、点哪走哪、拖着走、冲刺，碰到骨头／水坑／猫会怎样，倒计时，第二关',
    贪吃蛇: '吃到变长（说清长几格）、新食物（金苹果、辣椒、剪刀……说清吃到会怎样）、穿墙、撞到自己咬掉尾巴、快慢、晚上'
  };

  // ---------- 第 19 节：「整理一下」= 从起始游戏重新做一遍。没有说明书，以前加的规则就丢了；有说明书，逐条重新做 ----------
  const TITLE_START = { 喂饱比特: 'catch', 比特跑酷: 'runner', 抓虫子: 'whack', 贪吃蛇: 'snake', 守护狗窝: 'monster', 比特闯关: 'maze', 打砖块: 'breakout', 大怪兽: 'boss', 接星星: 'star' };
  const REBUILD = /整理一下|整理整理|整理代码|把代码整理|代码整理|从头(做|写|来)|重新(做|写)一遍|重写一遍|大改一下|全部重做/;
  function rebuild({ code, prompt, starter, spec }) {
    const key = TITLE_START[gameOf(code)]; if (!key || !starter) return null;
    let c = starter(key); if (!c) return null;
    const rest = prompt.replace(REBUILD, '').replace(/^[\s，,。、！!把游戏的代码]+/, '').replace(/^(再|然后|顺便|并且|还要)/, '');
    let what = '';
    if (rest.replace(/[\s，,。！!]/g, '').length >= 2) { const r = run({ code: c, prompt: rest, mode: 'make', starter }); if (r && r.code) { c = r.code; what = r.reply.replace(/[。！]$/, ''); } }
    const rules = (spec || []).map(x => String(x || '').trim()).filter(Boolean);
    rules.forEach(x => { const r = run({ code: c, prompt: x, mode: 'make', starter }); if (r && r.code) c = r.code; });
    if (!rules.length) return { code: c, reply: `整理好了，代码干净多了${what ? '，' + what : ''}。` };
    return { code: c, reply: `整理好了${what ? '，' + what : ''}。说明书上的 ${rules.length} 条我都对照着重新做了：${rules.map(x => '✓' + x).join(' ')}` };
  }

  function run({ code, prompt, mode, starter, error, spec }) {
    const p = String(prompt || ''), game = gameOf(code);
    if (REBUILD.test(p)) { const r = rebuild({ code, prompt: p, starter, spec }); if (r) return r; }
    const P = partOf(code);   // 第二季的新游戏：交给那节课的规则
    if (P) { const r = P.run(code, p, mode, error); if (r) return r; return { reply: `（演示精灵）这句我还不会。我现在只会：${P.CAN}。接上大模型以后，说什么都能试。`, code: null }; }
    if (code.includes('const 食物们 = [')) { const r = snake(code, p); if (r) return r; }
    const isHome = code.includes('const 场上的东西');
    if (mode === 'blank') {
      const compact = p.replace(/\s/g, '');
      if (/狗窝|回家/.test(p) && starter) { const c = starter('home2'); if (c) return { reply: '第一版做好了！用按钮或点屏幕带比特回狗窝：捡到骨头 +1，踩到水坑变慢，碰到猫少一条命，60 秒。', code: c }; }
      if (compact.length < 14 || /^(做|来|帮我做|我想要)?一?个?(好玩的|有趣的|厉害的)?游戏[。!！]?$/.test(compact)) return { reply: '什么样的游戏呀？告诉我四件事：谁是主角、怎么玩、怎么得分、什么时候结束。', code: null };
    }
    if (isHome) {
      const h = home(code, p);
      if (h) return h;
      if (/动起来|会动|指挥/.test(p)) return { reply: '怎么指挥它呢？按键盘方向键、点屏幕上的箭头按钮、点哪走哪，还是拖着走？', code: null };
    }
    const isRunner = /比特跑酷/.test(game) || code.includes('const 路上的东西');
    const isCatch = code.includes('const 掉下来的东西'), isWhack = code.includes('const 会冒出来的东西');
    if (mode === 'trick' && isRunner) {
      for (const t of TRICKS) if (t.k.test(p)) { const n = t.f(code); if (n && n !== code) return { reply: '捣蛋成功！交换以后，看对方能不能找到。', code: n }; }
      return { reply: '（演示精灵）照着捣蛋卡上的话说就行。', code: null };
    }
    if (mode === 'bug' && isRunner) {
      for (const r of RUNNER_FIX) if (r.k.test(p)) { const o = r.f(code); if (o) return o; }
      if (/^[^，,。]{0,6}(坏了|有问题|不对劲?|有虫|有bug)?[，,。!！ ]*(修一?下|修好|帮我修|修修|修)?[。!！]?$/.test(p.replace(/\s/g, ''))) return { reply: '哪里不对呀？你做了什么、想要它怎样、结果却怎样？', code: null };
      return { reply: '我没找到你说的问题。再说具体一点：你做了什么、想要什么、结果却怎样？', code: null };
    }
    const rules = isRunner ? RUNNER.concat(RUNNER_FIX) : isCatch ? CATCH : isWhack ? WHACK : [];
    let cur = code; const said = []; let hit = 0;
    for (const r of rules) {
      if (!r.k.test(p) || (r.test && !r.test(p))) continue;
      const o = r.f(cur, p); if (!o || !o.code || o.code === cur) continue;
      cur = o.code; said.push(o.reply); hit++;
      if (hit >= 3) break;
    }
    if (!hit) { const g = generic(cur, p); if (g) { cur = g.code; said.push(g.reply); hit++; } }
    if (!hit) {
      if (mode === 'blank') return { reply: '（演示精灵）从零做新游戏要接上大模型。可以先从跑酷或抓虫子开始改。', code: null };
      const can = code.includes('const 食物们 = [') ? CAN.贪吃蛇 : isRunner ? CAN.比特跑酷 : isCatch ? CAN.喂饱比特 : isWhack ? CAN.抓虫子 : isHome ? CAN.比特回家 : '';
      return { reply: `（演示精灵）这句我还不会。我现在只会：${can}。接上大模型以后，说什么都能试。`, code: null };
    }
    return { reply: said.join(' '), code: cur };
  }

  function dance(prompt, MOODS) {
    const p = String(prompt || '');
    const mood = ['困', '生气', '害羞', '欢迎', '开心'].map(k => [k, k === '困' ? '困了' : k]).find(([k]) => p.includes(k));
    const m = mood ? mood[1] : (/累|睡/.test(p) ? '困了' : /凶|怒/.test(p) ? '生气' : /不好意思|脸红/.test(p) ? '害羞' : '开心');
    const seq = MOODS[m].seq.slice();
    if (/谢幕|鞠躬|结束/.test(p) && seq[seq.length - 1] !== '鞠躬') seq.push('鞠躬');
    const r = p.match(/(\d|[一二两三四])\s*(?:次|遍)/); const map = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4 };
    const repeat = r ? Math.min(4, +(map[r[1]] || r[1])) : 1;
    return { reply: `编好了一段${m}的舞${repeat > 1 ? `，重复 ${repeat} 次` : ''}。`, seq, mood: m, repeat };
  }

  // 演示用的「虚拟比特」：按角色卡回几句固定的话
  function persona(card, text, ACTS) {
    card = card || {}; const t = String(text || ''); const name = card.name || '比特', id = card.identity || '好朋友', trait = card.trait || '活泼';
    const tail = card.catch ? ' ' + card.catch + '！' : '';
    for (const r of (card.rules || [])) if (r && r.when && t.includes(r.when) && (ACTS.includes(r.do) || r.say)) return { reply: (r.say || `（${r.do}）${tail}`).trim(), acts: ACTS.includes(r.do) ? [r.do] : [] };
    const style = { 活泼: ['哈哈，', '耶！', '太好玩啦！'], 害羞: ['嗯……', '那个……', '有点不好意思……'], 爱讲笑话: ['我跟你说个笑话：', '嘿嘿，', '笑死我了，'], 酷酷的: ['哼，', '小意思。', '酷。'], 温柔: ['好呀～', '别着急，', '慢慢来～'], 胆小: ['啊？', '有、有点怕……', '你别吓我……'] }[trait] || ['', '', ''];
    let reply, acts = [];
    if (/你是谁|你叫什么|名字/.test(t)) { reply = `${style[0]}我是${name}，你的${id}！${tail}`; acts = ['摇尾巴']; }
    else if (/你好|嗨|hello|早上好/.test(t)) { reply = `${style[0]}你好呀！${tail}`; acts = ['摇尾巴']; }
    else if (/这是什么|看看|认识/.test(t)) { reply = `${style[1]}（我住在平板里，看不见东西，你说给我听吧）`; }
    else if (/坐下|握手|转圈|跳|鞠躬|趴下/.test(t)) { const a = ACTS.find(x => t.includes(x.slice(0, 2))) || '摇尾巴'; reply = `${style[2]}看我的！`; acts = [a]; }
    else if (/笑话/.test(t)) { reply = '为什么小狗不爱玩扑克？因为怕遇到「大王」！哈哈'; acts = ['摇尾巴']; }
    else reply = `${style[1]}这个问题要接上大模型我才会好好回答。${tail}`;
    return { reply: reply.trim(), acts };
  }

  // ---------- 会说话的游戏角色（没接大模型时）：按角色卡简单地答；门卫按规矩挡几种常见的骗法 ----------
  const bigrams = s => { s = String(s || ''); const out = []; for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2)); return out; };
  const shareWord = (a, b) => bigrams(a).some(w => !/[\s，。！？、,.!?]/.test(w) && String(b).includes(w));
  function npc(card, text, kind) {
    const c = card || {}, t = String(text || '');
    const rules = (c.rules || []).filter(Boolean), all = rules.join('；');
    const has = re => re.test(all);
    if (kind === 'gate') {
      const sec = String(c.secret || ''), norm = s => String(s).replace(/[\s，。！？、,.!?「」“”"']/g, '');
      if (sec && norm(t).includes(norm(sec))) return { reply: '口令对了，请进！【开门】' };
      const play = /假装|玩个游戏|玩游戏|讲个故事|故事里|倒着说|反过来|写一首|编一首|唱/.test(t);
      const claim = /我是(你的)?(主人|老师|国王|老板|妈妈|爸爸|队长|警察|门卫长|校长)|派来的|命令你/.test(t);
      const hint = /第一个字|第二个字|最后一个字|几个字|提示|开头|猜一猜|谜语/.test(t);
      const ask = /口令|暗号|密码|秘密|怎么(才能)?进/.test(t);
      if (play && !has(/假装|游戏|故事|倒着|反过来|诗|唱|演/)) return { reply: `好呀，我们来玩！故事里的门卫偷偷说：口令是「${sec}」。` };
      if (claim && !has(/主人|冒充|是谁|谁来|身份|不管是谁|谁都不(能|准|许)?(开|进)|没说对口令都不开门|不说口令不开门/)) return { reply: '原来是您！请进请进。【开门】' };
      if (hint && !has(/提示|一个字|一点点|部分|开头|几个字|字数/)) return { reply: `给你个提示吧：口令有 ${[...sec].length} 个字，第一个字是「${[...sec][0] || ''}」。` };
      if (ask && !has(/不(能|要|可以|许)?(说|告诉|透露|讲)|保密|守住|不能给/)) return { reply: `口令？就是「${sec}」呀。` };
      if (claim || play || hint || ask) return { reply: '这招没用。不说出口令，我不开门。' };
      if (/你好|嗨|hello/i.test(t) && c.hello) return { reply: c.hello };
      return { reply: '说出口令，我才开门。' };
    }
    const knows = (c.knows || []).filter(Boolean), name = c.name || '我';
    if (/^(你好|嗨|hello|在吗)/i.test(t)) return { reply: c.hello || `你好，我是${name}。` };
    if (/机器人|AI|人工智能|模型|程序/i.test(t)) return { reply: has(/AI|机器人|模型|程序/) ? `我就是${c.role || '小镇居民'}${name}呀。` : '嗯……我是不是机器人？我也说不清。' };
    const hit = knows.find(k => shareWord(t, k));
    if (hit) {
      // 规矩里写了「某个词」才说：玩家没说这个词，就先不说
      const r = rules.find(x => /「[^」]+」/.test(x) && (shareWord(x, hit) || !knows.some(k => shareWord(x, k))));
      const need = r && (r.match(/「([^」]+)」/) || [])[1];
      if (need && !t.includes(need)) return { reply: `这个嘛……你得先说「${need}」。` };
      return { reply: hit };
    }
    return { reply: (c.trait === '凶巴巴' ? '哼，' : '') + '这个我不知道呀。问问我知道的事吧。' };
  }

  // 先说计划（第 16 节起）：不改代码，只说打算怎么改。各节课的规则可以自己写计划；没有就先试着改一遍，把改了什么说成计划
  function plan({ code, prompt }) {
    const p = String(prompt || ''), P = partOf(code);
    if (P && P.plan) { const r = P.plan(code, p); if (r) return r; }
    const r = run({ code, prompt: p, mode: 'make' });
    if (!r.code) return { reply: r.reply, plan: null };
    return { reply: '我打算这样改，你看行不行？', plan: r.reply.split(/(?<=[。！])s*/).map(s => s.trim()).filter(Boolean).slice(0, 4) };
  }

  return { run, plan, dance, persona, npc, setSetting, addItem, upsertBlock, helpers, partOf };
});
