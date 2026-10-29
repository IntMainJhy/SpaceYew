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
 check:{path:'M67 26C67 1 21 3 11 26S13 70 38 72 79 51 71 35 M23 37l14 15 27-31'},
 bracket:{box:'0 0 160 80',path:'M36 9C18 8 15 10 16 25L18 65 38 67 M124 10c18-2 21 1 20 16l-2 39-20 3 M25 12l-2 50 M136 13l-2 48'}
};
const pixels:Record<string,{box?:string;path:string;color:string;detail?:string}>={
 'pixel-heart':{color:'#bf667b',path:'M3 4h5v2h2v2h4V6h2V4h5v2h2v8h-2v2h-2v2h-2v2h-2v2H9v-2H7v-2H5v-2H3v-2H1V6h2Z',detail:'M5 7h3v2H5Z'},
 'pixel-star':{color:'#d4ad54',path:'M10 1h4v6h2v2h7v4h-3v3h-3v7h-4v-3h-2v3H7v-7H4v-3H1V9h7V7h2Z',detail:'M10 8h2v4h-2Z'},
 'pixel-cursor':{color:'#7181a7',path:'M4 2h2v2h2v2h2v2h2v2h2v2h2v2h3v2h-7v6H9v-6H7v3H4Z',detail:'M6 6h2v2H6Z'},
 'pixel-smile':{color:'#cfaa57',path:'M5 2h14v2h3v3h2v10h-2v3h-3v2H5v-2H2v-3H0V7h2V4h3Z',detail:'M6 7h3v4H6Zm9 0h3v4h-3ZM5 14h3v3h8v-3h3v5H5Z'},
 'pixel-spark':{color:'#9e7da5',path:'M10 0h4v6h2v2h2v2h6v4h-6v2h-2v2h-2v6h-4v-6H8v-2H6v-2H0v-4h6V8h2V6h2Z',detail:'M10 9h4v5h-4Z'},
 'pixel-window':{box:'0 0 40 28',color:'#7f9aab',path:'M2 1h36v2h2v23h-2v2H2v-2H0V3h2Zm2 9v14h32V10Z',detail:'M5 4h3v3H5Zm6 0h3v3h-3Zm19 0h4v3h-4ZM9 14h3v3H9Zm6 0h15v3H15Zm-6 6h18v2H9Z'},
 'pixel-sprout':{color:'#6c927e',path:'M10 11h4v11h-4ZM1 4h7v2h3v3h2v4H7v-2H4V9H1Zm22-3v8h-3v3h-6v3h-3V7h3V4h3V1Z',detail:'M4 6h3v2H4Zm13-2h3v2h-3Z'}
};
function ColorCutout({id,label}:{id:string;label?:string}){
 return <svg className="bd-sticker-symbol bd-sticker-cutout" viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
  {id==='pop-flower'&&<><path d="M59 10c10-17 28-2 24 12 21-4 28 18 10 27 20 12 6 33-12 27-1 22-26 24-31 5-17 12-34-5-20-21C8 55 12 32 33 32c-9-19 12-34 26-22Z" fill="var(--sticker-accent,#e5c668)"/><circle cx="59" cy="48" r="15" fill="#fff7db"/><path d="M51 45v2m15-2v2m-15 8q8 7 16-1"/></>}
  {id==='pop-bolt'&&<><path d="m62 5-34 47 22 4-9 38 50-55-26-3 17-29Z" fill="var(--sticker-accent,#d6c2e0)"/><path d="m58 17-20 29 23 2-8 27"/><path d="m95 14-5 7m13 11-9 1"/></>}
  {id==='pop-rainbow'&&<><path d="M14 85V59a46 46 0 0 1 92 0v26Z" fill="var(--sticker-accent,#cc8c84)"/><path d="M27 85V59a33 33 0 0 1 66 0v26Z" fill="#e1c477"/><path d="M40 85V59a20 20 0 0 1 40 0v26Z" fill="#91b2a1"/><path d="M52 85V59a8 8 0 0 1 16 0v26Z" fill="#fff9ee"/></>}
  {id==='pop-confetti'&&<><path d="m44 31 42 41-65 16Z" fill="var(--sticker-accent,#9aabc4)"/><path d="m35 51 22 27m-30-9 6 13M52 22l3-10m20 18 11-9m6 32 14-2"/><path d="m30 12 5 5-5 6-6-6Z" fill="#d4a55d"/><circle cx="86" cy="9" r="5" fill="#b88c9b"/><path d="m101 72 7-2 3 8-7 3Z" fill="#c8b1d4"/><path d="M65 49c-5-13 7-18 10-11s-7 6-10 1"/></>}
  {id==='pop-orbit'&&<><circle cx="60" cy="49" r="30" fill="var(--sticker-accent,#b7a4c9)"/><path d="M34 35C-1 43 6 78 65 61s70-46 20-31"/><path d="M35 34c-13 7-12 17-4 22m42-33 3 10" stroke="#fbf4e4" strokeWidth="4"/><path d="m97 8 3 7 8 2-7 4-1 8-4-7-8-2 7-4Z" fill="#e8c875"/></>}
  {id==='pop-heart'&&<><path d="M59 88C42 77 17 59 19 35s31-26 41-7C72 6 103 15 102 39S75 77 59 88Z" fill="var(--sticker-accent,#c88191)"/><path d="M28 36c1-9 10-13 16-9" stroke="#fff7ed" strokeWidth="4"/><path d="m96 75 4 5m-82-8-7 2"/></>}
 </svg>;
}
export function BlogSticker({node,children,inlineEditing=true}:{node:SpaceData;children?:ReactNode;inlineEditing?:boolean}){
 const {locale}=useLocale(),edit=useBlogEditing(),text=node.translations?.[locale]?.text?.trim()?node.translations[locale].text:node.text||'',preset=stickerPresets.find(p=>p.id===node.sticker),label=locale==='en'?preset?.en:preset?.zh,drawing=drawings[node.sticker],pixel=pixels[node.sticker],cutout=node.sticker.startsWith('pop-'),graphic=!!(drawing||pixel||cutout);
 const copy=children??((edit&&inlineEditing)||!edit?<DesignText path={['$sticker']} label={locale==='en'?'Sticker text':'贴纸文字'} max={300}>{text}</DesignText>:text);
 const customPaint=!!(node.style?.color||node.style?.background),inkLabel=node.sticker==='label-solid',style={'--sticker-turn':(node.style?.rotation||0)+'deg','--sticker-accent':node.style?.color||undefined,'--sticker-surface':node.style?.background||undefined,...(inkLabel?{background:customPaint?node.style?.background||'#ffffff':'#202124',color:customPaint?node.style?.color||'#202124':'#ffffff'}:{})} as CSSProperties;
 return <div className={'bd-sticker bd-sticker-'+node.sticker} style={style} data-sticker={node.sticker} data-family={preset?.group}>
  {drawing&&<svg className="bd-sticker-symbol" viewBox={drawing.box||'0 0 80 80'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={node.alt||label}><path d={drawing.path}/></svg>}
  {pixel&&<svg className="bd-sticker-symbol bd-sticker-pixel-art" viewBox={pixel.box||'0 0 24 24'} fill="none" role="img" aria-label={node.alt||label} shapeRendering="crispEdges"><path d={pixel.path} fill={'var(--sticker-accent,'+pixel.color+')'} fillRule="evenodd"/>{pixel.detail&&<path d={pixel.detail} fill={node.sticker==='pixel-smile'?'#453c31':'#fff9ef'} opacity={node.sticker==='pixel-smile'?1:.8}/>}</svg>}
  {cutout&&<ColorCutout id={node.sticker} label={node.alt||label}/>}
  {(text||children||!graphic||edit&&inlineEditing)&&<div className="bd-sticker-copy">{copy}</div>}
  {node.sticker==='note'&&<svg className="bd-note-arrow" viewBox="0 0 96 58" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 4c-1 25 18 37 54 34"/><path d="m66 28 12 10-11 10"/></svg>}
 </div>;
}
