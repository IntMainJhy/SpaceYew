'use client';
import {blogTemplates,resumePresentations} from '@/lib/blog-templates.mjs';
import {Icon} from './Icons';
type Say=(zh:string,en:string)=>string;
export function TemplateThumbnail({value,section=false}:{value:string;section?:boolean}){
 return <span className="bt-thumbnail" data-template={value} data-section={section} aria-hidden="true"><span className="bt-thumb-header"><i/><b/><em/></span><span className="bt-thumb-body"><span className="bt-thumb-aside"><i/><i/><i/></span><span className="bt-thumb-entries"><span><b/><i/><i/></span><span><b/><i/><i/></span><span><b/><i/></span></span></span></span>;
}
export function ResumeStyleChoices({value,say,onChoose,disabled=false,insert=false}:{value?:string;say:Say;onChoose:(id:string)=>void;disabled?:boolean;insert?:boolean}){
 return <div className="bt-section-choices" role="group" aria-label={say(insert?'插入简历栏目':'简历栏目样式',insert?'Insert résumé section':'Résumé section style')}>{resumePresentations.map(item=><button key={item.id} type="button" aria-pressed={insert?undefined:(value||'classic')===item.id} aria-label={(insert?say('插入：','Insert: '):say('栏目样式：','Section style: '))+say(item.zh,item.en)} disabled={disabled} onClick={()=>onChoose(item.id)}><TemplateThumbnail value={item.id} section/><strong>{say(item.zh,item.en)}</strong><span>{say(item.description,item.english)}</span></button>)}</div>;
}
export function BlogTemplateLibrary({value,say,onChoose,onClose,disabled}:{value?:string;say:Say;onChoose:(id:string)=>void;onClose:()=>void;disabled:boolean}){
 return <section className="bt-library" aria-label={say('页面模板','Page templates')}><header><h2>{say('页面模板','Page templates')}</h2><span>{blogTemplates.length}</span><button className="bl-close" type="button" aria-label={say('关闭模板库','Close template library')} onClick={onClose}><Icon name="close"/></button></header><p>{say('选择一种排版，保留你的文字、图片与链接。可随时撤销。','Choose a layout. Your text, images and links stay with you. You can undo the change.')}</p><div className="bt-page-choices">{blogTemplates.map(item=><button key={item.id} type="button" aria-label={say('应用模板：','Apply template: ')+say(item.zh,item.en)} aria-pressed={(value||'anx')===item.id} disabled={disabled} onClick={()=>onChoose(item.id)}><TemplateThumbnail value={item.id}/><span><strong>{say(item.zh,item.en)}</strong><small>{say(item.description,item.english)}</small></span>{(value||'anx')===item.id&&<Icon name="check"/>}</button>)}</div></section>;
}
