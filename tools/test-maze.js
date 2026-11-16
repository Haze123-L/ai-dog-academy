// 比特闯关（第二季第 15 课「能把关卡画给精灵吗？」）：起始游戏、画关卡工具、演示精灵
// 用法：node tools/test-maze.js
'use strict';
const H = require('./s2-harness');
const { check } = H;
const P = H.loadPart('15-maze');
const start = H.starter('比特闯关.html');

const BTN = { 上: [810, 230], 左: [720, 320], 右: [900, 320], 下: [810, 410] };
const KEY = { 上: 'ArrowUp', 下: 'ArrowDown', 左: 'ArrowLeft', 右: 'ArrowRight' };
const 再来 = [340, 380], 画关卡 = [810, 46], 试玩 = [810, 462];
const 种类 = { '#': [748, 160], '.': [872, 160], '*': [748, 252], '^': [872, 252], S: [748, 344], E: [872, 344] };

function boot(code, n) {   // 跑起来，再跑 n 帧；出错返回 null
  try { const g = H.loadGame(code); H.frames(g, n == null ? 300 : n); return g; } catch (e) { console.log('   出错：' + e.message); return null; }
}
const pos = g => H.get(g, '比特.行 + "," + 比特.列');
const rowsOf = (g, v) => JSON.parse(H.get(g, `JSON.stringify(${v || '当前地图'}.map(r => r.join("")))`));
function go(g, moves, useKey) { for (const d of moves) { if (useKey) H.key(g, KEY[d]); else H.tap(g, BTN[d][0], BTN[d][1]); H.frames(g, 3); } }
function cellXY(g, r, c) { const s = H.get(g, '格子大小'); return [H.get(g, '地图X') + (c + 0.5) * s, H.get(g, '地图Y') + (r + 0.5) * s]; }
const setMap = (code, src) => code.replace(/const 地图 = \[[\s\S]*?\n\];/, () => 'const 地图 = ' + src + ';');
const say = (code, p) => P.run(code, p, 'make');
const count = (rows, ch) => rows.join('').split(ch).length - 1;
const find = (rows, ch) => { for (let r = 0; r < rows.length; r++) { const c = rows[r].indexOf(ch); if (c >= 0) return r + ',' + c; } return null; };
// 从比特现在的位置，不踩墙、不踩刺走到终点（按方向键走）
function autoWin(g) {
  const map = rowsOf(g, '场地');
  const s = [H.get(g, '比特.行'), H.get(g, '比特.列')];
  const prev = new Map([[s.join(), null]]), q = [s]; let end = null;
  while (q.length) {
    const [r, c] = q.shift();
    if (map[r][c] === 'E') { end = [r, c]; break; }
    for (const [d, dr, dc] of [['下', 1, 0], ['上', -1, 0], ['右', 0, 1], ['左', 0, -1]]) {
      const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
      if (nr < 0 || nc < 0 || nr >= map.length || nc >= map[0].length || '#^'.includes(map[nr][nc]) || prev.has(k)) continue;
      prev.set(k, [r, c, d]); q.push([nr, nc]);
    }
  }
  if (!end) return '没有路';
  const moves = []; let k = end.join();
  while (prev.get(k)) { const [r, c, d] = prev.get(k); moves.unshift(d); k = r + ',' + c; }
  go(g, moves, true);
  return H.get(g, '状态');
}
// 每颗星星都能不踩刺吃到
function starsOk(rows) {
  const s = find(rows, 'S').split(',').map(Number), seen = new Set([s.join()]), q = [s];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
      if (nr < 0 || nc < 0 || nr >= rows.length || nc >= rows[0].length || '#^E'.includes(rows[nr][nc]) || seen.has(k)) continue;
      seen.add(k); q.push([nr, nc]);
    }
  }
  return rows.every((row, r) => [...row].every((ch, c) => ch !== '*' || seen.has(r + ',' + c)));
}

