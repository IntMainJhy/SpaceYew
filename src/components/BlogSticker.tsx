'use client';
import type {CSSProperties,ReactNode} from 'react';
import {useLocale} from './LocaleProvider';
import {DesignText,useBlogEditing} from './BlogDesignFields';
import type {SpaceData} from './SpaceBoard';
export const stickerPresets=[
 {id:'note',zh:'手写箭头',en:'Arrow note',text:'保持联系',english:'Keep in touch',w:132,fontSize:18},
 {id:'tape',zh:'纸胶带便签',en:'Paper note',text:'一点灵感',english:'A little inspiration',w:188,fontSize:21},
 {id:'stamp',zh:'文字印章',en:'Text stamp',text:'用心制作',english:'Made with care',w:168,fontSize:20},
 {id:'smile',zh:'微笑',en:'Smile',text:'',english:'',w:92,fontSize:18},
 {id:'sparkle',zh:'闪光',en:'Sparkle',text:'',english:'',w:88,fontSize:18},
 {id:'emoji',zh:'表情',en:'Emoji',text:'👋',english:'👋',w:100,fontSize:60}
];
export function BlogSticker({node,children}:{node:SpaceData;children?:ReactNode}){
 const {locale}=useLocale(),edit=useBlogEditing(),text=node.translations?.[locale]?.text?.trim()?node.translations[locale].text:node.text||'',title=stickerPresets.find(p=>p.id===node.sticker),label=locale==='en'?title?.en:title?.zh;
 const copy=children??(edit?<DesignText path={['$sticker']} label={locale==='en'?'Sticker text':'贴纸文字'} max={300}>{text}</DesignText>:text);
 return <div className={'bd-sticker bd-sticker-'+node.sticker} style={{'--sticker-turn':(node.style?.rotation||0)+'deg'} as CSSProperties} data-sticker={node.sticker}>
  {(node.sticker==='smile'||node.sticker==='sparkle')&&<svg className="bd-sticker-symbol" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={node.alt||label}>
   {node.sticker==='smile'?<><circle cx="40" cy="40" r="31"/><path d="M27 43c2 16 24 16 27 0"/><path d="M29 29v5M50 29v5" strokeWidth="4"/></>:<><path d="m40 5 9 26 26 9-26 9-9 26-9-26-26-9 26-9Z"/><path d="m64 7 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" strokeWidth="1.5"/></>}
  </svg>}
  {(text||children||!['smile','sparkle'].includes(node.sticker))&&<div className="bd-sticker-copy">{copy}</div>}
  {node.sticker==='note'&&<svg className="bd-note-arrow" viewBox="0 0 96 58" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 4c-1 25 18 37 54 34"/><path d="m66 28 12 10-11 10"/></svg>}
 </div>;
}
