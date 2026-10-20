import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const directory=await mkdtemp(path.join(tmpdir(),'site-audit-backend-'));
process.env.APP_DATA_DIR=path.join(directory,'data');
process.env.PUBLIC_URL='http://127.0.0.1:3008';
process.env.INITIAL_ADMIN_PASSWORD='audit-owner-password-2026';
const D=await import('../src/lib/db.mjs'),C=await import('../src/lib/content.mjs'),A=await import('../src/lib/auth.mjs'),S=await import('../src/lib/spaces.mjs'),Community=await import('../src/lib/community.mjs');
const d=D.db(),member=randomUUID(),password='audit-member-password-2026';
d.prepare("INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,'local_test',?,?)").run(member,'audit_member',D.passwordHash(password),'审计测试成员',D.now(),D.now());
const request=(token='',method='POST')=>new Request(process.env.PUBLIC_URL+'/api/community',{method,headers:{host:'127.0.0.1:3008',origin:process.env.PUBLIC_URL,cookie:token?'site_admin='+token:''}});
const token=A.login(request(),{username:'audit_member',password});
const space=S.ensureSpace({id:member,username:'audit_member',nickname:'审计测试成员'});

test('taxonomy removal protects community drafts, locked revisions and personal content',()=>{
 const taxonomy=D.getConfig('taxonomy'),doc={category:taxonomy.categories[0],tags:[taxonomy.tags[0]]};
 const removeCategory={...taxonomy,categories:taxonomy.categories.slice(1)},removeTag={...taxonomy,tags:taxonomy.tags.slice(1)};
 const blocked=()=>{assert.throws(()=>C.saveConfiguration('taxonomy',removeCategory),e=>e.status===400);assert.throws(()=>C.saveConfiguration('taxonomy',removeTag),e=>e.status===400);assert.deepEqual(D.getConfig('taxonomy'),taxonomy)};
 const post=randomUUID();
 d.prepare('INSERT INTO community_posts(id,author,draft,created,updated) VALUES(?,?,?,?,?)').run(post,member,JSON.stringify(doc),D.now(),D.now());
 blocked();
 for(const field of ['pending_revision','public_revision']){
  const revision=randomUUID();
  d.prepare('INSERT INTO community_revisions(id,post,number,data,status,created) VALUES(?,?,?,?,?,?)').run(revision,post,field==='pending_revision'?1:2,JSON.stringify(doc),field==='pending_revision'?'pending':'approved',D.now());
  d.prepare(`UPDATE community_posts SET draft=NULL,pending_revision=NULL,public_revision=NULL,${field}=? WHERE id=?`).run(revision,post);
  blocked();
 }
 d.prepare('DELETE FROM community_revisions WHERE post=?').run(post);d.prepare('DELETE FROM community_posts WHERE id=?').run(post);
 const content=randomUUID();
 d.prepare("INSERT INTO space_content(id,space,type,slug,draft,created,updated) VALUES(?,?,'articles',?,?,?,?)").run(content,space.id,content,JSON.stringify(doc),D.now(),D.now());
 blocked();
 d.prepare('UPDATE space_content SET published=draft,draft=? WHERE id=?').run('{}',content);blocked();
 d.prepare('DELETE FROM space_content WHERE id=?').run(content);
 assert.deepEqual(C.saveConfiguration('taxonomy',removeCategory).categories,removeCategory.categories);
 C.saveConfiguration('taxonomy',taxonomy);
});

test('appeals snapshot the latest rejected revision while ordinary reports retain the public revision',()=>{
 const post=randomUUID(),published=randomUUID(),rejected=randomUUID();
 d.prepare("INSERT INTO community_posts(id,author,visibility,public_revision,created,updated) VALUES(?,?,'public',?,?,?)").run(post,member,published,D.now(),D.now());
 const insert=d.prepare('INSERT INTO community_revisions(id,post,number,data,status,created) VALUES(?,?,?,?,?,?)');
 insert.run(published,post,1,JSON.stringify({title:'公开旧版本'}),'approved',D.now());
 insert.run(rejected,post,2,JSON.stringify({title:'被退回的新版本'}),'rejected',D.now());
 const call=(kind,auth='')=>Community.communityApi(request(auth),['community','cases'],{kind,post,category:'其他',description:'合成测试的工单说明，用于核对不可变版本。'},new URL(process.env.PUBLIC_URL));
 const appeal=call('appeal',token),report=call('report');
 assert.equal(d.prepare('SELECT revision FROM community_cases WHERE id=?').get(appeal.id).revision,rejected);
 assert.equal(d.prepare('SELECT revision FROM community_cases WHERE id=?').get(report.id).revision,published);
});