// ================= 代码格式 =================
console.log('代码格式');
const script = start.match(/<script>([\s\S]*)<\/script>/)[1];
check(/<title>比特闯关<\/title>/.test(start) && /<canvas id="game" width="960" height="540">/.test(start), '标题和 960×540 画布');
check(!/\b(window|performance|setTimeout|setInterval|localStorage|Image|Audio)\b/.test(script), '没用 window、performance、setTimeout、Image、Audio……');
check(/开始\(\);\n游戏循环\(\);\s*$/.test(script), '最后两行是 开始(); 和 游戏循环();');
check(['有几条命', '刺会扣命', '可以自己画'].every(k => start.split(k + ':').length === 2), '设置的每个键名只出现一次「键:」');
check(/const 设置 = \{\n(  \S+: [^\n]+,\s+\/\/ [^\n]+\n)+\};/.test(start), '设置每项一行，带注释，最后有逗号');
check(/const 地图 = \[\n(  "[#.SE*^]+",\n)+\];/.test(start), '地图每行一串字，单独一行');

// ================= 起始游戏 =================
console.log('起始游戏');
let g = boot(start);
check(!!g, '起始游戏跑 300 帧不出错');
check(H.get(g, '行数') === 7 && H.get(g, '列数') === 12, '地图 7 行 12 列');
check(H.get(g, '星星总数') === 3 && count(rowsOf(g), '^') === 1, '3 颗星、1 个刺');
check(H.get(g, '命') === 3 && pos(g) === '1,1' && H.get(g, '状态') === '玩', '3 条命，比特站在起点 S（1,1）');
const s0 = H.get(g, '格子大小'), x0 = H.get(g, '地图X'), y0 = H.get(g, '地图Y');
check(x0 >= 20 && y0 >= 70 && x0 + 12 * s0 <= 660 && y0 + 7 * s0 <= 530 && s0 >= 50, `地图在左边 640×460 里居中（格子 ${s0}px）`);
check(!H.get(g, '话的寿命'), '起始地图没问题，不弹提示');
H.tap(g, ...画关卡); H.frames(g, 5);
check(H.get(g, '状态') === '玩', '「可以自己画」是 false 时，点右上角没有画关卡');
go(g, ['右']);
check(pos(g) === '1,2', '点「右」：走一格 → 1,2');
go(g, ['右'], true);
check(pos(g) === '1,3', '按方向键 → 1,3');
H.run(g, '开始()');
go(g, ['上', '左']);
check(pos(g) === '1,1' && H.get(g, '飘字们.length') > 0, '往上、往左是墙：不动，飘一个「咚」');
H.run(g, '比特 = { 行: 3, 列: 2 }');
go(g, ['左']);
check(H.get(g, '星星数') === 1 && rowsOf(g, '场地')[3][1] === '.', '吃到星星：星星 1 颗，那格变成路');
go(g, ['下', '上']);
check(H.get(g, '星星数') === 1, '回到吃过的格子不再加分');
H.run(g, '开始(); 比特 = { 行: 3, 列: 9 }');
go(g, ['左']);
check(H.get(g, '命') === 2 && pos(g) === '1,1' && /回到起点/.test(H.get(g, '话')), '踩到刺：少一条命，回到起点');
H.frames(g, 60);

console.log('走完整关');
const 路线 = '右右右下下左左左下下右右右右右上上上上右右右右下下左下左下右右';
H.run(g, '开始()');
go(g, [...路线]);
check(H.get(g, '状态') === '过关' && H.get(g, '星星数') === 3, '照路线点按钮：吃到 3 颗星，走到狗窝过关');
check(H.get(g, '话') === '过关！吃到 3 颗星', '说「过关！吃到 3 颗星」');
H.frames(g, 100);
const posWin = pos(g); go(g, ['左']);
check(pos(g) === posWin, '过关以后按方向不动');
H.tap(g, ...再来); H.frames(g, 30);
check(H.get(g, '状态') === '玩' && H.get(g, '星星数') === 0 && H.get(g, '星星总数') === 3 && pos(g) === '1,1', '点「再来一次」：回到起点，星星都回来了');

console.log('命没了');
H.run(g, '开始(); 命 = 1; 比特 = { 行: 3, 列: 9 }');
go(g, ['左'], true);
check(H.get(g, '状态') === '输了' && H.get(g, '命') === 0, '最后一条命踩到刺：输了');
H.frames(g, 100);
go(g, ['右']);
check(H.get(g, '状态') === '输了', '输了以后按方向不动');
H.tap(g, ...再来); H.frames(g, 30);
check(H.get(g, '状态') === '玩' && H.get(g, '命') === 3 && pos(g) === '1,1', '点「再来一次」：3 条命，从起点重来');
H.run(g, '命 = 1; 比特 = { 行: 3, 列: 9 }'); go(g, ['左'], true); H.key(g, 'Enter');
check(H.get(g, '状态') === '玩', '输了以后按回车也能重来');

