import {BlogEditor} from '@/components/BlogEditor';
import {catalogEditorUrl} from '@/lib/catalog-presentation.mjs';
import {catalogApi,publicCatalogItem} from '@/lib/catalog.mjs';
import {CatalogPublisher} from '@/components/CatalogPublisher';
import {SharedDetail,ResourcesPage} from '@/components/SharedCatalog';
import {SkillDetail} from '@/components/SkillDetail';
import {getSkillDetail} from '@/lib/skill-details.mjs';
import {registrationEnabled} from '@/lib/app-access.mjs';
import {DocsPage,SkillsPage} from '@/components/LearningPages';
import {guides} from '@/lib/learning.mjs';
import {PlatformHome} from '@/components/PlatformHome';
import {DesktopDownloadsPage} from '@/components/DesktopDownloadsPage';
import {BlogPublic,OwnerBlog} from '@/components/BlogPublic';
import {currentUser} from '@/lib/auth.mjs';
import {ownerSpace,publicSpace} from '@/lib/spaces.mjs';
import {redirect,notFound} from 'next/navigation';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {serverI18n} from '@/lib/server-i18n';
import {headers} from 'next/headers';
import {PageResources} from '@/components/PageResources';
import {pageResources} from '@/lib/page-resources.mjs';
import {PublicSite,PublicFrame} from '@/components/PublicSite';
import {AdminApp} from '@/components/AdminApp';
import {CommunityApp} from '@/components/CommunityApp';
import {getConfig,publicBySlug} from '@/lib/db.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Props={params:Promise<{path?:string[]}>,searchParams:Promise<Record<string,string|string[]|undefined>>};
function decodedPath(path:string[]){return path.map(segment=>{try{return decodeURIComponent(segment)}catch{return segment}})}
export async function generateMetadata({params,searchParams}:Props){const {t,locale}=await serverI18n();const path=decodedPath((await params).path||[]),site=getConfig('site'),query=await searchParams;if(path.length===1&&['docs','skills','resources'].includes(path[0])&&query.compose==='1')return{title:t(({docs:'发布文档',skills:'分享 Skill',resources:'分享资源'} as Record<string,string>)[path[0]])+' · SpaceYew',robots:{index:false,follow:false}};if(['docs','skills','resources'].includes(path[0])&&path[1]==='shared'&&path.length===3){try{const req=new Request(process.env.PUBLIC_URL||'http://localhost:3008',{headers:await headers()}),item=publicCatalogItem(path[2],req);if(item.kind!==path[0])throw new Error('Kind mismatch');return{title:item.title+' · SpaceYew',description:item.summary,alternates:{canonical:item.url},openGraph:{title:item.title+' · SpaceYew',description:item.summary,images:item.coverId?['/media/'+item.coverId]:['/api/covers?'+new URLSearchParams({kind:item.kind,title:item.title,category:item.category})]}}}catch{return{title:'SpaceYew',robots:{index:false,follow:false}}}}if(path[0]==='publish')return{title:t('发布内容')+' · SpaceYew',robots:{index:false,follow:false}};if(['u','blog','blogs'].includes(path[0])){try{const requestHeaders=await headers(),req=new Request(process.env.PUBLIC_URL||'http://localhost:3008',{headers:requestHeaders}),space=publicSpace(req,path[0]==='blogs'?ownerSpace().handle:path[1]),profile=localizeProfile(space.profile,locale),item=path[3]?localizeContent(space.content.find((x:any)=>x.type===path[2]&&x.slug===path[3]),locale):null;return{metadataBase:new URL(process.env.PUBLIC_URL||'http://localhost:3008'),alternates:{canonical:'/blog/'+space.handle+(path.length>2?'/'+path.slice(2).map(encodeURIComponent).join('/'):'')},title:(item?.title||space.layout.blog?.title||profile.name)+' · SpaceYew',description:item?.summary||space.layout.blog?.description||profile.intro,robots:{index:space.layout.indexable!==false,follow:space.layout.indexable!==false},openGraph:{title:(item?.title||space.layout.blog?.title||profile.name)+' · SpaceYew',description:item?.summary||space.layout.blog?.description||profile.intro,images:item?.coverId?['/media/'+item.coverId]:space.layout.coverId?['/media/'+space.layout.coverId]:profile.avatarId?['/media/'+profile.avatarId]:[]}}}catch{return{title:'SpaceYew',robots:{index:false,follow:false}}}}if(['admin','workspace','login','join','report','community','legal'].includes(path[0]))return{title:t(({'admin':'管理后台','workspace':['blog','profile','library','files','insights','connect'].includes(path[1])?'博客主页管理':'个人账号','login':'登录','join':'邮箱注册','report':'举报与投诉','community':'社区分享','legal':'协议与规则'} as Record<string,string>)[path[0]])+' · SpaceYew',robots:{index:false,follow:false}};const item=path.length===2&&['projects','articles','resources'].includes(path[0])?localizeContent(publicBySlug(path[0],path[1]),locale):null;if(path[0]==='skills'&&path.length===2){const skill=getSkillDetail(path[1]);return skill?{title:skill.name+' · Skill · SpaceYew',description:t(skill.summary),alternates:{canonical:'/skills/'+skill.id}}:{title:'Skill · SpaceYew',robots:{index:false,follow:false}}}if(path[0]==='docs'||path[0]==='skills'&&path.length===1){const guide=guides.find(item=>item.slug===path[1]);const document=path[0]==='docs'&&path[1]==='articles'&&path.length===3?localizeContent(publicBySlug('articles',path[2]),locale):null;if(document)return{title:document.title+' · SpaceYew',description:document.summary,alternates:{canonical:'/docs/articles/'+encodeURIComponent(path[2])}};return{title:t(path[0]==='skills'?'Skill':path[1]==='connect'?'接入文档':guide?.title||'文档')+' · SpaceYew',description:t(path[0]==='skills'?'按类型探索 GitHub 上的 Agent Skill，查阅用途、原项目与许可。':guide?.summary||'教程、使用指南与工具接入。'),alternates:{canonical:'/'+path.map(encodeURIComponent).join('/')}}}const downloadsPage=path[0]==='downloads'&&path.length===1;const title=downloadsPage?t('下载桌面端')+' · SpaceYew':item?item.title+' · SpaceYew':'SpaceYew · '+t('让做过的事，成为被看见的你。'),description=downloadsPage?t('选择你的系统。网页版现在就可以使用。'):item?.summary||t('社区、博客主页与静态网站托管。');const base=new URL(process.env.PUBLIC_URL||'http://localhost:3008');return{title,description,metadataBase:base,alternates:{canonical:'/'+path.map(encodeURIComponent).join('/')},openGraph:{title,description,images:item?.coverId?['/media/'+item.coverId]:site.shareImageId?['/media/'+site.shareImageId]:[]}}}
export default async function Page({params,searchParams}:Props){
 const path=decodedPath((await params).path||[]),query=await searchParams,requestHeaders=await headers();
 const host=requestHeaders.get('host')||new URL(process.env.PUBLIC_URL||'http://localhost:3008').host;
 const req=new Request('http://'+host+'/'+path.map(encodeURIComponent).join('/'),{headers:requestHeaders});
 if(path[0]==='publish'){
  if(path.length>2)notFound();
  let kind=String(query.kind||'docs');
  if(path[1]){
   if(!currentUser(req))redirect('/login?next='+encodeURIComponent('/publish/'+path[1]));
   try{kind=catalogApi(req,['catalog','mine',path[1]],{},new URL(req.url)).kind}catch{notFound()}
  }
  redirect(catalogEditorUrl(kind,path[1]||''));
 }
 if(path[0]==='my-space')redirect('/blogs');
 if(path[0]==='u')redirect('/blog/'+path.slice(1).map(encodeURIComponent).join('/'));
 if(path[0]==='showcases')redirect('/blogs');
 if(path[0]==='workspace'&&['studio','preview','profile','library','files','insights','connect'].includes(path[1]))redirect('/workspace/blog');
 if(path[0]==='join'&&!registrationEnabled())redirect('/login');
 const composing=path.length===1&&['docs','skills','resources'].includes(path[0])&&query.compose==='1';
 const seed=await pageResources(req,path,query);
 const body=path[0]==='workspace'&&path[1]==='blog'&&path.length===2?<PublicFrame path={['blogs']}><BlogEditor/></PublicFrame>:path[0]==='admin'&&path[1]==='blog'&&path.length===2?<BlogEditor owner/>:composing?<PublicFrame path={path}><CatalogPublisher key={path[0]+':'+String(query.edit||'')} id={String(query.edit||'')} kind={path[0]}/></PublicFrame>:['docs','skills','resources'].includes(path[0])&&path[1]==='shared'&&path.length===3?<PublicFrame path={path}><SharedDetail kind={path[0]} id={path[2]}/></PublicFrame>:path[0]==='resources'&&path.length===1?<PublicFrame path={path}><ResourcesPage query={query}/></PublicFrame>:!path.length?<PublicFrame path={path}><PlatformHome req={req}/></PublicFrame>:path[0]==='downloads'&&path.length===1?<PublicFrame path={path}><DesktopDownloadsPage/></PublicFrame>:path[0]==='docs'?<PublicFrame path={path}><DocsPage path={path} query={query}/></PublicFrame>:path[0]==='skills'&&path.length===2?<PublicFrame path={path}><SkillDetail id={path[1]} query={query}/></PublicFrame>:path[0]==='skills'&&path.length===1?<PublicFrame path={path}><SkillsPage baseUrl={new URL(process.env.PUBLIC_URL||req.url).origin} query={query}/></PublicFrame>:path[0]==='blogs'?<PublicFrame path={path}><OwnerBlog req={req}/></PublicFrame>:path[0]==='blog'?<BlogPublic req={req} path={path} query={query}/>:path[0]==='admin'?<AdminApp path={path.slice(1)} query={query}/>:['community','workspace','login','join','report','legal'].includes(path[0])?<PublicFrame path={path}><CommunityApp path={path} query={query}/></PublicFrame>:<PublicSite path={path} query={query}/>;
 return <PageResources seed={seed}>{body}</PageResources>;
}
