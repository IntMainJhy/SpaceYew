'use client';
import {useState} from 'react';
import {blogAppearances,blogAppearance} from '@/lib/blog-appearances.mjs';
import {blogTemplates,resumePresentations} from '@/lib/blog-templates.mjs';
import {Icon} from './Icons';
type Say=(zh:string,en:string)=>string;
export function TemplateThumbnail({value,section=false}:{value:string;section?:boolean}){
 return <span className="bt-thumbnail" data-template={value} data-section={section} aria-hidden="true"><span className="bt-thumb-header"><i/><b/><em/></span><span className="bt-thumb-body"><span className="bt-thumb-aside"><i/><i/><i/></span><span className="bt-thumb-entries"><span><b/><i/><i/></span><span><b/><i/><i/></span><span><b/><i/></span></span></span></span>;
}
export function ResumeStyleChoices({value,say,onChoose,disabled=false,insert=false}:{value?:string;say:Say;onChoose:(id:string)=>void;disabled?:boolean;insert?:boolean}){
 return <div className="bt-section-choices" role="group" aria-label={say(insert?'插入简历栏目':'简历栏目样式',insert?'Insert résumé section':'Résumé section style')}>{resumePresentations.map(item=><button key={item.id} type="button" aria-pressed={insert?undefined:(value||'classic')===item.id} aria-label={(insert?say('插入：','Insert: '):say('栏目样式：','Section style: '))+say(item.zh,item.en)} disabled={disabled} onClick={()=>onChoose(item.id)}><TemplateThumbnail value={item.id} section/><strong>{say(item.zh,item.en)}</strong><span>{say(item.description,item.english)}</span></button>)}</div>;
}
export function BlogTemplateLibrary({value,appearance,say,onChoose,onAppearance,onClose,disabled}:{value?:string;appearance?:string;say:Say;onChoose:(id:string)=>void;onAppearance:(id:string)=>void;onClose:()=>void;disabled:boolean}){
 const [mode,setMode]=useState('appearance'),current=blogAppearance(appearance);
 return <section className="bt-library" aria-label={say('页面样式','Page styles')}>
  <header><h2>{say('页面样式','Page styles')}</h2><span/><button className="bl-close" type="button" aria-label={say('关闭模板库','Close template library')} onClick={onClose}><Icon name="close"/></button></header>
  <div className="bt-mode" role="group" aria-label={say('样式类型','Style type')}><button type="button" aria-pressed={mode==='appearance'} onClick={()=>setMode('appearance')}>{say('视觉主题','Visual theme')}</button><button type="button" aria-pressed={mode==='layout'} onClick={()=>setMode('layout')}>{say('页面排版','Page layout')}</button></div>
  <p role="status" className="bt-current">{say('当前：','Current: ')}{say(current.zh,current.en)} · {say((blogTemplates.find(item=>item.id===(value||'anx'))||blogTemplates[0]).zh,(blogTemplates.find(item=>item.id===(value||'anx'))||blogTemplates[0]).en)}</p>
  <p>{say(mode==='appearance'?'只改变配色、字体与质感，保留当前排版和内容。':'调整页面结构，可搭配任意视觉主题。文字与图片保留，可撤销。',mode==='appearance'?'Change colors, type and texture. Keep your layout and content.':'Choose a structure with any visual theme. Content stays; changes are undoable.')}</p>
  {mode==='appearance'?<div className="bt-appearance-choices">{blogAppearances.map(item=><button key={item.id} type="button" aria-label={say('应用主题：','Apply theme: ')+say(item.zh,item.en)} aria-pressed={current.id===item.id} disabled={disabled} onClick={()=>onAppearance(item.id)}>
   <span className="bt-theme-sample" data-appearance={item.id} aria-hidden="true"><span>{say('关于我','About me')}</span><b>{item.id==='sketch'?'Hello, world.':item.id==='mint-docs'?'Built with care.':item.id==='mint-serif'?'A quieter story.':item.id==='night-player'?'Made of stories.':'Your own space.'}</b><i/><i/><em>{say('探索作品','Explore work')} ↗</em></span>
   <span className="bt-theme-copy"><strong>{say(item.zh,item.en)}</strong><small>{say(item.description,item.english)}</small></span>{current.id===item.id&&<Icon name="check"/>}
  </button>)}</div>:<div className="bt-page-choices">{blogTemplates.map(item=><button key={item.id} type="button" aria-label={say('应用模板：','Apply template: ')+say(item.zh,item.en)} aria-pressed={(value||'anx')===item.id} disabled={disabled} onClick={()=>onChoose(item.id)}><TemplateThumbnail value={item.id}/><span><strong>{say(item.zh,item.en)}</strong><small>{say(item.description,item.english)}</small></span>{(value||'anx')===item.id&&<Icon name="check"/>}</button>)}</div>}
 </section>;
}