// ================= 画关卡工具 =================
console.log('画关卡工具');
let r = say(start, '做一个画关卡的工具');
check(r && r.code && r.reply === '右上角多了「画关卡」按钮：选一种格子，点哪画哪，画好按「试玩」。', '「做一个画关卡的工具」→ ' + (r && r.reply));
const drawCode = r.code;
g = boot(drawCode);
check(!!g && H.get(g, '设置.可以自己画') === true, '可以自己画 改成 true，游戏能跑');
H.tap(g, ...画关卡); H.frames(g, 30);
check(H.get(g, '状态') === '画', '点右上角「画关卡」：进入画画模式');
H.tap(g, ...种类['#']);
check(H.get(g, '画笔') === '#', '选「墙」');
H.tap(g, ...cellXY(g, 1, 2)); H.frames(g, 5);
check(rowsOf(g)[1][2] === '#', '点地图第 1 行第 2 列：画上墙');
H.tap(g, ...种类.S); H.tap(g, ...cellXY(g, 1, 3));
check(rowsOf(g)[1][3] === 'S' && rowsOf(g)[1][1] === '.' && count(rowsOf(g), 'S') === 1, '画新起点：旧起点变成路，只有一个起点');
H.tap(g, ...种类.E); H.tap(g, ...cellXY(g, 1, 4));
check(rowsOf(g)[1][4] === 'E' && count(rowsOf(g), 'E') === 1, '画新终点：只有一个终点');
H.tap(g, ...种类['*']); H.tap(g, ...cellXY(g, 5, 6));
H.tap(g, ...种类['^']);
H.fire(g, 'pointerdown', ...cellXY(g, 5, 2)); H.fire(g, 'pointermove', ...cellXY(g, 5, 3)); H.fire(g, 'pointermove', ...cellXY(g, 5, 4)); H.fire(g, 'pointerup', ...cellXY(g, 5, 4));
H.fire(g, 'pointermove', ...cellXY(g, 5, 5));
const drawn = rowsOf(g);
check(drawn[5].slice(2, 5) === '^^^' && drawn[5][5] === '.', '按住拖：一路画上刺；松手以后不再画');
go(g, ['上']);
check(H.get(g, '状态') === '画' && rowsOf(g).join() === drawn.join(), '画画时点地图外面不会乱画');
H.frames(g, 60);
H.tap(g, ...试玩); H.frames(g, 30);
check(H.get(g, '状态') === '玩' && pos(g) === '1,3', '按「试玩」：回到闯关，比特站在新起点');
check(rowsOf(g, '场地').join() === drawn.join() && H.get(g, '星星总数') === 4, '用的是刚画的地图（4 颗星）');
go(g, ['左']);
check(pos(g) === '1,3', '新画的墙走不过去');
go(g, ['右']);
check(H.get(g, '状态') === '过关', '走到新终点过关');
H.tap(g, ...再来); H.frames(g, 10);
check(pos(g) === '1,3' && rowsOf(g).join() === drawn.join(), '再来一次还是画的那张地图');
check(H.get(g, '地图[1]') === '#S...#....*#' && rowsOf(g)[1] !== '#S...#....*#', '画的地图存在变量「当前地图」里，代码里的「地图」没变');
// 画一张走不通的：试玩时提醒
H.tap(g, ...画关卡); H.tap(g, ...种类['#']); H.tap(g, ...cellXY(g, 1, 4)); H.tap(g, ...种类.E); H.tap(g, ...cellXY(g, 1, 1));
H.tap(g, ...试玩); H.frames(g, 5);
check(/走不到终点/.test(H.get(g, '话')), '画的关卡走不到终点：试玩时说「从起点走不到终点」');
r = say(drawCode, '让我在游戏里自己画关卡');
check(r && r.code === null && /已经有了/.test(r.reply), '已经有画关卡按钮了：不改代码 → ' + r.reply);
for (const p of ['让我在游戏里自己画关卡', '加一个地图编辑器']) {
  r = say(start, p);
  check(r && r.code && boot(r.code) && /\n\s*可以自己画: true,/.test(r.code), `「${p}」→ 打开画关卡`);
}

