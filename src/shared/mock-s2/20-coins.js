// 第 20 课《有虫的接金币》：游戏卡住了、白屏了怎么办？
// 三只虫只在极端情况才出现（0 条命、钱不够、两个键一起按）。孩子说清楚了、或者把报错交给精灵，才修那一只；别的不动。
S2PARTS.push(function (H) {
  'use strict';
  const N = H.NUM, CN = '零一两二三四五六七八九十';
  const lineOf = (c, s) => { const i = c.indexOf(s); return i < 0 ? -1 : c.slice(0, i).split('\n').length; };

  // ---------- 三只虫：还在不在、在第几行、怎么修 ----------
  const BUG1 = /(\n[ \t]*)心们\[心们\.length - 1\]\.跳一下 = 20;/;
  const BUG2 = /(\n[ \t]*)金币 = 金币 - 设置\.护盾价钱;/;
  const BUG3 = 'const 方向表 = { 左: -1, 右: 1 };';
  const BUGS = {
    1: {
      has: c => BUG1.test(c),
      line: c => lineOf(c, '心们[心们.length - 1].跳一下 = 20;'),
      fix: c => c.replace(BUG1, (m, a) => a + 'if (心们.length > 0) 心们[心们.length - 1].跳一下 = 20;'),
      reply: '找到了：最后一颗心去掉以后，程序还想让『最后一颗心』跳一下，可是已经一颗都没有了。改好了，再试一次 0 条命。'
    },
    2: {
      has: c => BUG2.test(c) && !c.includes('if (金币 < 设置.护盾价钱)'),
      line: c => lineOf(c, '金币 = 金币 - 设置.护盾价钱;'),
      fix: c => c.replace(BUG2, (m, a) => a + 'if (金币 < 设置.护盾价钱) { 说一句("钱不够，还差 " + (设置.护盾价钱 - 金币) + " 个金币"); return; }' + a + '金币 = 金币 - 设置.护盾价钱;'),
      reply: '找到了：买护盾时没先看钱够不够就付了钱。现在钱不够会告诉你还差几个，再用 0 个金币试试。'
    },
    3: {
      has: c => c.includes(BUG3),
      line: c => lineOf(c, 'const 方向表 = {'),
      fix: c => c.replace(BUG3, 'const 方向表 = { 左: -1, 右: 1, 左右: 0 };'),
      reply: '找到了：两个键一起按时，方向表里查不到「左右」，比特的位置就算坏了。现在一起按会站着不动。'
    }
  };
  const DONE = '这个已经修好了，再试一次看看。';
  const ASK = '哪里不对？你做了什么、结果怎样？要是有红色的报错，把它也告诉我。';
  function fixOne(code, n) {
    const b = BUGS[n];
    if (!b.has(code)) return { code: null, reply: DONE };
    return { code: b.fix(code), reply: b.reply };
  }

  // ---------- 孩子怎么描述这三只虫 ----------
  const PASTED = /TypeError|ReferenceError|SyntaxError|RangeError|Uncaught|Cannot (set|read) propert|undefined|is not an object|is not a function|is not defined|跳一下/i;
  const ERR1 = /跳一下|Cannot set propert|undefined/i;
  const SAY1 = /命没了|命都没了|心没了|心都没了|没命|没有命|命用完|命掉光|心掉光|没有心|最后一[条颗个]?(命|心)|(^|[^\d])[0零]\s*[条颗个]?\s*(命|心)|命.{0,6}(没了|没有了|用完|掉光|[为是成]\s*[0零])|心.{0,6}(没了|没有了|掉光|不见)/;
  const SAY1_WEAK = /卡住|卡死|卡了|卡在|不动了|动不了|白屏|黑屏|死机|定住|冻住|停住|画面不动|没反应/;
  const SAY2 = /钱不够|没钱|不够钱|没有钱|金币不够|没有金币|负数|负的|变成?负|-\s*\d|欠|也能买|还能买|照样能?买|也可以买|还可以买/;
  const SAY3 = /两个(键|按钮|方向键?|箭头)|两(根|个|只)手指|一起按|同时按|一块按|一齐按|左右.{0,6}(一起|同时)|(一起|同时).{0,6}(左右|◀|▶)|(比特|小狗|狗|主角)[^，。,！!命心]{0,6}(不见|消失|看不见|找不到|跑丢|隐身|跑没)|NaN/i;
  const SAY3_LOOSE = /(不见|消失)了/;
  const VAGUE = /坏了|有\s*bug|有虫|有问题|不对劲?|出错|出问题|修一?下|修好|帮我修|修修|不好玩|不正常|怪怪的|奇怪|不行/i;

  function whichBugs(p) {
    const s = [];
    if (SAY1.test(p)) s.push(1);
    if (SAY2.test(p)) s.push(2);
    if (SAY3.test(p) || (SAY3_LOOSE.test(p) && !/心|命|金币|钱|护盾|炸弹/.test(p))) s.push(3);
    if (!s.length && SAY1_WEAK.test(p)) s.push(1);
    return s;
  }

  // ---------- 设置：一开始几条命、护盾价钱、走路快慢、炸弹多少、掉得多少 ----------
  function settings(code, p) {
    let c = code, m; const said = [];
    const gap = '[^，。,！!\\d' + CN + ']{0,4}';
    if ((m = p.match(new RegExp('(?:一开始|开局|开始|改成|变成|设成|调成|换成|给|要|有)' + gap + N + '\\s*[条颗个]\\s*(?:命|心)'))) ||
        (m = p.match(new RegExp('(?:命|心)[^，。,！!]{0,6}?(?:改成|变成|设成|调成|换成|有)\\s*' + N))) ||
        (m = p.match(new RegExp('^\\s*' + N + '\\s*条命\\s*[。！!]?\\s*$')))) {
      const n = Math.max(1, Math.min(20, H.toNum(m[1]) || 3));
      c = H.setSetting(c, '一开始几条命', String(n)); said.push(`一开始有 ${n} 条命了。`);
    }
    if ((m = p.match(new RegExp('护盾[^，。,！!\\d' + CN + ']{0,8}' + N + '\\s*[个块枚]?\\s*(?:金币|钱|块)?'))) && /价|钱|金币|块|卖|改|变|要/.test(p)) {
      const n = Math.max(0, Math.min(99, H.toNum(m[1]) || 0));
      c = H.setSetting(c, '护盾价钱', String(n)); said.push(`护盾现在要 ${n} 个金币。`);
    } else if (/护盾[^，。,！!]{0,6}(便宜|太贵)/.test(p)) { c = H.setSetting(c, '护盾价钱', '3'); said.push('护盾便宜了，3 个金币一个。'); }
    else if (/护盾[^，。,！!]{0,6}(贵一点|贵点|太便宜)/.test(p)) { c = H.setSetting(c, '护盾价钱', '8'); said.push('护盾贵了，8 个金币一个。'); }
    if (/(走|跑|移动|比特|速度)[^，。,！!]{0,6}(快一点|快点|快些|更快|太慢)/.test(p)) { c = H.setSetting(c, '移动速度', '12'); said.push('比特走得快一点了。'); }
    else if (/(走|跑|移动|比特|速度)[^，。,！!]{0,6}(慢一点|慢点|慢些|更慢|太快)/.test(p)) { c = H.setSetting(c, '移动速度', '5'); said.push('比特走得慢一点了。'); }
    if (/不要炸弹|没有炸弹|去掉炸弹|炸弹去掉/.test(p)) { c = H.setSetting(c, '炸弹出现机会', '0'); said.push('不掉炸弹了。'); }
    else if (/炸弹[^，。,！!]{0,6}(多一点|多点|多些|更多|太少)/.test(p)) { c = H.setSetting(c, '炸弹出现机会', '0.5'); said.push('炸弹多了，一半是炸弹。'); }
    else if (/炸弹[^，。,！!]{0,6}(少一点|少点|少些|更少|太多)/.test(p)) { c = H.setSetting(c, '炸弹出现机会', '0.15'); said.push('炸弹少一点了。'); }
    if (!/炸弹/.test(p)) {
      if (/掉(得|的)?[^，。,！!]{0,4}(多一点|快一点|多点|快点|更多|更快)|东西[^，。,！!]{0,4}(多一点|多点)/.test(p)) { c = H.setSetting(c, '掉东西间隔帧', '25'); said.push('东西掉得多一点了。'); }
      else if (/掉(得|的)?[^，。,！!]{0,4}(少一点|慢一点|少点|慢点)|东西[^，。,！!]{0,4}(少一点|少点)/.test(p)) { c = H.setSetting(c, '掉东西间隔帧', '60'); said.push('东西掉得少一点了。'); }
    }
    if (!said.length && (m = p.match(/把?\s*([一-龥]{1,8}?)\s*(?:改成|变成|调成|设成|设为|改为|调到)\s*(-?\d+(?:\.\d+)?)/)) && H.hasSetting(c, m[1])) {
      c = H.setSetting(c, m[1], m[2]); said.push(`「${m[1]}」改成 ${m[2]} 了。`);
    }
    return said.length && c !== code ? { code: c, reply: said.join(' ') } : null;
  }

  function run(code, prompt, mode, error) {
    const p = String(prompt || ''), err = String(error || '').trim();
    // 1. 带着报错来的：看报错说了什么
    if (err || PASTED.test(p)) {
      if (ERR1.test(err + '\n' + p)) return fixOne(code, 1);
      return { code: null, reply: '这个报错我还看不懂。你做了什么、结果怎样？说给我听听。' };
    }
    // 2. 说了第几行（报错里写的行号）
    const ln = p.match(/第\s*(\d+)\s*行/);
    if (ln) {
      const at = [1, 2, 3].filter(n => BUGS[n].line(code) > 0 && Math.abs(BUGS[n].line(code) - +ln[1]) <= 1);
      if (at.length === 1) return fixOne(code, at[0]);
    }
    // 3. 说清楚了是哪只虫
    const s = whichBugs(p);
    if (s.length > 1) return { code: null, reply: '你说了好几个问题，一次修一个吧：先修哪一个？' };
    if (s.length === 1) return fixOne(code, s[0]);
    // 4. 改设置
    const st = settings(code, p);
    if (st) return st;
    // 5. 太模糊：反问
    if (VAGUE.test(p)) return { code: null, reply: ASK };
    return null;
  }

  return {
    key: 'coins',
    is: code => code.includes('function 买护盾()'),
    run,
    CAN: '修虫（说清楚做了什么、结果怎样，或者把红色报错告诉我）：0 条命卡住、钱不够也能买护盾、两个键一起按比特不见；改设置：一开始几条命、护盾几个金币、走快走慢、炸弹多少、东西掉得多少'
  };
});
