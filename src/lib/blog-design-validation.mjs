import {requireValue,cleanText} from './content.mjs';
import {designParts,stickerStyles} from './blog-design.mjs';
import {blogTemplates,resumePresentations} from './blog-templates.mjs';
const number=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):fallback;
const color=(v,fallback)=>{requireValue(v===undefined||v===''||/^#[a-f0-9]{6}$/i.test(v),'请选择有效颜色');return v||fallback};
export function validateBlogDesign(input,url){
 requireValue(input&&input.version===1&&Array.isArray(input.nodes)&&input.nodes.length<=60,'页面最多60个图层');
 const width=number(input.width,640,1440,940),background=color(input.background,'#ffffff');
 requireValue(input.template===undefined||blogTemplates.some(t=>t.id===input.template),'页面模板无效');
 const nodes=input.nodes.map((n,i)=>{
  requireValue(n&&typeof n==='object'&&/^[a-z][a-z0-9-]{0,59}$/.test(n.id)&&['template','text','image','button','sticker'].includes(n.kind),'页面图层格式无效');
  requireValue(n.kind!=='template'||designParts.includes(n.part)||['content:projects','content:articles','content:resources'].includes(n.part)||/^section:[a-z][a-z0-9-]{0,49}$/.test(n.part),'模板栏目无效');
  requireValue(n.presentation===undefined||n.kind==='template'&&resumePresentations.some(p=>p.id===n.presentation),'简历栏目样式无效');
  const f=n.frame||{},x=number(f.x,n.kind==='sticker'?-240:0,width-80,0),style=n.style||{},assetId=cleanText(n.assetId,50);
  requireValue(!assetId||/^[a-f0-9-]{36}$/.test(assetId),'图片标识无效');
  const bg=color(style.background,''),fg=color(style.color,'');
  // Inherited or custom page colours must still leave readable text.
  const lum=c=>{const a=c.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
  const a=lum(bg||background),b=lum(fg||'#202124');requireValue((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'文字与背景对比度不足');
  requireValue(n.kind!=='sticker'||stickerStyles.includes(n.sticker),'贴纸样式无效');const anchor=n.kind==='sticker'?cleanText(n.anchor,60):'';
  const translations=Object.fromEntries(['zh','en','ja'].filter(lang=>n.translations?.[lang]).map(lang=>[lang,Object.fromEntries(['label','text','alt'].map(key=>[key,cleanText(n.translations[lang][key],key==='text'?6000:300)]))]));
  return {translations,id:n.id,kind:n.kind,locked:n.locked===true,...(n.kind==='sticker'?{sticker:n.sticker,anchor}:{}),...(n.kind==='template'?{part:n.part,...(n.presentation?{presentation:n.presentation}:{})}:{}),label:cleanText(n.label,100),text:cleanText(n.text,6000),alt:cleanText(n.alt,300),url:url(n.url),assetId,hidden:n.hidden===true,frame:{x,y:number(f.y,n.kind==='sticker'?-240:0,40000,i*300),w:number(f.w,80,n.kind==='sticker'?400:width-x,n.kind==='sticker'?140:width-x),h:number(f.h,40,20000,240)},style:{background:bg,color:fg,rotation:number(style.rotation,-30,30,0),font:['serif','sans','mono'].includes(style.font)?style.font:'serif',fontSize:number(style.fontSize,12,96,n.kind==='text'?28:16),align:['left','center','right'].includes(style.align)?style.align:'left',padding:number(style.padding,0,80,0),radius:number(style.radius,0,48,0)}};
 });
 for(const node of nodes)if(node.anchor)requireValue(nodes.some(n=>n.id===node.anchor&&n.kind==='template'),'贴纸只能跟随页面中的内容图层');
 requireValue(new Set(nodes.map(n=>n.id)).size===nodes.length,'图层标识重复');requireValue(JSON.stringify(nodes).length<=240000,'页面内容过多，请精简至240KB以内');
 return {version:1,...(input.decorations===1?{decorations:1}:{}),...(input.template?{template:input.template}:{}),width,background,autoLayout:input.autoLayout===true,nodes};
}