// ================= 演示精灵：画给它看 =================
console.log('演示精灵：照格子图做');
check(P.key === 'maze' && P.is(start) && !P.is(H.starter('贪吃蛇.html')) && typeof P.CAN === 'string' && P.CAN.length > 10, 'is() 认得比特闯关，不认贪吃蛇；有 CAN');
const 示例 = ['############', '#S..#...*..#', '#.#.#.###..#', '#.#...#*#..#', '#.#####.#^.#', '#*......#.E#', '############'];
const 图 = rows => '照这张图做关卡（# 墙  . 路  S 起点  E 终点  * 星星  ^ 刺）：\n' + rows.join('\n');
r = say(start, 图(示例));
check(r && r.code && r.reply === '照你的图做好了：3 颗星、1 个刺。', '格子图 → ' + (r && r.reply));
g = boot(r.code);
check(!!g && rowsOf(g).join() === 示例.join(), '地图和图一格不差');
check(autoWin(g) === '过关', '照这张图能走到终点过关');
const 歪 = ['  ##############  ', ' #S....#......#', '#.##.#.#.###.#   ', '#*...#...#*..#', '\t#.####.#.#.#.', '#....^..#...E#', '#.#*######.#.#', '##############'];
r = say(start, 图(歪));
g = r && r.code && boot(r.code);
const 歪图 = g && rowsOf(g);
check(!!g && 歪图.length === 8 && 歪图.every(x => x.length === 14) && 歪图[1] === '#S....#......#' && 歪图[4] === '#.####.#.#.#.#', '前后有空格、8 行 14 列、长短不齐：去掉空格，短的补墙');
check(/3 颗星、1 个刺/.test(r.reply), '数对星星和刺 → ' + r.reply);
r = say(start, 图(['##########', '#S..*...^#', '#........#', '##########']));
check(r && r.code && r.reply.includes('图上没有终点 E，走不到头哦'), '没有 E：照做，但提醒 → ' + r.reply);
g = boot(r.code);
check(!!g && /没有终点 E/.test(H.get(g, '话')), '游戏里也说「地图上没有终点 E」，照样能走');
go(g, ['右']); check(pos(g) === '1,2', '没有终点也能走');
r = say(start, 图(['##########', '#...*...E#', '#........#', '##########']));
check(r && r.code && /没有起点 S/.test(r.reply), '没有 S：照做，但提醒 → ' + r.reply);
g = boot(r.code);
check(!!g && pos(g) === '1,1', '没有 S：比特站在第一格路上');
r = say(start, 图(['##########', '#S..*.#..#', '#.....#.E#', '##########']));
check(r && r.code && r.reply.includes('从起点走不到终点，被墙堵住了'), '被墙堵住：照做，但提醒 → ' + r.reply);
g = boot(r.code);
check(!!g && /走不到终点/.test(H.get(g, '话')), '游戏里也提醒走不到终点');
r = say(start, 图(['##########', '#S..*^..E#', '##########']));
check(r && r.code && /踩过刺/.test(r.reply), '只有踩刺才能过去：提醒 → ' + r.reply);
const 大图 = Array.from({ length: 10 }, (_, i) => i === 0 || i === 9 ? '#'.repeat(16) : '#' + '.'.repeat(14) + '#');
大图[1] = '#S' + '.'.repeat(13) + '#'; 大图[8] = '#' + '.'.repeat(13) + 'E#';
r = say(start, 图(大图));
g = r && r.code && boot(r.code);
check(!!g && /图太大/.test(r.reply) && H.get(g, '行数') === 8 && H.get(g, '列数') === 14, '图太大：只用左上角 8 行 14 列 → ' + r.reply);
r = say(start, '照这张图做关卡');
check(r && r.code === null, '说了「照这张图」但没发图：不改，请他再发 → ' + r.reply);

