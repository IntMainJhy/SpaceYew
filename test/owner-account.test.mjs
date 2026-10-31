import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-unified-owner-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://localhost:3199',APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'legacy-admin-fixture-password'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),S=await import('../src/lib/spaces.mjs'),API=await import('../src/lib/api.mjs'),E=await import('../src/lib/email-auth.mjs'),C=await import('../src/lib/community.mjs'),Connect=await import('../src/lib/connect.mjs'),Hosting=await import('../src/lib/blog-hosting.mjs');
const d=D.db(),base=process.env.PUBLIC_URL,password='canonical-owner-fixture-password';
const req=(token='',method='GET',pathname='/api/auth/me',body)=>new Request(base+pathname,{method,headers:{Cookie:token?'site_admin='+token:'',Origin:base,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
function account(username,role='member'){const id=randomUUID(),email=username+'@example.com';d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated,email,email_verified_at) VALUES(?,?,?,?,?,'active','local_test',?,?,?,?)").run(id,username,D.passwordHash(password),username,role,D.now(),D.now(),email,D.now());return{id,username,email,token:A.login(req(),{email,password})};}
const official=account('official'),other=account('other'),reviewer=account('reviewer','reviewer'),otherOwner=account('other_owner','owner');
const legacy=A.login(req(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
const legacySpace=S.mine(req(legacy)),personal=S.mine(req(official.token)),originalProfile=d.prepare("SELECT value FROM config WHERE key='profile'").get().value;
d.prepare("UPDATE admins SET email='legacy-owner@example.com',email_verified_at=? WHERE id=1").run(D.now());
const select=value=>d.prepare("INSERT OR REPLACE INTO config VALUES('ownerAccount',?)").run(typeof value==='string'?value:JSON.stringify(value));
d.prepare("UPDATE community_users SET role='owner' WHERE id=?").run(official.id);
select({id:official.id,email:official.email});

test('one configured verified account owns administration, including existing and delegated sessions',async()=>{
 const user=A.currentUser(req(official.token));assert.equal(user.id,official.id);assert.equal(user.username,official.username);assert.equal(user.role,'owner');assert.equal(user.ownerAccount,true);assert.equal(user.canPublish,true);
 assert.equal(A.currentUser(req(legacy)),null);assert.equal(A.currentUser(req(reviewer.token)).role,'member');assert.equal(A.currentUser(req(otherOwner.token)).role,'member');assert.equal(A.currentUser(req(other.token)).role,'member');
 assert.throws(()=>A.login(req(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD}),error=>error.status===401);
 assert.throws(()=>A.login(req(),{email:'legacy-owner@example.com',password:process.env.INITIAL_ADMIN_PASSWORD}),error=>error.status===401);
 assert.equal(A.currentUser(A.delegatedRequest(req(),{id:'owner',role:'owner',status:'active'})),null);
 assert.equal(A.currentUser(A.delegatedRequest(req(),{id:reviewer.id,role:'reviewer',status:'active'})).role,'member');
 for(const pathname of ['/api/admin/bootstrap','/api/admin/community/overview','/api/admin/catalog','/api/admin/spaces/reviews']){
  assert.equal((await API.handle(req(official.token,'GET',pathname))).status,200,pathname);
  for(const token of [legacy,reviewer.token,other.token,otherOwner.token])assert.ok([401,403].includes((await API.handle(req(token,'GET',pathname))).status),pathname+' denies other identities');
 }
 process.env.APP_SURFACE='admin';try{assert.throws(()=>A.login(req(),{email:reviewer.email,password}),error=>error.status===403);assert.throws(()=>A.login(req(),{email:other.email,password}),error=>error.status===403);assert.ok(A.login(req(),{email:official.email,password}));}finally{process.env.APP_SURFACE='combined';}
 process.env.APP_SURFACE='platform';try{assert.ok(A.login(req(),{email:official.email,password}));for(const account of [other,reviewer,otherOwner]){const token=A.login(req(),{email:account.email,password});const member=A.currentUser(req(token));assert.equal(member.id,account.id);assert.equal(member.role,'member','former staff can sign into their own account without administrative authority');}}finally{process.env.APP_SURFACE='combined';}
 assert.equal(d.prepare('SELECT role FROM community_users WHERE id=?').get(official.id).role,'owner','the same account is promoted while retaining its id, handle and content');
});

test('owner publication uses the existing personal space and snapshots without overwriting legacy data',()=>{
 let mine=S.mine(req(official.token));assert.equal(mine.id,personal.id);assert.equal(mine.legacy,false);assert.equal(mine.canManage,true);
 mine=S.spacesApi(req(official.token,'POST'),['spaces','save'],{...mine,profile:{...mine.profile,name:'Canonical public profile'},publish:true},new URL(base));
 assert.equal(mine.visibility,'public');assert.equal(S.publicSpace(req(),mine.handle).profile.name,'Canonical public profile');
 assert.equal(d.prepare("SELECT value FROM config WHERE key='profile'").get().value,originalProfile,'global legacy profile stays unchanged');
 assert.equal(S.publicSpace(req(),legacySpace.handle).owner,'owner','existing public URLs remain available');
 const directory=S.publicSpaces(req());assert.ok(directory.some(row=>row.handle===mine.handle));assert.equal(directory.some(row=>row.handle===legacySpace.handle),false,'do not duplicate the same operator in discovery');
 mine=S.spacesApi(req(official.token,'POST'),['spaces','save'],{...mine,profile:{...mine.profile,name:'Private owner draft'}},new URL(base));
 assert.equal(S.publicSpace(req(),mine.handle).profile.name,'Canonical public profile','saving a draft retains the fixed public snapshot');
 mine=S.spacesApi(req(official.token,'POST'),['spaces','save'],{...mine,publish:true},new URL(base));
 assert.equal(S.publicSpace(req(),mine.handle).profile.name,'Private owner draft');assert.ok(mine.history.length>=3);
 let member=S.mine(req(other.token));member=S.spacesApi(req(other.token,'POST'),['spaces','save'],{...member,publish:true,profile:{...member.profile,name:'Forged owner publish'}},new URL(base));assert.equal(member.visibility,'private');assert.equal(member.canManage,false);
 const foreign=randomUUID();d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(foreign,'foreign.png',1,'image/png',D.hash('fixture'),D.now());
 assert.throws(()=>S.spacesApi(req(official.token,'POST'),['spaces','save'],{...mine,publish:true,profile:{...mine.profile,avatarId:foreign}},new URL(base)),error=>error.status===403,'owner personal page still enforces scoped file ownership');
});

test('the canonical account cannot be closed, demoted or rebound to another mailbox by account endpoints',()=>{
 assert.equal(E.emailAccount(official.email).actor,official.id);assert.equal(E.emailAccount('legacy-owner@example.com'),null);
 assert.throws(()=>E.bindEmail(req(official.token,'POST'),{email:'replacement@example.com',current:password}),error=>error.status===403);
 assert.throws(()=>C.communityApi(req(official.token,'POST'),['community','account'],{action:'close',current:password,confirm:true},new URL(base)),error=>error.status===403);
 assert.throws(()=>C.communityApi(req(official.token,'POST'),['admin','community','accounts'],{id:official.id,action:'role',role:'member',reason:'Attempt to demote the sole administrator'},new URL(base)),error=>error.status===403);
 assert.equal(A.currentUser(req(official.token)).role,'owner');
});

test('configured identity failures never fall back to a legacy administrator',()=>{
 for(const value of ['invalid json',{id:'missing',email:official.email},{id:official.id,email:'wrong@example.com'}]){
  select(value);assert.equal(D.ownerAccountConfigured(),true);assert.equal(D.ownerAccountId(),'');assert.equal(A.currentUser(req(legacy)),null);assert.equal(A.currentUser(req(official.token)).role,'member');
 }
 select({id:official.id,email:official.email});d.prepare("UPDATE community_users SET status='restricted' WHERE id=?").run(official.id);assert.equal(D.ownerAccountId(),'');assert.equal(A.currentUser(req(official.token)).role,'member');d.prepare("UPDATE community_users SET status='active' WHERE id=?").run(official.id);assert.equal(D.ownerAccountId(),official.id);
});

test('previous reviewer preview links lose cross-account access after the owner is configured',async()=>{
 const space=S.mine(req(other.token)),file=randomUUID(),bundle=randomUUID(),access=randomUUID();
 d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(file,'private.html',1,'text/html',D.hash('fixture'),D.now());
 d.prepare('INSERT INTO blog_bundles VALUES(?,?,?,?,?,?,?)').run(bundle,space.id,file,'["index.html"]',1,'index.html',D.now());
 d.prepare("INSERT INTO space_reviews(id,space,kind,version,data,status,created) VALUES(?,?,'board',1,?,'pending',?)").run(randomUUID(),space.id,JSON.stringify({layout:{blog:{bundleId:bundle}}}),D.now());
 d.prepare('INSERT INTO blog_previews VALUES(?,?,?,?,?)').run(D.hash(access),bundle,D.hash(reviewer.token),reviewer.id,Date.now()+60000);
 await assert.rejects(()=>Hosting.blogFileResponse(req(),bundle,access,['index.html']),error=>error.status===404);
});

test('retired administrator tool credentials cannot read cached idempotent responses',async()=>{
 const key=randomUUID(),token='erg_'+randomBytes(32).toString('base64url'),input={operation:'library.save',input:{type:'articles',data:{title:'Cached legacy response'}},requestId:'owner-account-cached-fixture'};
 d.prepare('INSERT INTO connect_keys(id,actor,name,hash,scopes,expires,created) VALUES(?,?,?,?,?,?,?)').run(key,'owner','Legacy fixture',D.hash(token),'["library"]',Date.now()+600000,D.now());
 d.prepare('INSERT INTO connect_requests VALUES(?,?,?,?,?)').run(key,input.requestId,D.hash(JSON.stringify({operation:input.operation,value:input.input})),JSON.stringify({private:'legacy cached data'}),Date.now());
 await assert.rejects(()=>Connect.connectApi(new Request(base+'/api/connect',{method:'POST',headers:{Authorization:'Bearer '+token,Origin:base}}),input),error=>error.status===403);
});

test('the admin password endpoint changes the same personal account and revokes its sessions and tools',async()=>{
 const legacyPassword=d.prepare('SELECT password FROM admins WHERE id=1').get().password,key=randomUUID();
 d.prepare('INSERT INTO connect_keys(id,actor,name,hash,scopes,expires,created) VALUES(?,?,?,?,?,?,?)').run(key,official.id,'Owner fixture',D.hash(randomUUID()),'["library"]',Date.now()+600000,D.now());
 const response=await API.handle(req(official.token,'POST','/api/auth/password',{current:password,password:'replacement-canonical-fixture-password'}));assert.equal(response.status,200);
 assert.equal(d.prepare('SELECT password FROM admins WHERE id=1').get().password,legacyPassword);
 assert.equal(A.currentUser(req(official.token)),null);assert.equal(d.prepare('SELECT revoked FROM connect_keys WHERE id=?').get(key).revoked,1);
 const token=A.login(req(),{email:official.email,password:'replacement-canonical-fixture-password'});assert.equal(A.currentUser(req(token)).id,official.id);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});});
