import {appSurface} from '@/lib/app-access.mjs';
import {localeDate} from '@/lib/i18n.mjs';
import {serverI18n} from '@/lib/server-i18n';
/* Natural Organic — user-pinned public redesign, seed c1ce478a, code-led.
   Serif personal introduction and natural still life; content indexes below.
   Keep real content, publication, file access, analytics and admin behavior.
   FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
*/
import Link from 'next/link';
import Form from 'next/form';
import {PageMotion} from './PageMotion';
import {HomeFlowBackground} from './HomeFlowBackground';
import {notFound} from 'next/navigation';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {getConfig, publicContent, publicBySlug, fileInfo} from '@/lib/db.mjs';
import {Icon} from './Icons';
import {Tracker, TrackedLink} from './Tracker';
import {AuthNav} from './AuthNav';
import {SiteTools} from './SiteTools';
import {ResumePrint} from './ResumePrint';

type Doc = Record<string, any>;
type Query = Record<string, string | string[] | undefined>;
export const size = (n: number) => n >= 1e9 ? (n / 1e9).toFixed(1) + ' GB' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n >= 1000 ? (n / 1000).toFixed(1) + ' KB' : n + ' B';
const date = (s:string,locale='en')=>s?localeDate(s,locale,true):'';
const kind = (s: string) => ({file: '站内文件', website: '外部网站', external: '外部资源'}[s] || '资源');
const hrefFor = (type: string, slug: string) => '/' + type + '/' + encodeURIComponent(slug);
const button = 'organic-button px-6 py-3 rounded-full font-medium transition-colors duration-300';
const card = 'organic-card bg-[#faf6f1] rounded-[2rem] border border-stone-200';
const input = 'organic-input px-5 py-3 bg-white border border-stone-200 rounded-full text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all duration-300';