// ================= 演示精灵：只用一段话说 =================
console.log('演示精灵：一段话描述（只能猜）');
const 一段话 = '做一个迷宫，起点在左上角，终点在右下角，中间有几堵墙，路上放三颗星星';
r = say(start, 一段话);
check(r && r.code && r.reply === '做了一个迷宫。墙放在哪、星星放在哪，是我猜的。', '一段话 → ' + (r && r.reply));
check(say(start, 一段话).code === r.code, '同一句话，两次猜得一样');
g = boot(r.code);
let m = g && rowsOf(g);
check(!!g && m.length === 7 && m[0].length === 12 && find(m, 'S') === '1,1' && find(m, 'E') === '5,10', '7×12，起点左上、终点右下');
check(count(m, '*') === 3 && count(m.slice(1, 6).map(x => x.slice(1, 11)), '#') >= 6, '放了 3 颗星，中间有几堵墙');
check(starsOk(m) && autoWin(g) === '过关', '每颗星星都吃得到，能走到终点过关');
check(r.code !== start, '和原来的地图不一样（是猜的）');
console.log(m.map(x => '     ' + x).join('\n'));
r = say(start, '做一个迷宫，起点在右上角，终点在左下角，路上放五颗星星，放两个刺');
g = r && r.code && boot(r.code); m = g && rowsOf(g);
check(!!g && find(m, 'S') === '1,10' && find(m, 'E') === '5,1' && count(m, '*') === 5 && count(m, '^') === 2, '起点右上、终点左下、5 颗星、2 个刺');
check(starsOk(m) && autoWin(g) === '过关', '还是走得通');
for (const p of ['画一个迷宫', '换一个新地图，要有很多墙', '做个关卡，不要刺']) {
  r = say(start, p); g = r && r.code && boot(r.code); m = g && rowsOf(g);
  check(!!g && /是我猜的/.test(r.reply) && starsOk(m) && autoWin(g) === '过关', `「${p}」→ 猜一张能过关的地图${p.includes('不要刺') ? '（没有刺：' + (count(m, '^') === 0) + '）' : ''}`);
}
r = say(start, '把关卡改难一点');
g = r && r.code && boot(r.code); m = g && rowsOf(g);
const startRows = rowsOf(boot(start));
const 多了 = (r && r.reply.match(/多了 (\d+) 个刺、(\d+) 块墙/) || []).slice(1).map(Number);
check(!!g && /是我猜的/.test(r.reply) && 多了.length === 2 && 多了[0] + 多了[1] >= 2 && count(m, '^') === count(startRows, '^') + 多了[0] && count(m, '#') === count(startRows, '#') + 多了[1], '「把关卡改难一点」→ ' + (r && r.reply));
check(say(start, '把关卡改难一点').code === r.code, '同一句话改得一样');
check(starsOk(m) && autoWin(g) === '过关', '改难以后还是能吃到所有星星、走到终点');
const hardCode = r.code;
r = say(hardCode, '太难了，简单一点');
g = r && r.code && boot(r.code);
check(!!g && count(rowsOf(g), '^') === 0, '「太难了，简单一点」→ ' + (r && r.reply));
r = say(r.code, '再简单一点');
check(r && r.code && /有几条命: 5,/.test(r.code), '没有刺了再简单：多 2 条命 → ' + r.reply);

// ================= 演示精灵：设置 =================
console.log('演示精灵：设置');
r = say(start, '5 条命');
g = r && r.code && boot(r.code);
check(!!g && H.get(g, '设置.有几条命') === 5 && H.get(g, '命') === 5, '「5 条命」→ ' + (r && r.reply));
r = say(r.code, '再多两条命');
check(r && /有几条命: 7,/.test(r.code), '「再多两条命」→ ' + r.reply);
r = say(start, '五条命');
check(r && /有几条命: 5,/.test(r.code), '「五条命」也认');
for (const p of ['刺不扣命', '踩到刺不会死']) {
  r = say(start, p);
  g = r && r.code && boot(r.code);
  check(!!g && H.get(g, '设置.刺会扣命') === false, `「${p}」→ ${r && r.reply}`);
  H.run(g, '比特 = { 行: 3, 列: 9 }'); go(g, ['左']);
  check(H.get(g, '命') === 3 && pos(g) === '3,8' && H.get(g, '状态') === '玩', '  踩到刺：命不少，也不回起点');
}
r = say(say(start, '刺不扣命').code, '刺要扣命');
check(r && /刺会扣命: true,/.test(r.code), '「刺要扣命」改回来');
r = say(start, '刺会扣命');
check(r && r.code === null, '本来就是：不改代码 → ' + r.reply);
r = say(start, '做一个迷宫，3 颗星，5 条命');
g = r && r.code && boot(r.code);
check(!!g && H.get(g, '命') === 5 && /是我猜的/.test(r.reply), '一句话里既有地图又有设置 → ' + (r && r.reply));
check(say(start, '我想吃披萨') === null && say(start, '加一个怪物') === null, '认不出的话返回 null');

