import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const directory=await mkdtemp(path.join(tmpdir(),'site-auth-audit-'));
process.env.APP_DATA_DIR=directory;process.env.PUBLIC_URL='http://localhost:3108';process.env.INITIAL_ADMIN_PASSWORD='isolated-owner-password-2026';
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),Community=await import('../src/lib/community.mjs'),S=await import('../src/lib/spaces.mjs');
const d=D.db(),password=process.env.INITIAL_ADMIN_PASSWORD;
const req=token=>new Request(process.env.PUBLIC_URL+'/api/auth/me',{headers:{cookie:'site_admin='+token}});

test('owner password changes atomically invalidate sessions and tool credentials',()=>{
 const token=A.login(req(''),{username:'admin',password}),key=randomUUID();
 d.prepare('INSERT INTO connect_keys(id,actor,name,hash,scopes,expires,created) VALUES(?,?,?,?,?,?,?)').run(key,'owner','Audit fixture',D.hash(randomUUID()),'["library"]',Date.now()+600000,D.now());
 d.exec("CREATE TEMP TRIGGER reject_owner_key_revoke BEFORE UPDATE ON connect_keys BEGIN SELECT RAISE(ABORT,'revocation failed');END");
 try{
  assert.throws(()=>A.changePassword({current:password,password:'replacement-owner-password-2026'}),/revocation failed/);
  assert.ok(D.passwordMatches(password,d.prepare('SELECT password FROM admins WHERE id=1').get().password));
  assert.equal(A.currentUser(req(token)).id,'owner');
  assert.equal(d.prepare('SELECT revoked FROM connect_keys WHERE id=?').get(key).revoked,0);
 }finally{d.exec('DROP TRIGGER reject_owner_key_revoke')}
 A.changePassword({current:password,password:'replacement-owner-password-2026'});
 assert.equal(A.currentUser(req(token)),null);
 assert.equal(d.prepare('SELECT revoked FROM connect_keys WHERE id=?').get(key).revoked,1);
});

test('current owner password is bounded and repeated password-change guesses are limited',()=>{
 d.prepare("DELETE FROM limits WHERE key='password-change:owner'").run();
 assert.throws(()=>A.changePassword({current:'x'.repeat(257),password:'replacement-owner-password-2026'}),error=>error.status===400);
 d.prepare("DELETE FROM limits WHERE key='password-change:owner'").run();
 for(let attempt=0;attempt<10;attempt++)assert.throws(()=>A.changePassword({current:'wrong',password:'replacement-owner-password-2026'}),error=>error.status===400);
 assert.throws(()=>A.changePassword({current:'wrong',password:'replacement-owner-password-2026'}),error=>error.status===429);
});

function memberFixture(){const id=randomUUID(),token=randomUUID(),username='audit_'+id.slice(0,8),password='isolated-member-password-2026';d.prepare('INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(id,username,D.passwordHash(password),'Audit member','member','active','local_test',D.now(),D.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(D.hash(token),Date.now()+600000,id);return{id,token,username,password}}
const memberAccount=(member,input)=>Community.communityApi(new Request(req(member.token),{method:'POST'}),['community','account'],input,new URL(process.env.PUBLIC_URL));

test('member password changes and closure share a bounded current-password retry budget',()=>{
 const member=memberFixture();
 for(let attempt=0;attempt<10;attempt++)assert.throws(()=>memberAccount(member,{action:attempt%2?'close':'password',current:'wrong',password:'replacement-member-password-2026',confirm:true}),error=>error.status===400);
 assert.throws(()=>memberAccount(member,{action:'close',current:member.password,confirm:true}),error=>error.status===429);
 assert.equal(A.currentUser(req(member.token)).status,'active');
});

test('member password changes already roll back if credential revocation fails',()=>{
 const member=memberFixture(),key=randomUUID(),original=d.prepare('SELECT password FROM community_users WHERE id=?').get(member.id).password;
 d.prepare('INSERT INTO connect_keys(id,actor,name,hash,scopes,expires,created) VALUES(?,?,?,?,?,?,?)').run(key,member.id,'Audit fixture',D.hash(randomUUID()),'["library"]',Date.now()+600000,D.now());
 d.exec("CREATE TEMP TRIGGER reject_member_key_revoke BEFORE UPDATE ON connect_keys BEGIN SELECT RAISE(ABORT,'member revocation failed');END");
 try{
  assert.throws(()=>memberAccount(member,{action:'password',current:member.password,password:'replacement-member-password-2026'}),/member revocation failed/);
  assert.equal(d.prepare('SELECT password FROM community_users WHERE id=?').get(member.id).password,original);
  assert.equal(A.currentUser(req(member.token)).id,member.id);
  assert.equal(d.prepare('SELECT revoked FROM connect_keys WHERE id=?').get(key).revoked,0);
 }finally{d.exec('DROP TRIGGER reject_member_key_revoke')}
});

test('banned accounts retain account appeals while active editing and staff access stop immediately',()=>{
 const member=memberFixture();d.prepare("UPDATE community_users SET status='banned',role='reviewer' WHERE id=?").run(member.id);
 assert.equal(A.currentUser(req(member.token)).status,'banned');
 const replacement=A.login(req(''),{username:member.username,password:member.password});assert.equal(A.currentUser(req(replacement)).id,member.id);
 const accountReq=new Request(req(member.token),{method:'POST'}),url=new URL(process.env.PUBLIC_URL);
 assert.throws(()=>S.spaceActor(accountReq),error=>error.status===403);
 assert.throws(()=>Community.communityApi(new Request(req(member.token),{method:'GET'}),['admin','community','overview'],{},url),error=>error.status===403);
 const appeal=Community.communityApi(accountReq,['community','cases'],{kind:'appeal',category:'审核或账号申诉',description:'请复核此测试账号的限制状态与处理依据。'},url);assert.ok(appeal.id);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
