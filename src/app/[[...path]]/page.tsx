import {registrationEnabled} from '@/lib/app-access.mjs';
import {ConnectDocs} from '@/components/SpaceConnect';
import {PlatformHome,ShowcaseDirectory} from '@/components/PlatformHome';
import {DesktopDownloadsPage} from '@/components/DesktopDownloadsPage';
import {SpacePublic} from '@/components/SpacePublic';
import {SpaceWorkspace} from '@/components/SpaceWorkspace';
import {currentUser} from '@/lib/auth.mjs';
import {ensureSpace,publicSpace} from '@/lib/spaces.mjs';
import {redirect} from 'next/navigation';
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
export async function generateMetadata({params}:Props){const {t,locale}=await serverI18n();const path=decodedPath((await params).path||[]),site=getConfig('site');if(path[0]==='u'){try{const requestHeaders=await headers(),req=new Request(process.env.PUBLIC_URL||'http://localhost:3008',{headers:requestHeaders}),space=publicSpace(req,path[1]),profile=localizeProfile(space.profile,locale),item=path[3]?localizeContent(space.content.find((x:any)=>x.type===path[2]&&x.slug===path[3]),locale):null;return{metadataBase:new URL(process.env.PUBLIC_URL||'http://localhost:3008'),alternates:{canonical:space.url+(path.length>2?'/'+path.slice(2).map(encodeURIComponent).join('/'):'')},title:(item?.title||profile.name)+' · SpaceYew',description:item?.summary||profile.intro,robots:{index:space.layout.indexable!==false,follow:space.layout.indexable!==false},openGraph:{title:(item?.title||profile.name)+' · SpaceYew',description:item?.summary||profile.intro,images:item?.coverId?['/media/'+item.coverId]:space.layout.coverId?['/media/'+space.layout.coverId]:profile.avatarId?['/media/'+profile.avatarId]:[]}}}catch{return{title:'SpaceYew',robots:{index:false,follow:false}}}}if(['admin','workspace','login','join','report','community','legal'].includes(path[0]))return{title:t(({'admin':'管理后台','workspace':'我的工作台','login':'登录','join':'邀请注册','report':'举报与投诉','community':'社区分享','legal':'协议与规则'} as Record<string,string>)[path[0]])+' · SpaceYew',robots:{index:false,follow:false}};const item=path.length===2&&['projects','articles','resources'].includes(path[0])?localizeContent(publicBySlug(path[0],path[1]),locale):null;const downloadsPage=path[0]==='downloads'&&path.length===1;const title=downloadsPage?t('下载桌面端')+' · SpaceYew':item?item.title+' · SpaceYew':'SpaceYew · '+t('让做过的事，成为被看见的你。'),description=downloadsPage?t('选择你的系统。网页版现在就可以使用。'):item?.summary||t('社区、个人展板与持续更新的简历。');const base=new URL(process.env.PUBLIC_URL||'http://localhost:3008');return{title,description,metadataBase:base,alternates:{canonical:'/'+path.map(encodeURIComponent).join('/')},openGraph:{title,description,images:item?.coverId?['/media/'+item.coverId]:site.shareImageId?['/media/'+site.shareImageId]:[]}}}
export default async function Page({params,searchParams}:Props){
 const path=decodedPath((await params).path||[]),query=await searchParams,requestHeaders=await headers();
 const host=requestHeaders.get('host')||new URL(process.env.PUBLIC_URL||'http://localhost:3008').host;
 const req=new Request('http://'+host+'/'+path.map(encodeURIComponent).join('/'),{headers:requestHeaders});
 if(path[0]==='my-space'){const user=currentUser(req);if(!user)redirect('/login?next=/my-space');const space=ensureSpace(user);redirect(space.visibility==='public'?'/u/'+space.handle:'/workspace/studio')}
 if(path[0]==='join'&&!registrationEnabled())redirect('/login');
 const seed=await pageResources(req,path,query);
 const body=!path.length?<PublicFrame path={path}><PlatformHome req={req}/></PublicFrame>:path[0]==='downloads'&&path.length===1?<PublicFrame path={path}><DesktopDownloadsPage/></PublicFrame>:path[0]==='docs'?<PublicFrame path={path}><ConnectDocs/></PublicFrame>:path[0]==='showcases'?<PublicFrame path={path}><ShowcaseDirectory req={req}/></PublicFrame>:path[0]==='u'?<PublicFrame path={path}><SpacePublic req={req} path={path}/></PublicFrame>:path[0]==='workspace'&&['studio','profile','library','files','insights','preview','connect'].includes(path[1])?<PublicFrame path={path}><SpaceWorkspace section={path[1]}/></PublicFrame>:path[0]==='admin'?<AdminApp path={path.slice(1)} query={query}/>:['community','workspace','login','join','report','legal'].includes(path[0])?<PublicFrame path={path}><CommunityApp path={path} query={query}/></PublicFrame>:<PublicSite path={path} query={query}/>;
 return <PageResources seed={seed}>{body}</PageResources>;
}
