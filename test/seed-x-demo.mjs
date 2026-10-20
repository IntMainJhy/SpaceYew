// Creates a separate, persistent, synthetic local demo; never reads the primary data.
import {memberNames,postCopy,licenseCopy,portfolioCopy} from './demo-copy.mjs';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';import path from 'node:path';import {randomUUID} from 'node:crypto';import sharp from 'sharp';
const folder=path.resolve('..','.site-x-demo-data'),manifest=path.join(folder,'demo-manifest.json');
try{await access(manifest);console.log(await readFile(manifest,'utf8'));process.exit(0);}catch{}
try{await access(path.join(folder,'site.sqlite'));throw new Error('Existing data found without demo manifest; refuse to replace it');}catch(e){if(e.code!=='ENOENT')throw e;}
process.env.APP_DATA_DIR=folder;process.env.PUBLIC_URL='http://localhost:3010';process.env.COOKIE_SECURE='false';process.env.INITIAL_ADMIN_USERNAME='demo_admin';process.env.INITIAL_ADMIN_PASSWORD='DemoOwner2026!';
const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),C=await import('../src/lib/community.mjs'),V=await import('../src/lib/covers.mjs'),W=await import('../src/lib/content.mjs');
const base=process.env.PUBLIC_URL;
const request=(token='',method='POST',body)=>new Request(base+'/api/community/covers',{method,headers:{origin:base,host:'localhost:3010',cookie:token?'site_admin='+token:'','content-type':'image/jpeg'},...(body?{body}:{})});
const {verifiedSignup}=await import('./email-fixture.mjs');
const owner=A.login(request(),{username:'demo_admin',password:process.env.INITIAL_ADMIN_PASSWORD});
const call=(p,input={},token=owner,method='POST')=>C.communityApi(request(token,method),p.split('/'),p==='community/register'?verifiedSignup(input):input,new URL(base+'/api/'+p));
const config=call('community/config',{},'','GET'),ack={accepted:true,policyVersion:config.policyVersion,policyHash:config.policyHash};
const actors=[];
for(const [username,nickname]of ['demo_member','demo_design','demo_dev','demo_tools','demo_walk'].map((name,i)=>[name,memberNames[i]])){
 const invite=call('admin/community/invites',{label:'完整界面演示 · 合成成员'});call('community/register',{...ack,adult:true,username,nickname,password:'DemoMember2026!',invite:invite.token},'');
 const token=A.login(request(),{username,password:'DemoMember2026!'}),user=A.currentUser(request(token));call('admin/community/accounts',{id:user.id,action:'qualify',checked:true,reason:'合成演示账号，仅供本地界面和流程验证'});actors.push({...user,token});
}
const waitingInvite=call('admin/community/invites',{label:'待确认资格演示'});call('community/register',{...ack,adult:true,username:'demo_waiting',nickname:memberNames[5],password:'DemoMember2026!',invite:waitingInvite.token},'');
const pictures=['type-safe.svg','design-kit.svg','lake-walk.png','type-safe.svg','design-kit.svg'];
const assets=[];
for(let i=0;i<actors.length;i++){const input=await sharp(await readFile('public/images/community/'+pictures[i])).jpeg({quality:88}).toBuffer();assets.push((await V.uploadCover(request(actors[i].token,'PUT',input))).id);}
const entries=[
 [0,'开发资源','https://www.typescriptlang.org/docs/','深色代码编辑器中的 Resource 类型定义与 strict 配置'],
 [1,'素材合集','https://www.figma.com/community','头像、搜索框、胶囊按钮与基础颜色的组件研究'],
 [4,'技术笔记','https://developer.mozilla.org/en-US/docs/Learn_web_development','秋日山湖、松林与沿岸步道'],
 [2,'技术笔记','https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout','代码编辑器中的类型与边界检查'],
 [3,'实用网站','https://caniuse.com/','关于搜索框和按钮的组件研究'],
 [0,'开发资源','https://docs.github.com/en/repositories','代码编辑器中的说明与配置']
];
const posts=[];
function value(entry){const[i,category,url,coverAlt]=entry;return{...postCopy[entries.indexOf(entry)],category,tags:[i===1?'设计':'工具','学习'],basis:'official',sourceUrl:url,url,license:licenseCopy,note:'',coverId:assets[i],coverAlt};}
for(const entry of entries){const token=actors[entry[0]].token;let row=call('community/submissions',{data:value(entry)},token);row=call('community/submissions/'+row.id,{action:'submit',version:row.version,...ack},token);row=call('admin/community/reviews/'+row.id,{action:'approve',version:row.version,revision:row.pending_revision,checked:true,reason:'已检查封面、正文、来源与许可说明',rule:'来源与许可'});posts.push(row.id);}
// Add all work queue states without bypassing review.
const drafts=[];
for(const state of ['draft','pending','returned','rejected']){let row=call('community/submissions',{data:{...value(entries[0]),title:({draft:'还在整理：我的资源分类方法',pending:'待审核：一次封面与排版的练习',returned:'待补充：给组件研究补上出处',rejected:'未通过：范围说明不够清楚的资源介绍'})[state]}},actors[0].token);if(state!=='draft'){row=call('community/submissions/'+row.id,{action:'submit',version:row.version,...ack},actors[0].token);if(state!=='pending')row=call('admin/community/reviews/'+row.id,{action:state==='returned'?'return':'reject',version:row.version,revision:row.pending_revision,checked:true,reason:state==='returned'?'请补充封面生成来源以及具体的使用限制。':'当前说明不足以核查使用范围，请核对来源后重新整理。',rule:'来源与许可'});}drafts.push(row.id);}
for(let i=0;i<actors.length;i++){for(let j=0;j<posts.length;j++){if((i+j)%2===0)call('community/reactions/'+posts[j],{kind:'like',active:true},actors[i].token);}if(i>0)call('community/follows/'+actors[i].id,{active:true},actors[0].token);if(i!==0)call('community/follows/'+actors[0].id,{active:true},actors[i].token);}
for(const id of posts.slice(0,4))call('community/reactions/'+id,{kind:'bookmark',active:true},actors[0].token);
call('community/reactions/'+posts[1],{kind:'repost',active:true},actors[2].token);
let comment;
for(const[i,body]of [[1,'这个例子很清楚，我也喜欢先把状态建模好，再实现界面。'],[2,'补充一个思路：把空数据和错误状态也放在同一个最小例子里验证。'],[3,'我会把官方文档的版本一起记下来，后面查找方便很多。']]){let c=call('community/comments',{...ack,post:posts[0],body},actors[i].token);c=call('admin/community/comments/'+c.id,{action:'approve',version:c.version,checked:true,reason:'已检查评论正文和来源'});comment=c;}
let reply=call('community/comments',{...ack,post:posts[0],parent:comment.id,body:'赞同，文档版本和适用范围都应该留下来。'},actors[0].token);call('admin/community/comments/'+reply.id,{action:'approve',version:reply.version,checked:true,reason:'回复内容已核对，通过审核'});
call('community/comments',{...ack,post:posts[1],body:'想再请教一下这里按钮聚焦状态的设计方法。'},actors[0].token);
const report=call('community/cases',{kind:'report',post:posts[4],category:'链接失效',description:'来源链接暂时无法打开，刷新后仍然出现错误，希望核查链接是否已经迁移。'},'');
call('community/cases',{kind:'appeal',post:drafts[3],category:'审核或账号申诉',description:'希望了解需要补充哪些来源信息，方便修改后重新送审。'},actors[0].token);
call('admin/community/invites',{label:'开发交流邀请'});
// Separate synthetic portfolio/content/files/statistics in this demo only.
D.setConfig('profile',{...D.getConfig('profile'),name:'余江昊',intro:'在这里记录开发过程、分享项目与资源，也留下成长中的每一个重要节点。',skills:['前端开发','HarmonyOS','UI 研究'],experiences:[{id:'demo-1',title:'个人内容系统',type:'项目经历',start:'2026-06',end:'至今',description:'搭建个人内容工作台，持续完善作品发布、资源维护与社区交流。',visible:true,order:0},{id:'demo-2',title:'界面组件研究',type:'学习经历',start:'2026-01',end:'2026-05',description:'持续整理组件、布局与交互实践，把日常学习写成可以回看的笔记。',visible:true,order:1}]});
D.setConfig('site',{...D.getConfig('site'),description:'余江昊的项目、开发手记与资源分享。'});
const staticCovers=[];for(const name of ['design-kit.svg','type-safe.svg','lake-walk.png']){const bytes=await sharp(await readFile('public/images/community/'+name)).jpeg({quality:85}).toBuffer(),id=randomUUID();await writeFile(path.join(D.FILES,id),bytes);D.db().prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'内容封面.jpg',bytes.length,'image/jpeg',D.hash(bytes),D.now());staticCovers.push(id);}
const sample=Buffer.from('# 资源整理说明\n\n## 名称与用途\n资源名称：\n适用场景：\n\n## 来源与版本\n来源网址：\n适用版本：\n更新日期：\n\n## 许可与使用限制\n许可名称：\n注意事项：\n'),sampleId=randomUUID();await writeFile(path.join(D.FILES,sampleId),sample);D.db().prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(sampleId,'资源整理说明.md',sample.length,'text/plain',D.hash(sample),D.now());
for(const type of Object.keys(portfolioCopy))for(let i=0;i<3;i++){const[title,summary,paragraph]=portfolioCopy[type][i];W.writeContent({type,slug:'demo-'+type+'-'+i,action:'publish',data:{title,summary,bodyHtml:'<h2>'+title+'</h2><p>'+paragraph+'</p><h2>使用与整理</h2><p>'+summary+'</p>',coverId:staticCovers[i],category:['开发资源','素材合集','技术笔记'][i],tags:['工具','学习'],featured:i<2,career:true,order:i,role:'开发与设计',contribution:paragraph,outcome:'在持续维护中整理可复用的方法与记录。',...(type==='resources'?i===2?{kind:'file',attachmentId:sampleId}:{kind:'website',url:i?'https://fonts.google.com/':'https://developer.mozilla.org/'}:{})}});}
W.writeContent({type:'articles',slug:'demo-private-draft',action:'save',data:{title:'正在整理：我的开发笔记方法',summary:'把问题、排查过程与最后的取舍收在同一份笔记里。',bodyHtml:'<p>此草稿未发布。</p>',category:'技术笔记',tags:[]}});
const recycled=W.writeContent({type:'articles',slug:'demo-recycled-article',action:'save',data:{title:'一份暂时收起的开发笔记',summary:'整理过的旧笔记，留待之后补充与修订。',bodyHtml:'<p>恢复后可继续编辑，不会直接公开。</p>',tags:[]}});W.writeContent({id:recycled.id,revision:recycled.revision,action:'delete'});
D.transaction(d=>{for(let day=0;day<30;day++){const n=22+(day*17)%55;for(let i=0;i<n;i++){const at=new Date(Date.now()-day*86400000-i*430000).toISOString();d.prepare('INSERT INTO events(id,kind,path,content_id,visitor,source,device,browser,at,resource_kind) VALUES(?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),'view',['/','/community','/projects','/articles','/resources'][i%5],null,'demo-visitor-'+(i%27),['直接访问','github.com','google.com'][i%3],['Desktop','Mobile','Tablet'][i%3],['Chrome','Safari','Firefox'][i%3],at,null);if(i%9===0){const resource=d.prepare("SELECT id,slug FROM content WHERE type='resources' ORDER BY slug LIMIT 1").get();d.prepare('INSERT INTO events(id,kind,path,content_id,visitor,source,device,browser,at,resource_kind) VALUES(?,?,?,?,?,?,?,?,?,?)').run(randomUUID(),'download','/resources/'+resource.slug,resource.id,'demo-visitor-'+i,'直接访问','desktop','Chrome',at,'website');}if(i%9===0)d.prepare('INSERT INTO traffic VALUES(?,?,?,?,?)').run(randomUUID(),sampleId,120000+(day*17000),'application',at);}}});
await mkdir(folder,{recursive:true});const result={url:base,data:folder,member:'demo_member',memberPassword:'DemoMember2026!',owner:'demo_admin',ownerPassword:'DemoOwner2026!',posts,drafts,report:report.id,allSynthetic:true};await writeFile(manifest,JSON.stringify(result,null,2),{mode:0o600});await mkdir('.impeccable/review/x-social',{recursive:true});await writeFile('.impeccable/review/x-social/demo.json',JSON.stringify({url:base,data:folder,posts,drafts,allSynthetic:true},null,2));D.db().close();console.log(JSON.stringify({url:base,data:folder,posts:posts.length,drafts:drafts.length,allSynthetic:true}));
