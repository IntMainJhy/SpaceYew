import Link from 'next/link';
import {serverI18n} from '@/lib/server-i18n';
import {publicSpace,publicSpaces} from '@/lib/spaces.mjs';
import {currentUser,localRequest} from '@/lib/auth.mjs';
import {publicPosts} from '@/lib/community.mjs';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {FeedAvatar} from './FeedAvatar';
import {CommunityFeaturePreview} from './ProductFeaturePreviews';
import {ProductHomeMotion} from './ProductHomeMotion';
import {BlogTheme} from './BlogTheme';
import {SkillInstall} from './SkillInstall';
import {getConfig} from '@/lib/db.mjs';
import {homeDownload} from '@/lib/home-download.mjs';

function ShowcaseGrid({spaces,locale,t,heading='h3'}:{spaces:any[];locale:string;t:(text:string)=>string;heading?:'h2'|'h3'}){
  const Heading=heading;
  return spaces.length?<div className="platform-showcase-grid">{spaces.map(space=>{
    const profile=localizeProfile(space.profile,locale);
    return <Link className="platform-showcase" key={space.handle} href={'/blog/'+space.handle} aria-label={profile.name+' · '+t('查看个人主页')}>
      {space.coverId&&<img className="platform-showcase-cover" src={'/media/'+space.coverId} alt="" width={480} height={300} loading="lazy"/>}
      <div className="platform-showcase-info">
        <div className="platform-showcase-person"><FeedAvatar name={profile.name} avatarId={profile.avatarId}/><div><Heading>{profile.name}</Heading><small>@{space.handle}</small></div></div>
        {profile.intro&&<p>{profile.intro}</p>}
        <span className="platform-showcase-action">{t('查看个人主页')}</span>
      </div>
    </Link>;
  })}</div>:<p className="space-muted platform-empty">{t('暂时没有公开主页。')}</p>;
}
export async function ShowcaseDirectory({req}:{req:Request}){
  const {t,locale}=await serverI18n(),spaces=publicSpaces(req);
  return <div className="platform-page"><header className="platform-heading"><h1>{t('个人主页')}</h1></header><ShowcaseGrid spaces={spaces} locale={locale} t={t} heading="h2"/></div>;
}
export async function PlatformHome({req}:{req:Request}){
  const {t,locale}=await serverI18n(),spaces=publicSpaces(req),user=currentUser(req);
  const first=spaces[0],studioHref=user?'/workspace/blog':'/login?next=%2Fworkspace%2Fblog';
  const download=homeDownload(req.headers,getConfig('site').desktopDownloads);
  // Keep community gates and discovery opt-in; never use the visitor's private workspace as a demo.
  const posts=localRequest(req)?publicPosts().items.slice(0,2):[];
  const previewPosts=posts.map((post:any)=>Object.fromEntries(['id','title','summary','coverId','coverAlt','authorName','authorAvatarId'].map(key=>[key,post[key]])));
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
          <h2 id="showcase-introduction-title">{t('个人主页，')}<span>{t('由你来定义。')}</span></h2>
          <p>{t('把个人介绍、经历、技能和作品，整理成一份有质感的个人主页。')}</p>
          <Link className="space-link" href={studioHref}>{t('创建我的主页')}</Link>
        </div>
        <div className="home-personal-preview">{first?<BlogTheme preview data={publicSpace(req,first.handle)}/>:<div className="space-empty"><h3>{t('完整介绍你自己')}</h3><p>{t('个人介绍、经历、技能与作品。')}</p></div>}</div>
      </section>

      <section className="product-feature" id="resume-introduction" aria-labelledby="resume-introduction-title">
        <div className="product-story-copy">
          <h2 id="resume-introduction-title">{t('自己制作，')}<span>{t('我们来托管。')}</span></h2>
          <p>{t('上传 HTML 或 ZIP 静态网站，保留你的设计与交互，用一个地址分享。')}</p>
          <Link className="space-link" href={studioHref}>{t('上传我的网站')}</Link>
        </div>
        <div className="homepage-hosting-preview" aria-label={t('静态网站托管')}><span>index.html</span><pre>{'<main>\n  <h1>Hello, world.</h1>\n  <p>This is my space.</p>\n</main>'}</pre><div><span>CSS · JavaScript · Images</span><strong>SpaceYew ↗</strong></div></div>
      </section>
    </div>

    <section className="home-learning" aria-labelledby="home-learning-title"><div className="learning-section-heading"><h2 id="home-learning-title">{t('从这里，继续探索。')}</h2><Link className="space-link" href="/resources">{t('浏览其他资源')}</Link></div><div className="home-learning-links"><Link href="/docs"><h3>{t('文档')}</h3><p>{t('使用指南、教程与开发手记。')}</p><span>{t('开始阅读')} →</span></Link><Link href="/skills"><h3>Skill</h3><p>{t('让 AI 工具协助整理与投稿。')}</p><span>{t('探索 Skill')} →</span></Link></div></section>

    <section className="platform-showcases" aria-labelledby="public-showcases-heading"><div className="product-section-heading"><div><h2 id="public-showcases-heading">{t('每个人，都是一份独特的故事。')}</h2></div><Link className="space-link" href="/blogs">{t('发现更多主页')}</Link></div><ShowcaseGrid spaces={spaces} locale={locale} t={t}/></section>

    <section className="product-invitation" aria-labelledby="product-invitation-title"><h2 id="product-invitation-title">{t('下一份值得被看见的，')}<span>{t('是你的创造。')}</span></h2><div className="space-actions"><Link className="space-btn primary" href={studioHref}>{t('创建我的主页')}</Link><Link className="space-link" href="/community">{t('先逛逛社区')}</Link></div></section>
  </ProductHomeMotion>;
}
