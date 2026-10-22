import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-password-login-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://localhost:3108',APP_SURFACE:'platform',PLATFORM_LOGIN_MODE:'experience',INITIAL_ADMIN_PASSWORD:'isolated-owner-password-2026'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),API=await import('../src/lib/api.mjs');
const d=D.db(),password='isolated-member-password-2026';
for(const [id,role] of [['alice','member'],['bob','member'],['reviewer','reviewer']])d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated,email,email_verified_at) VALUES(?,?,?,?,?,'active','local_test',?,?,?,?)").run(id,id,D.passwordHash(password),id,role,D.now(),D.now(),id+'@example.org',D.now());
const req=(pathname='/api/auth/me',token='',body,base=process.env.PUBLIC_URL)=>new Request(base+pathname,{method:body?'POST':'GET',headers:{cookie:'site_platform='+token,Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const signIn=(username,pw=password,authentication='password',base)=>A.login(req('/api/auth/login','',undefined,base),{username,password:pw,...(authentication?{authentication}:{})});

test('password authentication verifies the existing website identity even when the platform offers experience login',async()=>{
 assert.throws(()=>signIn('alice','wrong'),error=>error.status===401);
 assert.throws(()=>signIn('unknown','arbitrary'),error=>error.status===401);
 assert.throws(()=>signIn('alice',password,'unknown'),error=>error.status===400);
 const alice=signIn(' ALICE '),email=signIn('alice@example.org'),bob=signIn('bob');
 for(const token of [alice,email]){const user=A.currentUser(req('/api/auth/me',token));assert.equal(user.id,'alice');assert.equal(user.authentication,'password');assert.equal(user.experience,undefined);assert.equal(user.password,undefined);}
 assert.equal(A.currentUser(req('/api/auth/me',bob)).id,'bob');
 assert.equal((await API.handle(req('/api/spaces/keys',alice))).status,200);
 assert.throws(()=>signIn('admin',process.env.INITIAL_ADMIN_PASSWORD),error=>error.status===403);
 assert.throws(()=>signIn('reviewer'),error=>error.status===403);
 assert.throws(()=>signIn('bob',password,'password','https://public.example.org'),error=>error.status===503);
 assert.equal(A.currentUser(req('/api/auth/me',alice,undefined,'https://public.example.org')),null);
 const wrongOrigin=new Request(req('/api/auth/login','',{username:'alice',password,authentication:'password'}),{headers:{Origin:'https://other.example.org','Content-Type':'application/json'}});
 assert.equal((await API.handle(wrongOrigin)).status,403);
});

test('experience and legacy platform sessions never become password-authenticated sessions',async()=>{
 const experience=signIn('arbitrary','anything',''),real=signIn('alice');
 assert.equal(A.currentUser(req('/api/auth/me',experience)).authentication,'experience');
 assert.equal(A.currentUser(req('/api/auth/me',experience)).experience,true);
 assert.equal((await API.handle(req('/api/spaces/keys',experience))).status,403);assert.equal((await API.handle(req('/api/spaces/mine',experience))).status,403,'Shared experience accounts cannot read private blog drafts');
 d.prepare("UPDATE session_realms SET authentication='legacy' WHERE token=?").run(D.hash(experience));
 assert.equal(A.currentUser(req('/api/auth/me',experience)).authentication,'experience');
 process.env.PLATFORM_LOGIN_MODE='password';
 assert.equal(A.currentUser(req('/api/auth/me',experience)),null);
 assert.equal(A.currentUser(req('/api/auth/me',real)).authentication,'password');
 process.env.PLATFORM_LOGIN_MODE='experience';
 const before=d.prepare('SELECT COUNT(*) n FROM community_users').get().n;
 assert.throws(()=>signIn('not-a-new-account','arbitrary'),error=>error.status===401);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM community_users').get().n,before);
});

test('website password changes revoke real client sessions without changing account identity',async()=>{
 const browser=signIn('bob'),client=signIn('bob');
 const changed=await API.handle(req('/api/community/account',browser,{action:'password',current:password,password:'replacement-member-password-2026'}));
 assert.equal(changed.status,200,await changed.text());
 assert.equal(A.currentUser(req('/api/auth/me',client)),null);
 assert.throws(()=>signIn('bob',password),error=>error.status===401);
 assert.equal(A.currentUser(req('/api/auth/me',signIn('bob','replacement-member-password-2026'))).id,'bob');
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});});
