'use client';

// Adapted from AnxForever/anx-portfolio at a7434847797658402d50fba29827eef246102bb7:
// profile-header, panel, handwritten-note and anx-mark-solid. MIT, © 2026 Chánh Đại / Anx.
// Full notice: docs/licenses/anx-portfolio-MIT.txt. Branding and personal data are replaced.
import Link from 'next/link';
import {DesignText,DesignLabel,useBlogEditing} from './BlogDesignFields';
import {ResumeSections,resumeText} from './ResumeSections';
import {useId,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import {SiteOwnerBadge} from './SiteOwnerBadge';
import {pixels} from './BlogSignatureThemes';
import {Icon} from './Icons';
import type {SpaceData} from './SpaceBoard';

function PortfolioMark({handle}:{handle:string}){
 const id=useId().replace(/:/g,''),highlight=useRef<SVGRadialGradientElement>(null);
 const letters=(handle.toUpperCase().replace(/[^A-Z]/g,'')||'YOU').slice(0,4),width=letters.length*6-1;
 const glyph=[...letters].flatMap((letter,i)=>pixels[letter].flatMap((row,y)=>[...row].map((value,x)=>value==='1'?`M${i*6+x} ${y}h1v1h-1z`:''))).join('');
 // Preserve the upstream layered extrusion, hatch and spotlight; use each member's own signature.
 return <svg className="anx-mark" viewBox={`-.2 -.2 ${width+1.1} 8.3`} fill="none" aria-hidden="true" onPointerMove={event=>{
  if(event.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const rect=event.currentTarget.getBoundingClientRect();highlight.current?.setAttribute('cx',String((event.clientX-rect.left)/rect.width*width));highlight.current?.setAttribute('cy',String((event.clientY-rect.top)/rect.height*7));
 }}>
  <defs><pattern id={'anx-hatch-'+id} width=".3" height=".3" patternUnits="userSpaceOnUse"><path d="M-.03 .03l.06-.06M0 .3l.3-.3M.27 .33l.06-.06" stroke="var(--anx-hatch)" strokeWidth=".018"/></pattern><radialGradient ref={highlight} id={'anx-light-'+id} cx={width/2} cy="3.5" r="6" gradientUnits="userSpaceOnUse"><stop stopColor="var(--anx-ink)"/><stop offset="1" stopColor="var(--anx-ink)" stopOpacity="0"/></radialGradient><g id={'anx-body-'+id}>{Array.from({length:15},(_,i)=>1-i/14).map(t=><path key={t} d={glyph} transform={`translate(${.65*t} ${.65*t})`}/>)}</g></defs>
  <use href={'#anx-body-'+id} fill="var(--anx-side)"/>
  <g className="anx-mark-face"><path d={glyph} fill="var(--anx-paper)"/><path d={glyph} fill={`url(#anx-hatch-${id})`}/><path d={glyph} stroke="var(--anx-line)" strokeWidth=".025"/><path d={glyph} stroke={`url(#anx-light-${id})`} strokeWidth=".025"/></g>
 </svg>;
}

function NoteArrow(){return <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M34 4c1 15-5 26-21 30"/><path d="m22 37-9-3 7.5-8"/></svg>}

export function AnxPortfolio({data,p,content,preview=false,embedded=false,part}:{data:SpaceData;p:SpaceData;content:SpaceData[];preview?:boolean;embedded?:boolean;part?:string}){
 const editing=useBlogEditing(),show=(key:string)=>!part||part===key;
 const {t,locale}=useLocale(),[failedAvatar,setFailedAvatar]=useState(''),settings=data.layout.blog||{},base='/blog/'+data.handle,Chapters=preview||embedded?'div':'main';
 const resume=p.resume,experiences=(resume&&!settings.showLegacyContent?[]:p.experiences||[]).filter((item:SpaceData)=>item.visible!==false),sections=(resume&&!settings.showLegacyContent?[]:settings.sections||['projects','articles','resources']).filter((key:string)=>content.some(item=>item.type===key));
 const labels:Record<string,string>={projects:'作品与项目',articles:'文字与思考',resources:'分享的资源'};
 const visibleParts=settings.design?new Set(settings.design.nodes.filter((n:SpaceData)=>!n.hidden).map((n:SpaceData)=>n.part)):null;
 const contacts=[...(p.github?[{label:'GitHub',url:p.github}]:[]),...(p.socials||[])];
 return <div className="anx-portfolio" data-home-theme="anx" data-design-part={part}>
  {show('header')&&<>
  <div className="anx-topbar"><a className="anx-handle" href="#anx-about">@{data.handle}</a><nav aria-label={t('博客栏目')}>{(!visibleParts||visibleParts.has('about'))&&<a href="#anx-about">{t('关于我')}</a>}{resume?.sections?.filter((section:SpaceData)=>!visibleParts||visibleParts.has('section:'+section.id)).slice(0,5).map((section:SpaceData)=><a key={section.id} href={'#anx-'+section.id}>{resumeText(section,locale).title}</a>)}{experiences.length>0&&<a href="#anx-experience">{t('经历')}</a>}{sections.filter((key:string)=>!part||part==='content:'+key).map((key:string)=><a href={'#anx-'+key} key={key}>{t(labels[key])}</a>)}</nav></div>
  <header className="anx-profile-header">
   <figure className="anx-signature"><PortfolioMark handle={/[a-z]/i.test(p.alias||'')?p.alias:data.handle}/><figcaption>Fig. 1.</figcaption></figure>
   <div className="anx-portrait" onClick={editing?()=>editing.image(['avatarId']):undefined}><span aria-hidden={!editing} role={editing?'button':undefined} tabIndex={editing?0:undefined} aria-label={editing?t('更换头像'):undefined} onKeyDown={editing?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();editing.image(['avatarId'])}}:undefined}>{[...(p.name||'?')][0]}{p.avatarId&&failedAvatar!==p.avatarId&&<img src={'/media/'+p.avatarId} alt="" onError={()=>setFailedAvatar(p.avatarId)}/>}</span></div>
   <div className="anx-name"><h1><DesignText path={[settings.title?'$title':'name']} label={t('姓名 / 公开昵称')} max={settings.title?120:80}>{settings.title||p.name}</DesignText><SiteOwnerBadge siteOwner={data.siteOwner}/></h1><p><DesignText path={[settings.description?'$description':'alias']} label={t('一句话介绍')} max={settings.description?500:80}>{settings.description||p.alias||(!editing?'@'+data.handle:'')}</DesignText></p></div>
  </header>
  <div className="anx-separator" aria-hidden="true"/></>}
  {show('contacts')&&(contacts.length>0||p.email||editing)&&<section onClick={editing?e=>{e.preventDefault();editing.image(['$contacts'])}:undefined} className="anx-contact" aria-label={t('联系我')}>{!settings.design&&<span className="anx-note" aria-hidden="true">{t('保持联系')}<NoteArrow/></span>}{contacts.map((item:SpaceData,index:number)=><a key={item.url+index} href={item.url} target="_blank" rel="noopener noreferrer"><Icon name="link"/>{item.label}</a>)}{p.email&&<a href={'mailto:'+p.email}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h18v14H3zM3 5l9 7 9-7"/></svg>{p.email}</a>}{editing&&contacts.length===0&&!p.email&&<span>{t('公开联系方式')}</span>}{resume?.resumeId&&<a href={'/download/'+resume.resumeId}>{locale==='en'?'Download résumé PDF':'下载简历 PDF'}<Icon name="download"/></a>}</section>}
  {show('cover')&&data.layout.coverId&&<img onClick={editing?()=>editing.image(['$cover']):undefined} className="anx-cover" src={'/media/'+data.layout.coverId} alt=""/>}
  <Chapters className="anx-chapters">
   {show('about')&&<section id="anx-about" className="anx-panel"><header><h2><DesignLabel>{t('关于我')}</DesignLabel></h2></header><div className="anx-panel-body anx-intro"><p><DesignText path={['intro']} label={t('个人介绍')} max={3000}>{p.intro||(!editing?t('个人介绍正在整理中。'):'')}</DesignText></p></div></section>}
   {show('skills')&&(p.skills?.length>0||editing)&&<><div className="anx-separator" aria-hidden="true"/><section className="anx-panel"><header><h2><DesignLabel>{t('技能与专长')}</DesignLabel></h2></header><ul className="anx-skills">{editing?<li className="bd-skills-input"><DesignText path={['$skills']} label={t('技能与专长')} max={1800}>{(p.skills||[]).join(' · ')}</DesignText></li>:(p.skills||[]).map((skill:string)=><li key={skill}>{skill}</li>)}</ul></section></>}
   {resume&&<ResumeSections resume={resume} part={part}/> }
   {show('legacy')&&experiences.length>0&&<><div className="anx-separator" aria-hidden="true"/><section id="anx-experience" className="anx-panel"><header><h2>{t('经历')}</h2></header><div className="anx-experiences">{experiences.map((item:SpaceData)=><article key={item.id}><time><DesignText path={['experiences',p.experiences.indexOf(item),'start']} label={t('开始时间')} max={10}>{item.start||''}</DesignText>{item.start&&' — '}<DesignText path={['experiences',p.experiences.indexOf(item),'end']} label={t('结束时间')} max={10}>{item.end||(!editing?t('至今'):'')}</DesignText></time><div><h3><DesignText path={['experiences',p.experiences.indexOf(item),'title']} label={t('经历标题')}>{item.title}</DesignText></h3>{(item.type||editing)&&<small><DesignText path={['experiences',p.experiences.indexOf(item),'type']} label={t('经历类型')} max={40}>{item.type||''}</DesignText></small>}{(item.description||editing)&&<p><DesignText path={['experiences',p.experiences.indexOf(item),'description']} label={t('经历描述')} max={5000}>{item.description||''}</DesignText></p>}</div></article>)}</div></section></>}
   {sections.filter((key:string)=>!part||part==='content:'+key).map((key:string)=>{const items=content.filter(item=>item.type===key);return <div key={key}><div className="anx-separator" aria-hidden="true"/><section id={'anx-'+key} className="anx-panel"><header><h2>{t(labels[key])} <sup>({items.length})</sup></h2></header><div className="anx-entries">{items.map(item=>{const body=<>{item.coverId&&<img src={'/media/'+item.coverId} alt="" loading="lazy"/>}<div><h3>{item.title}<Icon name="resize"/></h3>{item.category&&<small>{item.category}</small>}{item.summary&&<p>{item.summary}</p>}{item.tags?.length>0&&<span>{item.tags.slice(0,4).join(' / ')}</span>}</div></>;return preview?<article key={item.id} className="anx-entry">{body}</article>:<Link key={item.id} className="anx-entry" href={base+'/'+key+'/'+encodeURIComponent(item.slug)}>{body}</Link>})}</div></section></div>})}
  </Chapters>
  {show('credit')&&<p className="anx-credit">{t('模板改编自')} <a href="https://github.com/AnxForever/anx-portfolio" target="_blank" rel="noopener noreferrer">anx-portfolio</a> <span>· MIT · © 2026 Chánh Đại / Anx</span></p>}
 </div>;
}
