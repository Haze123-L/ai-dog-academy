// 第 17 课「怪兽怎么会换招？」：大怪兽。孩子用"状态表"下指令：有几种状态、什么时候换、每种做什么。
// 认识：① 贴来的状态表（整张换掉）② 只说"让怪兽会生气"（什么时候是猜的）③ 一句话说清一个状态 ④ 改设置 ⑤ 删掉一个状态 ⑥ 问"怎么不换"
// 读"什么时候""做什么"的规则和游戏里的 读什么时候 / 读做什么 一样，所以精灵说"不认识"的，游戏里也会标"?"。
S2PARTS.push(function (H) {
  const 记号 = 'const 状态们 = [';
  const 表块 = /const 状态们 = \[([\s\S]*?)\n\];/;

  // ---------- 和游戏里一样的读法 ----------
  const 中文数字 = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  function 读数(字) {
    if (/^\d/.test(字)) return parseFloat(字);
    if (字.includes('十')) { const 段 = 字.split('十'); return (段[0] ? 中文数字[段[0]] || 0 : 1) * 10 + (段[1] ? 中文数字[段[1]] || 0 : 0); }
    return 中文数字[字] || 0;
  }
  const 数字 = '(\\d+(?:\\.\\d+)?|[零一两二三四五六七八九十]+)';
  function 读什么时候(字) {
    const 文 = String(字 == null ? '' : 字).replace(/\s/g, '');
    if (!文) return null;
    if (/一开始|开始|开局/.test(文)) return { 类型: '一开始' };
    if (/一半|半血/.test(文)) return { 类型: '血量剩一半' };
    if (/打中|被打|挨打|砸中|受伤/.test(文)) return { 类型: '被打中' };
    const m = 文.match(new RegExp(数字 + '秒'));
    if (m) { const 秒 = 读数(m[1]); return 秒 > 0 ? { 类型: '过了', 秒 } : null; }
    if (/走远|离开|跑远|远离|走开|离远/.test(文)) return { 类型: '比特走远' };
    if (/靠近|走近|接近|过来|很近/.test(文)) return { 类型: '比特靠近' };
    return null;
  }
  const 做法们 = [
    ['喷火', /喷火|吐火|火球|放火/],
    ['睡觉', /睡/],
    ['不动', /不动|站着|站住|停|不追/],
    ['逃跑', /逃|躲|跑开|害怕/],
    ['跑得飞快', /飞快|冲|快速|狂奔|很快|快跑|加速/],
    ['追比特', /追/],
    ['慢慢走', /慢慢|散步|巡逻|走来走去|随便走|闲逛|溜达/],
  ];
  function 读做什么(字) {
    const 文 = String(字 == null ? '' : 字).replace(/\s/g, '');
    for (const [做法, 认] of 做法们) if (认.test(文)) return 做法;
    return null;
  }

  // ---------- 状态名字、样子 ----------
  const 名字们 = {   // 名字 → [样子, 没说做什么时默认做什么]
    生气: ['👹', '追比特'], 睡觉: ['😴', '睡觉'], 喷火: ['🐲', '喷火'], 逃跑: ['😱', '逃跑'], 害怕: ['😨', '逃跑'],
    累了: ['🥵', '不动'], 发疯: ['👺', '跑得飞快'], 狂暴: ['👺', '跑得飞快'], 暴怒: ['👺', '跑得飞快'], 冲刺: ['👺', '跑得飞快'],
    发呆: ['😶', '不动'], 休息: ['😌', '不动'], 巡逻: ['👹', '慢慢走'], 散步: ['👹', '慢慢走'], 晕了: ['😵‍💫', '不动'],
  };
  const 别名 = { 发火: '生气', 愤怒: '生气', 生起气: '生气', 睡着: '睡觉', 打瞌睡: '睡觉', 逃走: '逃跑', 吐火: '喷火', 发狂: '发疯', 晕倒: '晕了' };
  const 做法的名字 = { 追比特: '生气', 跑得飞快: '狂暴', 逃跑: '逃跑', 喷火: '喷火', 睡觉: '睡觉', 不动: '发呆', 慢慢走: '巡逻' };
  const 做法的样子 = { 追比特: '👹', 跑得飞快: '👺', 逃跑: '😱', 喷火: '🐲', 睡觉: '😴', 不动: '😶', 慢慢走: '👹' };
  const 做法的说法 = { 追比特: '追你', 跑得飞快: '飞快地冲向你', 逃跑: '逃跑', 喷火: '朝你喷火', 睡觉: '睡觉', 不动: '站着不动', 慢慢走: '慢慢走' };
  let 是表情;
  try { 是表情 = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { 是表情 = /[☀-➿\uD83C-\uDBFF]/; }
  function 找名字(文) {
    const 全部 = Object.keys(名字们).concat(Object.keys(别名)).sort((a, b) => b.length - a.length);
    const k = 全部.find(n => 文.includes(n));
    return k ? (别名[k] || k) : null;
  }
  const 时候说法 = 时 => 时.类型 === '过了' ? `过 ${时.秒} 秒就` : 时.类型 === '一开始' ? '一开始就' : 时.类型 === '被打中' ? '被雪球打中就' : 时.类型 + '就';
  const 时候短 = 时 => 时.类型 === '过了' ? `过${时.秒}秒` : 时.类型;
  const 自己说清了 = ['巡逻', '散步', '睡觉', '逃跑', '发呆', '休息'];   // 名字本身就是做法，不用再说一遍
  function 做的说法(名字, 做) {
    const 说 = 做法的说法[做] || 做;
    if (说.includes(名字) || (自己说清了.includes(名字) && 名字们[名字][1] === 做)) return 说.includes(名字) ? 说 : 名字;
    return 名字 + (/了$|呆$/.test(名字) ? '，' : '') + 说;
  }

  // ---------- 读表、写表 ----------
  const 引 = s => JSON.stringify(String(s));
  const 行文字 = r => `{ 名字: ${引(r.名字)}, 样子: ${引(r.样子)}, 什么时候: ${引(r.什么时候)}, 做什么: ${引(r.做什么)} },`;
  function 读表(code) {
    const m = code.match(表块); if (!m) return null;
    return m[1].split('\n').filter(l => /^\s*\{/.test(l)).map(l => {
      const 取 = k => { const x = l.match(new RegExp(k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"')); if (!x) return ''; try { return JSON.parse('"' + x[1] + '"'); } catch (e) { return x[1]; } };
      return { 名字: 取('名字'), 样子: 取('样子'), 什么时候: 取('什么时候'), 做什么: 取('做什么') };
    });
  }
  function 换整张表(code, 行们) {
    const 身体 = 行们.map(r => '\n  ' + 行文字(r)).join('');
    return code.replace(表块, () => 'const 状态们 = [' + 身体 + '\n];');
  }
  // 名字一样的那一行换掉；没有就加在最后（放最前面：一开始的状态）
  function 放一行(code, 行, 放最前面) {
    const m = code.match(表块);
    const 行们 = m[1].split('\n');
    const i = 行们.findIndex(l => /^\s*\{/.test(l) && (l.match(/名字:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] === 行.名字);
    const 新 = '  ' + 行文字(行);
    if (i >= 0) 行们[i] = 新;
    else if (放最前面) 行们.splice(1, 0, 新);
    else 行们.push(新);
    return { code: code.replace(表块, () => 'const 状态们 = [' + 行们.join('\n') + '\n];'), 换掉了: i >= 0 };
  }
  function 删一行(code, 名字) {
    const m = code.match(表块);
    const 行们 = m[1].split('\n').filter(l => !(/^\s*\{/.test(l) && (l.match(/名字:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] === 名字));
    return code.replace(表块, () => 'const 状态们 = [' + 行们.join('\n') + '\n];');
  }

  // 看看表能不能用：哪一行是一开始、哪些行能换进去、哪些写法不认识
  function 看表(行们) {
    const 时们 = 行们.map(r => 读什么时候(r.什么时候)), 做们 = 行们.map(r => 读做什么(r.做什么));
    let 起点 = 时们.findIndex(t => t && t.类型 === '一开始'); if (起点 < 0) 起点 = 0;
    const 能进 = 行们.map((r, i) => i !== 起点 && !!时们[i] && 时们[i].类型 !== '一开始');
    return { 时们, 做们, 起点, 能进, 有能进的: 能进.some(Boolean) };
  }
  function 提醒(行们, 看) {
    const 话 = [];
    const 不会做 = 行们.filter((r, i) => !看.做们[i]);
    if (不会做.length) {
      const 有字 = 不会做.filter(r => r.做什么).map(r => `「${r.做什么}」`);
      话.push(有字.length ? `${[...new Set(有字)].join('')}我不会，先当成不动。` : `「${不会做[0].名字}」没写做什么，先当成不动。`);
    }
    const 看不懂 = 行们.filter((r, i) => i !== 看.起点 && !看.时们[i]);
    if (看不懂.length) {
      const 有字 = 看不懂.filter(r => r.什么时候).map(r => `「${r.什么时候}」`);
      话.push(有字.length ? `${[...new Set(有字)].join('')}我看不懂，那行换不过去。` : `「${看不懂[0].名字}」没写什么时候，换不过去。`);
    }
    if (!看.有能进的 && !看不懂.length) 话.push(行们.length === 1 ? '只有一种状态，怪兽不会换。再加一行吧。' : `除了「${行们[看.起点].名字}」，别的行都换不过去，写清什么时候换。`);
    else {
      const 多余 = 行们.filter((r, i) => i !== 看.起点 && 看.时们[i] && 看.时们[i].类型 === '一开始');
      if (多余.length) 话.push(`「${多余[0].名字}」也写一开始，只有第一个算。`);
    }
    return 话.slice(0, 2).join('');
  }

  // ---------- ① 贴来的状态表 ----------
  function 读贴的表(p) {
    const 线们 = p.split(/\r?\n/).map(s => s.trim()).filter(s => s.includes('|'));
    if (线们.length < 2) return null;
    const 格 = l => { let s = l; if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map(c => c.trim()); };
    const 头 = 线们.findIndex(l => /状态|名字/.test(l));
    if (头 < 0) return { 错: '表头要有「状态」或「名字」这一列，我才看得懂。' };
    const 列 = { 名字: -1, 样子: -1, 什么时候: -1, 做什么: -1 };
    格(线们[头]).forEach((h, i) => {
      if (列.做什么 < 0 && /做什么|做啥|干什么|干啥|动作/.test(h)) 列.做什么 = i;
      else if (列.什么时候 < 0 && /什么时候|时候|何时|条件/.test(h)) 列.什么时候 = i;
      else if (列.样子 < 0 && /样子|长相|图案|表情|长什么样|外形/.test(h)) 列.样子 = i;
      else if (列.名字 < 0 && /名字|状态|叫什么/.test(h)) 列.名字 = i;
    });
    if (列.名字 < 0) 列.名字 = [0, 1, 2, 3].find(i => !Object.values(列).includes(i));
    const 行们 = [];
    for (const l of 线们.slice(头 + 1)) {
      const c = 格(l);
      if (c.every(x => /^:?-*:?$/.test(x))) continue;   // 分隔行、空行
      const 取 = k => 列[k] >= 0 ? (c[列[k]] || '').trim() : '';
      const r = { 名字: 取('名字') || '状态' + (行们.length + 1), 样子: 取('样子'), 什么时候: 取('什么时候'), 做什么: 取('做什么') };
      if (!是表情.test(r.样子)) {
        const 做 = 读做什么(r.做什么), 名 = 名字们[r.名字] || 名字们[别名[r.名字]];
        r.样子 = 名 ? 名[0] : 做 ? 做法的样子[做] : '👹';
      }
      行们.push(r);
    }
    return { 行们 };
  }

  // ---------- ③ 一句话里的"什么时候" ----------
  const 时候们 = [
    ['一开始', /一开始|刚开始|开局|开始的时候/],
    ['血量剩一半', /一半|半血/],
    ['被打中', /被打中|打中|被打|挨打|砸中|被雪球|受伤/],
    ['比特走远', /走远|离开|跑远|远离|离.{0,5}远/],
    ['比特靠近', /靠近|走近|接近|过来|离.{0,5}近|很近/],
    ['过了', new RegExp('(?:过了?|等了?)?' + 数字 + '秒钟?(?:以后|之后|后)?')],
  ];
  function 找时候(t) {
    let 最早 = null;
    for (const [类型, re] of 时候们) {
      const m = t.match(re); if (!m) continue;
      if (类型 === '过了' && !(读数(m[1]) > 0)) continue;
      if (!最早 || m.index < 最早.m.index) 最早 = { 类型, m };
    }
    if (!最早) return null;
    const 时 = 最早.类型 === '过了' ? { 类型: '过了', 秒: 读数(最早.m[1]) } : { 类型: 最早.类型 };
    const 剩下 = t.slice(0, 最早.m.index) + ' ' + t.slice(最早.m.index + 最早.m[0].length);
    return { 时, 写法: 时.类型 === '过了' ? `过了${时.秒}秒` : 时.类型, 剩下 };
  }
  const 去掉不要的 = s => s.replace(/(不要|别|不再)再?(追|喷火|喷|睡觉|睡|逃跑|逃|跑|冲|巡逻)了?/g, ' ');

  // ---------- ④ 设置 ----------
  const 数2 = '(\\d+|[零一两二三四五六七八九十]+)';
  const 改成 = '(?:改成|变成|设成|调成|调到|改为|设为|换成|是|有|=|:|：)?';
  const 设置们 = [
    { 键: '怪兽血量', 最小: 1, 最大: 99, 认: [new RegExp('血量?' + 改成 + 数2 + '(?!秒)'), new RegExp(数2 + '(?:滴|点|格)?血')], 说: v => `怪兽血量改成 ${v} 了。` },
    { 键: '星星有几颗', 最小: 0, 最大: 20, 认: [new RegExp('(?:星星?|⭐)' + 改成 + 数2), new RegExp(数2 + '(?:颗|个)?(?:星星?|⭐)')], 说: v => `现在有 ${v} 颗星星。` },
    { 键: '比特有几颗心', 最小: 1, 最大: 10, 认: [new RegExp(数2 + '(?:颗|条|个)?(?:心|命|生命|❤)'), new RegExp('(?:心|命|生命)' + 改成 + 数2)], 说: v => `比特有 ${v} 颗心了。` },
    { 键: '靠近是多近', 最小: 20, 最大: 900, 认: [new RegExp('(?:靠近是多近|多近算靠近|靠近的距离|靠近距离)' + 改成 + 数2), new RegExp(数2 + '(?:像素|格)?(?:以内)?(?:就算|算|叫)靠近')], 说: v => `离怪兽 ${v} 以内算靠近。` },
  ];
  function 改设置(code, t) {
    let c = code; const 说 = [];
    for (const s of 设置们) {
      let m = null;
      for (const re of s.认) if ((m = t.match(re))) break;
      if (!m) continue;
      const v = Math.min(s.最大, Math.max(s.最小, Math.round(读数(m[1]))));
      c = H.setSetting(c, s.键, String(v)); 说.push(s.说(v));
    }
    if (/(不能|不可以|不让|不准|不许|不要|别|没有|去掉|关掉|取消)(比特)?再?扔?雪球/.test(t)) { c = H.setSetting(c, '可以扔雪球', 'false'); 说.push('不能扔雪球了，只能收星星赢。'); }
    else if (/(能|可以|会|要)扔雪球|加上?雪球|打开雪球|有雪球/.test(t)) { c = H.setSetting(c, '可以扔雪球', 'true'); 说.push('可以扔雪球了。'); }
    return 说.length ? { code: c, reply: 说.join('') } : null;
  }

  // ---------- 问"怎么不换" ----------
  function 讲表(行们) {
    if (!行们.length) return '状态表是空的，怪兽只会站着。加一行试试。';
    const 看 = 看表(行们);
    if (!看.有能进的) return `只有「${行们[看.起点].名字}」用得上，怪兽换不了。再加一行，写清什么时候换。`;
    const 怎么换 = 行们.map((r, i) => 看.能进[i] ? `${时候短(看.时们[i])}→${r.名字}` : null).filter(Boolean).slice(0, 3);
    return `表能用：${怎么换.join('，')}。试试看！`;
  }

  function run(code, prompt, mode, error) {
    if (!code.includes(记号)) return null;
    const p = String(prompt || '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).replace(/｜/g, '|');
    const t = p.replace(/\s+/g, '');
    const 现在的表 = 读表(code) || [];

    // ① 状态表：整张换掉
    const 贴的 = 读贴的表(p);
    if (贴的) {
      if (贴的.错) return { code: null, reply: 贴的.错 };
      if (!贴的.行们.length) return { code: null, reply: '表里还没填状态，填好一行再发我。' };
      const 行们 = 贴的.行们;
      return { code: 换整张表(code, 行们), reply: `照表改好了：怪兽有 ${行们.length} 种状态。` + 提醒(行们, 看表(行们)) };
    }

    const 时 = 找时候(t);

    // ⑤ 删掉一个状态
    if (!时 && /(删掉|去掉|删除|拿掉|不要|取消)/.test(t)) {
      const 名 = 现在的表.map(r => r.名字).filter(Boolean).sort((a, b) => b.length - a.length).find(n => t.includes(n));
      if (名) {
        const c = 删一行(code, 名), 剩 = 读表(c);
        return { code: c, reply: `删掉了「${名}」。` + (剩.length ? 提醒(剩, 看表(剩)) : '表空了，怪兽只会站着。') };
      }
    }

    // ③ 一句话说清一个状态：什么时候 + 做什么（或名字）
    if (时) {
      const 剩下 = 去掉不要的(时.剩下);
      const 做 = 读做什么(剩下), 名0 = 找名字(剩下);
      if (做 || 名0) {
        const 名 = 名0 || 做法的名字[做], 真做 = 做 || 名字们[名][1];
        const 旧 = 现在的表.find(r => r.名字 === 名);
        const 行 = { 名字: 名, 样子: 旧 && 旧.样子 ? 旧.样子 : (名字们[名] ? 名字们[名][0] : 做法的样子[真做]), 什么时候: 时.写法, 做什么: 真做 };
        const 一开始 = 时.时.类型 === '一开始';
        const 放 = 放一行(code, 行, 一开始 && !旧);
        let 话 = `${放.换掉了 ? '改好了' : '加了'}「${名}」：${时候说法(时.时)}${做的说法(名, 真做)}。`;
        const 表 = 读表(放.code), 看 = 看表(表);
        if (一开始 && 表[看.起点].名字 !== 名) 话 += `可「${表[看.起点].名字}」排在前面，只有第一个算。`;
        else if (一开始) { const 原来 = 表.find((r, i) => i !== 看.起点 && 看.时们[i] && 看.时们[i].类型 === '一开始'); if (原来) 话 += `「${原来.名字}」就用不上了，要的话说说什么时候${原来.名字}。`; }
        if ((时.时.类型 === '被打中' || 时.时.类型 === '血量剩一半') && /\n\s*可以扔雪球:\s*false/.test(code)) 话 += '可现在不能扔雪球，打不中它。';
        return { code: 放.code, reply: 话 };
      }
    }

    // ④ 设置
    const 设 = 改设置(code, t);
    if (设) return 设;

    if (时) return { code: null, reply: `${时.写法}的时候，怪兽做什么？追你、逃跑、喷火、睡觉……说清楚我再加。` };

    // 问：怎么不换？
    if (/为什么|怎么不|怎么没|不换|没换|不变|没变|检查|对不对/.test(t)) return { code: null, reply: 讲表(现在的表) };

    // ② 只说一句话，不说什么时候：时候是猜的
    if (!时 && !/太|一点|多一些|少一些|别|不要|不会|不能/.test(t) && (/怪兽|它|boss/i.test(t) || !/比特/.test(t))) {
      const 剩下 = 去掉不要的(t);
      const 做 = 读做什么(剩下), 名0 = 找名字(剩下);
      if ((做 || 名0) && /怪兽|它|boss|让|会|加/i.test(t)) {
        const 名 = 名0 || 做法的名字[做], 真做 = 做 || 名字们[名][1];
        if (现在的表.some(r => r.名字 === 名)) return { code: null, reply: `表里已经有「${名}」了。想换什么时候${名}，就说「比特靠近的时候${名}」。` };
        const 行 = { 名字: 名, 样子: 名字们[名] ? 名字们[名][0] : 做法的样子[真做], 什么时候: '过了5秒', 做什么: 真做 };
        return { code: 放一行(code, 行, false).code, reply: `加了「${名}」：过 5 秒就${做的说法(名, 真做)}。什么时候${名}，是我猜的。` };
      }
    }

    // 「把 xx 改成 3」
    const g = t.match(/把?([一-龥]{1,8}?)(?:改成|变成|调成|设成|设为|改为|调到)(-?\d+)/);
    if (g && H.hasSetting(code, g[1])) return { code: H.setSetting(code, g[1], g[2]), reply: `「${g[1]}」改成 ${g[2]} 了。` };
    return null;
  }

  return {
    key: 'boss',
    is: code => code.includes(记号),
    run,
    CAN: '贴状态表（照表改怪兽）、让怪兽会生气／睡觉、一句话加一个状态（比特靠近的时候怪兽生气追比特、血量剩一半的时候喷火、被打中以后逃跑）、删掉某个状态、改怪兽血量／星星／心、不能扔雪球',
  };
});
