import Link from 'next/link';
import Form from 'next/form';
import {curatedSkills,skillCategories,skillCatalogVerifiedAt,skillFilters,filterSkills,skillFilterHref} from '@/lib/skill-catalog.mjs';
import {serverI18n} from '@/lib/server-i18n';
import {Icon} from './Icons';

export async function SkillCatalog({query={}}:{query?:Record<string,string|string[]|undefined>}){
 const {t}=await serverI18n(),{category,q}=skillFilters(query),results=filterSkills({category,q},t);
 return <section className="skill-directory" aria-label={t('GitHub Skill 目录')}>
  <div className="skill-directory-tools"><Form action="/skills" className="skill-search" role="search">
   {category!=='all'&&<input type="hidden" name="type" value={category}/>}
   <label htmlFor="skill-query" className="skill-search-label">{t('搜索 Skill 名称、用途或技术')}</label><Icon name="search"/>
   <input key={q} id="skill-query" name="q" type="search" defaultValue={q} maxLength={120} placeholder={t('搜索名称、用途或技术…')}/>
   <button className="space-btn" type="submit">{t('搜索')}</button>
  </Form><p>{t('收录 {0} 项 · 核对于 {1}',[curatedSkills.length,skillCatalogVerifiedAt])}</p></div>
  <div className="skill-directory-layout"><aside className="skill-types"><nav aria-label={t('Skill 类型')}>
   <Link href={skillFilterHref('all',q)} aria-current={category==='all'?'page':undefined}>{t('全部类型')}<span>{curatedSkills.length}</span></Link>
   {skillCategories.map(type=><Link key={type.id} href={skillFilterHref(type.id,q)} aria-current={category===type.id?'page':undefined}>{t(type.label)}<span>{curatedSkills.filter(item=>item.category===type.id).length}</span></Link>)}
  </nav><p>{t('按任务挑选，再按原作者说明使用。')}</p></aside>
  <div className="skill-directory-results"><div className="skill-results-heading"><p role="status">{t('找到 {0} 项 Skill',[results.length])}{q&&<> · “{q}”</>}</p>{(q||category!=='all')&&<Link href="/skills">{t('清除筛选')}</Link>}</div>
   {results.length?skillCategories.filter(type=>results.some(item=>item.category===type.id)).map(type=><section className="skill-group" key={type.id} aria-labelledby={'skill-type-'+type.id}><header><h2 id={'skill-type-'+type.id}>{t(type.label)}</h2><p>{t(type.description)}</p></header>
    <ul className="skill-list">{results.filter(item=>item.category===type.id).map(skill=><li key={skill.id} className="skill-entry"><div className="skill-entry-copy"><h3><a href={skill.sourceUrl} target="_blank" rel="noopener noreferrer">{skill.name}<span aria-hidden="true"> ↗</span></a></h3><span className="skill-upstream">{skill.repo}</span><p>{t(skill.summary)}</p><ul className="skill-tags" aria-label={t('适用技术')}>{skill.tags.map(tag=><li key={tag}>{tag}</li>)}</ul></div>
     <div className="skill-entry-links"><a href={skill.installUrl} target="_blank" rel="noopener noreferrer">{t(skill.license==='专有条款'?'使用说明':'安装说明')}<Icon name="link"/></a><a className="skill-license" href={skill.licenseUrl} target="_blank" rel="noopener noreferrer" aria-label={t('{0} 的许可：{1}',[skill.name,t(skill.license)])}>{t(skill.license)}</a></div>
    </li>)}</ul>
   </section>):<div className="skill-empty"><h2>{t('没有找到匹配的 Skill')}</h2><p>{t('试试 React、设计、PDF 或 Obsidian，也可以清除筛选查看全部。')}</p><Link className="space-btn" href="/skills">{t('查看全部 Skill')}</Link></div>}
   <div className="skill-catalog-note"><p>{t('收录依据：原作者仓库、明确的使用说明、配套资料与可查阅的许可。这里提供用途索引和原始链接，不打包第三方源码。')}</p><p>{t('办公类的四项 Anthropic Skill 采用专有条款，使用范围以各项许可为准。各工具的安装方式与运行依赖请查看原项目说明。')}</p></div>
  </div></div>
 </section>;
}