async function Tags({tags = [],literal=false}: {tags?: string[],literal?:boolean}) {const {t:tr,locale}=await serverI18n();
  if (!tags.length) return null;
  return <ul className="organic-tags" aria-label={tr("标签")}>{tags.map(t => <li key={t}>{literal?t:tr(t)}</li>)}</ul>;
}
async function TextLink({href, children, className = ''}: {href: string, children: React.ReactNode, className?: string}) {const {t:tr,locale}=await serverI18n();
  return <Link className={'organic-text-link ' + className} href={href}>{children}</Link>;
}
async function SectionTitle({title, description, href, action}: {title: string, description?: string, href?: string, action?: string}) {const {t:tr,locale}=await serverI18n();
  return <div className="organic-section-heading"><div><h2>{tr(title)}</h2>{description && <p>{tr(description)}</p>}</div>{href && <TextLink href={href}>{action || tr("继续看看")}</TextLink>}</div>;
}
async function ProjectCard({item, index = 0, collection=false}: {item: Doc, index?: number, collection?:boolean}) {const {t:tr,locale}=await serverI18n();const Title=collection?'h2':'h3';
  return <article className={card + ' organic-project-piece tone-' + index % 3}>
    <Link className="organic-project-link" href={hrefFor('projects', item.slug)}>
      <div className={'organic-project-cover ' + (!item.coverId ? 'organic-type-cover' : '')}>
        {item.coverId ? <img src={'/media/' + item.coverId} alt={item.title} loading="lazy"/> :
          <><span>{tr(item.category||"项目与实践")}</span><strong>{item.title}</strong><span>{item.tags.slice(0, 3).map((tag:string)=>tr(tag)).join(' · ') || tr("从想法到实践")}</span></>}
      </div>
      <div className="organic-project-copy"><div><Title>{item.title}</Title><p>{item.summary}</p></div></div>
    </Link><Tags tags={item.tags}/>
  </article>;
}
async function ResourceCard({item, collection=false}: {item: Doc, collection?:boolean}) {const {t:tr,locale}=await serverI18n();const Title=collection?'h2':'h3';
  const file = item.attachmentId ? fileInfo(item.attachmentId) : null;
  return <article className={card + ' organic-resource-piece'}><Link href={hrefFor('resources', item.slug)}>
    <div className="organic-resource-top"><span className="organic-resource-symbol"><Icon name={item.kind === 'file' ? 'folder' : 'link'}/></span><span>{tr(kind(item.kind))}</span></div>
    <Title>{item.title}</Title><p>{item.summary}</p>
    <div className="organic-resource-bottom"><span>{file ? size(file.size) : tr(item.category||"分享与收藏")}</span><span>{item.version || date(item.updated,locale)} </span></div>
  </Link></article>;
}
async function ArticleRow({item, collection=false}: {item: Doc, collection?:boolean}) {const {t:tr,locale}=await serverI18n();const Title=collection?'h2':'h3';
  return <article className="organic-article-row">
    <div className="organic-article-meta"><time dateTime={item.updated}>{date(item.updated,locale)}</time>{item.category && <span>{tr(item.category)}</span>}</div>
    <Link href={hrefFor('articles', item.slug)}><div className="catalog-article-copy"><Title>{item.title}</Title><p>{item.summary}</p>{!collection&&<span className="organic-text-link">{tr("展开这篇手记 ")}</span>}</div>{collection&&item.coverId&&<img className="catalog-article-cover" src={'/media/'+item.coverId} alt="" loading="lazy"/>}</Link><Tags tags={item.tags}/>
  </article>;
}
async function Timeline({profile, limit = 200}: {profile: Doc, limit?: number}) {const {t:tr,locale}=await serverI18n();
  const entries = profile.experiences.filter((x: Doc) => x.visible).sort((a: Doc, b: Doc) => a.order - b.order).slice(0, limit);
  return <div className="organic-timeline">{entries.map((x: Doc) => <article className="organic-timeline-entry" key={x.id}>
    <div className="organic-timeline-date"><span>{x.start?.replaceAll('-', '.')}</span><span>{x.end ? '— ' + x.end.replaceAll('-', '.') : tr("至今")}</span></div>
    <div>{x.type && <span className="organic-note">{x.type}</span>}<h3>{x.title}</h3><p className="organic-body-copy">{x.description}</p></div>
  </article>)}</div>;
}
async function Empty({title = '这一页，等下一次更新', text = '内容正在慢慢整理。也可以先从我的经历开始了解。', href = '/about', action = '去认识我'}: {title?: string, text?: string, href?: string, action?: string}) {const {t:tr,locale}=await serverI18n();
  return <div className="organic-empty"><span className="organic-empty-leaf" aria-hidden="true"/><h2>{tr(title)}</h2><p>{tr(text)}</p><TextLink href={href}>{tr(action)}</TextLink></div>;
}
async function ProfileLinks({profile}: {profile: Doc}) {const {t:tr,locale}=await serverI18n();
  return <div className="organic-profile-links">
    {profile.email && <a href={'mailto:' + profile.email}>{profile.email}</a>}
    {profile.github && <a href={profile.github} target="_blank" rel="noopener noreferrer">{tr("GitHub / 代码主页")}<Icon name="link"/></a>}
    {profile.socials.map((s: Doc) => <a href={s.url} key={s.url} target="_blank" rel="noopener noreferrer">{s.label}<Icon name="link"/></a>)}
  </div>;
}
async function Home({profile, projects, articles, resources}: {profile: Doc, projects: Doc[], articles: Doc[], resources: Doc[]}) {const {t:tr,locale}=await serverI18n();
  const selected = projects.some(x => x.featured) ? projects.filter(x => x.featured) : projects;
  const recommended = resources.some(x => x.featured) ? resources.filter(x => x.featured) : resources;
  const hasExperiences = profile.experiences.some((x: Doc) => x.visible);
  return <div className="home-page">
    <section className="organic-hero"><div className="organic-hero-copy">
      <h1>{tr("你好，我是")}{locale==='en'?' ':''}<span className="organic-name">{profile.name}{locale==='en'?'.':'。'}</span><em>{tr("一边探索，一边生长。")}</em></h1>
      <p className="organic-hero-description">{profile.intro}</p>
      <div className="organic-actions"><Link className={button + ' is-primary'} href="/projects">{tr("看看我的作品 ")}</Link><Link className={button + ' is-secondary'} href="/about">{tr("认识我更多")}</Link></div>
      <Tags literal tags={profile.skills.slice(0, 4)}/>
    </div><figure className="organic-hero-figure"><div className="organic-hero-image"><div className="organic-photo-underlay" aria-hidden="true"/>
      <img className="organic-hero-photo" src={profile.avatarId?'/media/'+profile.avatarId:'/images/organic/quiet-studio.webp'} alt={profile.avatarId?profile.name:tr("纸页、陶器与枝叶构成的自然静物")} fetchPriority="high" width="960" height="1200"/></div>
      <figcaption>{tr("留一点时间，给想法和生活。")}</figcaption>
    </figure></section>
    <nav className="home-index" aria-label={tr("探索网站")}>
      <a href={selected.length?'#home-work':'/projects'}><span>{tr("作品")}</span><small>{projects.length}</small></a>
      <a href={articles.length?'#home-notes':'/articles'}><span>{tr("手记")}</span><small>{articles.length}</small></a>
      <a href={recommended.length?'#home-resources':'/resources'}><span>{tr("资源")}</span><small>{resources.length}</small></a>
      <Link href="/community"><span>{tr("社区")}</span></Link>
    </nav>
    {selected.length > 0 && <section id="home-work" className="organic-section"><SectionTitle title={tr("精选作品")} description={tr("做过的事情，和每一段实践里的思考。")} href="/projects" action={tr("全部作品")}/><div className="organic-project-grid">{selected.slice(0, 4).map((item, i) => <ProjectCard item={item} index={i} key={item.id}/>)}</div></section>}
    {(articles.length > 0 || recommended.length > 0) && <section className="organic-section organic-reading-split">
      <div id="home-notes"><SectionTitle title={tr("最近写下的手记")} href="/articles" action={tr("全部文章")}/>{articles.length ? articles.slice(0, 3).map(item => <ArticleRow item={item} key={item.id}/>) : <p className="organic-quiet-copy">{tr("新的技术笔记与阶段总结，会在这里慢慢写下。")}</p>}</div>
      <div id="home-resources"><SectionTitle title={tr("资源收藏")} href="/resources" action={tr("资源中心")}/>{recommended.length ? <div className="organic-resource-stack">{recommended.slice(0, 2).map(item => <ResourceCard item={item} key={item.id}/>)}</div> : <p className="organic-quiet-copy">{tr("实用的网站、开发资料与自己的资源，会收在这里。")}</p>}</div>
    </section>}
    {hasExperiences && <section className="organic-section"><SectionTitle title={tr("走过的路，留下的印记。")} href="/about" action={tr("完整经历")}/><Timeline profile={profile} limit={3}/></section>}
    <section className="organic-about-band"><div><h2>{tr("从作品之外，")}<br/>{tr("再多认识我一点。")}</h2><p>{tr("个人介绍、成长经历与技能，也都收在这份持续更新的记录里。")}</p></div><div className="organic-about-band-links"><TextLink href="/about">{tr("关于我与我的经历")}</TextLink><TextLink href="/career">{tr("查看求职展示")}</TextLink></div></section>
  </div>;
}
async function About({profile}: {profile: Doc}) {const {t:tr,locale}=await serverI18n();
  const entries = profile.experiences.some((x: Doc) => x.visible);
  return <><header className="organic-page-heading"><h1>{tr("关于我，")}<em>{tr("和一路走来的经历。")}</em></h1></header>
    <div className="organic-about-layout"><aside className="organic-person">
      {profile.avatarId ? <img className="organic-portrait" src={'/media/' + profile.avatarId} alt={profile.name} width="220" height="260"/> : <div className="organic-initials" aria-hidden="true">{profile.name.slice(-2)}</div>}
      <h2>{profile.name}</h2>{profile.alias && <p className="organic-person-alias">{profile.alias}</p>}<Tags literal tags={profile.skills}/><ProfileLinks profile={profile}/>
      <Link href="/career" className={button + ' is-secondary'}>{tr("查看求职展示 ")}</Link>
    </aside><div><section className="organic-about-intro"><h2>{tr("很高兴，在这里遇见你。")}</h2><p className="organic-body-copy">{profile.intro}</p></section>
      <section className="organic-about-experiences"><h2>{tr("成长的足迹")}</h2>{entries ? <Timeline profile={profile}/> : <p className="organic-quiet-copy">{tr("这份经历还在整理中。可以先从项目与作品看看我的实践。")}</p>}<TextLink href="/projects">{tr("从项目继续了解")}</TextLink></section>
    </div></div>
  </>;
}
async function Career({profile, site, projects}: {profile: Doc, site: Doc, projects: Doc[]}) {const {t:tr}=await serverI18n();
  const selected=projects.filter(x=>x.career),experiences=profile.experiences.filter((x:Doc)=>x.visible).sort((a:Doc,b:Doc)=>a.order-b.order);
  return <div className="resume-page"><div className="resume-toolbar"><div><ResumePrint/>{site.resumeId&&<a href={'/download/'+site.resumeId} className={button+' is-secondary'}>{tr('下载附件简历')}</a>}</div></div><article className="resume-document" aria-label={tr('个人简历')}>
  <header className="resume-heading"><div><h1>{profile.name}</h1>{profile.alias&&<p>{profile.alias}</p>}</div><ProfileLinks profile={profile}/></header>
  {profile.intro&&<section className="resume-section"><h2>{tr('个人介绍')}</h2><p className="resume-summary">{profile.intro}</p></section>}
  {profile.skills?.length>0&&<section className="resume-section"><h2>{tr('技能')}</h2><ul className="resume-skills">{profile.skills.map((skill:string)=><li key={skill}>{skill}</li>)}</ul></section>}
  {experiences.length>0&&<section className="resume-section"><h2>{tr('教育与实践经历')}</h2>{experiences.map((item:Doc)=><article className="resume-entry" key={item.id}><div className="resume-entry-title"><h3>{item.title}</h3><p>{item.start?.replaceAll('-','.')} — {item.end?item.end.replaceAll('-','.'):tr('至今')}</p></div>{item.type&&<p className="resume-entry-type">{item.type}</p>}{item.description&&<p className="resume-description">{item.description}</p>}</article>)}</section>}
  {selected.length>0&&<section className="resume-section"><h2>{tr('精选项目与本人贡献')}</h2>{selected.map(item=><article className="resume-entry" key={item.id}><div className="resume-entry-title"><h3>{item.title}</h3><Link href={hrefFor('projects',item.slug)}>{tr('查看项目')} </Link></div>{item.summary&&<p className="resume-description">{item.summary}</p>}<dl className="resume-contributions">{[['role','我的角色'],['contribution','本人贡献'],['outcome','成果与收获']].filter(([key])=>item[key]).map(([key,label])=><div key={key}><dt>{tr(label)}</dt><dd>{item[key]}</dd></div>)}</dl>{item.tags?.length>0&&<p className="resume-project-tags">{item.tags.join(' · ')}</p>}</article>)}</section>}
  <footer className="resume-footnote"><Link href="/about">{tr('完整个人介绍')} </Link><Link href="/projects">{tr('全部作品')} </Link></footer></article></div>;
}
async function Detail({type, slug}: {type: string, slug: string}) {const {t:tr,locale}=await serverI18n();
  const item = localizeContent(publicBySlug(type, slug),locale) as Doc | null;
  if (!item) notFound();
  const file = item.attachmentId ? fileInfo(item.attachmentId) : null;
  const meta: [string,React.ReactNode][] = [['分类',tr(item.category||'未分类')],['更新日期',<time key="updated" dateTime={item.updated}>{date(item.updated,locale)}</time>]];
  if(type==='resources'){
    meta.push(['资源类型',tr(kind(item.kind))]);
    if(item.version)meta.push(['版本',item.version]);
    if(file)meta.push(['文件大小',size(file.size)],['文件名称',file.name]);
  }
  const actions=type==='resources'?<div className="organic-aside-actions">{item.kind==='file'&&file?<TrackedLink className={button+' is-primary'} href={'/download/'+file.id} path={hrefFor('resources',item.slug)}><Icon name="download"/>{tr("下载资源")}</TrackedLink>:item.url?<TrackedLink className={button+' is-primary'} href={item.url} path={hrefFor('resources',item.slug)} external><Icon name="link"/>{tr("访问外部资源")}</TrackedLink>:<p>{tr("资源暂不可获取。")}</p>}<p className="organic-fineprint">{item.kind==='file'?tr("支持中断续传。使用前，请先看看资源说明。"):tr("将打开外部网站，获取方式以对方页面为准。")}</p></div>:type==='projects'&&(item.url||item.sourceUrl)?<div className="organic-aside-actions">{item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" className={button+' is-primary'}>{tr("查看演示")}</a>}{item.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={button+' is-secondary'}>{tr("查看源码")}<Icon name="link"/></a>}</div>:null;
  return <div className={'detail-page detail-'+type}>
    <nav className="organic-breadcrumb" aria-label={tr("当前位置")}><Link href={'/'+type}>{type==='projects'?tr("项目与作品"):type==='articles'?tr("文章与手记"):tr("资源中心")}</Link><span aria-hidden="true">/</span><span aria-current="page">{tr("详情")}</span></nav>
    <header className="organic-detail-heading"><h1>{item.title}</h1><p>{item.summary}</p><Tags tags={item.tags}/></header>
    <div className="organic-detail-layout">
      <aside className={card+' organic-detail-aside'}>
        <h2>{type==='resources'?tr("把这份资源，带走吧。"):type==='projects'?tr("关于这个项目"):tr("这篇手记")}</h2>
        {actions}
        <dl className="organic-meta">{meta.map(([label,value])=><div className={'detail-meta-entry'+(label==='文件名称'?' is-filename':'')} key={label}><dt>{tr(label)}</dt><dd>{value}</dd></div>)}</dl>
      </aside>
      <article className="organic-detail-article">
        {type==='projects'&&(item.role||item.contribution||item.outcome)&&<section className="organic-contribution-section"><h2>{tr("这次实践，我做了什么")}</h2><dl className="organic-contributions">{item.role&&<><dt>{tr("我的角色")}</dt><dd>{item.role}</dd></>}{item.contribution&&<><dt>{tr("本人贡献")}</dt><dd>{item.contribution}</dd></>}{item.outcome&&<><dt>{tr("成果与收获")}</dt><dd>{item.outcome}</dd></>}</dl></section>}
        {item.coverId&&<img className="organic-detail-cover" src={'/media/'+item.coverId} alt={item.title}/>}
        <div className="organic-prose" dangerouslySetInnerHTML={{__html:(item.bodyHtml||'').replace(/<pre>/g,'<pre tabindex="0">')}}/><Link className="organic-text-link" href={'/report?target='+encodeURIComponent('/'+type+'/'+item.slug)}>{tr('举报与投诉')}</Link>
      </article>
    </div>
  </div>;
}
async function Collection({type, projects, articles, resources, taxonomy, query}: {type: string, projects: Doc[], articles: Doc[], resources: Doc[], taxonomy: Doc, query: Query}) {const {t:tr,locale}=await serverI18n();
  const q = String(query.q || '').trim(), category = String(query.category || ''), tag = String(query.tag || ''), resourceType = String(query.type || '');
  const all = type === 'projects' ? projects : type === 'articles' ? articles : resources;
  const filtered = all.filter(item => (!q || (item.title + ' ' + item.summary).toLowerCase().includes(q.toLowerCase())) && (!category || item.category === category) && (!tag || item.tags.includes(tag)) && (!resourceType || item.kind === resourceType));
  const pages = Math.max(1, Math.ceil(filtered.length / 12)), page = Math.min(pages, Math.max(1, Math.floor(Number(query.page)) || 1)), items = filtered.slice((page - 1) * 12, page * 12);
  const pageUrl = (n: number) => '?' + new URLSearchParams({q, category, tag, type: resourceType, page: String(n)});
  const [title, emphasis] = type === 'projects' ? ['项目与作品，', '把想法落在实处。'] : type === 'articles' ? ['随手记下，', '让思考慢慢扎根。'] : ['好用的资源，', '也想分享给你。'];
  return <div className={'catalog-page catalog-'+type}>
    <header className="organic-page-heading"><h1>{tr(title)}<em>{tr(emphasis)}</em></h1>{type==='resources'&&<><p>{tr('工具、模板、素材与实用网站，集中收在这里。')}</p><nav className="resource-shortcuts" aria-label={tr('资源入口')}><Link href="/docs">{tr('教程与文档')}<Icon name="link"/></Link><Link href="/skills">Skill<Icon name="link"/></Link></nav></>}</header>
    <Form key={'filters:'+pageUrl(1)} className="organic-filters" action={'/'+type}>
      <div className="organic-search-field"><Icon name="search"/><label className="organic-visually-hidden" htmlFor="public-search">{tr("搜索内容")}</label><input className={input} id="public-search" name="q" placeholder={type === 'resources' ? tr("找找资源名称、用途或关键词") : tr("搜索标题或摘要")} defaultValue={q}/></div>
      <div className="organic-filter-row"><label className="organic-visually-hidden" htmlFor="public-category">{tr("分类")}</label><select className={input} id="public-category" name="category" defaultValue={category}><option value="">{tr("全部分类")}</option>{taxonomy.categories.map((x: string) => <option key={x} value={x}>{tr(x)}</option>)}</select>
        <label className="organic-visually-hidden" htmlFor="public-tag">{tr("标签")}</label><select className={input} id="public-tag" name="tag" defaultValue={tag}><option value="">{tr("全部标签")}</option>{taxonomy.tags.map((x: string) => <option key={x} value={x}>{tr(x)}</option>)}</select>
        {type === 'resources' && <><label className="organic-visually-hidden" htmlFor="public-type">{tr("资源类型")}</label><select className={input} id="public-type" name="type" defaultValue={resourceType}><option value="">{tr("全部类型")}</option><option value="file">{tr("站内文件")}</option><option value="website">{tr("外部网站")}</option><option value="external">{tr("外部资源")}</option></select></>}
        <button className={button + ' is-primary'}>{tr("搜索")}<Icon name="search"/></button>
      </div>
    </Form>
    <div className="organic-results-info"><p>{tr("共 ")}{filtered.length} {type === 'projects' ? tr("个作品") : type === 'articles' ? tr("篇手记") : tr("份资源")}</p>{(q || category || tag || resourceType) && <Link href={'/' + type} className="organic-text-link">{tr("清空筛选")}</Link>}</div>
    {items.length ? type === 'projects' ? <div className="organic-project-grid">{items.map((item, i) => <ProjectCard item={item} index={i} key={item.id} collection/>)}</div> : type === 'resources' ? <div className="organic-resource-grid">{items.map(item => <ResourceCard item={item} key={item.id} collection/>)}</div> : <div className="organic-article-list">{items.map(item => <ArticleRow item={item} key={item.id} collection/>)}</div> : q || category || tag || resourceType ? <Empty title={tr("暂时没有找到这份内容")} text={tr("换个关键词，或者清空筛选，再找找看。")} href={'/' + type} action={tr("看看全部内容")}/> : <Empty/>}
    {pages > 1 && <nav className="organic-pagination" aria-label={tr("分页")}>{page > 1 && <Link className={button + ' is-secondary'} href={pageUrl(page - 1)}>{tr("上一页")}</Link>}<span>{page} / {pages}</span>{page < pages && <Link className={button + ' is-secondary'} href={pageUrl(page + 1)}>{tr("下一页")}</Link>}</nav>}
  </div>;
}
export async function PublicSite({path = [], query = {}}: {path?: string[], query?: Query}) {const {t:tr,locale}=await serverI18n();
  const profile = localizeProfile(getConfig('profile'),locale), site = getConfig('site'), taxonomy = getConfig('taxonomy');
  const current = '/' + path.join('/'), section = path[0] || '';
  const projects = (publicContent('projects') as Doc[]).map(item=>localizeContent(item,locale)).sort((a, b) => a.order - b.order), articles = (publicContent('articles') as Doc[]).map(item=>localizeContent(item,locale)), resources = (publicContent('resources') as Doc[]).map(item=>localizeContent(item,locale));
  let body;
  if (!section) body = <Home profile={profile} projects={projects} articles={articles} resources={resources}/>;
  else if (section === 'about' && path.length === 1) body = <About profile={profile}/>;
  else if (section === 'career' && path.length === 1) body = <Career profile={profile} site={site} projects={projects}/>;
  else if (['projects', 'articles', 'resources'].includes(section) && path.length === 2) body = <Detail type={section} slug={path[1]}/>;
  else if (['projects', 'articles', 'resources'].includes(section) && path.length === 1) body = <Collection type={section} projects={projects} articles={articles} resources={resources} taxonomy={taxonomy} query={query}/>;
  else notFound();
  return <PublicFrame path={path}>{body}</PublicFrame>;
}
export async function PublicFrame({path=[],children}:{path?:string[],children:React.ReactNode}){const {t:tr,locale}=await serverI18n();
  const section=path[0]||'',current='/'+path.join('/');
  const nav=[['/','首页'],['/community','社区'],['/docs','文档'],['/skills','Skill'],['/resources','资源']];
  const active = (href: string) => href === '/' ? !section : current===href||current.startsWith(href+'/')||href==='/docs'&&section==='articles';
  const authPage=section==='login'||section==='join';
  return <div className={'organic-site'+(authPage?' public-auth-site':path.length?' public-content-site':'')}>
    <HomeFlowBackground interactive={!path.length}/>
    <a className="organic-skip" href="#main">{tr("跳到主要内容")}</a><Tracker/>
    <header className="organic-header"><div className="organic-container organic-header-inner"><Link href="/" className="organic-brand">SpaceYew<span>{tr('社区与个人展板')}</span></Link>
      <div className="organic-header-tools">
      <nav className="organic-desktop-nav" aria-label={tr("主导航")}>{nav.map(([href, label]) => <Link href={href} className={active(href) ? 'is-active' : ''} aria-current={current === href ? 'page' : active(href) ? 'location' : undefined} key={href}>{tr(label)}</Link>)}<AuthNav/></nav>
      <details className="organic-mobile-menu" name="site-tools"><summary aria-label={tr("菜单")}><span className="organic-menu-label">{tr("菜单")}</span><span aria-hidden="true"><i/><i/></span></summary><nav aria-label={tr("手机导航")}>{nav.map(([href, label]) => <Link href={href} aria-current={active(href) ? 'page' : undefined} key={href}>{tr(label)}</Link>)}<AuthNav mobile/></nav></details>
      <SiteTools/></div>
    </div></header>
    <main id="main" className="organic-container organic-main"><PageMotion>{children}</PageMotion></main>
    <footer className="organic-footer organic-footer-compact"><div className="organic-container"><Link href="/" className="organic-footer-signature">SpaceYew</Link><nav aria-label={tr("页脚导航")}><Link href="/downloads">{tr("客户端下载")}</Link><Link href="/showcases">{tr("发现展板")}</Link><Link href="/legal/community">{tr("社区规则")}</Link><Link href="/legal/terms">{tr("用户协议")}</Link><Link href="/legal/privacy">{tr("隐私政策")}</Link><Link href="/report">{tr("举报投诉")}</Link>{appSurface()!=='platform'&&<Link href="/admin">{tr("内容管理")}</Link>}</nav></div><div className="organic-container organic-footer-filing"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2026018870号-2</a></div></footer>
  </div>;
}
