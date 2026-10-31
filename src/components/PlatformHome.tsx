import Link from 'next/link';
import {serverI18n} from '@/lib/server-i18n';
import {defaultBlogSpace} from '@/lib/spaces.mjs';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {getConfig} from '@/lib/db.mjs';
import {homeDownload} from '@/lib/home-download.mjs';
import {FeedAvatar} from './FeedAvatar';
import {Icon} from './Icons';
import {V2Atmosphere} from './V2Atmosphere';
import {CreatorStage,type CreatorStageData,type CreatorProject} from './CreatorStage';
import {HomeMotion} from './HomeMotion';
import {HomeBlogCanvasDemo,type HomeBlogDemoExample} from './HomeBlogCanvasDemo';
import {HomeResourceSculpture} from './HomeResourceSculpture';
import {HomeStoryVideo} from './HomeStoryVideo';
import '@/app/home-showcase.css';
export async function PlatformHome({req}:{req:Request}){
 const {t,locale}=await serverI18n();
 let featured:any=null;try{featured=defaultBlogSpace(req)}catch{}
 const download=homeDownload(req.headers,getConfig('site').desktopDownloads);
 let creator:CreatorStageData|null=null;
 let demoCreator:HomeBlogDemoExample|null=null;
 if(featured){
  const profile=localizeProfile(featured.profile,locale),url='/blog/'+encodeURIComponent(featured.handle),design=featured.layout.blog?.design;
  const visibleParts=new Set((design?.nodes||[]).filter((node:any)=>!node.hidden).map((node:any)=>node.part));
  const section=profile.resume?.sections?.find((section:any)=>/project|作品|项目/i.test(section.id+' '+section.title)&&(!design||visibleParts.has('section:'+section.id)));
  const localized=(item:any,field:string)=>item.translations?.[locale]?.[field]?.trim()||item[field]||'';
  const resumeProjects:CreatorProject[]=(section?.items||[]).filter((item:any)=>item.title).map((item:any)=>({title:localized(item,'title'),description:localized(item,'description'),imageId:item.coverId||'',href:url+'#anx-'+section.id}));
  const documents=featured.content.filter((item:any)=>item.type==='projects').map((raw:any)=>{const item=localizeContent(raw,locale);return{title:item.title,description:item.summary,imageId:item.coverId||'',href:'/u/'+encodeURIComponent(featured.handle)+'/projects/'+encodeURIComponent(item.slug)}});
  creator={name:profile.name,handle:featured.handle,intro:profile.intro||'',avatarId:profile.avatarId||'',skills:profile.skills||[],url,projects:resumeProjects.length?resumeProjects:documents};
  demoCreator={...creator,name:featured.layout.blog?.title||creator.name,description:featured.layout.blog?.description||profile.alias||'@'+featured.handle,skills:creator.skills.slice(0,6),projects:creator.projects.slice(0,2)};
 }
 const copy=locale==='zh'?{blogTitle:'你的故事，一个主页。',blogText:'介绍自己，也让作品与经历被看见。',skillTitle:'下一次创作，从这里开始。',skillText:'找到合适的 Skill，让想法更快落地。',resourceTitle:'好工具，随手找。',resourceText:'文档、网站与工具，随手探索。',editorTitle:'你的页面，随你编排。',editorText:'拖动、改字，马上看到新的样子。',editorAction:'创建我的空间',pause:'暂停演示',play:'继续演示',blogAlt:'SpaceYew 真实博客主页',skillAlt:'SpaceYew Skill 目录的实际操作演示',resourceAlt:'可拖动旋转的玻璃资源卡片',community:'去社区分享'}:locale==='ja'?{blogTitle:'あなたの物語を、ひとつのページに。',blogText:'自己紹介も、作品も、これまでの経験も。',skillTitle:'次の制作は、ここから。',skillText:'アイデアを形にする Skill を見つける。',resourceTitle:'見つけたものを、手元に。',resourceText:'ドキュメント、サイト、ツールを探索。',editorTitle:'あなたのページを、思いのままに。',editorText:'ドラッグして、言葉を変えて。その場で確かめる。',editorAction:'自分のスペースを作る',pause:'デモを停止',play:'デモを再生',blogAlt:'SpaceYew の実際のブログページ',skillAlt:'SpaceYew Skill ディレクトリの操作デモ',resourceAlt:'ドラッグして回転できるガラスのリソースカード',community:'コミュニティで共有'}:{blogTitle:'Your story. Your own page.',blogText:'Bring your work and experience into view.',skillTitle:'Start your next creation here.',skillText:'Find the right Skill to take an idea further.',resourceTitle:'Keep a good discovery close.',resourceText:'Explore documents, websites, and useful tools.',editorTitle:'Your page. Arranged your way.',editorText:'Drag, rewrite, and see your changes take shape.',editorAction:'Create my space',pause:'Pause demo',play:'Resume demo',blogAlt:'An actual SpaceYew blog page',skillAlt:'A recording of the actual SpaceYew Skill directory',resourceAlt:'Draggable glass resource cards',community:'Share with the community'};
 return <div className="v2-home">
  <HomeMotion/>
  <div className="v2-home-atmosphere" aria-hidden="true"><V2Atmosphere/></div>
  <section className="v2-hero-scene" aria-labelledby="product-title"><div className="v2-hero-intro"><div className="v2-hero-copy"><h1 id="product-title"><span>{t('让你的创造，')}</span><span>{t('有自己的空间。')}</span></h1><p>{t('分享发现，展示作品，记录成长。')}</p><div className="v2-hero-actions"><Link className="v2-primary" href="#creators">{t('发现博客空间')}<Icon name="arrow"/></Link><Link className="v2-hero-secondary" href="/workspace/blog">{t('创建我的空间')}<Icon name="plus"/></Link></div></div></div>
   <div className="v2-hero-showcase" data-glass-reveal="stage">{creator?<CreatorStage creator={creator}/>:<div className="v2-hero-empty"><h2>{t('完整介绍你自己')}</h2><p>{t('个人介绍、经历、技能与作品。')}</p><Link href="/workspace/blog">{t('创建我的空间')}<Icon name="arrow"/></Link></div>}</div>
  </section>
  <div className="home-stories">
   <section className="home-story" data-home-story="blog" data-home-side="left" id="creators" aria-labelledby="v2-creators-title">
    <Link className="home-story-visual home-story-screenshot" href={creator?.url||'/blogs'} aria-label={t('查看博客空间')}><img src="/media/home/blog-space.webp" alt={copy.blogAlt} width={1200} height={900} loading="lazy"/></Link>
    <div className="home-story-copy"><h2 id="v2-creators-title">{copy.blogTitle}</h2><p>{copy.blogText}</p>{creator&&<div className="home-story-person"><FeedAvatar name={creator.name} avatarId={creator.avatarId}/><span>{creator.name}<small>@{creator.handle}</small></span></div>}<Link className="home-story-link" href="/blogs">{t('发现更多主页')}<Icon name="arrow"/></Link></div>
   </section>
   <section className="home-story is-reverse" data-home-story="editor" data-home-side="right" aria-labelledby="v2-editor-title">
    <div className="home-story-visual home-story-editor"><HomeBlogCanvasDemo locale={locale} creator={demoCreator}/></div>
    <div className="home-story-copy"><h2 id="v2-editor-title">{copy.editorTitle}</h2><p>{copy.editorText}</p><Link className="home-story-link" href="/workspace/blog">{copy.editorAction}<Icon name="arrow"/></Link></div>
   </section>
   <section className="home-story" data-home-story="skills" data-home-side="left" aria-labelledby="v2-skills-title">
    <div className="home-story-visual"><HomeStoryVideo src="/media/home/skills-loop.mp4" poster="/media/home/skills-poster.webp" label={copy.skillAlt} pauseLabel={copy.pause} playLabel={copy.play}/></div>
    <div className="home-story-copy"><h2 id="v2-skills-title">{copy.skillTitle}</h2><p>{copy.skillText}</p><Link className="home-story-link" href="/resources?type=skills">{t('探索 Skill')}<Icon name="arrow"/></Link><Link className="home-story-secondary" href="/skills/gsap">GSAP Skills<Icon name="arrow"/></Link></div>
   </section>
   <section className="home-story is-reverse" data-home-story="resources" data-home-side="right" aria-labelledby="v2-tools-title">
    <div className="home-story-visual"><HomeResourceSculpture posterSrc="/media/home/resources.webp" label={copy.resourceAlt} pauseLabel={copy.pause} playLabel={copy.play}/></div>
    <div className="home-story-copy"><h2 id="v2-tools-title">{copy.resourceTitle}</h2><p>{copy.resourceText}</p><Link className="home-story-link" href="/resources">{t('资源')}<Icon name="arrow"/></Link><Link className="home-story-secondary" href="/community">{copy.community}<Icon name="arrow"/></Link></div>
   </section>
  </div>
  <section className="v2-section v2-invitation" data-home-scene="invitation" aria-labelledby="v2-invitation-title"><h2 id="v2-invitation-title">{t('下一份值得被看见的，')}<span>{t('是你的创造。')}</span></h2><div><Link className="v2-primary" href="/workspace/blog">{t('创建我的空间')}<Icon name="arrow"/></Link><Link className="v2-text-link" href={download.href}>{download.platform?t('{0} 下载',[download.name]):t('下载桌面端')}<Icon name="download"/></Link></div></section>
 </div>;
}
