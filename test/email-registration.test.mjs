import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'spaceyew-email-register-'));
Object.assign(process.env,{APP_DATA_DIR:temp,PUBLIC_URL:'http://127.0.0.1:3008',APP_SURFACE:'platform',PLATFORM_LOGIN_MODE:'password',REGISTRATION_ENABLED:'true',MAIL_MODE:'capture',INITIAL_ADMIN_PASSWORD:'isolated-owner-password-2026'});
const D=await import('../src/lib/db.mjs'),E=await import('../src/lib/email-auth.mjs'),A=await import('../src/lib/auth.mjs'),H=await import('../src/lib/api.mjs'),Access=await import('../src/lib/app-access.mjs');
const base=process.env.PUBLIC_URL;
const req=(url,body,origin=base,cookie='')=>new Request(base+url,{method:body===undefined?'GET':'POST',headers:{host:'127.0.0.1:3008',origin,'content-type':'application/json',cookie},body:body===undefined?undefined:JSON.stringify(body)});
const call=(url,body,origin,cookie)=>H.handle(req(url,body,origin,cookie));
const config=await(await call('/api/community/config')).json(),ack={adult:true,accepted:true,policyVersion:config.policyVersion,policyHash:config.policyHash};
const codeFor=async email=>{for(const name of await readdir(path.join(temp,'mail-outbox'))){const mail=JSON.parse(await readFile(path.join(temp,'mail-outbox',name),'utf8'));if(mail.to===email)return mail.text.match(/\d{6}/)[0]}throw new Error('Missing captured email')};

test('password platform supports verified email signup without an invitation and preserves account isolation',async()=>{
 const email='signup@example.com',password='new-member-password-2026';
 assert.equal((await(await call('/api/auth/me')).json()).access.registration,true);
 let response=await call('/api/auth/email/request',{purpose:'register',email},'https://foreign.example');assert.equal(response.status,403);
 response=await call('/api/auth/email/request',{purpose:'register',email});assert.equal(response.status,200);const sent=await response.json();assert.ok(sent.challenge);assert.equal(sent.code,undefined);
 assert.equal((await call('/api/auth/email/request',{purpose:'register',email})).status,429);
 const input={...ack,email,password,nickname:'New member',challenge:sent.challenge,code:await codeFor(email)};
 response=await call('/api/community/register',{...input,email:'other@example.com'});assert.equal(response.status,400);
 response=await call('/api/community/register',{...input,code:input.code==='000000'?'111111':'000000'});assert.equal(response.status,400);
 response=await call('/api/community/register',{...input,accepted:false});assert.equal(response.status,409);
 response=await call('/api/community/register',input);assert.equal(response.status,200);
 const row=D.db().prepare('SELECT * FROM community_users WHERE email=?').get(email);assert.equal(row.verification,'pending');assert.ok(row.email_verified_at);assert.notEqual(row.password,password);
 assert.equal((await call('/api/community/register',input)).status,400);
 response=await call('/api/auth/login',{email,password});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];const me=await(await call('/api/auth/me',undefined,undefined,cookie)).json();assert.equal(me.user.id,row.id);assert.equal(me.user.authentication,'password');
 const space=await(await call('/api/spaces/mine',undefined,undefined,cookie)).json();assert.equal(space.profile.name,'New member');assert.deepEqual(space.profile.resume?.sections||[],[]);
 assert.equal((await call('/api/catalog/mine',undefined,undefined,cookie)).status,403);
 // Known and unknown email requests have the same public shape; no second account or mail is created.
 D.db().prepare('UPDATE limits SET reset=0 WHERE key=?').run('email-cooldown:'+D.hash(email));
 const duplicate=await(await call('/api/auth/email/request',{purpose:'register',email})).json();assert.deepEqual(Object.keys(duplicate),Object.keys(sent));assert.equal(duplicate.message,sent.message);assert.equal(D.db().prepare('SELECT COUNT(*) n FROM community_users WHERE email=?').get(email).n,1);
});

test('disabled, experience and admin surfaces do not allow registration; remote requests remain gated',async()=>{
 try{
  process.env.REGISTRATION_ENABLED='false';assert.equal((await call('/api/auth/email/request',{purpose:'register',email:'disabled@example.com'})).status,403);assert.equal((await call('/api/community/register',{})).status,403);assert.equal(Access.pageRedirect('/join'),'/login');
  process.env.REGISTRATION_ENABLED='true';process.env.PLATFORM_LOGIN_MODE='experience';assert.equal(Access.registrationEnabled(),false);assert.equal((await call('/api/auth/email/request',{purpose:'register',email:'experience@example.com'})).status,403);
  process.env.PLATFORM_LOGIN_MODE='password';process.env.APP_SURFACE='admin';assert.equal(Access.registrationEnabled(),false);assert.equal((await call('/api/community/register',{})).status,404);
  process.env.APP_SURFACE='platform';process.env.PUBLIC_URL='https://public.example.com';assert.equal(E.emailStatus(req('/api/auth/email/status')).available,false);
  await assert.rejects(E.requestEmail(req('/api/auth/email/request'),{purpose:'register',email:'remote@example.com'}),e=>e.status===503);
 }finally{process.env.APP_SURFACE='platform';process.env.PLATFORM_LOGIN_MODE='password';process.env.REGISTRATION_ENABLED='true';process.env.PUBLIC_URL=base;}
});
test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(temp,{recursive:true,force:true})});
