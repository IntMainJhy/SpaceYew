import type {ReactNode} from 'react';
import Link from 'next/link';
import {catalogCategoryLabel,catalogCoverUrl} from '@/lib/catalog-presentation.mjs';
import Form from 'next/form';
import {curatedSkills,skillAiTools,skillCategories,skillCatalogVerifiedAt,skillFilters,filterSkills,skillFilterHref} from '@/lib/skill-catalog.mjs';
import {serverI18n} from '@/lib/server-i18n';
import {Icon} from './Icons';

export async function SkillCatalog({query={},children}:{query?:Record<string,string|string[]|undefined>;children?:ReactNode}){
 const {t}=await serverI18n(),{category,q,tool}=skillFilters(query),results=filterSkills({category,q,tool},t);
 const categoryScope=filterSkills({q,tool},t),toolScope=filterSkills({category,q},t);
 const toolOptions=[{id:'all',label:'全部 AI 工具',count:toolScope.length},...skillAiTools.map(item=>({...item,count:toolScope.filter(skill=>skill.tools.some(supported=>supported.id===item.id)).length}))];
 return <section className="skill-directory skill-directory-cards" aria-label={t('GitHub Skill 目录')}>
  <div className="skill-directory-tools"><Form action="/skills" className="skill-filter-form" role="search">
   {category!=='all'&&<input type="hidden" name="type" value={category}/>}
   {tool!=='all'&&<input type="hidden" name="tool" value={tool}/>}
   <div className="skill-search"><label htmlFor="skill-query" className="skill-search-label">{t('搜索 Skill 名称、用途或技术')}</label><Icon name="search"/>
   <input key={q} id="skill-query" name="q" type="search" defaultValue={q} maxLength={120} placeholder={t('搜索名称、用途或技术…')}/>
   <button className="space-btn" type="submit">{t('搜索')}</button></div>
  </Form><p>{t('收录 {0} 项 · 核对于 {1}',[curatedSkills.length,skillCatalogVerifiedAt])}</p></div>
  <div className="catalog-filter-group skill-tool-options"><span>{t('按 AI 工具筛选')}</span><nav className="catalog-filter-options" aria-label={t('按 AI 工具筛选')}>{toolOptions.map(option=><Link key={option.id} href={skillFilterHref(category,q,option.id)} scroll={false} aria-current={tool===option.id?'page':undefined}>{t(option.label)}<span>{option.count}</span></Link>)}</nav></div>
  <div className="skill-directory-layout"><aside className="skill-types"><nav aria-label={t('Skill 类型')}>
   <Link href={skillFilterHref('all',q,tool)} aria-current={category==='all'?'page':undefined}>{t('全部类型')}<span>{categoryScope.length}</span></Link>
   {skillCategories.map(type=><Link key={type.id} href={skillFilterHref(type.id,q,tool)} aria-current={category===type.id?'page':undefined}>{t(type.label)}<span>{categoryScope.filter(item=>item.category===type.id).length}</span></Link>)}
  </nav><p>{t('按任务挑选，再按原作者说明使用。')}</p></aside>
  <div className="skill-directory-results"><div className="skill-results-heading"><p role="status">{t('找到 {0} 项精选 Skill',[results.length])}{q&&<> · “{q}”</>}{tool!=='all'&&<> · {skillAiTools.find(item=>item.id===tool)?.label}</>}</p>{(q||category!=='all'||tool!=='all')&&<Link href="/skills">{t('清除筛选')}</Link>}</div>
   {results.length?skillCategories.filter(type=>results.some(item=>item.category===type.id)).map(type=><section className="skill-group" key={type.id} aria-labelledby={'skill-type-'+type.id}><header><h2 id={'skill-type-'+type.id}>{t(type.label)}</h2><p>{t(type.description)}</p></header>
    <ul className="skill-list">{results.filter(item=>item.category===type.id).map(skill=>{const detailHref=skillFilterHref(category,q,tool).replace('/skills','/skills/'+skill.id);return <li key={skill.id} className="skill-entry"><Link className="skill-entry-cover" href={detailHref} tabIndex={-1} aria-hidden="true"><img src={catalogCoverUrl('skills',skill.name,t(catalogCategoryLabel(skill.category)))} alt="" width={640} height={360} loading="lazy"/></Link><div className="skill-entry-copy"><h3><Link href={detailHref}>{skill.name}</Link></h3><span className="skill-upstream">{skill.repo}</span><p>{t(skill.summary)}</p><div className="skill-entry-tools"><span>{t('支持工具')}</span><ul className="skill-tool-badges" aria-label={t('支持的 AI 工具')}>{skill.tools.map(item=><li key={item.id} data-selected={item.id===tool?'true':undefined}>{item.label}</li>)}</ul></div><ul className="skill-tags" aria-label={t('适用技术')}>{skill.tags.map(tag=><li key={tag}>{tag}</li>)}</ul></div>
     <div className="skill-entry-links"><Link href={detailHref}>{t('查看详情')}<Icon name="link"/></Link><Link href={detailHref+'#installation'}>{t('安装方法')}</Link><a className="skill-license" href={skill.licenseUrl} target="_blank" rel="noopener noreferrer" aria-label={t('{0} 的许可：{1}',[skill.name,t(skill.license)])}>{t(skill.license)}</a></div>
    </li>})}</ul>
   </section>):<div className="skill-empty"><h2>{t('精选目录中没有匹配的 Skill')}</h2><p>{t('试试 GSAP、设计、React 或 Obsidian，也可以清除筛选查看全部。')}</p><Link className="space-btn" href="/skills">{t('查看全部 Skill')}</Link></div>}
   {children}
   <div className="skill-catalog-note"><p>{t('工具标签对应本站已整理的安装方式；更多兼容性请查看详情或原项目。')}</p><p>{t('收录依据：原作者仓库、明确的使用说明、配套资料与可查阅的许可。这里提供用途索引和原始链接，不打包第三方源码。')}</p><p>{t('这里只做用途索引与安装指引。第三方 Skill 和其调用的软件、图片、模型服务分别适用原作者的许可。')}</p></div>
  </div></div>
 </section>;
}
