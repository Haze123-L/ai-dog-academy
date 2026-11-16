'use strict';
// 公网入口验证仅使用临时合成课堂；不读取真实配置。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process'),http=require('http'),net=require('net');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'.tmp'),{recursive:true});const tmp=fs.mkdtempSync(path.join(root,'.tmp/name-only-'));
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const n=net.createServer();await new Promise(r=>n.listen(0,'127.0.0.1',r));const p=n.address().port;await new Promise(r=>n.close(r));return p;}
async function start(extra={}){const port=await freePort();const c=spawn(process.execPath,['app/server.js'],{cwd:root,env:{...process.env,XGXY_REVIEW:'0',XGXY_CODEX_DEMO:'0',XGXY_CLAUDE_DEMO:'0',XGXY_PUBLIC:'1',XGXY_NAME_ONLY_JOIN:'1',XGXY_DATA:tmp,HOST:'127.0.0.1',PORT:String(port),...extra},stdio:['ignore','pipe','pipe']});let output='', lastError='';c.stdout.on('data',b=>output+=b);c.stderr.on('data',b=>output+=b);for(let i=0;i<80;i++){if(c.exitCode!==null)return {c,output,port};try{await fetch('http://127.0.0.1:'+port+'/api/hello');return {c,port,output};}catch(e){lastError=String(e.cause||e);}await delay(50);}await stop(c);throw Error('启动超时，端口 '+port+'：'+lastError+' '+output);}
async function stop(c){if(c.exitCode!==null)return;const done=new Promise(r=>c.once('exit',r));c.kill();await done;}
async function run(){let svc=await start();let base='http://127.0.0.1:'+svc.port;const cfg=JSON.parse(fs.readFileSync(path.join(tmp,'config.json')));
const get=async p=>{const r=await fetch(base+p);return {status:r.status,data:await r.json()};};const post=async(p,b)=>{const r=await fetch(base+'/api/'+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});return {status:r.status,data:await r.json()};};
async function view(q){const r=await fetch(base+'/api/stream?'+q);assert.equal(r.status,200);const reader=r.body.getReader();let text='';for(;;){const a=await reader.read();text+=new TextDecoder().decode(a.value);const m=text.match(/data: ([^\n]+)/);if(m){await reader.cancel();return JSON.parse(m[1]);}}}
try {
assert.deepEqual((await get('/api/names')).data,{names:[],needCode:false});
const joined=await post('join',{name:'现场测试甲'});assert.equal(joined.status,200);assert.ok(joined.data.tok);
assert.deepEqual((await get('/api/names')).data,{names:[],needCode:false});
assert.equal((await post('join',{name:'现场测试甲'})).data.tok,joined.data.tok);
assert.equal((await get('/api/settings')).status,401);assert.equal((await get('/api/settings?t='+joined.data.tok)).status,401);
assert.equal((await post('act',{a:{type:'class.reset'}})).status,401);assert.notEqual((await post('act',{t:joined.data.tok,a:{type:'roster.set',names:['篡改']}})).status,200);
assert.equal((await get('/api/stream?role=screen')).status,401);
for(const q of ['k='+cfg.teacherKey,'role=screen&s='+cfg.screenKey,'t='+joined.data.tok]) {const v=await view(q);assert.equal(v.nameOnlyJoin,true);if(!q.startsWith('k=')){assert.equal(v.screenKey,undefined);assert.equal(v.teacherKey,undefined);}}
assert.equal((await post('act',{k:cfg.teacherKey,a:{type:'roster.needCode',on:true}})).status,400);
assert.equal((await post('act',{k:cfg.teacherKey,a:{type:'class.reset',keepRoster:false}})).status,200);await delay(600);
assert.equal(JSON.parse(fs.readFileSync(path.join(tmp,'class.json'))).cls.needCode,false);assert.equal((await post('join',{name:'重置后测试乙'})).status,200);await delay(600);
await stop(svc.c);const saved=JSON.parse(fs.readFileSync(path.join(tmp,'class.json')));saved.cls.needCode=true;fs.writeFileSync(path.join(tmp,'class.json'),JSON.stringify(saved));svc=await start();base='http://127.0.0.1:'+svc.port;
assert.deepEqual((await get('/api/names')).data,{names:[],needCode:false});assert.equal((await post('join',{name:'重启后测试丙'})).status,200);await delay(600);assert.equal(JSON.parse(fs.readFileSync(path.join(tmp,'class.json'))).cls.needCode,false);
console.log('PASS：仅名字入班、匿名名单隐藏、管理鉴权、三端模式字段、同名恢复、重置和重启持续免码');
} finally {await stop(svc.c);}}
run().catch(e=>{console.error(e);process.exitCode=1;});
