import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-production-content-'));
const base='https://space.example.com';
Object.assign(process.env,{APP_DATA_DIR:directory,INITIAL_ADMIN_PASSWORD:'isolated-production-owner-password',APP_SURFACE:'combined',PUBLIC_URL:base,PLATFORM_URL:base,PUBLIC_FEATURES_ENABLED:'true',LEGAL_OPERATOR:'Test operator',LEGAL_CONTACT_EMAIL:'operator@example.com',LEGAL_EFFECTIVE_DATE:'2026-10-22'});
const D=await import('../src/lib/db.mjs'),C=await import('../src/lib/community.mjs'),Catalog=await import('../src/lib/catalog.mjs'),S=await import('../src/lib/spaces.mjs'),P=await import('../src/lib/community-policies.mjs'),API=await import('../src/lib/api.mjs');
const d=D.db(),tokens={};
for(const id of ['pending','alice','bob']){const token=id+'-isolated-session';tokens[id]=token;d.prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated,email,email_verified_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,id,'unused',id,id==='pending'?'pending':'verified',D.now(),D.now(),id+'@example.com',D.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(D.hash(token),Date.now()+600000,id);d.prepare('INSERT INTO session_realms VALUES(?,?,?)').run(D.hash(token),'combined','password')}
tokens.owner='isolated-owner-session';d.prepare('INSERT INTO sessions VALUES(?,?,NULL)').run(D.hash(tokens.owner),Date.now()+600000);d.prepare('INSERT INTO session_realms VALUES(?,?,?)').run(D.hash(tokens.owner),'combined','password');
const req=(id='',method='GET',pathname='/api/community/config',input)=>new Request(base+pathname,{method,headers:{host:new URL(base).host,origin:base,cookie:id?'site_admin='+tokens[id]:'','content-type':'application/json'},body:input===undefined?undefined:JSON.stringify(input)});
const call=(id,parts,input={},method='POST')=>C.communityApi(req(id,method),parts.split('/'),input,new URL(base));
const agreement=()=>{const bundle=P.policyBundle(req());return{accepted:true,policyVersion:bundle.version,policyHash:bundle.hash}};
const plain={title:'Readable interfaces',body:'Use clear labels and useful error messages, and test the complete flow with a keyboard.'};

test('production policies bind the actual documents and fail closed until configured',()=>{
 const bundle=P.policyBundle(req());assert.equal(bundle.status,'active');assert.doesNotMatch(bundle.documents.privacy.text,/【待填写/);assert.match(bundle.documents.privacy.text,/operator@example.com/);
 assert.equal(call('','community/config',{},'GET').policyHash,bundle.hash);
 const original=process.env.LEGAL_OPERATOR;delete process.env.LEGAL_OPERATOR;assert.equal(P.policyBundle(req()).ready,false);assert.throws(()=>call('','community/register',{adult:true,...agreement()}),error=>error.status===503);process.env.LEGAL_OPERATOR=original;
 process.env.LEGAL_CONTACT_EMAIL='other@example.com';assert.notEqual(P.policyBundle(req()).hash,bundle.hash);process.env.LEGAL_CONTACT_EMAIL='operator@example.com';
});

test('unverified accounts keep private drafts while public posting and cross-account access stay blocked',async()=>{
 const draft=call('pending','community/submissions',{data:plain});assert.ok(draft.id);assert.throws(()=>call('pending','community/submissions/'+draft.id,{action:'submit',version:draft.version,...agreement()}),e=>e.status===403);assert.throws(()=>call('bob','community/submissions/'+draft.id,{},'GET'),e=>e.status===404);assert.equal(call('','community/posts',{},'GET').items.length,0);
 const response=await API.handle(new Request(base+'/api/community/posts',{headers:{host:'attacker.example'}}));assert.equal(response.status,503);
 assert.throws(()=>call('owner','admin/community/accounts',{id:'pending',action:'verify_identity',reason:'An isolated verification record',method:'approved provider',reference:'check-123',nicknameChecked:true}),e=>e.status===400);
 call('owner','admin/community/accounts',{id:'pending',action:'verify_identity',reason:'An isolated completed check, no personal documents',method:'approved provider',reference:'check-123',nicknameChecked:true,identityChecked:true});assert.equal(d.prepare('SELECT verification FROM community_users WHERE id=?').get('pending').verification,'verified');
 const sent=call('pending','community/submissions/'+draft.id,{action:'submit',version:draft.version,...agreement()});assert.equal(sent.visibility,'public');assert.equal(call('','community/posts',{},'GET').items.length,1);
});

