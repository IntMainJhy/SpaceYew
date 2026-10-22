import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-manual-post-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://127.0.0.1:3008',APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'manual-owner-fixture-password'});
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),C=await import('../src/lib/community.mjs'),V=await import('../src/lib/covers.mjs');
const base=process.env.PUBLIC_URL;
const request=(token='',method='POST')=>new Request(base+'/api/community',{method,headers:{host:new URL(base).host,origin:base,cookie:token?'site_admin='+token:''}});
const owner=A.login(request(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});
const call=(p,input={},token=owner,method='POST')=>C.communityApi(request(token,method),p.split('/'),input,new URL(base+'/api/'+p));
const get=(p,token='')=>call(p,{},token,'GET'),policy=get('community/config'),accepted={accepted:true,policyVersion:policy.policyVersion,policyHash:policy.policyHash};
function member(verification='local_test'){
 const id=randomUUID(),username='writer_'+id.slice(0,8),nickname='Writer '+id.slice(0,8),password='writer-fixture-password-2026';
 D.db().prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,?,?,?)').run(id,username,D.passwordHash(password),nickname,verification,D.now(),D.now());
 return{id,nickname,token:A.login(request(),{username,password})};
}
const text={title:'一次组件重构的记录',body:'今天把表单中的重复逻辑移到了共享函数，并用键盘检查了错误反馈，准备继续整理成一份可复用的经验。'};
const save=(user,value=text,row)=>call('community/submissions',{id:row?.id,version:row?.version,data:value},user.token);
const submit=(user,row)=>call('community/submissions/'+row.id,{...accepted,action:'submit',version:row.version},user.token);
const approve=row=>call('admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'Checked authored text and evidence.',rule:'来源与许可'});

test('manual original text needs no external source, retains private drafts and publishes after local screening',()=>{
 const author=member();let row=save(author,{...text,note:'PRIVATE_REVIEW_NOTE'});
 assert.equal(row.origin,'manual');assert.equal(row.catalogId,'');assert.throws(()=>C.publicPost(row.id),e=>e.status===404);
 row=submit(author,row);assert.equal(row.visibility,'public');assert.equal(row.pending_revision,null);assert.equal(row.latestStatus,'approved');assert.equal(row.revisions[0].reviewer,'system:local-rules-v1');
 const visible=C.publicPost(row.id);assert.equal(visible.body,text.body);assert.equal(visible.basis,'original');assert.equal(visible.summary,text.body);assert.equal(visible.sourceUrl,'');assert.equal(visible.url,'');assert.equal(visible.sourceName,author.nickname);assert.equal(visible.license,'本人原创，保留所有权利。');assert.equal(visible.category,'技术笔记');assert.equal(visible.note,undefined);
 const oldVersion=row.version;row=save(author,{...text,title:'下一次组件重构'},row);assert.equal(C.publicPost(row.id).title,text.title);assert.throws(()=>call('community/submissions/'+row.id,{...accepted,action:'submit',version:oldVersion},author.token),e=>e.status===409);
 row=submit(author,row);assert.equal(C.publicPost(row.id).title,'下一次组件重构');assert.equal(row.revisions.length,2);
 row=call('community/submissions/'+row.id,{action:'offline',version:row.version},author.token);assert.throws(()=>C.publicPost(row.id),e=>e.status===404);assert.ok(row.draft);
 row=submit(author,row);assert.equal(row.visibility,'public');assert.equal(C.publicPosts().items.filter(x=>x.id===row.id).length,1);
});

test('flagged revisions keep the previous public version; withdrawals defeat stale reviewer decisions',()=>{
 const author=member();let row=submit(author,save(author));const stableVersion=row.public_revision;
 row=save(author,{...text,title:'需要复核的内容',body:'这是一段包含赌博风险信号的文字，发布前需要管理员人工核对其含义、上下文及是否合法。'},row);row=submit(author,row);assert.equal(row.latestStatus,'pending');assert.ok(row.pending_revision);assert.equal(C.publicPost(row.id).revision,stableVersion);
 const stale=row;row=call('community/submissions/'+row.id,{action:'withdraw',version:row.version},author.token);assert.equal(row.latestStatus,'withdrawn');assert.throws(()=>approve(stale),e=>e.status===409);
 row=save(author,{...text,title:'整理后的正常经验'},row);row=submit(author,row);assert.equal(C.publicPost(row.id).title,'整理后的正常经验');
});

test('manual mode, original image posts, external links and non-original sources retain human review',async()=>{
 const author=member();D.db().prepare("INSERT INTO config(key,value) VALUES('moderation','{\"mode\":\"manual\"}') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();
 let row=submit(author,save(author));assert.equal(row.latestStatus,'pending');row=approve(row);assert.equal(row.visibility,'public');D.setConfig('moderation',{mode:'automatic'});
 const png=await sharp({create:{width:160,height:90,channels:3,background:'#364c60'}}).png().toBuffer();
 const cover=await V.uploadCover(new Request(base+'/api/community/covers',{method:'PUT',headers:{origin:base,host:new URL(base).host,cookie:'site_admin='+author.token,'content-type':'image/png'},body:png}));
 row=submit(author,save(author,{...text,coverId:cover.id,coverAlt:'程序生成的测试色块'}));assert.equal(row.latestStatus,'pending');assert.match(row.revisions[0].reason,/图片/);
 row=submit(author,save(author,{...text,body:text.body+' 参考文档：https://example.com/docs'}));assert.equal(row.latestStatus,'pending');assert.match(row.revisions[0].reason,/链接/);
 const foreign=save(author,{...text,basis:'official',summary:text.body,sourceName:'Official source',license:'Link to the official project only.'});assert.throws(()=>submit(author,foreign),e=>e.status===400);
});

test('fenced HTML is stored as literal code while embedded HTML and unsafe prose URLs remain rejected',()=>{
 const author=member(),body='下面是一个只作为文字展示的按钮示例，便于记录标签结构与交互名称。\n```html\n<button onclick="alert(1)">保存</button>\n```';
 const row=submit(author,save(author,{...text,body}));assert.equal(C.publicPost(row.id).body,body);
 assert.throws(()=>save(author,{...text,body:'<button onclick="alert(1)">运行</button>'+text.body}),/正文只接收文字/);
 assert.throws(()=>save(author,{...text,body:text.body+' javascript:alert(1)'}),/完整 HTTPS/);
 assert.throws(()=>save(author,{...text,body:text.body+' https://127.0.0.1/private'}));
});

test('revoked qualification hides posts, comments, bookmarks and following feeds; inactive follows can still be removed',()=>{
 const author=member(),reader=member();const authored=submit(author,save(author)),readerPost=submit(reader,save(reader,{...text,title:'读者自己的经验记录'}));
 call('community/reactions/'+authored.id,{kind:'bookmark',active:true},reader.token);
 call('community/follows/'+author.id,{active:true},reader.token);
 const comment=call('community/comments',{...accepted,post:readerPost.id,body:'谢谢这份实际经验，我也准备按这个流程检查自己的表单。'},author.token);assert.equal(comment.status,'approved');
 assert.equal(get('community/comments/'+readerPost.id).approvedCount,1);assert.equal(get('community/members/'+reader.id).followingCount,1);
 D.db().prepare("UPDATE community_users SET verification='pending' WHERE id=?").run(author.id);
 assert.throws(()=>C.publicPost(authored.id),e=>e.status===404);assert.equal(C.publicPosts().items.some(x=>x.id===authored.id),false);assert.equal(get('community/bookmarks',reader.token).items.length,0);assert.equal(get('community/bookmarks',reader.token).unavailable,1);
 const following=C.communityApi(request(reader.token,'GET'),['community','posts'],{},new URL(base+'/api/community/posts?feed=following'));assert.equal(following.total,0);
 assert.equal(get('community/comments/'+readerPost.id).approvedCount,0);assert.equal(C.publicPost(readerPost.id).commentCount,0);assert.equal(get('community/members/'+reader.id).followingCount,0);assert.equal(get('community/members/'+reader.id+'/following').total,0);
 assert.deepEqual(call('community/follows/'+author.id,{active:false},reader.token),{id:author.id,following:false,unavailable:true});assert.equal(D.db().prepare('SELECT 1 FROM community_follows WHERE follower=? AND following=?').get(reader.id,author.id),undefined);assert.equal(call('community/follows/'+author.id,{active:false},reader.token).following,false);
 call('admin/community/accounts',{id:author.id,action:'qualify',checked:true,reason:'Requalified after isolated authorization test.'});assert.equal(C.publicPost(authored.id).id,authored.id);assert.equal(get('community/comments/'+readerPost.id).approvedCount,1);
 call('community/follows/'+author.id,{active:true},reader.token);call('admin/community/accounts',{id:author.id,action:'status',status:'restricted',reason:'Restricted in the isolated follow-removal test.'});assert.equal(call('community/follows/'+author.id,{active:false},reader.token).following,false);
});

test('pending accounts cannot save or submit and paused communities reject new manual publications',()=>{
 const pending=member('pending');assert.throws(()=>save(pending),e=>e.status===403);
 const author=member(),row=save(author);D.setConfig('community',{paused:true});assert.throws(()=>submit(author,row),e=>e.status===409);D.setConfig('community',{paused:false});
 const another=member();assert.throws(()=>call('community/submissions/'+row.id,{},another.token,'GET'),e=>e.status===404);
});

test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