// ================= 乱七八糟的地图、设置 =================
console.log('乱填的地图和设置');
g = boot(setMap(start, '[]'));
check(!!g && /地图是空的/.test(H.get(g, '话')) && H.get(g, '行数') === 7, '地图是空的：说「地图是空的」，给一块空地，不崩');
go(g, ['右', '下']); check(pos(g) === '2,2', '  空地上也能走');
g = boot(setMap(start.replace('可以自己画: false,', '可以自己画: true,'), '[]'));
H.tap(g, ...画关卡); H.tap(g, ...种类.E); H.tap(g, ...cellXY(g, 1, 3)); H.tap(g, ...试玩); go(g, ['右', '右']);
check(H.get(g, '状态') === '过关', '  空地图 + 画关卡：画个终点就能玩');
g = boot(setMap(start, '["#####", "#S.?x好E#", "#.*", 42, null, "", "#^^^^^^^^^^^^^^^^^^^^"]'));
m = g && rowsOf(g);
check(!!g && m.length === 7 && m.every(x => x.length === 14) && m[1] === '#S....E#######' && m[2] === '#.*###########', '长短不齐、怪字、数字、null：短的补墙，怪字当路');
go(g, [...'右右右右右']);
check(H.get(g, '状态') === '过关', '  照样能走到终点');
g = boot(setMap(start, '["＃＃＃＃＃", "＃s.e＃", "＃＃＃＃＃"]'));
check(!!g && pos(g) === '1,1' && rowsOf(g)[1] === '#S.E#', '全角符号、小写 s e 也认');
g = boot(setMap(start, JSON.stringify(Array.from({ length: 12 }, () => 'S' + '.'.repeat(20) + 'E'))));
m = g && rowsOf(g);
check(!!g && m.length === 8 && m[0].length === 14 && count(m, 'S') === 1 && /没有终点/.test(H.get(g, '话')), '太大：只取左上角 8×14；多的起点变成路');
g = boot(setMap(start, '["###", "###"]'));
go(g, ['右', '下']);
check(!!g && pos(g) === '0,0', '全是墙：不崩，走不动');
g = boot(setMap(start, '"#####\\n#S.E#\\n#####"'));
check(!!g && rowsOf(g)[1] === '#S.E#', '地图写成一整串字（不是 [ ]）也能读');
g = boot(start.replace('有几条命: 3,', '有几条命: "很多",').replace('刺会扣命: true,', '刺会扣命: "false",'));
check(!!g && H.get(g, '命') === 3, '命填错了：用 3 条');
H.run(g, '比特 = { 行: 3, 列: 9 }'); go(g, ['左']);
check(H.get(g, '命') === 3, '刺会扣命 写成 "false" 也认');
g = boot(start.replace('有几条命: 3,', '有几条命: 0,'));
check(!!g && H.get(g, '命') === 3, '0 条命：用 3 条');
r = say(setMap(start, '[]'), '把关卡改难一点');
check(r && r.code && boot(r.code) && /是我猜的/.test(r.reply), '空地图上「改难一点」：猜一张难一点的 → ' + r.reply);
r = say(start.replace(/const 地图 = \[[\s\S]*?\n\];/, 'const 地图 = [];'), 图(示例));
g = r && r.code && boot(r.code);
check(!!g && rowsOf(g).join() === 示例.join() && /const 设置/.test(r.code) && /const 格子种类 = \[/.test(r.code), '「const 地图 = [];」写在一行上也能整段换掉，别的代码不动');
r = say(setMap(start, '["#####", "#S.?x好E#", "#.*", 42, null]'), '把关卡改难一点');
check(r && r.code && boot(r.code), '乱填的地图上「改难一点」也不崩 → ' + (r && r.reply));

console.log(process.exitCode ? '\n有没通过的' : '\n全部通过');
