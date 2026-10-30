import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'site-security-http-'));let server;
try{
 server=await startServer(path.join(directory,'data'),3119);const base=server.base,owner=await loginServer(base);
 async function call(url,input,token='',method='POST',extra={}){const r=await fetch(base+url,{method,headers:{Origin:base,Cookie:token,'Content-Type':'application/json',...extra},...(input===undefined?{}:{body:JSON.stringify(input)})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 async function code(email){for(const name of (await readdir(path.join(directory,'data','mail-outbox'))).sort().reverse()){const mail=JSON.parse(await readFile(path.join(directory,'data','mail-outbox',name),'utf8'));if(mail.to===email)return mail.text.match(/\d{6}/)[0]}throw new Error('Missing mail')}
 const me=(await call('/api/auth/me',undefined,owner,'GET')).data.user;assert.equal(me.email,null);
 const email='owner-test@example.com',sent=await call('/api/auth/email/request',{purpose:'bind',email,current:'integration-only-password-2026'},owner);assert.equal(sent.status,200);assert.equal(sent.data.code,undefined);
 let r=await call('/api/auth/email/bind',{email,current:'wrong',challenge:sent.data.challenge,code:await code(email)},owner);assert.equal(r.status,400);
 r=await call('/api/auth/email/bind',{email,current:'integration-only-password-2026',challenge:sent.data.challenge,code:await code(email)},owner);assert.equal(r.status,200);assert.equal(r.data.user.email,email);
 r=await call('/api/auth/login',{email,password:'integration-only-password-2026'});assert.equal(r.status,200);const second=r.cookie;
 assert.equal((await call('/api/auth/email/request',{purpose:'reset',email})).status,429);
 // Reset only the test fixture's cooldown; no clock or verification bypass exists in the application.
 const bootstrap=(await call('/api/admin/bootstrap',undefined,owner,'GET')).data;
 const profile={...bootstrap.profile,name:'简历原文姓名',intro:'简介实时同步一',email:'contact@example.com',skills:['技能原文'],experiences:[{id:'public-exp',title:'公开经历原文',description:'公开经历内容',start:'2025-01',end:'',visible:true},{id:'private-exp',title:'HIDDEN_EXPERIENCE',visible:false}],translations:{en:{name:'Resume English Name',intro:'English public summary',skills:['TypeScript'],experiences:{'public-exp':{title:'Public experience'}}},ja:{intro:'日本語の自己紹介'}}};
 assert.equal((await call('/api/admin/config',{key:'profile',value:profile},owner)).status,200);
 const project=await call('/api/admin/content',{type:'projects',slug:'resume-project',action:'publish',data:{title:'项目简历原文',summary:'项目原文摘要',career:true,role:'角色原文',contribution:'本人贡献原文',bodyHtml:'<p>公开内容</p>',translations:{en:{title:'Published resume project'}}}},owner);assert.equal(project.status,200);
 assert.equal((await call('/api/admin/content',{type:'projects',action:'save',data:{title:'HIDDEN_PROJECT_DRAFT',career:true}},owner)).status,200);
 for(const [language,expected]of [['en','Resume English Name'],['zh','简历原文姓名'],['ja','日本語の自己紹介']]){const html=await(await fetch(base+'/career',{headers:{Cookie:'site-locale='+language}})).text();assert.ok(html.includes(expected));assert.ok(!html.includes('HIDDEN_EXPERIENCE'));assert.ok(!html.includes('HIDDEN_PROJECT_DRAFT'));assert.ok(html.includes('角色原文'));assert.ok(!html.includes(email));assert.ok(html.includes('contact@example.com'))}
 assert.equal((await call('/api/admin/config',{key:'profile',value:{...profile,intro:'简介实时同步二'}},owner)).status,200);assert.ok((await(await fetch(base+'/career',{headers:{Cookie:'site-locale=zh'}})).text()).includes('简介实时同步二'));
 const invite=(await call('/api/admin/community/invites',{label:'独立邮箱HTTP注册'},owner)).data,registerEmail='member-test@example.com';
 const signup=await call('/api/auth/email/request',{purpose:'register',email:registerEmail,invite:invite.token});assert.equal(signup.status,200);const conf=(await call('/api/community/config',undefined,'','GET')).data;
 const payload={email:registerEmail,password:'member-test-password-2026',nickname:'邮件测试成员',invite:invite.token,challenge:signup.data.challenge,code:await code(registerEmail),adult:true,accepted:true,policyVersion:conf.policyVersion,policyHash:conf.policyHash};
 assert.equal((await call('/api/community/register',{...payload,code:'abcdef'})).status,400);assert.equal((await call('/api/community/register',payload)).status,200);assert.notEqual((await call('/api/community/register',payload)).status,200);assert.equal((await call('/api/auth/login',{email:registerEmail,password:payload.password})).status,200);
 for(const route of ['/','/career','/login','/join','/admin']){const page=await fetch(base+route),csp=page.headers.get('content-security-policy'),html=await page.text(),nonce=csp.match(/'nonce-([^']+)'/)[1];assert.match(csp, /connect-src 'self' blob:/);assert.ok(!csp.includes("'unsafe-eval'"));assert.ok(!csp.match(/script-src[^;]*'unsafe-inline'/));assert.ok(html.includes('nonce="'+nonce+'"'));assert.ok(page.headers.get('x-content-type-options')==='nosniff')}
 const first=await fetch(base+'/career'),next=await fetch(base+'/career');assert.notEqual(first.headers.get('content-security-policy'),next.headers.get('content-security-policy'));
 assert.equal((await fetch(base+'/.env.local')).status,404);assert.equal((await fetch(base+'/backup.sqlite')).status,404);
 assert.equal((await call('/api/auth/login',[], '', 'POST')).status,400);assert.equal((await call('/api/auth/login',{email,password:'wrong'},'','POST',{Origin:'https://evil.example'})).status,403);
 assert.equal((await call('/api/auth/me',undefined,second,'GET')).data.user.id,'owner');
 const fixtureDb=new DatabaseSync(path.join(directory,'data','site.sqlite'));fixtureDb.prepare('UPDATE limits SET reset=0 WHERE key=?').run('email-cooldown:'+createHash('sha256').update(email).digest('hex'));fixtureDb.close();
 const recovery=await call('/api/auth/email/request',{purpose:'reset',email});assert.equal(recovery.status,200);const reset={email,challenge:recovery.data.challenge,code:await code(email),password:'new-owner-password-2026'};assert.equal((await call('/api/auth/email/reset',reset)).status,200);assert.equal((await call('/api/auth/me',undefined,owner,'GET')).data.user,null);assert.equal((await call('/api/auth/me',undefined,second,'GET')).data.user,null);assert.equal((await call('/api/auth/email/reset',reset)).status,400);assert.equal((await call('/api/auth/login',{email,password:reset.password})).status,200);

 console.log('PASS: real HTTP email verification, single-use signup, email binding/login, CSRF/JSON checks, per-request CSP nonces and private-file probe rejection.');
}catch(error){console.error(server?.log()||'');throw error}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
