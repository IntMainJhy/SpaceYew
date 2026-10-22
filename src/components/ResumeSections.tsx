'use client';
import {useLocale} from './LocaleProvider';
import type {SpaceData} from './SpaceBoard';
export function resumeText(item:SpaceData,locale:string){return {...item,...item.translations?.[locale]}}
export function ResumeSections({resume}:{resume:SpaceData}){
 const{locale}=useLocale(),en=locale==='en';
 return <>
 {resume.metrics?.length>0&&<dl className="anx-resume-facts">{resume.metrics.map((original:SpaceData,i:number)=>{const x=resumeText(original,locale);return <div key={i}><dt>{x.label}</dt><dd>{x.value}<small>{x.note}</small></dd></div>})}</dl>}
 {resume.sections?.map((original:SpaceData)=>{const section=resumeText(original,locale);return <div key={section.id}><div className="anx-separator" aria-hidden="true"/><section id={'anx-'+section.id} className="anx-panel"><header><h2>{section.title}</h2></header><div className="anx-resume-items">{section.items.map((original:SpaceData,i:number)=>{const item=resumeText(original,locale);return <article key={i}><div className="anx-resume-meta">{item.period&&<p>{item.period}</p>}{item.subtitle&&<p>{item.subtitle}</p>}</div><div>{item.title&&<h3>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer">{item.title} ↗</a>:item.title}</h3>}{item.description&&<p className="anx-resume-description">{item.description}</p>}{item.coverId&&<figure><img src={'/media/'+item.coverId} loading="lazy" alt={item.caption||item.title}/>{item.caption&&<figcaption>{item.caption}</figcaption>}</figure>}</div></article>})}</div></section></div>})}
 {resume.gallery?.length>0&&<><div className="anx-separator" aria-hidden="true"/><section className="anx-panel"><header><h2>{en?'In the community':'分享现场'}</h2></header><div className="anx-resume-gallery">{resume.gallery.map((original:SpaceData,i:number)=>{const image=resumeText(original,locale);return <figure key={i}><img src={'/media/'+image.imageId} alt={image.caption} loading="lazy"/><figcaption>{image.caption}</figcaption></figure>})}</div></section></>}
 {resume.updated&&<p className="anx-resume-updated">{en?'Profile updated':'资料更新于'} {resume.updated}</p>}
 </>;
}
