import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';import sharp from 'sharp';
const temp=await mkdtemp(path.join(tmpdir(),'site-cover-test-'));process.env.APP_DATA_DIR=temp;process.env.PUBLIC_URL='http://localhost:3012';process.env.INITIAL_ADMIN_PASSWORD='cover-owner-test-password';
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),C=await import('../src/lib/community.mjs'),V=await import('../src/lib/covers.mjs'),M=await import('../src/lib/media.mjs');
const base=process.env.PUBLIC_URL;
const req=(token='',method='GET',body,extra={})=>new Request(base+'/api/community/covers',{method,headers:{origin:base,host:'localhost:3012',cookie:token?'site_admin='+token:'','content-type':'image/png',...extra},...(body?{body}:{})});
const owner=A.login(req(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
function member(name,qualified=true){const id=randomUUID();D.db().prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,?,?,?)').run(id,name,D.passwordHash('cover-member-password'),name,qualified?'local_test':'pending',D.now(),D.now());return{id,token:A.login(req(),{username:name,password:'cover-member-password'})};}
const a=member('cover_author'),b=member('cover_other'),pending=member('cover_pending',false);
const call=(p,input={},token=a.token,method='POST')=>C.communityApi(req(token,method),p.split('/'),input,new URL(base+'/api/'+p));
const config=call('community/config',{},'','GET'),ack={accepted:true,policyVersion:config.policyVersion,policyHash:config.policyHash};
const png=await sharp({create:{width:800,height:450,channels:3,background:'#1179be'}}).withMetadata({exif:{IFD0:{Artist:'private-cover-metadata'}}}).png().toBuffer();
let cover,replacement,row;
const doc={title:'带图投稿封面测试',summary:'这是一条验证封面与文字一同审核和公开版本隔离的合成测试资源。',body:'正文仅用来确认审核后的内容展示，封面图片的私密版本不能提前通过公共图片链接读取。',category:'开发资源',tags:[],basis:'original',sourceName:'测试作者',sourceUrl:'https://example.com/source',url:'https://example.com/docs',license:'测试图片由程序自行生成，仅用于本地测试。',coverAlt:'蓝色测试画面'};
test('cover upload requires qualified actor and CSRF, rejects forged/oversized/excessive-pixel images',async()=>{
 for(const [request,status] of [[req('','PUT',png),401],[req(pending.token,'PUT',png),403],[req(a.token,'PUT',png,{origin:'https://evil.example'}),403],[req(a.token,'PUT',Buffer.alloc(V.COVER_MAX_BYTES+1)),413],[req(a.token,'PUT',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"/>')),400]])await assert.rejects(V.uploadCover(request),e=>e.status===status);
 const ownerCover=(await V.uploadCover(req(owner,'PUT',png))).id;assert.ok(V.ownsCover('owner',ownerCover));assert.equal(V.canReadCover(req('','GET'),ownerCover),false);
 const oversized=await sharp({create:{width:5000,height:5000,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(V.uploadCover(req(a.token,'PUT',oversized)),e=>e.status===400);
});
test('cover is normalized, private until approval, owned and bound to immutable review revisions',async()=>{
 cover=(await V.uploadCover(req(a.token,'PUT',png))).id;const metadata=await sharp(await readFile(path.join(D.FILES,cover))).metadata();assert.equal(metadata.format,'jpeg');assert.equal(metadata.exif,undefined);
 await assert.rejects(M.fileResponse(req(),cover,true),e=>e.status===404);assert.equal((await M.fileResponse(req(a.token),cover,true,true)).status,200);await assert.rejects(M.fileResponse(req(b.token),cover,true),e=>e.status===404);
 assert.throws(()=>call('community/submissions',{data:{...doc,coverId:cover}},b.token),/本人上传/);
 row=call('community/submissions',{data:{...doc,coverId:cover}});row=call('community/submissions/'+row.id,{action:'submit',version:row.version,...ack});await assert.rejects(M.fileResponse(req(),cover,true),e=>e.status===404);
 row=call('admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'核对正文和测试封面',rule:'来源与许可'},owner);
 assert.equal((await M.fileResponse(req(),cover,true,true)).status,200);assert.equal(C.publicPost(row.id).coverId,cover);
 D.db().prepare("UPDATE community_users SET verification='pending' WHERE id=?").run(a.id);await assert.rejects(M.fileResponse(req(),cover,true),e=>e.status===404);assert.equal((await M.fileResponse(req(a.token),cover,true,true)).status,200);D.db().prepare("UPDATE community_users SET verification='local_test' WHERE id=?").run(a.id);
 replacement=(await V.uploadCover(req(a.token,'PUT',png))).id;row=call('community/submissions/'+row.id,{action:'revise',version:row.version});row=call('community/submissions',{id:row.id,version:row.version,data:{...doc,coverId:replacement}});row=call('community/submissions/'+row.id,{action:'submit',version:row.version,...ack});assert.equal(C.publicPost(row.id).coverId,cover);
 D.db().prepare("UPDATE community_users SET verification='pending' WHERE id=?").run(a.id);await assert.rejects(M.fileResponse(req(),cover,true),e=>e.status===404);assert.equal((await M.fileResponse(req(a.token),cover,true,true)).status,200);D.db().prepare("UPDATE community_users SET verification='local_test' WHERE id=?").run(a.id);await assert.rejects(M.fileResponse(req(),replacement,true),e=>e.status===404);
 row=call('admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'核对新的封面版本',rule:'来源与许可'},owner);assert.equal(C.publicPost(row.id).coverId,replacement);await assert.rejects(M.fileResponse(req(),cover,true),e=>e.status===404);assert.equal((await M.fileResponse(req(),replacement,true,true)).status,200);
});
test('cover publication survives restart and cannot bypass freezing, offline status or the public host gate',async()=>{
 D.db().close();delete globalThis.__personalSiteDb;assert.equal((await M.fileResponse(req(),replacement,true,true)).status,200);
 let report=call('community/cases',{post:row.id,category:'其他',description:'合成举报，仅用于测试封面是否随正文一起暂停公开。'},'');call('admin/community/cases/'+report.id,{action:'freeze',version:1,reason:'封面隔离测试，暂停关联内容',checked:true},owner);
 await assert.rejects(M.fileResponse(req(),replacement,true),e=>e.status===404);
 const foreign=new Request('https://public.example/media/'+replacement,{headers:{host:'public.example'}});await assert.rejects(M.fileResponse(foreign,replacement,true),e=>e.status===404);
 assert.equal((await M.fileResponse(req(a.token),replacement,true,true)).status,200);row=call('community/submissions/'+row.id,{},a.token,'GET');row=call('community/submissions/'+row.id,{action:'offline',version:row.version});await assert.rejects(M.fileResponse(req(),replacement,true),e=>e.status===404);
});
test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(temp,{recursive:true,force:true});});
