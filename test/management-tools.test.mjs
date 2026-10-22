import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,access,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(path.join(tmpdir(),'spaceyew-management-tools-'));
process.env.APP_DATA_DIR=dir;process.env.PUBLIC_URL='http://localhost:3182';process.env.INITIAL_ADMIN_PASSWORD='management-test-password-2026';
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),C=await import('../src/lib/content.mjs'),S=await import('../src/lib/spaces.mjs'),U=await import('../src/lib/uploads.mjs'),SU=await import('../src/lib/spaces-uploads.mjs'),API=await import('../src/lib/api.mjs'),M=await import('../src/lib/media.mjs');
let d=D.db();
const request=(token='',url='/api/community',method='GET',body)=>new Request(process.env.PUBLIC_URL+url,{method,headers:{host:'localhost:3182',origin:process.env.PUBLIC_URL,cookie:'site_admin='+token,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
const owner=A.login(request(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
function member(name,role='member'){const id=randomUUID(),token=randomUUID();d.prepare('INSERT INTO community_users(id,username,password,nickname,role,verification,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,name,'unused',name,role,'local_test',D.now(),D.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(D.hash(token),Date.now()+3600000,id);return{id,token,space:S.ensureSpace({id,username:name,nickname:name})}}
const alice=member('file_alice'),bob=member('file_bob'),reviewer=member('tools_reviewer','reviewer');
async function call(url,input,token=owner,method=input===undefined?'GET':'POST'){const response=await API.handle(request(token,url,method,input));return{status:response.status,data:await response.json()}}
async function file(user,name='fixture.txt',data=Buffer.from('synthetic fixture')){const url=new URL(process.env.PUBLIC_URL+'/api/spaces/uploads'),task=await SU.spaceUploads(request(user.token,'/api/spaces/uploads','POST'),['spaces','uploads'],{name,size:data.length,fingerprint:D.hash(randomUUID())},url);await U.putChunk(task.id,0,new Request(url,{method:'PUT',headers:{'x-chunk-sha256':D.hash(data)},body:data}));const result=await SU.spaceUploads(request(user.token,'/api/spaces/uploads/'+task.id+'/complete','POST'),['spaces','uploads',task.id,'complete'],{},url);return result.file}

test('personal files isolate owners, expose quota and filters, and refuse referenced deletion',async()=>{
 const uploaded=await file(alice);
 assert.equal((await call('/api/spaces/files',undefined,'')).status,401);
 assert.equal((await call('/api/spaces/files?space='+alice.space.id,undefined,bob.token)).data.count,0);
 let list=(await call('/api/spaces/files?q=fixture&status=unused',undefined,alice.token)).data;
 assert.equal(list.total,1);assert.equal(list.used,uploaded.size);assert.equal(list.quota,1000000000);
 assert.equal((await call('/api/spaces/files/'+uploaded.id,undefined,bob.token,'DELETE')).status,404);
 let mine=S.mine(request(alice.token));mine.layout.nodes[0].assetId=uploaded.id;mine=S.spacesApi(request(alice.token,'/api/spaces/save','POST'),['spaces','save'],mine,new URL(process.env.PUBLIC_URL));
 list=(await call('/api/spaces/files?status=used',undefined,alice.token)).data;assert.equal(list.items[0].references[0].kind,'展板草稿');
 assert.equal((await call('/api/spaces/files/'+uploaded.id,undefined,alice.token,'DELETE')).status,409);
 assert.deepEqual(await readFile(path.join(D.FILES,uploaded.id)),Buffer.from('synthetic fixture'));
 assert.equal((await call('/api/spaces/files?kind=image',undefined,alice.token)).data.total,0);
});

test('unreferenced deletion releases quota and invalidates uploads; failed audit rolls back disk and DB',async()=>{
 const uploaded=await file(alice,'deletable.txt'),before=(await call('/api/spaces/files',undefined,alice.token)).data.used;
 d.exec("CREATE TEMP TRIGGER reject_file_audit BEFORE INSERT ON community_audit WHEN NEW.action='space_file_delete' BEGIN SELECT RAISE(ABORT,'audit unavailable');END");
 assert.equal((await call('/api/spaces/files/'+uploaded.id,undefined,alice.token,'DELETE')).status,500);
 d.exec('DROP TRIGGER reject_file_audit');assert.ok(D.fileInfo(uploaded.id));await access(path.join(D.FILES,uploaded.id));
 assert.equal((await call('/api/spaces/files/'+uploaded.id,undefined,alice.token,'DELETE')).status,200);
 assert.equal((await call('/api/spaces/files',undefined,alice.token)).data.used,before-uploaded.size);
 assert.equal(D.fileInfo(uploaded.id),null);await assert.rejects(access(path.join(D.FILES,uploaded.id)));
 assert.equal(d.prepare('SELECT status FROM uploads WHERE file_id=?').get(uploaded.id),undefined);
 assert.ok(d.prepare("SELECT 1 FROM community_audit WHERE action='space_file_delete' AND actor=? AND target=?").get(alice.id,uploaded.id));
});

test('unified log is owner-only, filters and paginates, and settings/content audits omit private values',async()=>{
 assert.equal((await call('/api/admin/logs',undefined,alice.token)).status,401);assert.equal((await call('/api/admin/logs',undefined,reviewer.token)).status,401);
 const config={...D.getConfig('site'),description:'PRIVATE_LOG_VALUE_NEVER_STORED'},saved=await call('/api/admin/config',{key:'site',value:config});assert.equal(saved.status,200);
 const content=await call('/api/admin/content',{type:'articles',action:'save',data:{title:'PRIVATE_LOG_TITLE',bodyHtml:'<p>PRIVATE_LOG_BODY</p>'}});assert.equal(content.status,200);
 const logs=await call('/api/admin/logs?scope=site&actor=owner&page=1');assert.equal(logs.status,200);assert.ok(logs.data.items.some(row=>row.action==='site_config_update'));
 assert.ok(logs.data.items.some(row=>row.action==='site_content_save'));
 assert.ok(!JSON.stringify(logs.data).includes('PRIVATE_LOG_'));
 assert.equal((await call('/api/admin/logs?action=site_content_save')).data.items[0].target,content.data.id);
 assert.equal((await call('/api/admin/logs?start=2026-02-31')).status,400);
 for(let i=0;i<51;i++)D.recordAudit('owner','site_fixture','synthetic-'+i,{});
 const second=await call('/api/admin/logs?action=site_fixture&page=2');assert.equal(second.data.page,2);assert.equal(second.data.items.length,1);
});

test('content save and its audit commit atomically',async()=>{
 const before=d.prepare('SELECT COUNT(*) n FROM content').get().n;
 d.exec("CREATE TEMP TRIGGER reject_content_audit BEFORE INSERT ON community_audit WHEN NEW.action='site_content_save' BEGIN SELECT RAISE(ABORT,'audit unavailable');END");
 const result=await call('/api/admin/content',{type:'articles',data:{title:'Must roll back'}});assert.equal(result.status,500);
 d.exec('DROP TRIGGER reject_content_audit');assert.equal(d.prepare('SELECT COUNT(*) n FROM content').get().n,before);
});

test('legacy complaints bind fixed snapshots, protect files, freeze every public path and restore only the public version',async()=>{
 const uploaded=await file(alice,'case.txt'),doc=C.writeContent({type:'resources',slug:'case-resource',action:'publish',data:{title:'公开资源',bodyHtml:'<p>公开正文</p>',kind:'file',attachmentId:uploaded.id}}),board=S.ownerSpace();
 const target='/u/'+board.handle+'/resources/'+doc.slug;
 const create=()=>call('/api/community/cases',{kind:'report',target,category:'隐私泄露',description:'合成的投诉测试，验证关联内容和多案件限制。'},'');
 const one=await create(),two=await create();assert.equal(one.status,200);assert.equal(two.status,200);
 const item=async id=>(await call('/api/admin/community/cases')).data.items.find(row=>row.id===id);
 let a=await item(one.data.id),b=await item(two.data.id);assert.equal(a.target.id,doc.id);assert.equal(a.snapshot.title,'公开资源');
 assert.equal((await call('/api/community/case-status',one.data,'')).data.target,undefined);
 const act=(row,action,extra={})=>call('/api/admin/community/cases/'+row.id,{action,version:row.version,targetRevision:row.target.revision,reason:'合成测试：已核查事实与全部关联案件',...extra});
 assert.equal((await act(a,'freeze')).status,200);assert.equal(D.publicBySlug('resources',doc.slug),null);assert.equal(D.publicContent('resources').some(row=>row.id===doc.id),false);
 assert.throws(()=>S.publicSpaceDocument(request(),board.handle,'resources',doc.slug),e=>e.status===404);
 await assert.rejects(M.fileResponse(request('','/download/'+uploaded.id),uploaded.id),e=>e.status===404);
 assert.equal((await call('/api/admin/files/'+uploaded.id,undefined,owner,'DELETE')).status,409);
 assert.equal((await act(b,'freeze')).status,409);b=await item(two.data.id);assert.equal((await act(b,'freeze')).status,200);
 let row=d.prepare('SELECT * FROM content WHERE id=?').get(doc.id);row=C.writeContent({id:doc.id,revision:row.revision,action:'save',data:{...doc.published,title:'PRIVATE_NEW_DRAFT'}});
 assert.throws(()=>C.writeContent({id:row.id,revision:row.revision,action:'publish'}),e=>e.status===409);
 a=await item(one.data.id);assert.equal((await act(a,'resolve')).status,200);assert.equal(d.prepare('SELECT frozen FROM community_cases WHERE id=?').get(a.id).frozen,1);
 a=await item(one.data.id);assert.equal((await act(a,'release')).status,200);a=await item(one.data.id);assert.equal((await act(a,'restore',{checked:true})).status,409);
 b=await item(two.data.id);assert.equal((await act(b,'release')).status,200);a=await item(one.data.id);assert.equal((await act(a,'restore',{checked:true})).status,200);
 assert.equal(D.publicBySlug('resources',doc.slug).title,'公开资源');assert.equal(JSON.parse(d.prepare('SELECT draft FROM content WHERE id=?').get(doc.id).draft).title,'PRIVATE_NEW_DRAFT');
 assert.equal((await act(a,'restore',{checked:true})).status,409);
});

test('old text cases can be explicitly linked by owner and cannot be relinked or expose an unpublished draft',async()=>{
 const receipt=await call('/api/community/cases',{kind:'report',target:'旧决定回执',category:'其他',description:'合成旧工单，在人工核对后才关联具体内容。'},'');
 const content=C.writeContent({type:'articles',action:'publish',data:{title:'可关联文章',bodyHtml:'<p>已公开内容</p>'}});
 const input={action:'link',version:1,contentId:content.id,targetRevision:content.revision,reason:'人工核对原地址和当时记录后关联此内容'};
 assert.equal((await call('/api/admin/community/cases/'+receipt.data.id,input,reviewer.token)).status,403);
 assert.equal((await call('/api/admin/community/cases/'+receipt.data.id,{...input,targetRevision:0})).status,409);
 assert.equal((await call('/api/admin/community/cases/'+receipt.data.id,input)).status,200);
 assert.equal((await call('/api/admin/community/cases/'+receipt.data.id,{...input,version:2})).status,409);
 const draft=C.writeContent({type:'articles',data:{title:'OWNER_PRIVATE_DRAFT',bodyHtml:'<p>OWNER_SECRET_BODY</p>'}}),second=await call('/api/community/cases',{kind:'report',target:'合成账号问题',category:'其他',description:'这是一条用于验证未发布内容隔离的合成工单。'},'');
 assert.equal((await call('/api/admin/community/cases/'+second.data.id,{...input,contentId:draft.id,targetRevision:draft.revision})).status,409);
 assert.ok(!JSON.stringify((await call('/api/admin/community/cases',undefined,reviewer.token)).data).includes('OWNER_SECRET_BODY'));
});

test('crash recovery restores staged files before DB commit and removes committed tombstones',async()=>{
 const uploaded=await file(bob,'recovery.txt');await rename(path.join(D.FILES,uploaded.id),path.join(D.FILES,'.delete-'+uploaded.id));
 d.close();delete globalThis.__personalSiteDb;d=D.db();await access(path.join(D.FILES,uploaded.id));
 const removed=await file(bob,'committed.txt');await rename(path.join(D.FILES,removed.id),path.join(D.FILES,'.delete-'+removed.id));
 D.transaction(tx=>{tx.prepare('DELETE FROM refs WHERE file=?').run(removed.id);tx.prepare('DELETE FROM space_assets WHERE file=?').run(removed.id);tx.prepare('DELETE FROM files WHERE id=?').run(removed.id)});
 d.close();delete globalThis.__personalSiteDb;d=D.db();await assert.rejects(access(path.join(D.FILES,'.delete-'+removed.id)));
});
test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(dir,{recursive:true,force:true})});
