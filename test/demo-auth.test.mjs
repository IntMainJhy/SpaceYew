import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const directory=await mkdtemp(path.join(tmpdir(),'site-demo-auth-'));
process.env.APP_DATA_DIR=path.join(directory,'data');
process.env.INITIAL_ADMIN_PASSWORD='isolated-demo-auth-password';
process.env.PUBLIC_URL='http://localhost:3010';
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),API=await import('../src/lib/api.mjs');
const d=D.db(),id=randomUUID();
d.prepare('INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'demo_member','not-a-login-password','体验成员','member','active','local_test',D.now(),D.now());
const req=(pathname='/api/auth/me',headers={},base='http://localhost:3010')=>new Request(base+pathname,{headers});
const enable=()=>{process.env.SITE_DEMO='true';process.env.DEMO_SKIP_LOGIN='true';process.env.PUBLIC_URL='http://localhost:3010';};

test('skipping login requires both explicit demo flags',()=>{
 delete process.env.SITE_DEMO;delete process.env.DEMO_SKIP_LOGIN;
 assert.equal(A.currentUser(req()),null);
 process.env.SITE_DEMO='true';assert.equal(A.currentUser(req()),null);
 delete process.env.SITE_DEMO;process.env.DEMO_SKIP_LOGIN='true';assert.equal(A.currentUser(req()),null);
});

test('local preview opens the qualified demo member without creating sessions or owner privileges',async()=>{
 enable();
 assert.equal(A.currentUser(req()).id,id);
 assert.equal(A.currentUser(req()).role,'member');
 assert.equal('password' in A.currentUser(req()),false);
 const me=await API.handle(req());
 assert.equal((await me.json()).user.id,id);
 assert.equal(me.headers.get('set-cookie'),null);
 assert.equal(d.prepare('SELECT count(*) n FROM sessions').get().n,0);
 assert.equal((await API.handle(req('/api/community/workspace'))).status,200);
 assert.equal((await API.handle(req('/api/admin/bootstrap'))).status,401);
});

test('remote hosts and public deployment addresses never receive the automatic member',()=>{
 enable();
 assert.equal(A.currentUser(req('/api/auth/me',{},'https://public.example.com')),null);
 assert.equal(A.currentUser(req('/api/auth/me',{host:'public.example.com'})),null);
 process.env.PUBLIC_URL='https://public.example.com';assert.equal(A.currentUser(req()),null);
});

test('existing verified sessions and delegated identities take precedence; inactive demo accounts cannot auto-enter',()=>{
 enable();
 const token=randomUUID();d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,NULL)').run(D.hash(token),Date.now()+60000);
 assert.equal(A.currentUser(req('/api/auth/me',{cookie:'site_admin='+token})).role,'owner');
 const principal={id:'scoped-tool',role:'member'};
 assert.deepEqual(A.currentUser(A.delegatedRequest(req(),principal)),principal);
 for(const update of ["status='banned'","status='closed'","status='active',verification='pending'","verification='local_test',role='reviewer'"]){
  d.prepare("UPDATE community_users SET role='member',status='active',verification='local_test' WHERE id=?").run(id);
  d.prepare('UPDATE community_users SET '+update+' WHERE id=?').run(id);
  assert.equal(A.currentUser(req()),null);
 }
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});});
