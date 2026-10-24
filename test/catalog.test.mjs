import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(path.join(tmpdir(),'spaceyew-catalog-'));
process.env.APP_DATA_DIR=dir;process.env.PUBLIC_URL='http://localhost:3129';process.env.INITIAL_ADMIN_PASSWORD='catalog-owner-test-password';
const D=await import('../src/lib/db.mjs'),C=await import('../src/lib/catalog.mjs'),Community=await import('../src/lib/community.mjs'),M=await import('../src/lib/moderation.mjs'),Connect=await import('../src/lib/connect.mjs');
const d=D.db();
function account(name,role='member'){const id=randomUUID(),token=randomUUID();d.prepare('INSERT INTO community_users(id,username,password,nickname,role,verification,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,name,D.passwordHash('test-member-password-2026'),name,role,'local_test',D.now(),D.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(D.hash(token),Date.now()+600000,id);return{id,token}}
const alice=account('alice'),bob=account('bob'),reviewer=account('reviewer','reviewer'),owner={id:'owner',token:randomUUID()};d.prepare('INSERT INTO sessions VALUES(?,?,NULL)').run(D.hash(owner.token),Date.now()+600000);
const req=(user=alice,method='POST')=>new Request(process.env.PUBLIC_URL+'/api/catalog',{method,headers:{cookie:'site_admin='+user.token,origin:process.env.PUBLIC_URL}});
const call=(parts,input={},user=alice,method='POST')=>C.catalogApi(req(user,method),parts.split('/'),input,new URL(process.env.PUBLIC_URL));
const cfg=Community.communityApi(req(alice,'GET'),['community','config'],{},new URL(process.env.PUBLIC_URL)),accepted={accepted:true,policyVersion:cfg.policyVersion,policyHash:cfg.policyHash};
const doc={kind:'docs',title:'Accessible form basics',summary:'A practical tutorial about clear labels and keyboard interactions.',bodyHtml:'<h2>Label the inputs</h2><p>Use explicit labels, explain validation errors and test every interaction with the keyboard.</p>',category:'Frontend',license:'Original text by the author.'};
const save=(value=doc,user=alice)=>call('catalog/save',value,user);
const submit=(row,user=alice)=>call('catalog/'+row.id+'/action',{action:'submit',version:row.version,...accepted},user);
function approve(row){return call('admin/catalog/'+row.id,{action:'approve',version:row.version,reason:'Verified the original source, license, full text and linked material.',checked:true},reviewer)}

test('shared plain text publishes atomically once, independent of any blog; private drafts never leak',()=>{
 let item=save();assert.equal(C.publicCatalog({},req(alice,'GET')).items.length,0);assert.throws(()=>call('catalog/mine/'+item.id,{},bob,'GET'),e=>e.status===404);assert.throws(()=>C.publicCatalogItem(item.id,req(alice,'GET')),e=>e.status===404);
 item=submit(item);assert.equal(item.status,'published');assert.ok(item.communityPostId);assert.equal(C.publicCatalogItem(item.id,req(alice,'GET')).title,doc.title);assert.equal(C.publicCatalog().items.length,0);assert.throws(()=>C.publicCatalogItem(item.id),e=>e.status===503);assert.equal(C.publicCatalog({},new Request(process.env.PUBLIC_URL,{headers:{host:'public.example.com'}})).items.length,0);assert.equal(Community.publicPost(item.communityPostId).catalogUrl,item.url);assert.equal(d.prepare('SELECT COUNT(*) n FROM spaces WHERE owner=?').get(alice.id).n,0);
 const originalPost=item.communityPostId;item=save({...doc,id:item.id,version:item.version,title:'Updated accessible forms'});assert.equal(C.publicCatalogItem(item.id,req(alice,'GET')).title,doc.title);item=submit(item);assert.equal(item.communityPostId,originalPost);assert.equal(C.publicCatalogItem(item.id,req(alice,'GET')).title,'Updated accessible forms');assert.equal(d.prepare('SELECT COUNT(*) n FROM community_posts WHERE id=?').get(originalPost).n,1);
 assert.throws(()=>Community.communityApi(req(alice),['community','submissions'],{id:originalPost,version:1,data:{}},new URL(process.env.PUBLIC_URL)),e=>e.status===409);
});
test('risky text and external Skills remain private until an independent reviewer approves; sanitization and ownership hold',()=>{
 let item=submit(save({...doc,title:'Risk phrase',bodyHtml:'<p>这是一份提及网赌和赌博风险的说明文档，必须先由管理员核对具体语境。</p>'}));assert.equal(item.status,'pending');assert.ok(item.moderation.signals.some(x=>x.code==='gambling'));assert.throws(()=>C.publicCatalogItem(item.id,req(alice,'GET')),e=>e.status===404);assert.throws(()=>call('admin/catalog/'+item.id,{action:'approve',version:item.version,reason:'Trying own approval',checked:true},alice),e=>e.status===403);
 item=approve(item);assert.equal(item.status,'published');
 let skill=submit(save({...doc,kind:'skills',title:'Test Skill',sourceUrl:'https://github.com/example/example',installCommand:'npx skills add example/example',bodyHtml:doc.bodyHtml+'<script>alert(1)</script><iframe src="https://example.com"></iframe><img src="/media/123"/>'}));assert.equal(skill.status,'pending');assert.ok(skill.moderation.signals.some(x=>x.code==='external'));assert.equal(/<(script|iframe|img)/.test(skill.pending.bodyHtml),false);
 assert.throws(()=>save({...doc,coverId:randomUUID()}),e=>e.status===400);assert.throws(()=>save({...doc,sourceUrl:'https://127.0.0.1/private'}),e=>e.status===400);
 skill=call('admin/catalog/'+skill.id,{action:'reject',version:skill.version,reason:'Please provide the precise upstream license and documented installation.'},reviewer);assert.equal(skill.latestDecision.status,'rejected');assert.match(skill.reviewReason,/precise upstream license/);skill=submit(skill);const stale=skill;skill=call('catalog/'+skill.id+'/action',{action:'withdraw',version:skill.version});assert.equal(skill.status,'draft');assert.throws(()=>approve(stale),e=>e.status===409);
});
test('manual mode is owner-controlled and audited; offline and complaint freezes propagate to both public views',()=>{
 assert.throws(()=>call('admin/catalog/settings',{mode:'manual'},reviewer),e=>e.status===403);call('admin/catalog/settings',{mode:'manual'},owner);let item=submit(save({...doc,title:'Manual mode entry'}));assert.equal(item.status,'pending');assert.equal(call('admin/catalog',{},reviewer,'GET').settings.mode,'manual');item=approve(item);
 const report=Community.communityApi(req(bob),['community','cases'],{target:item.url,kind:'report',category:'其他',description:'Please review this shared document for this specific local test.'},new URL(process.env.PUBLIC_URL));const row=d.prepare('SELECT * FROM community_cases WHERE id=?').get(report.id);assert.equal(row.post,item.communityPostId);
 Community.communityApi(req(reviewer),['admin','community','cases',report.id],{action:'freeze',version:row.version,reason:'Temporarily stop this document for review.'},new URL(process.env.PUBLIC_URL));assert.throws(()=>C.publicCatalogItem(item.id,req(alice,'GET')),e=>e.status===404);assert.throws(()=>Community.publicPost(item.communityPostId),e=>e.status===404||e.status===409);
 item=call('catalog/'+item.id+'/action',{action:'offline',version:item.version});assert.equal(item.visibility,'offline');assert.equal(d.prepare('SELECT visibility FROM community_posts WHERE id=?').get(item.communityPostId).visibility,'offline');
 assert.ok(d.prepare("SELECT 1 FROM community_audit WHERE action='moderation_settings'").get());call('admin/catalog/settings',{mode:'automatic'},owner);d.prepare("UPDATE config SET value='invalid json' WHERE key='moderation'").run();assert.equal(M.moderationSettings().mode,'manual');call('admin/catalog/settings',{mode:'automatic'},owner);
});
test('ordinary comments auto-pass, risky or linked comments await review and remain hidden to other members',()=>{
 const published=submit(save({...doc,title:'Comment target'}));let result=Community.communityApi(req(bob),['community','comments'],{post:published.communityPostId,body:'Thanks for explaining keyboard focus clearly.',...accepted},new URL(process.env.PUBLIC_URL));assert.equal(result.status,'approved');const approvedId=result.id;d.prepare("UPDATE community_users SET status='restricted' WHERE id=?").run(bob.id);assert.equal(Community.communityApi(req(alice,'GET'),['community','comments',published.communityPostId],{},new URL(process.env.PUBLIC_URL)).items.some(row=>row.id===approvedId),false);d.prepare("UPDATE community_users SET status='active' WHERE id=?").run(bob.id);
 result=Community.communityApi(req(bob),['community','comments'],{post:published.communityPostId,body:'涉嫌毒品的内容需要管理员检查语境。',...accepted},new URL(process.env.PUBLIC_URL));assert.equal(result.status,'pending');const list=Community.communityApi(req(alice,'GET'),['community','comments',published.communityPostId],{},new URL(process.env.PUBLIC_URL));assert.equal(list.items.some(x=>x.id===result.id),false);
 result=Community.communityApi(req(bob),['community','comments'],{post:published.communityPostId,body:'Please also see https://example.com/source',...accepted},new URL(process.env.PUBLIC_URL));assert.equal(result.status,'pending');
 assert.equal(M.screenContent('赌\u200b博').decision,'pending');assert.equal(M.screenContent('<p>毒<strong>&#x54c1;</strong></p>').decision,'pending');
});

test('a suspended author and frozen share cannot leak covers; restoring a case cannot revive an author-offlined original',async()=>{
 const {canReadCover}=await import('../src/lib/covers.mjs');const cover=randomUUID();d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(cover,'cover.jpg',10,'image/jpeg','fixture-sha',D.now());d.prepare('INSERT INTO refs VALUES(?,?,?)').run('community-cover:'+alice.id,cover,'private');
 let entry=submit(save({...doc,title:'Reviewed cover entry',coverId:cover,coverAlt:'An original diagram for this tutorial'}));assert.equal(entry.status,'pending');assert.equal(canReadCover(req(bob,'GET'),cover),false);assert.equal(canReadCover(req(reviewer,'GET'),cover),true);entry=approve(entry);assert.equal(canReadCover(req(bob,'GET'),cover),true);
 d.prepare("UPDATE community_users SET status='banned' WHERE id=?").run(alice.id);assert.equal(canReadCover(req(bob,'GET'),cover),false);assert.throws(()=>C.publicCatalogItem(entry.id,req(bob,'GET')),e=>e.status===404);assert.throws(()=>Community.publicPost(entry.communityPostId),e=>e.status===404);d.prepare("UPDATE community_users SET status='active' WHERE id=?").run(alice.id);
 const complaint=Community.communityApi(req(bob),['community','cases'],{target:entry.url,category:'其他',description:'Review the ownership of this published cover in this local test.'},new URL(process.env.PUBLIC_URL));let caseRow=d.prepare('SELECT * FROM community_cases WHERE id=?').get(complaint.id);
 Community.communityApi(req(reviewer),['admin','community','cases',complaint.id],{action:'freeze',version:caseRow.version,reason:'Hold the shared tutorial while reviewing the cover.'},new URL(process.env.PUBLIC_URL));assert.equal(canReadCover(req(bob,'GET'),cover),false);
 caseRow=d.prepare('SELECT * FROM community_cases WHERE id=?').get(complaint.id);Community.communityApi(req(owner),['admin','community','cases',complaint.id],{action:'release',version:caseRow.version,reason:'The relevant cover review is now complete.'},new URL(process.env.PUBLIC_URL));caseRow=d.prepare('SELECT * FROM community_cases WHERE id=?').get(complaint.id);
 Community.communityApi(req(owner),['admin','community','cases',complaint.id],{action:'restore',version:caseRow.version,reason:'Restore the reviewed, approved shared version.',checked:true},new URL(process.env.PUBLIC_URL));assert.equal(C.publicCatalogItem(entry.id,req(bob,'GET')).id,entry.id);
 const post=d.prepare('SELECT * FROM community_posts WHERE id=?').get(entry.communityPostId);Community.communityApi(req(alice),['community','submissions',post.id],{action:'offline',version:post.version},new URL(process.env.PUBLIC_URL));assert.equal(getEntry(entry.id).visibility,'offline');caseRow=d.prepare('SELECT * FROM community_cases WHERE id=?').get(complaint.id);assert.throws(()=>Community.communityApi(req(owner),['admin','community','cases',complaint.id],{action:'restore',version:caseRow.version,reason:'This must not revive an author-offlined original.',checked:true},new URL(process.env.PUBLIC_URL)),e=>e.status===409);
 function getEntry(id){return call('catalog/mine/'+id,{},alice,'GET')}
});

test('catalog scope is separate, submits require consent, retries never create duplicate shares',async()=>{
 function key(scopes){return Connect.manageKeys(req(alice),{action:'create',name:'Catalog test',current:'test-member-password-2026',scopes}).token}const limitedKey=key(['library','submit']),token=key(['catalog','submit']);
 const request=t=>new Request(process.env.PUBLIC_URL+'/api/connect',{method:'POST',headers:{authorization:'Bearer '+t}});
 await assert.rejects(()=>Connect.connectApi(request(limitedKey),{operation:'catalog.list'}),e=>e.status===403);
 const input={operation:'catalog.save',input:{...doc,title:'MCP shared draft'},requestId:'catalog-tool-save-one'},a=await Connect.connectApi(request(token),input),b=await Connect.connectApi(request(token),input);assert.equal(a.id,b.id);
 const action={operation:'catalog.submit',input:{id:a.id,version:a.version,...accepted},requestId:'catalog-tool-submit-one'};await assert.rejects(()=>Connect.connectApi(request(token),action),e=>e.status===403);action.input.confirmed=true;const published=await Connect.connectApi(request(token),action),retried=await Connect.connectApi(request(token),action);assert.equal(published.status,'published');assert.equal(retried.communityPostId,published.communityPostId);assert.equal(d.prepare('SELECT COUNT(*) n FROM community_revisions WHERE post=?').get(published.communityPostId).n,1);
});
test('production public catalog and writes remain closed; restricted authors and foreign updates cannot publish',()=>{
 const item=save({...doc,title:'Restricted publish'});d.prepare("UPDATE community_users SET status='restricted' WHERE id=?").run(alice.id);assert.throws(()=>submit(item),e=>e.status===403);d.prepare("UPDATE community_users SET status='active' WHERE id=?").run(alice.id);assert.throws(()=>save({...doc,id:item.id,version:item.version},bob),e=>e.status===404);
 process.env.PUBLIC_URL='https://public.example.com';try{assert.equal(C.publicCatalog({},req(alice,'GET')).items.length,0);assert.throws(()=>C.publicCatalogItem(item.id,req(alice,'GET')),e=>e.status===503);assert.throws(()=>save(),e=>e.status===503)}finally{process.env.PUBLIC_URL='http://localhost:3129'}
});

test('document import uses the local authenticated cookie boundary and never saves a draft implicitly',async()=>{
 const {handle}=await import('../src/lib/api.mjs');const data={name:'safe.md',text:'# Safe document\n\n- First item\n- Second item'},before=d.prepare('SELECT COUNT(*) n FROM catalog_entries').get().n;
 function request(token,origin=process.env.PUBLIC_URL,host='localhost:3129'){return new Request(process.env.PUBLIC_URL+'/api/catalog/import',{method:'POST',headers:{cookie:token?'site_admin='+token:'',origin,host,'Content-Type':'application/json'},body:JSON.stringify(data)})}
 assert.equal((await handle(request(''))).status,401);assert.equal((await handle(request(alice.token,'https://foreign.example'))).status,403);assert.equal((await handle(request(alice.token,process.env.PUBLIC_URL,'public.example.com'))).status,503);
 const response=await handle(request(alice.token));assert.equal(response.status,200);const parsed=await response.json();assert.equal(parsed.title,'safe');assert.match(parsed.bodyHtml,/<ul>/);assert.equal(d.prepare('SELECT COUNT(*) n FROM catalog_entries').get().n,before);
});

test('all catalog kinds keep one linked share across rejected/withdrawn revisions and repeated publication',()=>{
 call('admin/catalog/settings',{mode:'manual'},owner);
 try{for(const kind of ['docs','skills','resources']){
  const value={...doc,kind,title:'Lifecycle '+kind,...(kind==='docs'?{}:{sourceUrl:'https://github.com/example/lifecycle',sourceName:'Lifecycle upstream'})};
  let entry=save(value);assert.equal(entry.communityPostId,null);entry=submit(entry);assert.equal(entry.status,'pending');assert.equal(entry.communityPostId,null);entry=approve(entry);
  const post=entry.communityPostId,originalTitle=value.title;assert.equal(Community.publicPost(post).title,originalTitle);assert.equal(Community.publicPost(post).catalogKind,kind);
  entry=save({...value,id:entry.id,version:entry.version,title:originalTitle+' revised'});entry=submit(entry);
  assert.equal(C.publicCatalogItem(entry.id,req(alice,'GET')).title,originalTitle);assert.equal(Community.publicPost(post).title,originalTitle);
  entry=call('admin/catalog/'+entry.id,{action:'reject',version:entry.version,reason:'The revision requires a clearer explanation of the original material.'},reviewer);
  assert.equal(C.publicCatalogItem(entry.id,req(alice,'GET')).title,originalTitle);assert.equal(Community.publicPost(post).title,originalTitle);
  entry=submit(entry);entry=call('catalog/'+entry.id+'/action',{action:'withdraw',version:entry.version});assert.equal(entry.status,'draft');assert.equal(Community.publicPost(post).title,originalTitle);
  entry=approve(submit(entry));assert.equal(entry.communityPostId,post);assert.equal(Community.publicPost(post).title,originalTitle+' revised');assert.equal(d.prepare('SELECT COUNT(*) n FROM community_posts WHERE id=?').get(post).n,1);
  assert.equal(d.prepare("SELECT COUNT(*) n FROM community_revisions WHERE post=? AND status='approved'").get(post).n,2);
  entry=call('admin/catalog/'+entry.id,{action:'offline',version:entry.version,reason:'Take this fixture offline for lifecycle verification.'},reviewer);
  assert.throws(()=>C.publicCatalogItem(entry.id,req(alice,'GET')),e=>e.status===404);assert.throws(()=>Community.publicPost(post),e=>e.status===404);
  entry=approve(submit(entry));assert.equal(entry.communityPostId,post);assert.equal(C.publicCatalogItem(entry.id,req(alice,'GET')).communityPostId,post);
 }}finally{call('admin/catalog/settings',{mode:'automatic'},owner)}
});

test('restricted qualified authors can inspect, withdraw and take down their own entries without regaining publishing rights',()=>{
 let published=submit(save({...doc,title:'Voluntary takedown'}));
 let pending=submit(save({...doc,kind:'skills',title:'Withdraw restricted Skill',sourceUrl:'https://github.com/example/restricted'}));assert.equal(pending.status,'pending');
 try{for(const status of ['restricted','banned']){
  d.prepare('UPDATE community_users SET status=? WHERE id=?').run(status,alice.id);
  assert.equal(call('catalog/mine/'+published.id,{},alice,'GET').id,published.id);assert.ok(call('catalog/mine',{},alice,'GET').items.some(x=>x.id===pending.id));
  assert.throws(()=>save({...doc,id:published.id,version:published.version}),e=>e.status===403);assert.throws(()=>submit(pending),e=>e.status===403);
  assert.throws(()=>call('catalog/mine/'+pending.id,{},bob,'GET'),e=>e.status===404);
  if(status==='restricted'){pending=call('catalog/'+pending.id+'/action',{action:'withdraw',version:pending.version});assert.equal(pending.status,'draft')}
  else{published=call('catalog/'+published.id+'/action',{action:'offline',version:published.version});assert.equal(published.visibility,'offline');assert.equal(d.prepare('SELECT visibility FROM community_posts WHERE id=?').get(published.communityPostId).visibility,'offline')}
 }}finally{d.prepare("UPDATE community_users SET status='active' WHERE id=?").run(alice.id)}
 assert.throws(()=>C.publicCatalogItem(published.id,req(alice,'GET')),e=>e.status===404);
});

test('failed publication rolls back the catalog revision and auto-share together, then retries exactly once',()=>{
 let entry=save({...doc,title:'Atomic publish recovery'}),before=d.prepare('SELECT COUNT(*) n FROM community_posts').get().n;
 d.exec(`CREATE TEMP TRIGGER reject_catalog_publication BEFORE UPDATE ON catalog_entries WHEN NEW.id='${entry.id}' AND NEW.visibility='public' BEGIN SELECT RAISE(ABORT,'fixture publish failure');END`);
 try{assert.throws(()=>submit(entry),/fixture publish failure/)}finally{d.exec('DROP TRIGGER reject_catalog_publication')}
 const original=call('catalog/mine/'+entry.id,{},alice,'GET');assert.equal(original.version,entry.version);assert.equal(original.status,'draft');assert.equal(original.communityPostId,null);assert.equal(d.prepare('SELECT COUNT(*) n FROM community_posts').get().n,before);assert.equal(d.prepare('SELECT COUNT(*) n FROM catalog_revisions WHERE entry=?').get(entry.id).n,0);
 entry=submit(original);assert.equal(entry.status,'published');assert.equal(d.prepare('SELECT COUNT(*) n FROM community_posts').get().n,before+1);assert.equal(d.prepare('SELECT COUNT(*) n FROM community_revisions WHERE post=?').get(entry.communityPostId).n,1);
});

test('minimal link submissions keep safe defaults and produce one reviewed community share',()=>{
 for(const kind of ['skills','resources']){let row=submit(save({kind,title:'Useful project',sourceUrl:'https://example.com/project'}));assert.equal(row.status,'pending');assert.equal(row.pending.summary,'Useful project');assert.match(row.pending.license,/未注明许可/);row=approve(row);assert.equal(Community.publicPost(row.communityPostId).catalogKind,kind);assert.equal(C.publicCatalogItem(row.id,req(bob,'GET')).title,'Useful project')}
 assert.throws(()=>submit(save({kind:'resources',title:'Missing source'})),e=>e.status===400);
});
test('document tables survive sanitization; inline images stay owner-scoped, reviewed and coupled to publication',async()=>{
 const {canReadCover}=await import('../src/lib/covers.mjs');const image=randomUUID(),foreign=randomUUID();for(const [id,user]of [[image,alice],[foreign,bob]]){d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'inline.webp',20,'image/webp','fixture-sha-'+id,D.now());d.prepare('INSERT INTO refs VALUES(?,?,?)').run('community-cover:'+user.id,id,'private')}
 assert.throws(()=>save({...doc,bodyHtml:'<p>Foreign image</p><img src="/media/'+foreign+'"/>'}),e=>e.status===400);assert.throws(()=>save({...doc,bodyHtml:'<img src="https://example.com/track.png"/>'}),e=>e.status===400);
 let row=save({...doc,bodyHtml:'<h2>Example table</h2><table><tr><th colspan="2">Name</th></tr><tr><td>One</td><td>Two</td></tr></table><img src="/media/'+image+'" alt="An original diagram" onerror="alert(1)"/><script>alert(1)</script>',imageIds:[foreign]});assert.deepEqual(row.draft.imageIds,[image]);assert.match(row.draft.bodyHtml,/<table>/);assert.match(row.draft.bodyHtml,/colspan="2"/);assert.doesNotMatch(row.draft.bodyHtml,/onerror|script/);assert.equal(canReadCover(req(bob,'GET'),image),false);
 row=submit(row);assert.equal(row.status,'pending');assert.ok(row.moderation.signals.some(x=>x.code==='media'));assert.equal(canReadCover(req(reviewer,'GET'),image),true);row=approve(row);assert.equal(canReadCover(req(bob,'GET'),image),true);
 row=call('catalog/'+row.id+'/action',{action:'offline',version:row.version});assert.equal(canReadCover(req(bob,'GET'),image),false);assert.throws(()=>C.publicCatalogItem(row.id,req(bob,'GET')),e=>e.status===404);assert.equal(canReadCover(req(alice,'GET'),image),true);
});
test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(dir,{recursive:true,force:true})});
