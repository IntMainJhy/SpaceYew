// Extends the existing isolated browser demo; never reads the primary site's credentials/data.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const old=JSON.parse(await readFile('.impeccable/review/avatar-demo-clean/run.json','utf8'));
if(!old.data.includes('/T/community-ui-')||old.url!=='http://localhost:3009')throw new Error('Only the isolated UI demo is allowed');
process.env.APP_DATA_DIR=old.data;
const {verifiedSignup}=await import('./email-fixture.mjs');
const base=old.url;
async function api(path,input,token='',method='POST'){const r=await fetch(base+'/api/'+path,{method,headers:{Origin:base,Cookie:token,'Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(path==='community/register'?verifiedSignup(input):input)})});const data=await r.json();if(!r.ok)throw new Error(path+': '+JSON.stringify(data));return{data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const owner=(await api('auth/login',{username:'admin',password:'ui-only-community-owner-2026'})).cookie;
const config=(await api('community/config',undefined,'','GET')).data,ack={accepted:true,policyVersion:config.policyVersion,policyHash:config.policyHash};
const users=[];
for(const [username,nickname] of [['ui_design','林间设计（演示）'],['ui_notes','阿禾的开发札记（演示）'],['ui_tools','寻路工具箱（演示）']]){
 const accounts=(await api('admin/community/accounts',undefined,owner,'GET')).data.items;
 let user=accounts.find(x=>x.username===username);
 if(!user){const invite=(await api('admin/community/invites',{label:'社区互动界面演示 · 合成成员'},owner)).data;await api('community/register',{...ack,adult:true,username,nickname,password:'ui-only-social-member-2026',invite:invite.token});user=(await api('admin/community/accounts',undefined,owner,'GET')).data.items.find(x=>x.username===username);await api('admin/community/accounts',{id:user.id,action:'qualify',checked:true,reason:'合成账号，仅用于本地社区互动验收'},owner);}
 const token=(await api('auth/login',{username,password:'ui-only-social-member-2026'})).cookie;users.push({...user,token});
}
const entries=[['[互动演示] 给设计素材留一份出处','素材合集','Google Fonts','https://fonts.google.com/','字体的选择也可以从阅读开始。先在官方目录中比较字形、语言覆盖和授权，再决定是否用于自己的项目。这里是合成演示内容，仅链接官方来源，不上传字体文件。'],['[互动演示] 把踩过的布局问题写成手记','技术笔记','MDN Web Docs','https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout','从盒模型到 Flexbox，再到 Grid，把每次调试遇到的问题收成可查阅的笔记。先理解布局规则，再用小例子验证。这是一份合成演示，原始资料以官方文档为准。'],['[互动演示] 少装一个插件，也能查清兼容性','实用网站','Can I use','https://caniuse.com/','准备采用一个新的 CSS 特性之前，查看支持范围和已知问题，再给旧环境留好退路。这份合成分享用于演示社区分类、关注与收藏，不构成兼容性保证。']];
const posts=[];
for(let i=0;i<entries.length;i++){const [title,category,sourceName,sourceUrl,body]=entries[i],user=users[i];let list=(await api('community/workspace',undefined,user.token,'GET')).data.posts;let row=list.find(p=>(p.public||p.draft||p.pending?.data)?.title===title);if(!row){row=(await api('community/submissions',{data:{title,category,sourceName,sourceUrl,url:sourceUrl,body,summary:body.slice(0,140),basis:'official',license:'仅介绍官方来源页，不复制原素材；许可与限制请以来源方说明为准。',tags:[],note:'纯合成演示，不涉及真实授权材料。'}},user.token)).data;row=(await api('community/submissions/'+row.id,{...ack,action:'submit',version:row.version},user.token)).data;row=(await api('admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'演示：核查官方链接、内容、许可说明',rule:'来源与许可'},owner)).data;}posts.push(row.id);}
const member=(await api('auth/login',{username:'ui_member',password:'ui-only-community-member-2026'})).cookie;
for(const [i,id] of posts.entries()){await api('community/reactions/'+id,{kind:'like',active:true},users[(i+1)%users.length].token);await api('community/follows/'+users[i].id,{active:true},member);}
await api('community/reactions/'+posts[0],{kind:'repost',active:true},users[1].token);
await api('community/reactions/'+posts[1],{kind:'bookmark',active:true},member);
let row=(await api('community/comments',{...ack,post:posts[1],body:'[互动演示] 我会把每个布局问题整理成一个最小例子，再链接对应的官方文档，之后复用会方便很多。'},users[0].token)).data;
row=(await api('admin/community/comments/'+row.id,{action:'approve',version:row.version,checked:true,reason:'合成评论，已检查正文和关联来源'},owner)).data;
const reply=(await api('community/comments',{...ack,post:posts[1],parent:row.id,body:'[待审演示] 这个整理方法很实用，我还想补充不同视口下的对比。'},users[2].token)).data;
await mkdir('.impeccable/review/community-social-v2',{recursive:true});
await writeFile('.impeccable/review/community-social-v2/run.json',JSON.stringify({...old,users:users.map(({token,password,...user})=>({id:user.id,name:user.nickname})),posts,comment:row.id,pendingReply:reply.id},null,2));
console.log('Isolated demo extended:',JSON.stringify({url:base,posts,comment:row.id,pendingReply:reply.id}));
