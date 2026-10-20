import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {scryptSync} from 'node:crypto';
const temp=await mkdtemp(path.join(tmpdir(),'site-email-'));
process.env.APP_DATA_DIR=temp;process.env.PUBLIC_URL='http://127.0.0.1:3008';process.env.COOKIE_SECURE='false';process.env.MAIL_MODE='capture';process.env.INITIAL_ADMIN_PASSWORD='email-owner-password-2026';
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),E=await import('../src/lib/email-auth.mjs'),C=await import('../src/lib/community.mjs'),H=await import('../src/lib/api.mjs');
const req=(token='',ip='127.0.0.1')=>new Request(process.env.PUBLIC_URL+'/api/community',{method:'POST',headers:{host:new URL(process.env.PUBLIC_URL).host,origin:process.env.PUBLIC_URL,'x-real-ip':ip,cookie:token?'site_admin='+token:''}});
const owner=A.login(req(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
const call=(p,input={},token=owner,method='POST')=>C.communityApi(new Request(req(token),{method}),p.split('/'),input,new URL(process.env.PUBLIC_URL+'/api/'+p));
const config=call('community/config',{},'','GET'),ack={accepted:true,adult:true,policyVersion:config.policyVersion,policyHash:config.policyHash};
let memberToken,memberId;
async function codeFor(email){for(const name of (await readdir(path.join(temp,'mail-outbox'))).sort().reverse()){const mail=JSON.parse(await readFile(path.join(temp,'mail-outbox',name),'utf8'));if(mail.to===email)return mail.text.match(/\d{6}/)[0]}throw new Error('Missing captured email')}
test('email signup requires owned, unexpired, invite-bound code; failed attempts persist and successful code cannot replay',async()=>{
 const invite=call('admin/community/invites',{label:'邮箱流程隔离邀请'}),email='member@example.com',input={...ack,email,password:'email-member-password-2026',nickname:'邮箱测试成员',invite:invite.token};
 assert.throws(()=>call('community/register',input,''),e=>e.status===400);
 const sent=await E.requestEmail(req(),{purpose:'register',email,invite:invite.token});assert.equal(sent.code,undefined);assert.ok(sent.challenge);const code=await codeFor(email),payload={...input,challenge:sent.challenge,code};
 assert.throws(()=>call('community/register',{...payload,code:code==='000000'?'111111':'000000'},''),e=>e.status===400);assert.equal(D.db().prepare('SELECT attempts FROM email_challenges WHERE id=?').get(sent.challenge).attempts,1);
 const other=call('admin/community/invites',{label:'不同邀请不能复用验证'});assert.throws(()=>call('community/register',{...payload,invite:other.token},''));call('community/register',payload,'');assert.throws(()=>call('community/register',payload,''));
 memberToken=A.login(req(),{email,password:input.password});const me=A.currentUser(req(memberToken));memberId=me.id;assert.equal(me.email,email);assert.ok(me.emailVerifiedAt);assert.match(me.username,/^member_/);call('admin/community/accounts',{id:memberId,action:'qualify',checked:true,reason:'确认邮箱测试昵称和本地资格'});assert.ok(!JSON.stringify(call('community/members/'+memberId,{},'','GET')).includes(email));
});
test('codes have a five-attempt cap, expiry, replacement and purpose isolation',()=>{
 const scope=D.hash('isolated-invite'),first=E.prepareEmailChallenge('isolated@example.com','register','',scope);E.activateEmailChallenge(first.id);let input={email:'isolated@example.com',challenge:first.id,code:first.code};
 for(let i=0;i<5;i++)assert.throws(()=>E.verifyEmailChallenge({...input,code:'bad'},'register','',scope));assert.throws(()=>E.verifyEmailChallenge(input,'register','',scope));
 const second=E.prepareEmailChallenge(input.email,'register','',scope);E.activateEmailChallenge(second.id);input={...input,challenge:second.id,code:second.code};assert.throws(()=>E.verifyEmailChallenge(input,'reset','',scope));D.db().prepare('UPDATE email_challenges SET expires=0 WHERE id=?').run(second.id);assert.throws(()=>E.verifyEmailChallenge(input,'register','',scope));
 const third=E.prepareEmailChallenge(input.email,'register','',scope);E.activateEmailChallenge(third.id);const fourth=E.prepareEmailChallenge(input.email,'register','',scope);E.activateEmailChallenge(fourth.id);assert.throws(()=>E.verifyEmailChallenge({...input,challenge:third.id,code:third.code},'register','',scope));
});
test('binding email requires current password, preserves the active session and revokes other sessions',async()=>{
 const other=A.login(req(),{email:'member@example.com',password:'email-member-password-2026'}),email='updated@example.com',sent=await E.requestEmail(req(memberToken),{purpose:'bind',email,current:'email-member-password-2026'}),code=await codeFor(email),input={email,challenge:sent.challenge,code,current:'email-member-password-2026'};
 assert.throws(()=>E.bindEmail(req(memberToken),{...input,current:'wrong'}));assert.equal(E.bindEmail(req(memberToken),input).user.email,email);assert.equal(A.currentUser(req(other)),null);assert.equal(A.currentUser(req(memberToken)).email,email);assert.throws(()=>E.bindEmail(req(memberToken),input));
});
test('password recovery is non-enumerating, single-use and revokes all sessions',async()=>{
 const email='updated@example.com';await assert.rejects(E.requestEmail(req(),{purpose:'reset',email}),e=>e.status===429);D.db().prepare('UPDATE limits SET reset=0 WHERE key=?').run('email-cooldown:'+D.hash(email));const sent=await E.requestEmail(req(),{purpose:'reset',email}),missing=await E.requestEmail(req(),{purpose:'reset',email:'missing@example.com'});assert.deepEqual(Object.keys(sent),Object.keys(missing));assert.equal(sent.message,missing.message);assert.equal(sent.code,undefined);
 const input={email,challenge:sent.challenge,code:await codeFor(email),password:'replacement-member-password-2026'};E.resetEmailPassword(req(),input);assert.equal(A.currentUser(req(memberToken)),null);assert.throws(()=>E.resetEmailPassword(req(),input));assert.throws(()=>A.login(req(),{email,password:'email-member-password-2026'}));memberToken=A.login(req(),{email,password:input.password});assert.equal(A.currentUser(req(memberToken)).id,memberId);
});
test('capture is loopback-only, private on disk, and request identities ignore forged forwarding headers by default',async()=>{
 const dir=path.join(temp,'mail-outbox');assert.equal((await stat(dir)).mode&0o777,0o700);for(const name of await readdir(dir))assert.equal((await stat(path.join(dir,name))).mode&0o777,0o600);
 process.env.PUBLIC_URL='https://public.example.com';assert.equal(E.emailStatus(req()).available,false);assert.match(A.sessionCookie('test'),/Secure/);process.env.PUBLIC_URL='http://127.0.0.1:3008';process.env.TRUST_PROXY='false';assert.equal(A.clientIp(req('','8.8.8.8')),'untrusted');process.env.TRUST_PROXY='true';assert.equal(A.clientIp(req('','127.0.0.1')),'127.0.0.1');assert.equal(A.clientIp(req('','forged, 1.1.1.1')),'unknown');process.env.TRUST_PROXY='false';
});
test('legacy password hashes remain valid and new hashes use versioned stronger scrypt',()=>{const salt='f'.repeat(32),legacy=salt+':'+scryptSync('legacy-password',salt,64).toString('hex');assert.ok(D.passwordMatches('legacy-password',legacy));const stored=D.passwordHash('new-password');assert.match(stored,/^v2:/);assert.ok(D.passwordMatches('new-password',stored));assert.equal(D.passwordMatches('wrong',stored),false);assert.equal(D.passwordMatches('anything','malformed'),false)});
test('JSON and login body validation rejects arrays, unexpected content types and oversized input',async()=>{
 for(const [body,type,status]of [['[]','application/json',400],['{}','text/plain',415],[JSON.stringify({username:'admin',password:'x'.repeat(5000)}),'application/json',413]]){const response=await H.handle(new Request(process.env.PUBLIC_URL+'/api/auth/login',{method:'POST',headers:{origin:process.env.PUBLIC_URL,'content-type':type},body}));assert.equal(response.status,status)}
});
test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(temp,{recursive:true,force:true})});
