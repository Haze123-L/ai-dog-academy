'use strict';
// 4495 金元宝补丁：实际绘制路径、模型纠正重试和无修改回复。
const assert=require('assert/strict');
const H=require('./s2-harness'),G=require('../app/lib/genie-core'),Service=require('../app/lib/service'),Core=require('../app/lib/core-state');
const start=H.starter('喂饱比特.html');
const oldItem='{ 名字: "骨头", 图案: "🦴", 接到加几分: 1, 出现机会: 1 }';
const gold=start.replace(oldItem,'{ 名字: "金元宝", 画法: "金元宝", 接到加几分: 5, 出现机会: 1 }');
const fake=start.replace(oldItem,'{ 名字: "金元宝", 图案: "💰", 接到加几分: 5, 出现机会: 1 }');
assert.notEqual(start,gold);
assert.equal(G.validate(gold),null);
const game=H.loadGame(gold);let draws=0;const draw=game.画金元宝;game.画金元宝=(...args)=>{draws++;return draw(...args);};H.frames(game,180);assert.ok(draws>0,'掉落元宝实际走Canvas绘制分支');
assert.ok(G.emojiTrap('加入金元宝',start,fake));
assert.equal(G.emojiTrap('加入金元宝',start,gold),null);
assert.equal(G.emojiTrap('加金币',start,fake),null);
const existing=start+'\n<!-- 已有装饰 💰 -->';
assert.equal(G.emojiTrap('加入金元宝',existing,gold+'\n<!-- 已有装饰 💰 -->'),null,'不因已有无关钱袋重试');
assert.equal(G.emojiTrap('加入金元宝',existing,existing),null,'未改变时不误判新增符号');
function service(replies){const data=new Map(),core=Core.create({lessons:[]});let calls=0,correction='';const svc=Service.create({core,store:{get:k=>data.get(k),put:(k,v)=>data.set(k,v)},starter:()=>start,llm:async msgs=>{if(calls)correction=msgs[msgs.length-1].content;return replies[calls++];},filter:()=>false,GAMES:{catch:{name:'喂饱比特'}},ACTS:[],MOODS:[],strictLLM:true});return {svc,core,calls:()=>calls,correction:()=>correction};}
(async()=>{
 const a=service(['<reply>加好了</reply><file>'+fake+'</file>','<reply>现在掉落船形金元宝</reply><file>'+gold+'</file>']);await a.svc.demo({game:'catch',prompt:'加入金元宝'});assert.equal(a.calls(),2);assert.match(a.correction(),/船形金锭/);assert.equal(a.svc.demoCode('catch'),gold.trim());assert.equal(a.core.state.live.demo.changed,true);
 const b=service(['<reply>改好了，已经换成金元宝</reply>']);const r=await b.svc.demo({game:'catch',prompt:'加入金元宝'});assert.match(r.reply,/这次代码其实没变/);assert.equal(b.core.state.live.demo.changed,false);assert.equal(b.svc.demoCode('catch'),start);
 console.log('PASS：金元宝Canvas运行180帧、替代emoji检测与误报回归、真实服务重试和无改动提示');
})().catch(e=>{console.error(e);process.exitCode=1;});
