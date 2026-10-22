import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-site-owner-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://localhost:3197',APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'isolated-owner-identity-password'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),S=await import('../src/lib/spaces.mjs'),C=await import('../src/lib/community.mjs'),API=await import('../src/lib/api.mjs'),Catalog=await import('../src/lib/catalog.mjs');
const d=D.db(),base=process.env.PUBLIC_URL,password='isolated-personal-member-password';
const request=(token='',method='GET',pathname='/api/community')=>new Request(base+pathname,{method,headers:{Cookie:token?'site_admin='+token:'',Origin:base}});
function account(name){const id=randomUUID();d.prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,?,?,?)').run(id,name,D.passwordHash(password),name,'local_test',D.now(),D.now());return{id,username:name,token:A.login(request(),{username:name,password})}}
const official=account('official_member'),other=account('other_member'),owner=A.login(request(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
const select=id=>d.prepare("INSERT OR REPLACE INTO config VALUES('siteOwnerAccount',?)").run(JSON.stringify({id}));
const community=(route,input={},token='',method='GET')=>C.communityApi(request(token,method),route.split('/'),input,new URL(base+'/api/'+route));
let officialSpace,officialPost;

test('the public owner badge is operator-assigned, account-bound and never grants administration',async()=>{
 assert.equal(D.isSiteOwnerAccount(official.id),false);assert.equal(D.isSiteOwnerAccount(''),false);
 d.prepare("INSERT INTO config VALUES('siteOwnerAccount','invalid json')").run();assert.equal(D.isSiteOwnerAccount(official.id),false);select('missing-account');assert.equal(D.siteOwnerAccountId(),'');
 select(official.id);assert.equal(D.siteOwnerAccountId(),official.id);assert.equal(D.isSiteOwnerAccount(other.id),false);
 const user=A.currentUser(request(official.token));assert.equal(user.siteOwner,true);assert.equal(user.role,'member');assert.equal(A.currentUser(request(other.token)).siteOwner,false);assert.equal(A.currentUser(request(owner)).siteOwner,false);assert.throws(()=>A.admin(request(official.token)),e=>e.status===401);
 assert.equal((await API.handle(request(official.token,'GET','/api/admin/bootstrap'))).status,401);
 process.env.APP_SURFACE='admin';assert.throws(()=>A.login(request(),{username:official.username,password}),e=>e.status===403);process.env.APP_SURFACE='combined';
 const own=S.mine(request(other.token));const saved=S.spacesApi(request(other.token,'POST'),['spaces','save'],{...own,siteOwner:true,profile:{...own.profile,siteOwner:true,name:'A self-claimed owner'}},null);
 assert.equal(saved.siteOwner,false);assert.equal(saved.profile.siteOwner,undefined);assert.equal(D.siteOwnerAccountId(),official.id);
 assert.equal(A.currentUser(request(other.token)).role,'member');
});

test('default blog, discovery and community authors expose one consistent identity without changing editable ownership',()=>{
 officialSpace=S.mine(request(official.token));assert.equal(officialSpace.siteOwner,true);assert.equal(officialSpace.legacy,false);
 officialSpace=S.spacesApi(request(official.token,'POST'),['spaces','save'],{...officialSpace,profile:{...officialSpace.profile,name:'Reviewed personal homepage'},layout:{...officialSpace.layout,blog:{mode:'theme',theme:'anx',sections:[]}}},null);
 const submitted=S.spacesApi(request(official.token,'POST'),['spaces','submit'],{revision:officialSpace.revision,accepted:true},null),review=submitted.reviews.find(row=>row.kind==='board'&&row.status==='pending');
 S.spacesApi(request(owner,'POST'),['admin','spaces'],{id:review.id,action:'approve',checked:true,reason:'Review of isolated personal homepage identity'},null);
 d.prepare("INSERT INTO config VALUES('featuredBlog',?)").run(JSON.stringify({handle:officialSpace.handle}));
 assert.equal(S.defaultBlogSpace(request()).siteOwner,true);assert.equal(S.publicSpaces(request()).find(row=>row.handle===officialSpace.handle).siteOwner,true);
 assert.equal(S.defaultBlogSpace(request(other.token)).owner,official.id);assert.equal(S.mine(request(other.token)).owner,other.id,'Editing is based on the signed-in identity, never the default homepage');
 const directory=community('community/members');assert.equal(directory.items[0].id,official.id);assert.equal(directory.items[0].siteOwner,true);assert.equal(directory.items.some(row=>row.id==='owner'),false,'The retired admin profile is not the default recommendation');
 const policy=community('community/config'),ack={accepted:true,policyVersion:policy.policyVersion,policyHash:policy.policyHash};
 let post=community('community/submissions',{data:{title:'Original identity verification',body:'This original engineering note verifies the account-bound author marker and independent post permissions.'}},official.token,'POST');
 officialPost=community('community/submissions/'+post.id,{...ack,action:'submit',version:post.version},official.token,'POST');
 assert.equal(C.publicPost(officialPost.id).authorSiteOwner,true);assert.equal(C.publicPosts().items.find(row=>row.id===officialPost.id).authorSiteOwner,true);
 const comment=community('community/comments',{...ack,post:officialPost.id,body:'A comment from the verified site owner.'},official.token,'POST');assert.equal(comment.author.siteOwner,true);
 assert.equal(community('community/members/'+official.id).siteOwner,true);assert.equal(community('community/members/'+other.id).siteOwner,false);
 const catalog=(parts,input)=>Catalog.catalogApi(request(official.token,'POST'),parts.split('/'),input,new URL(base));let entry=catalog('catalog/save',{kind:'docs',title:'An original author identity guide',summary:'A practical note on preserving account identity while keeping administrative authorization separate.',bodyHtml:'<p>This original text explains why a public author badge does not grant administrative access or publishing privileges.</p>',category:'Engineering',license:'Original text by the author.'});entry=catalog('catalog/'+entry.id+'/action',{action:'submit',version:entry.version,...ack});assert.equal(Catalog.publicCatalogItem(entry.id,request()).authorSiteOwner,true);assert.equal(C.publicPost(entry.communityPostId).authorSiteOwner,true);
 select(other.id);assert.equal(S.defaultBlogSpace(request()).siteOwner,false);assert.equal(C.publicPost(officialPost.id).authorSiteOwner,false,'Changing a display identity does not rewrite reviewed post versions');select(official.id);
 d.prepare("UPDATE community_users SET status='restricted' WHERE id=?").run(official.id);assert.equal(D.isSiteOwnerAccount(official.id),false);assert.equal(A.currentUser(request(official.token)).siteOwner,false);assert.throws(()=>community('community/members/'+official.id),e=>e.status===404);assert.throws(()=>C.publicPost(officialPost.id),e=>e.status===404);assert.throws(()=>S.defaultBlogSpace(request()),e=>e.status===404);
 d.prepare("UPDATE community_users SET status='active' WHERE id=?").run(official.id);assert.equal(D.isSiteOwnerAccount(official.id),true);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
