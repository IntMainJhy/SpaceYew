import Link from 'next/link';
import {serverI18n} from '@/lib/server-i18n';
import {defaultBlogSpace,publicSpaces} from '@/lib/spaces.mjs';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {getConfig} from '@/lib/db.mjs';
import {homeDownload} from '@/lib/home-download.mjs';
import {FeedAvatar} from './FeedAvatar';
import {Icon} from './Icons';
import {V2Atmosphere} from './V2Atmosphere';
import {CreatorStage,type CreatorStageData,type CreatorProject} from './CreatorStage';
export async function PlatformHome({req}:{req:Request}){
 const {t,locale}=await serverI18n(),spaces=publicSpaces(req);
 let featured:any=null;try{featured=defaultBlogSpace(req)}catch{}
 const download=homeDownload(req.headers,getConfig('site').desktopDownloads);
 let creator:CreatorStageData|null=null;
 if(featured){
  const profile=localizeProfile(featured.profile,locale),url='/blog/'+encodeURIComponent(featured.handle),design=featured.layout.blog?.design;
  const visibleParts=new Set((design?.nodes||[]).filter((node:any)=>!node.hidden).map((node:any)=>node.part));
  const section=profile.resume?.sections?.find((section:any)=>/project|作品|项目/i.test(section.id+' '+section.title)&&(!design||visibleParts.has('section:'+section.id)));
  const localized=(item:any,field:string)=>item.translations?.[locale]?.[field]?.trim()||item[field]||'';
  const resumeProjects:CreatorProject[]=(section?.items||[]).filter((item:any)=>item.title).map((item:any)=>({title:localized(item,'title'),description:localized(item,'description'),imageId:item.coverId||'',href:url+'#anx-'+section.id}));
  const documents=featured.content.filter((item:any)=>item.type==='projects').map((raw:any)=>{const item=localizeContent(raw,locale);return{title:item.title,description:item.summary,imageId:item.coverId||'',href:'/u/'+encodeURIComponent(featured.handle)+'/projects/'+encodeURIComponent(item.slug)}});
  creator={name:profile.name,handle:featured.handle,intro:profile.intro||'',avatarId:profile.avatarId||'',skills:profile.skills||[],url,projects:resumeProjects.length?resumeProjects:documents};
 }
 return <div className="v2-home">
  <div className="v2-home-atmosphere" aria-hidden="true"><V2Atmosphere/></div>
  <section className="v2-hero-scene" aria-labelledby="product-title"><div className="v2-hero-intro"><div className="v2-hero-copy"><h1 id="product-title"><span>{t('让你的创造，')}</span><span>{t('有自己的空间。')}</span></h1><p>{t('分享发现，展示作品，记录成长。')}</p><div className="v2-hero-actions"><Link className="v2-primary" href="#creators">{t('发现博客主页')}<Icon name="arrow"/></Link><Link className="v2-hero-secondary" href="/workspace/blog">{t('创建我的主页')}<Icon name="plus"/></Link></div></div></div>
   <div className="v2-hero-showcase">{creator?<CreatorStage creator={creator}/>:<div className="v2-hero-empty"><h2>{t('完整介绍你自己')}</h2><p>{t('个人介绍、经历、技能与作品。')}</p><Link href="/workspace/blog">{t('创建我的主页')}<Icon name="arrow"/></Link></div>}</div>
  </section>
  <section className="v2-section v2-work-section" aria-labelledby="v2-work-title"><div className="v2-section-heading"><h2 id="v2-work-title">{t('每个人，都是一份独特的故事。')}</h2><p>{t('把个人介绍、经历、技能和作品，整理成一份有质感的博客主页。')}</p></div><div className="v2-work-grid">{creator?.projects.slice(0,3).map((project,index)=><Link className="v2-work" href={project.href} key={project.title+'-'+index}><div className="v2-work-art">{project.imageId?<img src={'/media/'+project.imageId} alt="" width={800} height={500} loading="lazy"/>:<div className={'v2-work-type v2-work-type-'+index} aria-hidden="true"><span>{project.title}</span><Icon name={index===1?'layers':'grid'}/></div>}</div><div className="v2-work-info"><h3>{project.title}</h3><Icon name="arrow"/></div><p>{project.description}</p></Link>)}</div>{!creator?.projects.length&&<div className="v2-simple-empty"><p>{t('暂时没有公开主页。')}</p><Link href="/blogs">{t('发现博客主页')}<Icon name="arrow"/></Link></div>}</section>
  <section className="v2-section v2-creators-section" id="creators" aria-labelledby="v2-creators-title"><div className="v2-section-heading v2-heading-row"><div><h2 id="v2-creators-title">{t('博客主页，')}<span>{t('由你来定义。')}</span></h2><p>{t('个人介绍、经历、技能与作品。')}</p></div><Link className="v2-text-link" href="/blogs">{t('发现更多主页')}<Icon name="arrow"/></Link></div><div className="v2-creators">{spaces.slice(0,6).map((space:any)=>{const p=localizeProfile(space.profile,locale);return <Link className="v2-creator" href={'/blog/'+encodeURIComponent(space.handle)} key={space.handle}><FeedAvatar name={p.name} avatarId={p.avatarId}/><div><h3>{p.name}</h3><span>@{space.handle}</span><p>{p.intro}</p></div><Icon name="arrow"/></Link>})}</div></section>
  <section className="v2-section v2-tools-section" aria-labelledby="v2-tools-title"><div className="v2-section-heading"><h2 id="v2-tools-title">{t('从这里，继续探索。')}</h2><p>{t('分享发现与创作心得，和同样热爱创造的人交流。')}</p></div><div className="v2-tools"><Link href="/community"><Icon name="comment"/><h3>{t('社区')}</h3><p>{t('发现资源，交流想法，收藏值得留下的内容。')}</p><span>{t('去社区看看')}<Icon name="arrow"/></span></Link><Link href="/docs"><Icon name="file"/><h3>{t('文档')}</h3><p>{t('使用指南、教程与开发手记。')}</p><span>{t('开始阅读')}<Icon name="arrow"/></span></Link><Link href="/skills"><Icon name="layers"/><h3>Skill</h3><p>{t('让 AI 工具协助整理与投稿。')}</p><span>{t('探索 Skill')}<Icon name="arrow"/></span></Link></div></section>
  <section className="v2-section v2-invitation" aria-labelledby="v2-invitation-title"><h2 id="v2-invitation-title">{t('下一份值得被看见的，')}<span>{t('是你的创造。')}</span></h2><div><Link className="v2-primary" href="/workspace/blog">{t('创建我的主页')}<Icon name="arrow"/></Link><Link className="v2-text-link" href={download.href}>{download.platform?t('{0} 下载',[download.name]):t('下载桌面端')}<Icon name="download"/></Link></div></section>
 </div>;
}
