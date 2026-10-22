import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-production-auth-'));
const base='https://space.example.com',password='isolated-production-password-2026';
Object.assign(process.env,{APP_DATA_DIR:directory,INITIAL_ADMIN_PASSWORD:'isolated-owner-password-2026',APP_SURFACE:'platform',PUBLIC_URL:base,PUBLIC_FEATURES_ENABLED:'true',REGISTRATION_ENABLED:'true',LEGAL_OPERATOR:'Test operator',LEGAL_CONTACT_EMAIL:'test@example.com',LEGAL_EFFECTIVE_DATE:'2026-10-22',MAIL_MODE:'capture',TRUST_PROXY:'false'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),E=await import('../src/lib/email-auth.mjs'),C=await import('../src/lib/community.mjs'),S=await import('../src/lib/spaces.mjs'),P=await import('../src/lib/community-policies.mjs'),API=await import('../src/lib/api.mjs');
const d=D.db(),req=(pathname='/api/auth/me',token='',body,headers={})=>new Request(base+pathname,{method:body===undefined?'GET':'POST',headers:{host:'space.example.com',origin:base,cookie:token?'site_platform='+token:'','content-type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
for(const [id,verification,emailVerified] of [['pending','pending',true],['local','local_test',true],['verified','verified',true],['unverified','verified',false],['reviewer','verified',true]])d.prepare('INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated,email,email_verified_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,id,D.passwordHash(password),id,id==='reviewer'?'reviewer':'member','active',verification,D.now(),D.now(),id+'@example.com',emailVerified?D.now():null);

test('public password login preserves real identity, verified email, role and qualification boundaries',async()=>{
 for(const id of ['pending','local','verified']){const token=A.login(req(),{email:id+'@example.com',password}),user=A.currentUser(req('/api/auth/me',token));assert.equal(user.id,id);assert.equal(user.canPublish,id==='verified');}
 assert.throws(()=>A.login(req(),{username:'unverified',password}),error=>error.status===403);
 assert.throws(()=>A.login(req(),{username:'verified',password:'wrong'}),error=>error.status===401);
 assert.throws(()=>A.login(req(),{username:'reviewer',password}),error=>error.status===403);
 assert.throws(()=>A.login(req(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD}),error=>error.status===403);
 const token=A.login(req(),{username:'verified',password});
 assert.equal(A.currentUser(req('/api/auth/me',token,undefined,{host:'attacker.example'})),null);
 assert.equal((await API.handle(req('/api/auth/login','',{username:'verified',password},{origin:'https://attacker.example'}))).status,403);
 assert.match(A.sessionCookie(token),/Secure/);assert.match(A.sessionCookie(token),/HttpOnly/);assert.doesNotMatch(A.sessionCookie(token),/Domain=/);
 process.env.PUBLIC_FEATURES_ENABLED='false';assert.equal(A.currentUser(req('/api/auth/me',token)),null);assert.throws(()=>A.login(req(),{username:'verified',password}),error=>error.status===503);process.env.PUBLIC_FEATURES_ENABLED='true';
});

test('verified email registration on the public origin creates a private editable draft and never grants publishing',async()=>{
 const email='new-public-member@example.com',challenge=E.prepareEmailChallenge(email,'register','',D.hash(''));E.activateEmailChallenge(challenge.id);
 const input={email,password,nickname:'Public member',challenge:challenge.id,code:challenge.code,adult:true,accepted:true,policyVersion:P.policyBundle(req()).version,policyHash:P.policyBundle(req()).hash};
 const response=await API.handle(req('/api/community/register','',input));assert.equal(response.status,200,await response.text());
 const row=d.prepare('SELECT * FROM community_users WHERE email=?').get(email);assert.ok(row.email_verified_at);assert.equal(row.verification,'pending');
 const token=A.login(req(),{email,password}),user=A.currentUser(req('/api/auth/me',token));assert.equal(user.canPublish,false);
 const space=S.mine(req('/api/spaces/mine',token));assert.equal(space.visibility,'private');assert.equal(space.profile.name,'Public member');
 assert.equal((await API.handle(req('/api/community/register','',input))).status,400);
 // Capture is never a production transport, even when public features are open.
 assert.equal(E.emailStatus(req()).available,false);
});

test('public password reset is single use and revokes all existing member sessions',()=>{
 const row=d.prepare('SELECT * FROM community_users WHERE id=?').get('verified'),token=A.login(req(),{username:row.username,password});
 const challenge=E.prepareEmailChallenge(row.email,'reset',row.id,D.hash(row.password+':'+row.email));E.activateEmailChallenge(challenge.id);
 const input={email:row.email,challenge:challenge.id,code:challenge.code,password:'replacement-production-password-2026'};
 E.resetEmailPassword(req('/api/auth/email/reset'),input);assert.equal(A.currentUser(req('/api/auth/me',token)),null);
 assert.throws(()=>E.resetEmailPassword(req('/api/auth/email/reset'),input),error=>error.status===400);
 assert.equal(A.currentUser(req('/api/auth/me',A.login(req(),{email:row.email,password:input.password}))).id,row.id);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
