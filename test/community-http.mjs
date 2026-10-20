import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'site-community-http-'));let server;
try{
 server=await startServer(path.join(directory,'data'),3118);const base=server.base,owner=await loginServer(base);
 async function call(url,input,token='',method='POST',headers={}){const r=await fetch(base+url,{method,headers:{Origin:base,Cookie:token,'Content-Type':'application/json',...headers},...(input===undefined?{}:{body:JSON.stringify(input)})});return{status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}}
 const get=(url,token='')=>call(url,undefined,token,'GET');
 const conf=(await get('/api/community/config')).data,ack={accepted:true,policyVersion:conf.policyVersion,policyHash:conf.policyHash};
 assert.equal((await call('/api/community/cases',{},'', 'POST',{Origin:'https://foreign.example'})).status,403);
 const invite=(await call('/api/admin/community/invites',{label:'HTTP 本地验收邀请'},owner)).data;
 const email='http-member@example.com';const verification=await call('/api/auth/email/request',{purpose:'register',email,invite:invite.token});assert.equal(verification.status,200);assert.equal(verification.data.code,undefined);const outbox=path.join(directory,'data','mail-outbox'),mail=JSON.parse(await readFile(path.join(outbox,(await readdir(outbox))[0]),'utf8')),code=mail.text.match(/\d{6}/)[0];
 let r=await call('/api/community/register',{...ack,adult:true,email,code,challenge:verification.data.challenge,username:'http_member',password:'community-http-password-2026',nickname:'HTTP 测试成员',invite:invite.token});assert.equal(r.status,200);

 r=await call('/api/auth/login',{username:'http_member',password:'community-http-password-2026'});assert.equal(r.status,200);const member=r.cookie,user=(await get('/api/auth/me',member)).data.user;
 assert.equal(user.verification,'pending');assert.equal((await get('/api/admin/bootstrap',member)).status,401);
 assert.equal((await call('/api/admin/uploads',{name:'forbidden.zip',size:1,fingerprint:'a'.repeat(64)},member)).status,401);
 assert.equal((await call('/api/admin/community/accounts',{id:user.id,action:'qualify',checked:true,reason:'本机验收昵称检查与测试资格确认'},owner)).status,200);
 const doc={title:'HTTP 本地验收分享',summary:'这是 HTTP 流程验收的资源介绍，清楚说明来源、许可与限制。',body:'这份文字用来验证真实 HTTP 投稿、人工审核、修改复审及举报冻结，不是站长真实分享。',category:'开发资源',tags:['工具'],sourceName:'验收来源机构',sourceUrl:'https://example.com/source',url:'https://example.com/official',basis:'official',license:'仅介绍官方来源页面，原内容权利保留。',note:'PRIVATE_NOTE_NEVER_PUBLIC'};
 r=await call('/api/community/submissions',{data:doc},member);assert.equal(r.status,200);let row=r.data;
 assert.equal((await get('/api/community/posts/'+row.id)).status,404);assert.equal((await get('/api/community/submissions/'+row.id)).status,401);
 r=await call('/api/community/submissions/'+row.id,{...ack,action:'submit',version:row.version},member);assert.equal(r.status,200);row=r.data;
 assert.equal((await get('/api/community/posts')).data.total,0);
 r=await call('/api/admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'已核查来源页面、许可和所有链接',rule:'来源与许可'},owner);assert.equal(r.status,200);row=r.data;
 const publicHtml=await(await fetch(base+'/community')).text();assert.ok(publicHtml.includes('class="feed-post"'));assert.ok(publicHtml.includes(doc.title));assert.ok(!publicHtml.includes('class="skeleton"'));
 const memberHtml=await(await fetch(base+'/workspace',{headers:{Cookie:member}})).text();assert.ok(memberHtml.includes('<h1>My posts</h1>'));assert.ok(!memberHtml.includes('class="skeleton"'));
 const ownerHtml=await(await fetch(base+'/admin',{headers:{Cookie:owner}})).text();assert.match(ownerHtml,/<h1 id="admin-overview-title">Management center<\/h1>/);assert.ok(ownerHtml.includes('class="admin-summary-grid"'));assert.ok(!ownerHtml.includes('class="skeleton"'));
 const unauthorizedHtml=await(await fetch(base+'/admin')).text();assert.ok(unauthorizedHtml.includes('Sign in to dashboard'));assert.ok(!unauthorizedHtml.includes('class="stats-grid"'));
 for(const [language,lang,heading] of [['zh','zh-CN','我的投稿'],['ja','ja','自分の投稿']]){const localized=await(await fetch(base+'/workspace',{headers:{Cookie:member+'; site-locale='+language}})).text();assert.ok(localized.includes('lang="'+lang+'"'));assert.ok(localized.includes('<h1>'+heading+'</h1>'));assert.ok(localized.includes(doc.title));}
 assert.ok(memberHtml.includes('lang="en"'));
 const pub=await get('/api/community/posts/'+row.id);assert.equal(pub.data.title,doc.title);assert.ok(!JSON.stringify(pub.data).includes(doc.note));
 // Persisted interactions and moderated comments over the actual origin/auth boundary.
 const postId=row.id;
 assert.equal((await call('/api/community/reactions/'+postId,{kind:'like',active:true})).status,401);
 assert.equal((await call('/api/community/reactions/'+postId,{kind:'like',active:true},member,'POST',{Origin:'https://foreign.example'})).status,403);
 for(const kind of ['like','bookmark','repost']){assert.equal((await call('/api/community/reactions/'+postId,{kind,active:true},member)).status,200);assert.equal((await call('/api/community/reactions/'+postId,{kind,active:true},member)).status,200);}
 let signals=(await get('/api/community/posts/'+postId,member)).data;assert.equal(signals.likeCount,1);assert.equal(signals.repostCount,1);assert.equal(signals.bookmarked,true);
 assert.equal((await get('/api/community/posts/'+postId)).data.bookmarked,false);assert.equal((await get('/api/community/bookmarks',member)).data.total,1);assert.equal((await get('/api/community/bookmarks',owner)).data.total,0);
 assert.equal((await call('/api/community/follows/'+user.id,{active:true},owner)).status,200);assert.ok((await get('/api/community/posts?feed=following',owner)).data.items.some(x=>x.id===postId));assert.equal((await get('/api/community/posts?feed=following')).status,401);
 let comment=(await call('/api/community/comments',{...ack,post:postId,body:'HTTP_PENDING_COMMENT 这是等待人工审核的测试评论。'},member)).data;
 assert.ok(comment.id);assert.equal((await get('/api/community/comments/'+postId)).data.total,0);assert.equal((await get('/api/community/comments/'+postId,member)).data.total,1);assert.equal((await get('/api/admin/community/comments',member)).status,403);
 assert.equal((await call('/api/admin/community/comments/'+comment.id,{action:'approve',version:comment.version,checked:true,reason:'已检查评论正文与关联分享，符合规则'},owner,'POST',{Origin:'https://foreign.example'})).status,403);
 r=await call('/api/admin/community/comments/'+comment.id,{action:'approve',version:comment.version,checked:true,reason:'已检查评论正文与关联分享，符合规则'},owner);assert.equal(r.status,200);comment=r.data;
 assert.equal((await get('/api/community/comments/'+postId)).data.approvedCount,1);
 let reply=(await call('/api/community/comments',{...ack,post:postId,parent:comment.id,body:'这是一条通过真实 HTTP 提交的回复。'},owner)).data;assert.ok(reply.id);
 assert.equal((await call('/api/admin/community/comments/'+reply.id,{action:'approve',version:reply.version,checked:true,reason:'站长也不能审批自己的评论'},owner)).status,403);
 comment=(await call('/api/community/comments/'+comment.id,{...ack,action:'edit',version:comment.version,body:'HTTP_EDIT_PENDING 编辑后应重新送审且不可公开。'},member)).data;
 assert.equal((await get('/api/community/comments/'+postId)).data.total,0);
 comment=(await call('/api/admin/community/comments/'+comment.id,{action:'reject',version:comment.version,reason:'合成测试：请补充更明确的使用场景'},owner)).data;
 assert.ok((await get('/api/community/comments/'+postId,member)).data.items[0].reason.includes('补充'));assert.equal((await get('/api/community/comments/'+postId)).data.total,0);
 const inbox=(await get('/api/community/notifications?status=all&page=1',member)).data;assert.ok(inbox.items.length&&inbox.unread>0);
 assert.equal((await get('/api/community/notifications')).status,401);
 assert.equal((await call('/api/community/notifications',{id:inbox.items[0].id},owner)).status,404);
 assert.equal((await call('/api/community/notifications',{id:inbox.items[0].id},member,'POST',{Origin:'https://foreign.example'})).status,403);
 assert.equal((await call('/api/community/notifications',{id:inbox.items[0].id},member)).status,200);
 assert.equal((await get('/api/community/notification-count',member)).data.unread,inbox.unread-1);
 assert.ok((await get('/api/community/notification-count',member)).data.unread>0);assert.equal((await call('/api/community/notifications',{},member)).status,200);assert.equal((await get('/api/community/notification-count',member)).data.unread,0);
 r=await call('/api/community/submissions',{id:row.id,version:row.version,data:{...doc,title:'PRIVATE_TITLE_PENDING_REVIEW',url:'https://example.com/pending'}},member);assert.equal(r.status,200);row=r.data;
 assert.equal((await get('/api/community/posts/'+row.id)).data.title,doc.title);
 const html=await(await fetch(base+'/community/'+row.id)).text();assert.ok(!html.includes('PRIVATE_TITLE_PENDING_REVIEW'));assert.ok(!html.includes(doc.note));
 r=await call('/api/community/cases',{kind:'report',post:row.id,category:'隐私泄露',description:'HTTP 验收使用的风险描述，没有真实个人信息。'});assert.equal(r.status,200);const receipt=r.data;
 assert.equal((await call('/api/community/case-status',{id:receipt.id,token:'wrong'})).status,404);
 let item=(await get('/api/admin/community/cases',owner)).data.items.find(x=>x.id===receipt.id);
 r=await call('/api/admin/community/cases/'+item.id,{action:'freeze',version:item.version,reason:'HTTP 本地风险核查，先暂停公开'},owner);assert.equal(r.status,200);
 assert.equal((await get('/api/community/posts')).data.total,0);assert.equal((await get('/api/community/bookmarks',member)).data.items.length,0);assert.equal((await get('/api/community/posts?feed=following',owner)).data.total,0);assert.equal((await call('/api/community/case-status',receipt)).data.response,'HTTP 本地风险核查，先暂停公开');
 await stopServer(server);server=await startServer(path.join(directory,'data'),3118);
 assert.equal((await get('/api/auth/me',member)).data.user.id,user.id);assert.equal((await get('/api/community/workspace',member)).data.posts.length,1);assert.equal((await get('/api/community/bookmarks',member)).data.unavailable,1);assert.equal((await get('/api/community/members/'+user.id,owner)).data.following,true);
 for(const route of ['/community','/login','/join','/workspace','/workspace/submissions/new','/report','/legal/terms','/legal/community','/legal/privacy','/legal/rights','/admin/community','/admin/community/reviews','/admin/community/reports','/admin/community/accounts','/admin/community/comments','/workspace/bookmarks','/community/members','/community/members/'+user.id])assert.equal((await fetch(base+route)).status,200,route);
 assert.equal((await call('/api/auth/logout',{},member)).status,200);assert.equal((await get('/api/community/workspace',member)).status,401);
 console.log('PASS：社区真实 HTTP 邀请注册、统一登录、资格与越权、草稿保密、先审后发、修改隔离、匿名举报与凭证、冻结、进程重启持久化、点赞收藏转发关注、评论复审与自审隔离、通知及页面入口。');
}catch(error){console.error(server?.log()||'');throw error}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
