import Link from 'next/link';
import {notFound} from 'next/navigation';
import {publicContent} from '@/lib/db.mjs';
import {localizeContent} from '@/lib/content-locales.mjs';
import {guides} from '@/lib/learning.mjs';
import {serverI18n} from '@/lib/server-i18n';
import {ConnectDocs} from './SpaceConnect';
import {SkillInstall} from './SkillInstall';
import {Icon} from './Icons';

export async function DocsPage({path}:{path:string[]}){
 const {t,locale}=await serverI18n(),slug=path[1]||'';
 const guide=guides.find(item=>item.slug===slug);
 if(path.length>2||slug&&!guide&&slug!=='connect')notFound();
 const articles=publicContent('articles').map((item:any)=>localizeContent(item,locale));
 return <div className="learning-layout">
  <aside className="learning-sidebar"><nav aria-label={t('文档导航')}>
   <Link href="/docs" aria-current={!slug?'page':undefined}>{t('文档总览')}</Link>
   {guides.map(item=><Link key={item.slug} href={'/docs/'+item.slug} aria-current={slug===item.slug?'page':undefined}>{t(item.title)}</Link>)}
   <Link href="/docs/connect" aria-current={slug==='connect'?'page':undefined}>Connect API &amp; MCP</Link>
  </nav><div className="learning-related"><Link href="/skills">{t('探索 Skill')}<Icon name="link"/></Link><Link href="/resources">{t('浏览其他资源')}<Icon name="link"/></Link></div></aside>
  <div className="learning-main">
   {!slug?<><header className="learning-heading"><h1>{t('文档')}</h1><p>{t('从第一步到进阶使用，把方法写清楚。')}</p></header>
    <section aria-labelledby="guides-heading"><h2 id="guides-heading">{t('使用指南')}</h2><div className="learning-index">{guides.map(item=><Link key={item.slug} href={'/docs/'+item.slug}><div><h3>{t(item.title)}</h3><p>{t(item.summary)}</p></div><span aria-hidden="true">↗</span></Link>)}</div></section>
    <section className="learning-section" aria-labelledby="tutorials-heading"><div className="learning-section-heading"><h2 id="tutorials-heading">{t('教程与开发手记')}</h2><Link className="space-link" href="/articles">{t('查看全部文章')}</Link></div>
     {articles.length?<div className="learning-index">{articles.slice(0,6).map((item:any)=><Link key={item.id} href={'/articles/'+encodeURIComponent(item.slug)}><div><h3>{item.title}</h3>{item.summary&&<p>{item.summary}</p>}</div><span aria-hidden="true">↗</span></Link>)}</div>:<p className="learning-muted">{t('教程正在整理中，可以先从使用指南开始。')}</p>}
    </section><section className="learning-callout"><h2>{t('让工具接入你的工作流')}</h2><p>{t('了解 API、工具授权与本地 MCP 桥接。')}</p><Link className="space-link" href="/docs/connect">{t('阅读接入文档')}<Icon name="link"/></Link></section></>
    :slug==='connect'?<><Link className="learning-back" href="/docs">← {t('文档总览')}</Link><ConnectDocs/></>
    :guide&&<article className="learning-article"><Link className="learning-back" href="/docs">← {t('文档总览')}</Link><header className="learning-heading"><h1>{t(guide.title)}</h1><p>{t(guide.summary)}</p></header>
     {guide.sections.map(section=><section key={section.title}><h2>{t(section.title)}</h2><p>{t(section.text)}</p>{section.href&&<Link className="space-link" href={section.href}>{t(section.action)}<Icon name="link"/></Link>}</section>)}
     <nav className="learning-next" aria-label={t('继续阅读')}><Link href="/docs">{t('返回文档总览')}</Link><Link href="/skills">{t('探索 Skill')} →</Link></nav>
    </article>}
  </div>
 </div>;
}

export async function SkillsPage({baseUrl}:{baseUrl:string}){
 const {t}=await serverI18n();
 return <div className="skills-page"><header className="learning-heading"><h1>Skill</h1><p>{t('把重复的整理，交给熟悉你工作流的工具。')}</p></header>
  <article className="skill-feature"><div className="skill-feature-copy"><h2>spaceyew-post</h2><p>{t('让支持 Skill 的 AI 工具，把你的项目、文章和资源整理成 SpaceYew 草稿。')}</p><p className="learning-muted">{t('默认保存草稿；只有明确确认后才提交审核，不会直接公开。')}</p><div className="space-actions"><a className="space-btn primary" href="/skills/spaceyew-post.tar.gz" download>{t('下载 Skill')}</a><Link className="space-link" href="/docs/connect">{t('阅读接入文档')}</Link></div></div>
   <div className="skill-setup"><h3>{t('安装到本地工具')}</h3><SkillInstall baseUrl={baseUrl} animated={false}/><p>{t('安装后，在你的工具私密配置中设置网站地址和独立授权凭据。')}</p><Link className="space-link" href="/workspace/connect">{t('管理工具授权')}</Link></div>
  </article>
  <section className="skill-workflow" aria-labelledby="skill-workflow-heading"><h2 id="skill-workflow-heading">{t('从想法到一份可修改的草稿')}</h2><ol><li><h3>{t('说明要整理什么')}</h3><p>{t('提供自己的项目、文章或资源资料，并选择内容库或社区投稿。')}</p></li><li><h3>{t('保存并检查草稿')}</h3><p>{t('工具使用当前账号的授权保存草稿，你仍可以在工作台中检查和修改。')}</p></li><li><h3>{t('确认后再提交')}</h3><p>{t('需要公开时，明确确认提交审核。审核流程与手动投稿一致。')}</p></li></ol></section>
  <div className="learning-related-links"><Link href="/docs/getting-started">{t('第一次使用？从这里开始')} →</Link><Link href="/resources">{t('浏览其他资源')} →</Link></div>
 </div>;
}
