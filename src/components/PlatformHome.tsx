import Link from 'next/link';
import {serverI18n} from '@/lib/server-i18n';
import {publicSpace,publicSpaces} from '@/lib/spaces.mjs';
import {currentUser,localRequest} from '@/lib/auth.mjs';
import {publicPosts} from '@/lib/community.mjs';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {FeedAvatar} from './FeedAvatar';
import {CommunityFeaturePreview,ShowcaseFeaturePreview,ResumeFeaturePreview,type PreviewSpace} from './ProductFeaturePreviews';
import {ProductHomeMotion} from './ProductHomeMotion';
import {SkillInstall} from './SkillInstall';
import {getConfig} from '@/lib/db.mjs';
import {homeDownload} from '@/lib/home-download.mjs';

function ShowcaseGrid({spaces,locale,t,heading='h3'}:{spaces:any[];locale:string;t:(text:string)=>string;heading?:'h2'|'h3'}){
  const Heading=heading;
  return spaces.length?<div className="platform-showcase-grid">{spaces.map(space=>{
    const profile=localizeProfile(space.profile,locale);
    return <Link className="platform-showcase" key={space.handle} href={space.url} aria-label={profile.name+' · '+t('查看个人展板')}>
      {space.coverId&&<img className="platform-showcase-cover" src={'/media/'+space.coverId} alt="" width={480} height={300} loading="lazy"/>}
      <div className="platform-showcase-info">
        <div className="platform-showcase-person"><FeedAvatar name={profile.name} avatarId={profile.avatarId}/><div><Heading>{profile.name}</Heading><small>@{space.handle}</small></div></div>
        {profile.intro&&<p>{profile.intro}</p>}
        <span className="platform-showcase-action">{t('查看个人展板')}</span>
      </div>
    </Link>;
  })}</div>:<p className="space-muted platform-empty">{t('暂时没有公开展板。')}</p>;
}
export async function ShowcaseDirectory({req}:{req:Request}){
  const {t,locale}=await serverI18n(),spaces=publicSpaces(req);
  return <div className="platform-page"><header className="platform-heading"><h1>{t('个人展板')}</h1></header><ShowcaseGrid spaces={spaces} locale={locale} t={t} heading="h2"/></div>;
}
export async function PlatformHome({req}:{req:Request}){
  const {t,locale}=await serverI18n(),spaces=publicSpaces(req),user=currentUser(req);
  const first=spaces[0],studioHref=user?'/workspace/studio':'/login?next=%2Fworkspace%2Fstudio';
  const download=homeDownload(req.headers,getConfig('site').desktopDownloads);
  // Keep community gates and discovery opt-in; never use the visitor's private workspace as a demo.
  const posts=localRequest(req)?publicPosts().items.slice(0,2):[];
  const previewPosts=posts.map((post:any)=>Object.fromEntries(['id','title','summary','coverId','coverAlt','authorName','authorAvatarId'].map(key=>[key,post[key]])));
  let previewSpace:PreviewSpace|undefined;
  if(first){
    const published=publicSpace(req,first.handle,{resume:true}),profile=localizeProfile(published.profile,locale);
    const publicExperience=profile.experiences.filter((item:any)=>item.visible!==false);
    const experiences=[...new Map([...publicExperience.slice(0,2),...publicExperience.filter((item:any)=>item.career!==false).slice(0,2)].map((item:any)=>[item.id,item])).values()];
    const content=published.content.map((item:any)=>localizeContent(item,locale));
    const items=[...new Map([...content.filter((item:any)=>item.type==='projects').slice(0,2),...content.filter((item:any)=>item.type==='resources').slice(0,2),...content.filter((item:any)=>item.type==='projects'&&item.career).slice(0,2)].map((item:any)=>[item.id,item])).values()];
    previewSpace={url:published.url,handle:published.handle,profile:{name:profile.name,alias:profile.alias,intro:profile.intro,avatarId:profile.avatarId,skills:profile.skills.slice(0,5),experiences:experiences.map((item:any)=>Object.fromEntries(['id','title','start','end','type','description','career','visible'].map(key=>[key,item[key]])))},content:items.map((item:any)=>Object.fromEntries(['id','type','slug','title','summary','coverId','career','role','contribution','outcome'].map(key=>[key,item[key]])))} as PreviewSpace;
  }
  return <ProductHomeMotion>
    <section className="product-hero" aria-labelledby="product-title">
      <div className="product-hero-copy">
        <h1 id="product-title"><span>{t('让你的创造，')}</span><span>{t('有自己的空间。')}</span></h1>
        <p>{t('分享发现，展示作品，记录成长。')}</p>
        <SkillInstall baseUrl={new URL(process.env.PUBLIC_URL||req.url).origin}/>
        <div className="space-actions product-entry-actions"><Link className="space-btn primary" href={download.href} rel="noopener noreferrer" title={download.platform&&!download.available?t('{0} 桌面版即将推出',[download.name]):undefined}>{download.platform?t('{0} 下载',[download.name]):t('下载桌面端')}</Link><Link className="space-link" href="/login?next=%2Fcommunity">{t('进入网站')}</Link></div>
      </div>
    </section>

    <div id="possibilities" className="product-features">
      <section className="product-feature" id="community-introduction" aria-labelledby="community-introduction-title">
        <div className="product-story-copy">
          <h2 id="community-introduction-title">{t('在社区，')}<span>{t('遇见新的灵感。')}</span></h2>
          <p>{t('分享发现与创作心得，和同样热爱创造的人交流。')}</p>
          <Link className="space-link" href="/community">{t('去社区看看')}</Link>
        </div>
        <CommunityFeaturePreview posts={previewPosts as any}/>
      </section>

      <section className="product-feature product-feature-reverse" id="showcase-introduction" aria-labelledby="showcase-introduction-title">
        <div className="product-story-copy">
          <h2 id="showcase-introduction-title">{t('个人展板，')}<span>{t('由你来定义。')}</span></h2>
          <p>{t('用模块或自由画布，展示你的作品、经历与资源。')}</p>
          <Link className="space-link" href={studioHref}>{t('创建我的展板')}</Link>
        </div>
        <ShowcaseFeaturePreview space={previewSpace}/>
      </section>

      <section className="product-feature" id="resume-introduction" aria-labelledby="resume-introduction-title">
        <div className="product-story-copy">
          <h2 id="resume-introduction-title">{t('一份简历，')}<span>{t('串起你的成长。')}</span></h2>
          <p>{t('汇集技能、经历与作品，生成可分享、可打印的简历。')}</p>
          <Link className="space-link" href={first?first.url+'/resume':studioHref}>{t(first?'查看完整简历':'创建我的展板')}</Link>
        </div>
        <ResumeFeaturePreview space={previewSpace}/>
      </section>
    </div>

    <section className="platform-showcases" aria-labelledby="public-showcases-heading"><div className="product-section-heading"><div><h2 id="public-showcases-heading">{t('每个展板，都是一种表达。')}</h2></div><Link className="space-link" href="/showcases">{t('发现更多展板')}</Link></div><ShowcaseGrid spaces={spaces} locale={locale} t={t}/></section>

    <section className="product-invitation" aria-labelledby="product-invitation-title"><h2 id="product-invitation-title">{t('下一份值得被看见的，')}<span>{t('是你的创造。')}</span></h2><div className="space-actions"><Link className="space-btn primary" href={studioHref}>{t('开始我的展板')}</Link><Link className="space-link" href="/community">{t('先逛逛社区')}</Link></div></section>
  </ProductHomeMotion>;
}
