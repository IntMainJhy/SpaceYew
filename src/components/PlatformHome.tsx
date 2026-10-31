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
import {HomeMotion} from './HomeMotion';
import {HomeWindGallery,type HomeWindItem} from './HomeWindGallery';
import {HomeDiscovery} from './HomeDiscovery';
import '@/app/home-showcase.css';
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
 const projects=creator?.projects.slice(0,3)||[];
 const windCopy=locale==='zh'?{heading:'让发现，随风而来。',hint:'轻触或悬停布片，遇见下一份灵感。'}:locale==='ja'?{heading:'風に乗って、新しい発見を。',hint:'布に触れるか、カーソルを重ねて次のひらめきへ。'}:{heading:'A little wind. A new discovery.',hint:'Hover or touch a fabric to find your next inspiration.'};
 const discovery=locale==='zh'?{heading:'灵感，在这里交汇。',hint:'移动鼠标或拖动玻璃，让想法有新的连接。',pause:'暂停动效',play:'播放动效',action:'继续探索',descriptions:['从一件真实的作品，了解创作背后的过程。','走进个人空间，发现各自的经历与故事。','找到下一次创作中，用得上的 Skill 与资源。']}:locale==='ja'?{heading:'ひらめきが、ここでつながる。',hint:'マウスを動かすかガラスをドラッグして、新しいつながりを。',pause:'アニメーションを停止',play:'アニメーションを再生',action:'もっと見る',descriptions:['作品を通して、その制作過程に出会う。','個人の空間で、それぞれの経験や物語を知る。','次の制作に役立つ Skill やリソースを探す。']}:{heading:'Where ideas find each other.',hint:'Move your pointer or drag the glass to discover a new connection.',pause:'Pause animation',play:'Play animation',action:'Explore further',descriptions:['Meet the process behind a real piece of work.','Discover the experiences and stories inside personal spaces.','Find a Skill or resource for your next creation.']};
 const windItems:HomeWindItem[]=[
  {title:creator?.name||t('博客空间'),category:t('博客空间'),description:creator?'@'+creator.handle:t('个人介绍、经历、技能与作品。'),href:creator?.url||'/blogs'},
  {title:'GSAP',category:'Skill',description:t('探索 Skill'),href:'/skills/gsap'},
  {title:t('文档'),category:t('资源'),description:t('使用指南、教程与开发手记。'),href:'/resources?type=docs'},
  {title:t('其他资源'),category:t('探索网站'),description:t('发现资源，交流想法，收藏值得留下的内容。'),href:'/resources?type=resources'}
 ];
 return <div className="v2-home">
  <HomeMotion/>
  <div className="v2-home-atmosphere" aria-hidden="true"><V2Atmosphere/></div>
  <section className="v2-hero-scene" aria-labelledby="product-title"><div className="v2-hero-intro"><div className="v2-hero-copy"><h1 id="product-title"><span>{t('让你的创造，')}</span><span>{t('有自己的空间。')}</span></h1><p>{t('分享发现，展示作品，记录成长。')}</p><div className="v2-hero-actions"><Link className="v2-primary" href="#creators">{t('发现博客空间')}<Icon name="arrow"/></Link><Link className="v2-hero-secondary" href="/workspace/blog">{t('创建我的空间')}<Icon name="plus"/></Link></div></div></div>
   <div className="v2-hero-showcase" data-glass-reveal="stage">{creator?<CreatorStage creator={creator}/>:<div className="v2-hero-empty"><h2>{t('完整介绍你自己')}</h2><p>{t('个人介绍、经历、技能与作品。')}</p><Link href="/workspace/blog">{t('创建我的空间')}<Icon name="arrow"/></Link></div>}</div>
  </section>
  <section className="v2-section v2-work-section" data-home-scene="works" aria-labelledby="v2-work-title">
   <div className="v2-section-heading v2-editorial-heading"><h2 id="v2-work-title">{t('每个人，都是一份独特的故事。')}</h2><p>{t('把个人介绍、经历、技能和作品，整理成一份有质感的博客主页。')}</p></div>
   <div className="v2-work-collection">{projects.map((project,index)=><Link className={'v2-work '+(index===0?'v2-work-feature':'v2-work-secondary')} href={project.href} key={project.title+'-'+index}>
    <div className="v2-work-art">{project.imageId?<img src={'/media/'+project.imageId} alt="" width={1000} height={680} loading="lazy"/>:<div className={'v2-work-type v2-work-type-'+index} aria-hidden="true"><span>{project.title}</span><Icon name={index===1?'layers':'grid'}/></div>}</div>
    <div className="v2-work-copy"><h3>{project.title}</h3>{project.description&&<p>{project.description}</p>}<span className="v2-work-action">{t('作品')}<Icon name="arrow"/></span></div>
   </Link>)}</div>
   {!projects.length&&<div className="v2-simple-empty"><p>{t('暂时没有公开主页。')}</p><Link href="/blogs">{t('发现博客空间')}<Icon name="arrow"/></Link></div>}
  </section>
  <HomeDiscovery heading={discovery.heading} hint={discovery.hint} pauseLabel={discovery.pause} playLabel={discovery.play} items={[{label:t('作品'),description:discovery.descriptions[0],href:creator?.url||'/blogs',action:discovery.action},{label:t('博客空间'),description:discovery.descriptions[1],href:'/blogs',action:discovery.action},{label:t('资源'),description:discovery.descriptions[2],href:'/resources',action:discovery.action}]}/>
  <section className="v2-section v2-creators-section" data-home-scene="creators" id="creators" aria-labelledby="v2-creators-title">
   <div className="v2-section-heading v2-editorial-heading"><h2 id="v2-creators-title">{t('博客空间，')}<span>{t('由你来定义。')}</span></h2><div><p>{t('个人介绍、经历、技能与作品。')}</p><Link className="v2-text-link" href="/blogs">{t('发现更多主页')}<Icon name="arrow"/></Link></div></div>
   <div className="v2-creators">{spaces.slice(0,6).map((space:any)=>{const p=localizeProfile(space.profile,locale);return <Link className="v2-creator" href={'/blog/'+encodeURIComponent(space.handle)} key={space.handle}><FeedAvatar name={p.name} avatarId={p.avatarId}/><div className="v2-creator-identity"><h3>{p.name}</h3><span>@{space.handle}</span></div><p>{p.intro}</p><Icon name="arrow"/></Link>})}</div>
  </section>
  <section className="v2-section v2-tools-section" data-home-scene="explore" aria-labelledby="v2-tools-title">
   <div className="v2-section-heading v2-editorial-heading"><h2 id="v2-tools-title">{t('从这里，继续探索。')}</h2><p>{t('分享发现与创作心得，和同样热爱创造的人交流。')}</p></div>
   <div className="v2-explore-layout"><Link className="v2-explore-feature" href="/community"><h3>{t('社区')}</h3><p>{t('发现资源，交流想法，收藏值得留下的内容。')}</p><span>{t('去社区看看')}<Icon name="arrow"/></span><Icon name="comment"/></Link>
    <div className="v2-explore-directory">{[{href:'/resources?type=docs',icon:'file',title:t('文档'),description:t('使用指南、教程与开发手记。')},{href:'/resources?type=skills',icon:'layers',title:'Skill',description:t('让 AI 工具协助整理与投稿。')},{href:'/resources?type=resources',icon:'grid',title:t('其他资源'),description:t('实用网站、开发资料与个人资源，认真整理，持续更新。')}].map(item=><Link className="v2-explore-link" href={item.href} key={item.href}><Icon name={item.icon}/><div><h3>{item.title}</h3><p>{item.description}</p></div><Icon name="arrow"/></Link>)}</div>
   </div>
  </section>
  <section className="v2-section v2-invitation" data-home-scene="invitation" aria-labelledby="v2-invitation-title"><h2 id="v2-invitation-title">{t('下一份值得被看见的，')}<span>{t('是你的创造。')}</span></h2><div><Link className="v2-primary" href="/workspace/blog">{t('创建我的空间')}<Icon name="arrow"/></Link><Link className="v2-text-link" href={download.href}>{download.platform?t('{0} 下载',[download.name]):t('下载桌面端')}<Icon name="download"/></Link></div></section>
  <HomeWindGallery items={windItems} heading={windCopy.heading} hint={windCopy.hint}/>
 </div>;
}