test('manual posts, comments and catalog shares keep moderation and exactly-one synchronization on HTTPS',()=>{
 const doc={kind:'docs',title:'Accessible forms',summary:'Build readable, accessible forms with clear labels and understandable messages.',bodyHtml:'<h2>Clear labels</h2><p>Label each input and explain each validation error. Test the complete flow with the keyboard before release.</p>',category:'Frontend',license:'Original work by the author.'};
 const catalog=(parts,input={},id='alice',method='POST')=>Catalog.catalogApi(req(id,method),parts.split('/'),input,new URL(base));
 let entry=catalog('catalog/save',doc);entry=catalog('catalog/'+entry.id+'/action',{action:'submit',version:entry.version,...agreement()});assert.equal(entry.status,'published');assert.equal(C.publicPost(entry.communityPostId).origin,'catalog');assert.equal(d.prepare('SELECT COUNT(*) n FROM community_posts WHERE id=?').get(entry.communityPostId).n,1);assert.throws(()=>catalog('catalog/'+entry.id+'/action',{action:'submit',version:entry.version,...agreement()}),e=>e.status===409);
 const comment=call('bob','community/comments',{post:entry.communityPostId,body:'These labels make the form easier to understand.',...agreement()});assert.equal(comment.status,'approved');const risky=call('bob','community/comments',{post:entry.communityPostId,body:'这是一份关于赌博风险的说明，需要人工核查具体语境。',...agreement()});assert.equal(risky.status,'pending');assert.equal(call('','community/comments/'+entry.communityPostId,{},'GET').items.some(x=>x.id===risky.id),false);
 d.prepare("UPDATE community_users SET status='banned' WHERE id='alice'").run();assert.throws(()=>Catalog.publicCatalogItem(entry.id,req()),e=>e.status===404);assert.throws(()=>C.publicPost(entry.communityPostId),e=>e.status===404);
});

test('the approved featured homepage remains visible without upgrading its historical local qualification',()=>{
 let space=S.mine(req('bob'));space=S.spacesApi(req('bob','POST'),['spaces','save'],{...space,profile:{...space.profile,name:'Existing owner profile'}},new URL(base));space=S.spacesApi(req('bob','POST'),['spaces','submit'],{revision:space.revision,...agreement()},new URL(base));const review=space.reviews.find(x=>x.status==='pending');S.spacesApi(req('owner','POST'),['admin','spaces'],{id:review.id,action:'approve',checked:true,reason:'Reviewed an isolated production profile'},new URL(base));
 d.prepare('INSERT OR REPLACE INTO config VALUES(?,?)').run('siteOwnerAccount',JSON.stringify({id:'bob'}));d.prepare('INSERT OR REPLACE INTO config VALUES(?,?)').run('featuredBlog',JSON.stringify({handle:space.handle}));d.prepare("UPDATE community_users SET verification='local_test' WHERE id='bob'").run();assert.equal(S.defaultBlogSpace(req()).profile.name,'Existing owner profile');assert.equal(S.mine(req('bob')).canPublish,false);assert.throws(()=>S.spacesApi(req('bob','POST'),['spaces','submit'],{revision:space.revision,...agreement()},new URL(base)),e=>e.status===403);
});

test('server rendering preloads public community resources through the same public guards',async()=>{const {pageResources}=await import('../src/lib/page-resources.mjs');const page=await pageResources(req(),['community'],{});assert.equal(page.resources['/api/community/config'].data.mode,'public');assert.equal(page.resources['/api/community/posts'].status,200)});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