test('case targets reject hidden stale IDs and parse comment links on the server',()=>{
 const post=d.prepare("SELECT id FROM community_posts WHERE author=? AND visibility='public' LIMIT 1").get(member).id,comment=randomUUID();
 d.prepare("INSERT INTO community_comments(id,post,author,body,status,created) VALUES(?,?,?,?,'approved',?)").run(comment,post,member,'合成的公开评论内容',D.now());
 const call=input=>Community.communityApi(request(token),['community','cases'],{kind:'report',category:'其他',description:'合成目标一致性测试，不应该关联隐藏的旧编号。',...input},new URL(process.env.PUBLIC_URL));
 const count=()=>d.prepare('SELECT COUNT(*) n FROM community_cases').get().n,before=count();
 for(const target of ['/community/'+randomUUID(),'/u/audit_member','账号问题','https://foreign.example/community/'+post])assert.throws(()=>call({target,post}),e=>e.status===400);
 assert.throws(()=>call({target:'/community/'+post+'#comment-'+randomUUID(),post,comment}),e=>e.status===400);
 assert.equal(count(),before);
 const receipt=call({target:'/community/'+post+'#comment-'+comment});
 const saved=d.prepare('SELECT post,description FROM community_cases WHERE id=?').get(receipt.id);
 assert.equal(saved.post,post);assert.ok(saved.description.includes('#comment-'+comment));
 const external=call({target:'https://foreign.example/community/'+post});
 assert.equal(d.prepare('SELECT post FROM community_cases WHERE id=?').get(external.id).post,null);
});

test('analytics cannot bypass source limits by omitting or rotating visitor cookies',async()=>{
 const {track}=await import('../src/lib/analytics.mjs');
 d.prepare("DELETE FROM limits WHERE key LIKE 'events%'").run();
 const call=visitor=>track(new Request(process.env.PUBLIC_URL+'/api/analytics',{headers:{'user-agent':'AuditBrowser/1.0',...(visitor?{cookie:'site_visitor='+visitor}:{})}}),{id:randomUUID(),kind:'view',path:'/'});
 for(let i=0;i<200;i++)call(i%2?randomUUID():'');
 for(const visitor of ['',randomUUID()])assert.throws(()=>call(visitor),e=>e.status===429);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM events').get().n,200);
 assert.equal(d.prepare("SELECT COUNT(*) n FROM limits WHERE key LIKE 'events%'").get().n,201);
});

