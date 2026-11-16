// 第二季（第 14–24 节）的课堂流程：先说计划 → 同意、说明书、需求卡、大屏演示（两份、按剧本、带报错）、所有新游戏起始能跑
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./s2-harness');
const pack = require('../app/lib/lessons-pack.js');
const ClassCore = require('../app/lib/core-state.js');
const Service = require('../app/lib/service.js');
const Mock = require('../app/lib/mock-genie.js');
const { check } = H;
const GAMES_DIR = path.join(__dirname, '..', 'app', 'games');
const starter = name => { const g = pack.GAMES[name]; return g ? fs.readFileSync(path.join(GAMES_DIR, g.file), 'utf8') : ''; };

(async () => {
  // ---------- 1. 每个新游戏都能跑，演示精灵认得它 ----------
  for (const k of ['monster', 'maze', 'breakout', 'boss', 'star', 'coins']) {
    const code = starter(k);
    if (!code) { check(false, `${k}：起始游戏文件不在`); continue; }
    let ok = true; try { const g = H.loadGame(code); H.frames(g, 120); } catch (e) { ok = false; console.log('   ', e.message); }
    check(ok, `${k}（${pack.GAMES[k].name}）：起始游戏能跑 120 帧`);
    check(!!Mock.partOf(code), `${k}：演示精灵认得这个游戏`);
  }

  // ---------- 2. 课堂：老师、两个学生 ----------
  const mem = new Map(); const store = { get: k => mem.has(k) ? mem.get(k) : null, put: (k, v) => { if (v == null) mem.delete(k); else mem.set(k, v); } };
  const core = ClassCore.create({ lessons: pack.LESSONS });
  const T = { role: 'teacher' };
  core.act(T, { type: 'roster.set', names: ['小明', '小红'] }); core.act(T, { type: 'teams.draw' });
  const svc = Service.create({ core, store, starter, llm: null, dog: null, filter: t => /坏词/.test(t), ACTS: pack.ACTS, MOODS: pack.MOODS, GAMES: pack.GAMES });
  const [a, b] = core.state.cls.roster.map(r => r.sid);

  // 第 16 节：先说计划
  core.act(T, { type: 'go', lesson: 'L16', slide: core.lessonOf('L16').slides.findIndex(s => s.id === 'make') });
  let r = await svc.genie(a, { proj: 'breakout', prompt: '让砖块更厉害', plan: true });
  check(r.plan && r.plan.length === 3 && !r.changed, '先说计划：模糊的说法给出 3 步计划，代码没改 → ' + (r.plan || []).join(' / '));
  check(!!svc.work({ role: 'student', sid: a }, a, 'breakout').pending, '计划等着同意（刷新平板也还在）');
  check((svc.summary(a, 'breakout').talk || []).some(x => x.plan && x.plan.length === 3), '聊天记录里有这份计划');
  r = await svc.genie(a, { proj: 'breakout', reject: true });
  check(!svc.work({ role: 'student', sid: a }, a, 'breakout').pending, '按「不对」：计划作废');
  r = await svc.genie(a, { proj: 'breakout', approve: true });
  check(!!r.err, '没有计划时按「同意」会提示');
  r = await svc.genie(a, { proj: 'breakout', prompt: '红色的砖要打 3 下才碎', plan: true });
  r = await svc.genie(a, { proj: 'breakout', approve: true });
  const bcode = svc.work({ role: 'student', sid: a }, a, 'breakout').code;
  check(r.changed && /记号: "红"[^\n]*打几下才碎: 3/.test(bcode), '按「同意」：照计划改了（红砖打 3 下）');

  // 第 19 节：说明书
  r = svc.specSave(a, { proj: 'rules', rules: ['接到炸弹扣 3 分', '有 60 秒倒计时', '', '主角是小猫'] });
  check(r.ok, '说明书存好了');
  check(svc.specOf({ role: 'student', sid: a }, a, 'rules').rules.length === 4, '自己能读自己的说明书');
  check(!!svc.specOf({ role: 'student', sid: b }, a, 'rules').err, '没配对时，别人读不到我的说明书');
  check(!!svc.specSave(a, { proj: 'rules', rules: ['坏词'] }).err, '说明书里有不合适的话会被挡');
  svc.specSave(a, { proj: 'rules', rules: ['接到炸弹扣 3 分', '有 60 秒倒计时', '主角是小猫'] });
  for (const p of ['加一颗炸弹，接到扣 3 分', '加 60 秒倒计时', '主角换成小猫', '把游戏整理一下，换成晚上']) r = await svc.genie(a, { proj: 'rules', prompt: p });
  let c = svc.work({ role: 'student', sid: a }, a, 'rules').code;
  check(c.includes('名字: "炸弹"') && c.includes('剩余时间') && c.includes('主角: "🐱"') && c.includes('#1E2A4A'), '有说明书时「整理一下」：规则都还在，也换成了晚上');
  check(/说明书上的 3 条/.test(r.reply), '精灵回复里说对照了说明书 → ' + r.reply);
  for (const p of ['加一颗炸弹，接到扣 3 分', '加 60 秒倒计时', '把游戏整理一下，换成晚上']) r = await svc.genie(b, { proj: 'rules', prompt: p });
  c = svc.work({ role: 'student', sid: b }, b, 'rules').code;
  check(!c.includes('名字: "炸弹"') && !c.includes('剩余时间'), '没有说明书时「整理一下」：以前的规则丢了');
  // 守规则赛：交换后能读对方的说明书
  core.act(T, { type: 'go', lesson: 'L19', slide: core.lessonOf('L19').slides.findIndex(s => s.id === 'keep') });
  core.act(T, { type: 'balance.swap' });
  const pair = core.slideData(core.curKey()).pairs;
  check(svc.specOf({ role: 'student', sid: pair[b] === a ? b : a }, pair[b] === a ? a : b, 'rules').rules != null, '守规则赛：交换以后能读对方的说明书');

  // 第 23 节：需求卡
  r = svc.needsSave(a, { card: { who: '奶奶', name: '奶奶的花园', base: 'catch', started: true, qa: [{ q: '你喜欢什么动物或东西？', a: '花' }, { q: '玩一局要多长时间？', a: '两分钟' }] } });
  check(r.card && r.card.started && r.card.qa.length === 2, '需求卡存好了');
  r = svc.importWork(a, { proj: 'family', from: 'catch' });
  check(!r.err && /喂饱比特/.test(svc.work({ role: 'student', sid: a }, a, 'family').code), '从选的游戏开始做（给家人的游戏）');

  // 大屏演示：两份、按剧本、带说明书、先说计划、报错
  core.act(T, { type: 'go', lesson: 'L19', slide: core.lessonOf('L19').slides.findIndex(s => s.id === 'demo1') });
  for (const p of ['加一颗炸弹，接到扣 3 分', '把游戏整理一下，换成晚上']) await svc.demo({ game: 'catch', slot: 'catch@无说明书', mock: true, prompt: p });
  for (const p of ['加一颗炸弹，接到扣 3 分', '把游戏整理一下，换成晚上']) await svc.demo({ game: 'catch', slot: 'catch@有说明书', mock: true, spec: ['接到炸弹扣 3 分'], prompt: p });
  check(!svc.demoCode('catch@无说明书').includes('名字: "炸弹"') && svc.demoCode('catch@有说明书').includes('名字: "炸弹"'), '第 19 节两份演示各是各的：没说明书丢了炸弹，有说明书还在');
  check(core.state.live.demo.key === 'catch@有说明书', '大屏知道现在演示的是哪一份');
  r = await svc.demo({ game: 'breakout', plan: true, prompt: '让游戏更好玩' });
  check(core.state.live.demo.plan && core.state.live.demo.plan.length === 3 && !core.state.live.demo.changed, '大屏先说计划：列出计划，没改代码');
  r = await svc.demo({ game: 'breakout', plan: true, approve: true });
  check(core.state.live.demo.changed && /同意计划/.test(core.state.live.demo.prompt), '大屏按「同意」：照计划改了');
  svc.demoError({ key: 'coins', msg: "Cannot set properties of undefined (setting '跳一下')（第 61 行）", line: 61 });
  check(core.view(T).demoErr && core.view(T).demoErr.line === 61, '大屏的游戏报错，老师端看得到');
  r = await svc.demo({ game: 'coins', prompt: '', error: core.state.live.demoErr.msg });
  check(core.state.live.demo.changed && svc.demoCode('coins').includes('if (心们.length > 0)'), '把报错交给精灵：修好了 0 条命的虫 → ' + core.state.live.demo.reply);
  check(!core.view(T).demoErr, '修完以后报错条消失');

  // 学生把报错交给精灵（第 20 节）
  r = await svc.genie(a, { proj: 'coins', prompt: '', error: "Uncaught TypeError: Cannot set properties of undefined (setting '跳一下')（第 61 行：心们[心们.length - 1].跳一下 = 20;）" });
  check(r.changed, '孩子按「把问题告诉精灵」：带着报错修好了 → ' + r.reply);

  // 课程包：第二季每节都在，月结算算的是本班的课
  const ids = pack.LESSONS.map(l => l.id);
  for (let n = 13; n <= 24; n++) check(ids.includes('L' + n) && ids.includes('L' + n + 'H'), `第 ${n} 节：低龄班、高龄班都有`);
  const r16 = core.lessonOf('L16H').slides.find(s => s.type === 'result');
  check(r16.pack.join() === 'L13H,L14H,L15H,L16H', '高龄班第 16 节月结算只算高龄班的课');
  console.log(process.exitCode ? '\n有没通过的' : '\n全部通过');
})().catch(e => { console.error(e); process.exitCode = 1; });
