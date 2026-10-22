import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

const directory=await mkdtemp(path.join(tmpdir(),'site-no-demo-auth-'));
Object.assign(process.env,{APP_DATA_DIR:directory,INITIAL_ADMIN_PASSWORD:'isolated-no-demo-auth-password',PUBLIC_URL:'http://localhost:3010',APP_SURFACE:'combined'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),API=await import('../src/lib/api.mjs');
const d=D.db(),id=randomUUID();
// Existing installations may still contain this username; it must never imply authentication.
d.prepare('INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'demo_member','not-a-login-password','Legacy member','member','active','local_test',D.now(),D.now());
const req=(pathname='/api/auth/me',headers={},base='http://localhost:3010')=>new Request(base+pathname,{headers});
const enable=()=>Object.assign(process.env,{SITE_DEMO:'true',DEMO_SKIP_LOGIN:'true',PLATFORM_LOGIN_MODE:'experience',PUBLIC_URL:'http://localhost:3010'});

test('obsolete preview flags never authenticate guests, create users or issue sessions',async()=>{
 enable();
 for(const headers of [{},{cookie:'site_admin=unknown'}]){
  assert.equal(A.currentUser(req('/api/auth/me',headers)),null);
  const response=await API.handle(req('/api/auth/me',headers)),me=await response.json();
  assert.equal(me.user,null);assert.equal(me.access.experience,false);assert.equal(response.headers.get('set-cookie'),null);
  assert.equal((await API.handle(req('/api/community/workspace',headers))).status,401);
  assert.equal((await API.handle(req('/api/admin/bootstrap',headers))).status,401);
 }
 assert.throws(()=>A.login(req(),{username:'arbitrary',password:'anything'}),error=>error.status===401);
 assert.equal(d.prepare('SELECT count(*) n FROM sessions').get().n,0);
 assert.equal(d.prepare('SELECT count(*) n FROM community_users').get().n,1);
});

test('remote origins cannot gain an automatic member from obsolete preview flags',()=>{
 enable();
 assert.equal(A.currentUser(req('/api/auth/me',{},'https://public.example.com')),null);
 assert.equal(A.currentUser(req('/api/auth/me',{host:'public.example.com'})),null);
 process.env.PUBLIC_URL='https://public.example.com';assert.equal(A.currentUser(req()),null);
});

test('legacy real combined sessions remain valid while old experience sessions are rejected',()=>{
 enable();
 for(const authentication of [null,'legacy','password','experience','unknown']){
  const token=randomUUID();d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,NULL)').run(D.hash(token),Date.now()+60000);
  if(authentication!==null)d.prepare('INSERT INTO session_realms(token,realm,authentication) VALUES(?,?,?)').run(D.hash(token),'combined',authentication);
  const user=A.currentUser(req('/api/auth/me',{cookie:'site_admin='+token}));
  if([null,'legacy','password'].includes(authentication)){assert.equal(user.role,'owner');assert.equal(user.authentication,'password');assert.equal(user.experience,undefined);}
  else assert.equal(user,null);
 }
});

test('verified server adapters preserve their delegated identity without trusting HTTP headers',()=>{
 const principal={id:'scoped-tool',role:'member'};
 assert.deepEqual(A.currentUser(A.delegatedRequest(req(),principal)),principal);
 assert.equal(A.currentUser(req('/api/auth/me',{'x-role':'owner','x-user-id':id})),null);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});});
