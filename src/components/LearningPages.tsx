import Link from 'next/link';
import {headers} from 'next/headers';
import {publicCatalog} from '@/lib/catalog.mjs';
import {CatalogCards,CatalogFilter,MemberCatalog,defaultCover} from './SharedCatalog';
import {notFound} from 'next/navigation';
import {publicContent} from '@/lib/db.mjs';
import {localizeContent} from '@/lib/content-locales.mjs';
import {guides} from '@/lib/learning.mjs';
import {serverI18n} from '@/lib/server-i18n';
import {ConnectDocs} from './SpaceConnect';
import {SkillInstall} from './SkillInstall';
import {Icon} from './Icons';
import {SkillCatalog} from './SkillCatalog';

export async function DocsPage({path,query={}}:{path:string[];query?:Record<string,string|string[]|undefined>}){
 const {t,locale}=await serverI18n(),slug=path[1]||'',guide=guides.find(item=>item.slug===slug);
 const articles=publicContent('articles').map((item:any)=>({...localizeContent(item,locale),url:'/docs/articles/'+encodeURIComponent(item.slug),authorName:'SpaceYew',category:item.category||'开发教程'}));
 const article=path[1]==='articles'?articles.find((item:any)=>item.slug===path[2]):null;
 if(path.length>2&&!article||slug&&!guide&&slug!=='connect'&&!article)notFound();
 if(!slug){const members=publicCatalog({kind:'docs'},new Request(process.env.PUBLIC_URL||'http://localhost:3008',{headers:await headers()})).items,category=String(query.category||''),q=String(query.q||'');
 const all=[...guides.map(item=>({...item,id:item.slug,title:t(item.title),summary:t(item.summary),category:item.slug==='desktop'?'客户端指南':'使用指南',url:'/docs/'+item.slug})),{id:'connect',title:'Connect API & MCP',summary:t('让 AI 直接发布文档、Skill 和其他资源。'),category:'AI 工作流',url:'/docs/connect'},...members,...articles];
 const categories=[...new Set(all.map(item=>item.category))];const items=all.filter(item=>(!category||item.category===category)&&(!q||[item.title,item.summary].join(' ').toLowerCase().includes(q.toLowerCase())));
 return <div className="catalog-page"><header className="catalog-page-heading"><div><h1>{t('文档')}</h1><p>{t('把经验写成教程，把方法分享给更多人。')}</p></div><Link className="space-btn primary" href="/docs?compose=1">{t('发布文档')}</Link></header><CatalogFilter kind="docs" q={q} category={category} categories={categories}/>{categories.filter(value=>!category||category===value).map(value=>{const group=items.filter(item=>item.category===value);return group.length?<section className="catalog-board" key={value}><div className="learning-section-heading"><h2>{t(value)}</h2><span>{group.length}</span></div><CatalogCards items={group} kind="docs"/></section>:null})}{!items.length&&<p className="catalog-empty">{t('没有匹配的文档。')}</p>}</div>
 }
 return <div className="learning-layout"><aside className="learning-sidebar"><nav aria-label={t('文档导航')}><Link href="/docs">← {t('文档总览')}</Link><strong>{article?.title||t(guide?.title||'接入文档')}</strong>{guide?.sections.map((section,index)=><a key={section.title} href={'#doc-section-'+index}>{t(section.title)}</a>)}{slug==='connect'&&<><a href="#connect-publish">{t('用 AI 发布')}</a><a href="#connect-mcp">MCP</a></>}{article&&<a href="#doc-body">{t('详细内容')}</a>}</nav></aside><div className="learning-main">{slug==='connect'?<ConnectDocs/>:article?<article className="learning-article"><header className="learning-heading"><h1>{article.title}</h1><p>{article.summary}</p></header><img className="shared-detail-cover" src={article.coverId?'/media/'+article.coverId:defaultCover('docs',article.title,t(article.category))} alt=""/><div className="prose" id="doc-body" dangerouslySetInnerHTML={{__html:article.bodyHtml}}/></article>:guide&&<article className="learning-article"><header className="learning-heading"><h1>{t(guide.title)}</h1><p>{t(guide.summary)}</p></header><img className="shared-detail-cover" src={defaultCover('docs',t(guide.title),t('使用指南'))} alt=""/>{guide.sections.map((section,index)=><section id={'doc-section-'+index} key={section.title}><h2>{t(section.title)}</h2><p>{t(section.text)}</p>{section.href&&<Link className="space-link" href={section.href}>{t(section.action)}<Icon name="link"/></Link>}</section>)}<nav className="learning-next" aria-label={t('继续阅读')}><Link href="/docs">{t('返回文档总览')}</Link><Link href="/skills">{t('探索 Skill')} →</Link></nav></article>}</div></div>;
}

export async function SkillsPage({baseUrl,query={}}:{baseUrl:string,query?:Record<string,string|string[]|undefined>}){
 const {t}=await serverI18n();
 return <div className="skills-page"><header className="catalog-page-heading"><div><h1>{t('第三方 Skill 精选')}</h1><p>{t('精选独立维护的 Skill，不重复列出 AI 工具自带的功能。')}</p></div><Link className="space-btn primary" href="/skills?compose=1">{t('分享 Skill')}</Link></header>
  <SkillCatalog query={query}><MemberCatalog kind="skills" query={query}/></SkillCatalog>
  <div className="skill-platform-heading"><h2>{t('连接 SpaceYew')}</h2><p>{t('把重复的整理，交给熟悉你工作流的工具。')}</p></div>
  <article className="skill-feature"><div className="skill-feature-copy"><h2>spaceyew-post</h2><p>{t('让 AI 直接发布文档、Skill 和其他资源。')}</p><p className="learning-muted">{t('可保存草稿，或在你的明确授权下提交发布。审核通过后自动分享到社区。')}</p><div className="space-actions"><a className="space-btn primary" href="/skills/spaceyew-post.tar.gz" download>{t('下载 Skill')}</a><Link className="space-link" href="/docs/connect">{t('阅读接入文档')}</Link></div></div>
   <div className="skill-setup"><h3>{t('安装到本地工具')}</h3><SkillInstall baseUrl={baseUrl} animated={false}/><p>{t('安装后，在你的工具私密配置中设置网站地址和独立授权凭据。')}</p><Link className="space-link" href="/workspace/connect">{t('管理工具授权')}</Link></div>
  </article>
  <section className="skill-workflow" aria-labelledby="skill-workflow-heading"><h2 id="skill-workflow-heading">{t('从想法到一份可修改的草稿')}</h2><ol><li><h3>{t('说明要整理什么')}</h3><p>{t('提供文档、Skill 或资源资料，选择对应栏目。')}</p></li><li><h3>{t('保存并检查草稿')}</h3><p>{t('工具使用你的独立凭据保存草稿，可在对应栏目的发布页面继续检查和修改。')}</p></li><li><h3>{t('确认后再提交')}</h3><p>{t('需要公开时，明确确认提交审核。审核流程与手动投稿一致。')}</p></li></ol></section>
  <div className="learning-related-links"><Link href="/docs/getting-started">{t('第一次使用？从这里开始')} →</Link><Link href="/resources">{t('浏览其他资源')} →</Link></div>
 </div>;
}
