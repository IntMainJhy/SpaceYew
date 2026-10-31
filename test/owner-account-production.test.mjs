import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-public-owner-')),base='https://space.example.com',password='public-owner-fixture-password';
Object.assign(process.env,{APP_DATA_DIR:directory,APP_SURFACE:'combined',PUBLIC_URL:base,PUBLIC_FEATURES_ENABLED:'true',LEGAL_OPERATOR:'Test operator',LEGAL_CONTACT_EMAIL:'test@example.com',LEGAL_EFFECTIVE_DATE:'2026-10-22',INITIAL_ADMIN_PASSWORD:'legacy-production-fixture-password'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),S=await import('../src/lib/spaces.mjs'),C=await import('../src/lib/community.mjs'),Catalog=await import('../src/lib/catalog.mjs');
const d=D.db(),id=randomUUID(),email='official@example.com',time=D.now();
d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated,email,email_verified_at) VALUES(?,?,?,?,'owner','active','pending',?,?,?,?)").run(id,'official',D.passwordHash(password),'Official author',time,time,email,time);
for(const key of ['ownerAccount','siteOwnerAccount'])d.prepare('INSERT INTO config VALUES(?,?)').run(key,JSON.stringify({id,email}));
const request=(token='',method='GET')=>new Request(base+'/api/community',{method,headers:{host:'space.example.com',Origin:base,Cookie:token?'site_admin='+token:''}}),token=A.login(request(),{email,password});
const community=(parts,input={},method='GET')=>C.communityApi(request(token,method),parts.split('/'),input,new URL(base));

test('the configured owner keeps author and discovery privileges on a non-loopback public origin',()=>{
 const user=A.currentUser(request(token));assert.equal(user.id,id);assert.equal(user.role,'owner');assert.equal(user.canPublish,true);assert.equal(user.verification,'pending','owner authority does not forge member verification records');
 const mine=S.mine(request(token));const saved=S.spacesApi(request(token,'POST'),['spaces','save'],{...mine,publish:true,profile:{...mine.profile,name:'Published owner on public origin'}},new URL(base));assert.equal(saved.visibility,'public');assert.equal(S.publicSpace(request(),saved.handle).owner,id);assert.ok(S.publicSpaces(request()).some(row=>row.handle===saved.handle));
 const policy=community('community/config'),ack={accepted:true,policyVersion:policy.policyVersion,policyHash:policy.policyHash};
 let post=community('community/submissions',{data:{title:'A practical engineering note',body:'I write original notes about building useful websites and preserving clear interfaces. This short original text records a practical software development experience.'}},'POST');post=community('community/submissions/'+post.id,{...ack,action:'submit',version:post.version},'POST');assert.equal(post.visibility,'public');assert.equal(C.publicPost(post.id).authorId,id);assert.ok(C.publicPosts().items.some(row=>row.id===post.id));
 const comment=community('community/comments',{...ack,post:post.id,body:'An original short follow-up from the site author.'},'POST');assert.equal(comment.status,'approved');const comments=community('community/comments/'+post.id);assert.ok(comments.items.some(row=>row.id===comment.id));assert.equal(comments.approvedCount,1);assert.equal(C.publicPosts().items.find(row=>row.id===post.id).commentCount,1);
 const input={kind:'docs',title:'An original publishing guide',summary:'A practical original note about account ownership, publishing and maintaining a useful engineering knowledge library.',bodyHtml:'<p>This original engineering note records how an author maintains a useful knowledge library and publishes clear documentation for readers.</p>',category:'Engineering',license:'Original text by the author.'};let entry=Catalog.catalogApi(request(token,'POST'),['catalog','save'],input,new URL(base));entry=Catalog.catalogApi(request(token,'POST'),['catalog',entry.id,'action'],{...ack,action:'submit',version:entry.version},new URL(base));assert.equal(entry.visibility,'public');assert.equal(Catalog.publicCatalogItem(entry.id,request()).authorId,id);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});});
