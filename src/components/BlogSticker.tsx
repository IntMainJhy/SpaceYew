'use client';
import type {CSSProperties,ReactNode} from 'react';
import {useLocale} from './LocaleProvider';
import {DesignText,useBlogEditing} from './BlogDesignFields';
import {stickerPresets} from '@/lib/blog-stickers.mjs';
import type {SpaceData} from './SpaceBoard';
export {stickerPresets};

// Fixed, original line geometry: no random paths or filters that change during a drag.
const drawings:Record<string,{box?:string;path:string}>={
 smile:{path:'M70 40C70 81 7 81 9 39S71-1 70 40Z M27 43C29 60 52 60 54 42 M29 28l-.5 5 M50 28l.5 5'},
 sparkle:{path:'m40 5 9 26 26 9-26 9-9 26-9-26-26-9 26-9Z M64 7l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z'},
 arrow:{box:'0 0 160 80',path:'M10 65C23 17 76 12 139 27 M119 12l23 16-24 13 M14 65C30 29 75 17 131 27'},
 loop:{box:'0 0 160 100',path:'M10 80C24 83 54 79 72 61S90 15 69 16 54 55 80 61 122 51 145 31 M125 35l21-7-3 23'},
 heart:{path:'M40 68C31 61 5 42 8 24S34 5 40 24C49 4 72 7 73 26S51 58 40 68Z M14 24c2-7 9-9 14-6'},
 flower:{path:'M33 30C8 6 48-9 46 23 61-5 86 32 55 38 85 50 48 81 43 53 39 85 2 60 27 44 0 40 9 9 33 30Z M45 32c15 9 0 23-9 14s-1-20 9-14Z M42 59l-1 16'},
 sun:{path:'M58 40c2 25-37 27-38 2S56 15 58 40Z M40 5l-1 9 M40 66l1 9 M5 40l9 1 M66 40l9-1 M14 14l7 7 M61 61l6 6 M14 66l7-7 M60 21l7-7 M30 36v2 M48 35v2 M31 46q9 9 16-1'},
 star:{path:'M40 5 50 29 75 31 56 48 61 73 39 60 17 73 22 47 4 30 30 27Z M43 14l5 18 18 2'},
 burst:{path:'M40 5 39 23 M40 57l1 18 M5 40l18 1 M57 40l18-1 M14 14l14 15 M54 54l13 13 M13 68l14-15 M54 27l14-14 M27 6l5 14 M59 6l-7 14 M6 24l14 7 M62 51l13 6 M22 63l-5 12 M57 63l6 11'},
 underline:{box:'0 0 180 48',path:'M8 22C48 13 112 14 169 18 M15 33C67 22 116 23 165 27 M157 4l3 5 M174 8l-4 6'},
 circle:{box:'0 0 160 90',path:'M139 17C95-9 5 10 9 48S105 99 145 62 116 6 61 12 M132 13C87-2 2 18 17 57'},
 check:{path:'M67 26C67 1 21 3 11 26S13 70 38 72 79 51 71 35 M23 37l14 15 27-31'}
};
export function BlogSticker({node,children,inlineEditing=true}:{node:SpaceData;children?:ReactNode;inlineEditing?:boolean}){
 const {locale}=useLocale(),edit=useBlogEditing(),text=node.translations?.[locale]?.text?.trim()?node.translations[locale].text:node.text||'',title=stickerPresets.find(p=>p.id===node.sticker),label=locale==='en'?title?.en:title?.zh,drawing=drawings[node.sticker];
 const copy=children??(edit&&inlineEditing?<DesignText path={['$sticker']} label={locale==='en'?'Sticker text':'贴纸文字'} max={300}>{text}</DesignText>:text);
 return <div className={'bd-sticker bd-sticker-'+node.sticker} style={{'--sticker-turn':(node.style?.rotation||0)+'deg'} as CSSProperties} data-sticker={node.sticker}>
  {drawing&&<svg className="bd-sticker-symbol" viewBox={drawing.box||'0 0 80 80'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={node.alt||label}><path d={drawing.path}/></svg>}
  {(text||children||!drawing||edit&&inlineEditing)&&<div className="bd-sticker-copy">{copy}</div>}
  {node.sticker==='note'&&<svg className="bd-note-arrow" viewBox="0 0 96 58" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 4c-1 25 18 37 54 34"/><path d="m66 28 12 10-11 10"/></svg>}
 </div>;
}
