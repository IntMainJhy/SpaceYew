import Link from 'next/link';
import Form from 'next/form';
import {headers} from 'next/headers';
import {serverI18n} from '@/lib/server-i18n';
import {publicCatalog} from '@/lib/catalog.mjs';
import {publicContent} from '@/lib/db.mjs';
import {localizeContent} from '@/lib/content-locales.mjs';
import {guides} from '@/lib/learning.mjs';
import {curatedSkills} from '@/lib/skill-catalog.mjs';
import {legalConsultationResource,LEGAL_CONSULTATION_PATH} from '@/lib/legal-consultation.mjs';
import {DocsPage,SkillsPage} from './LearningPages';
import {ResourcesPage,CatalogCards,type CatalogQuery} from './SharedCatalog';
import {Icon} from './Icons';

export async function ResourceTabs({active='all'}:{active?:string}){
 const {t}=await serverI18n();
 return <nav className="resource-hub-tabs" aria-label={t('资源类型')}>{[['all','全部'],['docs','文档'],['skills','Skill'],['resources','网站与工具'],['legal','法律咨询']].map(([id,label])=><Link key={id} href={id==='legal'?LEGAL_CONSULTATION_PATH:'/resources'+(id==='all'?'':'?type='+id)} aria-current={active===id?'page':undefined}>{t(label)}</Link>)}</nav>;
}

async function ResourceOverview({query,baseUrl}:{query:CatalogQuery;baseUrl:string}){
 const {t,locale}=await serverI18n(),q=String(query.q||'').trim();
 const published=publicCatalog({kind:''},new Request(baseUrl,{headers:await headers()})).items;
 const docs=[...guides.map(item=>({id:'guide-'+item.slug,title:t(item.title),summary:t(item.summary),category:t('使用指南'),url:'/docs/'+item.slug})),{id:'connect',title:'Connect API & MCP',summary:t('让 AI 直接发布文档、Skill 和其他资源。'),category:t('AI 工作流'),url:'/docs/connect'},...publicContent('articles').map((item:any)=>({...localizeContent(item,locale),url:'/docs/articles/'+encodeURIComponent(item.slug),authorName:'SpaceYew'})),...published.filter((item:any)=>item.kind==='docs')];
 const skills=[...curatedSkills.map(item=>({id:'skill-'+item.id,title:item.name,summary:t(item.summary),category:'Skill',authorName:item.repo,url:'/skills/'+item.id})),...published.filter((item:any)=>item.kind==='skills')];
 const resources=[legalConsultationResource(locale),...published.filter((item:any)=>item.kind==='resources'),...publicContent('resources').map((item:any)=>({...localizeContent(item,locale),url:'/resources/'+encodeURIComponent(item.slug)}))];
 const groups=[{kind:'docs',label:t('文档'),items:docs},{kind:'skills',label:'Skill',items:skills},{kind:'resources',label:t('网站与工具'),items:resources}].map(group=>({...group,items:group.items.filter((item:any)=>!q||[item.title,item.summary,item.category].join(' ').toLowerCase().includes(q.toLowerCase()))}));
 return <div className="resource-overview"><header className="catalog-page-heading"><div><h1>{t('资源')}</h1><p>{t('教程、Skill、网站与工具，在一个地方发现。')}</p></div><Link className="space-btn primary" href="/resources?compose=1">{t('分享资源')}</Link></header>
  <Form action="/resources" className="resource-overview-search" role="search"><label htmlFor="resource-hub-search">{t('搜索全部资源')}</label><div><Icon name="search"/><input id="resource-hub-search" name="q" type="search" defaultValue={q} key={q}/><button className="space-btn" type="submit">{t('搜索')}</button></div></Form>
  {groups.filter(group=>group.items.length).map(group=><section className="resource-overview-group" data-glass-reveal="works" key={group.kind}><header><h2>{group.label}</h2><Link className="space-link" href={'/resources?'+new URLSearchParams({type:group.kind,...(q?{q}:{})})}>{t('浏览全部')}<Icon name="arrow"/></Link></header><CatalogCards items={group.items.slice(0,q?12:3)} kind={group.kind}/></section>)}
  {!groups.some(group=>group.items.length)&&<div className="catalog-empty"><p>{t('没有匹配的资源。')}</p><Link href="/resources">{t('清除筛选')}</Link></div>}
 </div>;
}

export async function ResourceHub({query={},baseUrl}:{query?:CatalogQuery;baseUrl:string}){
 const requested=String(query.type||''),kind=['docs','skills','resources'].includes(requested)?requested:query.category?'resources':'all';
 return <div className="resource-hub" data-resource-kind={kind}><ResourceTabs active={kind}/><div data-glass-reveal="stage">{kind==='skills'?<SkillsPage baseUrl={baseUrl} query={query}/>:kind==='docs'?<DocsPage path={['docs']} query={query}/>:kind==='resources'?<ResourcesPage query={query}/>:<ResourceOverview query={query} baseUrl={baseUrl}/>}</div></div>;
}