test('legacy public detail and board section complaints are accepted without misbinding the entire board',()=>{
 const owner=S.ownerSpace(),item=C.writeContent({type:'articles',slug:'audit-legacy',action:'publish',data:{title:'合成旧内容',bodyHtml:'<p>可公开读取的旧内容</p>'}});
 assert.equal(S.publicSpaceDocument(request(),owner.handle,'articles',item.slug).id,item.id);
 const call=target=>Community.communityApi(request(),['community','cases'],{kind:'report',category:'其他',description:'合成旧内容投诉，不应错误冻结整个展板。',target},new URL(process.env.PUBLIC_URL));
 const ownerToken=A.login(request(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
 S.spacesApi(request(ownerToken),['spaces','content'],{type:'articles',slug:item.slug,data:{title:'同地址的私有草稿'}},new URL(process.env.PUBLIC_URL));
 assert.equal(S.publicSpaceDocument(request(),owner.handle,'articles',item.slug).id,item.id);
 const receipt=call('/u/'+owner.handle+'/articles/'+item.slug);
 assert.equal(d.prepare('SELECT author FROM community_cases WHERE id=?').get(receipt.id).author,'owner');
 assert.equal(d.prepare('SELECT 1 FROM space_case_targets WHERE case_id=?').get(receipt.id),undefined);
 for(const section of ['resume','experience','projects','articles','resources']){
  const sectionReceipt=call('/u/'+owner.handle+'/'+section);
  assert.equal(d.prepare('SELECT space FROM space_case_targets WHERE case_id=?').get(sectionReceipt.id).space,owner.id);
 }
});

test('malformed nested records and identifiers return validation errors and pagination stays integral',async()=>{
 const {spaceProfile,spaceLayout}=await import('../src/lib/spaces-model.mjs'),{handle}=await import('../src/lib/api.mjs');
 for(const field of ['socials','experiences'])for(const item of [null,[],42]){
  assert.throws(()=>C.saveConfiguration('profile',{name:'合成资料',[field]:[item]}),e=>e.status===400);
  assert.throws(()=>spaceProfile({name:'合成资料',[field]:[item]}),e=>e.status===400);
 }
 assert.throws(()=>spaceLayout({nodes:[null]}),e=>e.status===400);
 assert.throws(()=>C.writeContent({id:{},action:'delete'}),e=>e.status===400);
 assert.throws(()=>S.spacesApi(request(token),['spaces','content'],{id:{},type:'articles'},new URL(process.env.PUBLIC_URL)),e=>e.status===400);
 assert.throws(()=>Community.communityApi(request(token),['community','counter-notice'],{id:{}},new URL(process.env.PUBLIC_URL)),e=>e.status===400);
 for(let i=0;i<21;i++){const id=randomUUID();d.prepare("INSERT INTO content(id,type,slug,draft,updated) VALUES(?,'articles',?,?,?)").run(id,id,'{"title":"分页合成内容"}',D.now())}
 assert.equal(C.listContent({type:'articles',page:'1.234'}).page,1);
 const ownerToken=A.login(request(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
 for(const page of ['Infinity','1.234']){
  const response=await handle(new Request(process.env.PUBLIC_URL+'/api/admin/files?page='+page,{headers:{cookie:'site_admin='+ownerToken}}));
  assert.equal(response.status,200);assert.equal((await response.json()).page,1);
 }
});

test('restoring a backup cannot reactivate old tool keys, invitations or cached tool responses',async()=>{
 const {backupSite}=await import('../scripts/backup.mjs'),{restoreSite}=await import('../scripts/restore.mjs');
 const key=randomUUID(),invite=randomUUID();
 d.prepare('INSERT INTO connect_keys(id,actor,name,hash,scopes,expires,created) VALUES(?,?,?,?,?,?,?)').run(key,member,'合成工具凭据',D.hash(randomUUID()),'["library"]',Date.now()+86400000,D.now());
 d.prepare('INSERT INTO connect_requests VALUES(?,?,?,?,?)').run(key,randomUUID(),'fixture','{"private":"fixture"}',Date.now());
 d.prepare('INSERT INTO community_invites(id,token,label,expires,created) VALUES(?,?,?,?,?)').run(invite,D.hash(randomUUID()),'合成邀请',Date.now()+86400000,D.now());
 const backup=path.join(directory,'backup'),restored=path.join(directory,'restored');
 await backupSite(D.DATA,backup);
 d.prepare('UPDATE connect_keys SET revoked=1 WHERE id=?').run(key);
 d.prepare('UPDATE community_invites SET revoked=1 WHERE id=?').run(invite);
 await restoreSite(backup,restored);
 const copy=new DatabaseSync(path.join(restored,'site.sqlite'),{readOnly:true});
 try{
  assert.equal(copy.prepare('SELECT revoked FROM connect_keys WHERE id=?').get(key).revoked,1);
  assert.equal(copy.prepare('SELECT revoked FROM community_invites WHERE id=?').get(invite).revoked,1);
  for(const table of ['sessions','email_challenges','connect_requests'])assert.equal(copy.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,0);
 }finally{copy.close()}
 await assert.rejects(restoreSite(backup,restored),/恢复目标已存在/);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
