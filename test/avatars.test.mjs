import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
const temp=await mkdtemp(path.join(tmpdir(),'site-avatar-test-'));
process.env.APP_DATA_DIR=temp;process.env.PUBLIC_URL='http://127.0.0.1:3008';process.env.INITIAL_ADMIN_PASSWORD='avatar-test-owner-password-2026';
// Start from the actual pre-avatar member schema to verify additive migration.
const old=new DatabaseSync(path.join(temp,'site.sqlite'));
old.exec("CREATE TABLE community_users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password TEXT NOT NULL,nickname TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member',status TEXT NOT NULL DEFAULT 'active',verification TEXT NOT NULL DEFAULT 'pending',verification_note TEXT NOT NULL DEFAULT '',created TEXT NOT NULL,updated TEXT NOT NULL)");
old.prepare('INSERT INTO community_users(id,username,password,nickname,created,updated) VALUES(?,?,?,?,?,?)').run('legacy','legacy_account','unused','旧账号','2026-01-01','2026-01-01');old.close();
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),C=await import('../src/lib/community.mjs'),V=await import('../src/lib/avatars.mjs'),M=await import('../src/lib/media.mjs');
const base=process.env.PUBLIC_URL;
function req(token='',method='PUT',body,headers={}){return new Request(base+'/api/community/avatar',{method,headers:{Origin:base,...(body?{'Content-Type':'image/png'}:{}),...(token?{Cookie:'site_admin='+token}:{}),...headers},...(body?{body}:{})})}
const owner=A.login(req(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
function member(qualified=true){const id=randomUUID(),username='avatar_'+id.slice(0,8),password='avatar-member-test-password';D.db().prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,?,?,?)').run(id,username,D.passwordHash(password),'头像测试成员',qualified?'local_test':'pending',D.now(),D.now());return{id,username,password,token:A.login(req(),{username,password})}}
const m=member(),other=member(false);
const call=(p,value,token=m.token,method='POST')=>C.communityApi(req(token,method),p.split('/'),value,new URL(base+'/api/'+p));
const png=await sharp({create:{width:400,height:300,channels:3,background:'#0092b8'}}).withMetadata({exif:{IFD0:{Artist:'private-test-metadata'}}}).png().toBuffer();
let post,id,second;
test('member-avatar migration, authenticated permissions and CSRF preserve original accounts',async()=>{
 assert.equal(D.db().prepare('SELECT nickname FROM community_users WHERE id=?').get('legacy').nickname,'旧账号');
 assert.equal(D.db().prepare('SELECT avatar_id FROM community_users WHERE id=?').get('legacy').avatar_id,null);
 for(const [request,status] of [[req('', 'PUT',png),401],[req(owner,'PUT',png),403],[req(other.token,'PUT',png),403],[req(m.token,'PUT',png,{Origin:'https://evil.example'}),403]])await assert.rejects(V.changeAvatar(request),e=>e.status===status);
});
test('upload normalizes, publishes and dynamically updates existing posts; replace, restart and remove',async()=>{
 const config=C.communityApi(req('','GET'),['community','config'],{},new URL(base));
 let row=call('community/submissions',{data:{title:'头像同步测试资源',summary:'这是一份用于验证头像同步和公开资源列表展示效果的测试介绍。',body:'验证图片更新不会修改已审核的资源正文与版本，头像信息始终来自当前作者资料。',category:'开发资源',tags:[],sourceName:'测试官方来源',sourceUrl:'https://example.com/source',url:'https://example.com/resource',license:'仅供测试的来源介绍。',basis:'official'}});
 row=call('community/submissions/'+row.id,{action:'submit',version:row.version,accepted:true,policyVersion:config.policyVersion,policyHash:config.policyHash});
 row=call('admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'已核对测试来源和说明',rule:'来源与许可'},owner);post=row.id;
 assert.equal(C.publicPost(post).authorAvatarId,null);
 id=(await V.changeAvatar(req(m.token,'PUT',png))).user.avatarId;
 assert.equal(A.currentUser(req(m.token)).avatarId,id);assert.equal(C.publicPost(post).authorAvatarId,id);
 const info=D.fileInfo(id),metadata=await sharp(await readFile(path.join(D.FILES,id))).metadata();
 assert.equal(info.mime,'image/jpeg');assert.equal(metadata.width,256);assert.equal(metadata.height,256);assert.equal(metadata.exif,undefined);
 assert.equal(D.isFilePublic(id),true);assert.equal((await M.fileResponse(req('','HEAD'),id,true,true)).status,200);
 const revision=C.publicPost(post).revision;
 second=(await V.changeAvatar(req(m.token,'PUT',png))).user.avatarId;
 assert.notEqual(second,id);assert.equal(C.publicPost(post).authorAvatarId,second);assert.equal(C.publicPost(post).revision,revision);
 assert.equal(D.isFilePublic(id),false);await assert.rejects(M.fileResponse(req('','HEAD'),id,true,true),e=>e.status===404);
 assert.equal(A.currentUser(req(other.token)).avatarId,null);
 D.db().close();delete globalThis.__personalSiteDb;assert.equal(A.currentUser(req(m.token)).avatarId,second);
 const{backupSite}=await import('../scripts/backup.mjs');const backup=path.join(temp,'snapshot');await backupSite(temp,backup);const snapshot=new DatabaseSync(path.join(backup,'site.sqlite'),{readOnly:true});assert.equal(snapshot.prepare('SELECT avatar_id FROM community_users WHERE id=?').get(m.id).avatar_id,second);snapshot.close();assert.deepEqual(await readFile(path.join(backup,'files',second)),await readFile(path.join(D.FILES,second)));
 await V.changeAvatar(req(m.token,'DELETE'));assert.equal(C.publicPost(post).authorAvatarId,null);assert.equal(D.isFilePublic(second),false);
});
test('reject oversized, forged, unsupported, malformed and excessive-pixel images; cleanup remains authorized',async()=>{
 for(const [input,headers,status] of [[Buffer.alloc(2*1024*1024+1),{},413],[Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),{},400],[Buffer.from('<html>not an image</html>'),{},400],[png,{'Content-Type':'image/svg+xml'},400],[Buffer.from([137,80,78,71,13,10,26,10,1,2,3]),{},400]])await assert.rejects(V.changeAvatar(req(m.token,'PUT',input,headers)),e=>e.status===status);
 const huge=await sharp({create:{width:5000,height:4000,channels:3,background:'#fff'}}).png().toBuffer();await assert.rejects(V.changeAvatar(req(m.token,'PUT',huge)),e=>e.status===400);
 id=(await V.changeAvatar(req(m.token,'PUT',png))).user.avatarId;
 call('admin/community/accounts',{id:m.id,action:'status',status:'restricted',reason:'测试头像上传权限限制'},owner);
 await assert.rejects(V.changeAvatar(req(m.token,'PUT',png)),e=>e.status===403);
 call('admin/community/accounts',{id:m.id,action:'avatar_remove',reason:'测试管理员清除违规头像'},owner);assert.equal(D.isFilePublic(id),false);assert.equal(A.currentUser(req(m.token)).avatarId,null);assert.throws(()=>C.publicPost(post),e=>e.status===404);
 call('admin/community/accounts',{id:m.id,action:'status',status:'active',reason:'完成测试并恢复本地资格'},owner);assert.equal(C.publicPost(post).authorAvatarId,null);
 id=(await V.changeAvatar(req(m.token,'PUT',png))).user.avatarId;
 call('community/account',{action:'close',current:m.password,confirm:true});assert.equal(D.isFilePublic(id),false);assert.equal(A.currentUser(req(m.token)),null);
});
test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(temp,{recursive:true,force:true})});
