'use client';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {localizeProfile,localizeContent} from '@/lib/content-locales.mjs';
import {FeedAvatar} from './FeedAvatar';
import {BlogSignatureTheme} from './BlogSignatureThemes';
import {AnxPortfolio} from './AnxPortfolio';
import type {SpaceData} from './SpaceBoard';

export const homepageThemes=[['anx','Anx Portfolio','来自 anx-portfolio 的内置适配版，立体像素签名与细线个人档案。'],['folio','像素手记','像素签名、细线框架与开放的个人档案。'],['panorama','远景日记','宽幅风景、深色阅读面板与独立个人名片。'],['journal','叙事杂志','宽幅标题、留白与细致的经历编排。'],['minimal','简洁档案','侧栏名片与清晰的个人信息。'],['terminal','开发者','深色界面与等宽字体，专注技术与作品。']];
export function BlogTheme({data,preview=false}:{data:SpaceData;preview?:boolean}){
 const Chapters=preview?'div':'main';
 const {t,locale}=useLocale(),p=localizeProfile(data.profile,locale),settings=data.layout.blog||{},theme=settings.theme||'journal',content=(data.content||[]).map((x:SpaceData)=>localizeContent(x,locale)),base='/blog/'+data.handle;
 const experiences=(p.experiences||[]).filter((x:SpaceData)=>x.visible!==false),sections=(settings.sections||['projects','articles','resources']).filter((key:string)=>content.some((x:SpaceData)=>x.type===key)),labels:Record<string,string>={projects:'作品与项目',articles:'文字与思考',resources:'分享的资源'};
 if(theme==='anx')return <AnxPortfolio data={data} p={p} content={content} preview={preview}/>;
 if(['folio','panorama'].includes(theme))return <BlogSignatureTheme data={data} p={p} content={content} preview={preview}/>;
 return <div className="personal-homepage" data-home-theme={theme}>
  <div className="homepage-masthead"><span>{p.alias||'@'+data.handle}</span><span>{t('个人档案')}</span></div>
  {data.layout.coverId&&<img className="homepage-cover" src={'/media/'+data.layout.coverId} alt=""/>}
  <div className="homepage-layout"><aside className="homepage-identity"><FeedAvatar name={p.name} avatarId={p.avatarId} className="homepage-avatar"/><h1>{settings.title||p.name}</h1>{p.alias&&<p className="homepage-alias">{p.alias}</p>}{settings.description&&<p className="homepage-deck">{settings.description}</p>}<nav aria-label={t('主页栏目')}><a href="#about">{t('关于我')}</a>{p.skills?.length>0&&<a href="#skills">{t('技能')}</a>}{experiences.length>0&&<a href="#experience">{t('经历')}</a>}{sections.map((key:string)=><a key={key} href={'#'+key}>{t(labels[key])}</a>)}</nav><div className="homepage-contact">{p.email&&<a href={'mailto:'+p.email}>{t('联系我')} ↗</a>}{p.github&&<a href={p.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}{p.socials?.map((x:SpaceData)=><a href={x.url} key={x.url} target="_blank" rel="noopener noreferrer">{x.label} ↗</a>)}</div></aside>
  <Chapters className="homepage-chapters"><section id="about" className="homepage-about"><h2 className="homepage-section-label">{t('关于我')}</h2><p className="homepage-intro">{p.intro||t('个人介绍正在整理中。')}</p></section>
   {p.skills?.length>0&&<section id="skills"><h2 className="homepage-section-label">{t('技能与专长')}</h2><div className="homepage-skills">{p.skills.map((skill:string)=><span key={skill}>{skill}</span>)}</div></section>}
   {experiences.length>0&&<section id="experience"><h2 className="homepage-section-label">{t('经历')}</h2><div className="homepage-timeline">{experiences.map((x:SpaceData)=><article key={x.id}><time>{x.start} — {x.end||t('至今')}</time><div><small>{x.type}</small><h3>{x.title}</h3>{x.description&&<p>{x.description}</p>}</div></article>)}</div></section>}
   {sections.map((key:string)=><section id={key} key={key}><h2 className="homepage-section-label">{t(labels[key])}</h2><div className={'homepage-entries homepage-entries-'+key}>{content.filter((x:SpaceData)=>x.type===key).map((x:SpaceData)=>{const body=<>{x.coverId&&<img src={'/media/'+x.coverId} alt="" loading="lazy"/>}<div><small>{x.category||t(key==='projects'?'项目':key==='articles'?'文章':'资源')}</small><h3>{x.title} <span aria-hidden="true">↗</span></h3><p>{x.summary}</p>{x.tags?.length>0&&<span className="homepage-entry-tags">{x.tags.slice(0,4).join(' / ')}</span>}</div></>;return preview?<article className="homepage-entry" key={x.id}>{body}</article>:<Link className="homepage-entry" key={x.id} href={base+'/'+key+'/'+encodeURIComponent(x.slug)}>{body}</Link>})}</div></section>)}
  </Chapters></div>
 </div>;
}
