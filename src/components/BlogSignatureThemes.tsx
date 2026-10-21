'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import type {SpaceData} from './SpaceBoard';

// An original 5 × 7 alphabet, rendered as geometry rather than a downloaded font.
const pixels:Record<string,string[]>={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01110'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','11011','10001'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111']};
function PixelSignature({handle}:{handle:string}){
 const text=(handle.toUpperCase().replace(/[^A-Z]/g,'')||'YOU').slice(0,4);
 return <svg className="folio-signature" viewBox={`0 0 ${text.length*6-1} 7`} fill="none" aria-hidden="true">{[...text].flatMap((letter,i)=>pixels[letter].flatMap((row,y)=>[...row].map((value,x)=>value==='1'?<rect key={`${i}-${x}-${y}`} x={i*6+x+.035} y={y+.035} width=".93" height=".93"/>:null)))}</svg>;
}
function Arrow(){return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>}
function SignatureAvatar({name,avatarId}:{name:string;avatarId?:string}){
 const [failed,setFailed]=useState('');
 return <span className="signature-avatar" aria-hidden="true">{[...(name||'?')][0]}{avatarId&&failed!==avatarId&&<img src={'/media/'+avatarId} alt="" onError={()=>setFailed(avatarId)}/>}</span>;
}

export function BlogSignatureTheme({data,p,content,preview=false}:{data:SpaceData;p:SpaceData;content:SpaceData[];preview?:boolean}){
 const {t}=useLocale(),root=useRef<HTMLDivElement>(null),settings=data.layout.blog||{},theme=settings.theme,panorama=theme==='panorama',base='/blog/'+data.handle;
 const sections=(settings.sections||['projects','articles','resources']).filter((key:string)=>content.some(x=>x.type===key)),experiences=(p.experiences||[]).filter((x:SpaceData)=>x.visible!==false),labels:Record<string,string>={projects:'作品与项目',articles:'文字与思考',resources:'分享的资源'};
 const Chapters=preview?'div':'main';
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');let context:{revert:()=>void}|undefined,cancelled=false;
  if(!preference.matches)void import('gsap').then(({gsap})=>{if(cancelled||preference.matches||!root.current)return;context=gsap.context(()=>{gsap.fromTo('.blog-signature-visual',{clipPath:'inset(0 0 8% 0)'},{clipPath:'inset(0 0 0% 0)',duration:.65,ease:'expo.out',clearProps:'clipPath'})},root)});
  const reduce=()=>{if(preference.matches)context?.revert()};preference.addEventListener('change',reduce);
  return()=>{cancelled=true;context?.revert();preference.removeEventListener('change',reduce)};
 },[theme]);
 const contact=<div className="signature-contact">{p.email&&<a href={'mailto:'+p.email}>{t('联系我')} <Arrow/></a>}{p.github&&<a href={p.github} target="_blank" rel="noopener noreferrer">GitHub <Arrow/></a>}{p.socials?.map((x:SpaceData)=><a href={x.url} key={x.url} target="_blank" rel="noopener noreferrer">{x.label}<Arrow/></a>)}</div>;
 return <div ref={root} className={'signature-blog signature-'+theme} data-home-theme={theme}>
  <div className="signature-topbar"><a href="#blog-about" className="signature-wordmark">{p.name}</a><nav aria-label={t('博客栏目')}><a href="#blog-about">{t('关于我')}</a>{sections.map((key:string)=><a key={key} href={'#blog-'+key}>{t(labels[key])}</a>)}</nav></div>
  {panorama?<div className="panorama-banner blog-signature-visual"><img src={data.layout.coverId?'/media/'+data.layout.coverId:'/images/community/lake-walk.png'} alt=""/><div><span>@{data.handle}</span><h1>{settings.title||p.name}</h1>{settings.description&&<p>{settings.description}</p>}</div></div>:<header className="folio-banner"><div className="blog-signature-visual"><PixelSignature handle={data.handle}/></div><div className="folio-profile"><SignatureAvatar name={p.name} avatarId={p.avatarId}/><div><h1>{settings.title||p.name}</h1><p>{settings.description||p.alias||'@'+data.handle}</p></div></div>{data.layout.coverId&&<img className="folio-cover" src={'/media/'+data.layout.coverId} alt=""/>}</header>}
  <div className="signature-layout"><aside className="signature-profile">{panorama&&<><SignatureAvatar name={p.name} avatarId={p.avatarId}/><h2>{p.name}</h2><p>{p.alias||'@'+data.handle}</p></>}{!panorama&&<p className="signature-handle">@{data.handle}</p>}{contact}{p.skills?.length>0&&<div className="signature-skills"><h2>{t('技能与专长')}</h2><ul>{p.skills.map((skill:string)=><li key={skill}>{skill}</li>)}</ul></div>}{panorama&&!data.layout.coverId&&<small className="panorama-art-note">{t('主题默认风景 · AI 创作')}</small>}</aside>
   <Chapters className="signature-chapters"><section id="blog-about" className="signature-about"><h2>{t('关于我')}</h2><p>{p.intro||t('个人介绍正在整理中。')}</p></section>
    {experiences.length>0&&<section id="blog-experience"><h2>{t('经历')}</h2><div className="signature-experiences">{experiences.map((item:SpaceData)=><article key={item.id}><time>{item.start}{item.start&&' — '}{item.end||t('至今')}</time><div>{item.type&&<small>{item.type}</small>}<h3>{item.title}</h3>{item.description&&<p>{item.description}</p>}</div></article>)}</div></section>}
    {sections.map((key:string)=><section id={'blog-'+key} key={key}><div className="signature-section-heading"><h2>{t(labels[key])}</h2><span>{content.filter(x=>x.type===key).length}</span></div><div className="signature-entries">{content.filter(x=>x.type===key).map(item=>{const body=<>{item.coverId&&<img src={'/media/'+item.coverId} alt="" loading="lazy"/>}<div className="signature-entry-copy"><small>{item.category||t(key==='projects'?'项目':key==='articles'?'文章':'资源')}</small><h3>{item.title}</h3>{item.summary&&<p>{item.summary}</p>}{item.tags?.length>0&&<span>{item.tags.slice(0,4).join(' / ')}</span>}</div><span className="signature-entry-arrow"><Arrow/></span></>;return preview?<article className="signature-entry" key={item.id}>{body}</article>:<Link className="signature-entry" key={item.id} href={base+'/'+key+'/'+encodeURIComponent(item.slug)}>{body}</Link>})}</div></section>)}
   </Chapters>
  </div>
 </div>;
}
