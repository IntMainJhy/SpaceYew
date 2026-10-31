'use client';

import {useEffect,useId,useRef,useState,type CSSProperties,type KeyboardEvent,type PointerEvent} from 'react';
import {moveDesignNode} from '@/lib/blog-design.mjs';
import {Icon} from './Icons';
import '@/app/home-blog-canvas-demo.css';

const words={
 zh:{name:'博客画布',demo:'互动演示',edit:'编辑',preview:'预览',layers:'图层',title:'标题',intro:'介绍',note:'便签',add:'添加文字',undo:'撤销',reset:'恢复初始画布',content:'文字内容',color:'文字颜色',hint:'拖动文字，或选中后用方向键移动',local:'演示改动仅在此处生效',resetDone:'已恢复初始画布',added:'已添加文字',moved:'位置已更新',undone:'已撤销',initialTitle:'把想法，写成自己的页面。',initialIntro:'记录发现，分享作品。\n让每一段经历，都有自己的位置。',initialNote:'保持好奇。',newText:'写下你的故事。',blue:'蓝色',ink:'墨色',plum:'紫色',canvas:'可编辑的博客示例画布',empty:'选择画布上的文字，即可修改。'},
 en:{name:'Blog canvas',demo:'Interactive demo',edit:'Edit',preview:'Preview',layers:'Layers',title:'Title',intro:'Introduction',note:'Note',add:'Add text',undo:'Undo',reset:'Reset canvas',content:'Text content',color:'Text color',hint:'Drag text, or select it and use the arrow keys',local:'Changes stay in this demo',resetDone:'Canvas reset',added:'Text added',moved:'Position updated',undone:'Change undone',initialTitle:'Make a page\nthat feels like you.',initialIntro:'Record a discovery. Share your work.\nGive your story a place of its own.',initialNote:'Stay curious.',newText:'Tell your story.',blue:'Blue',ink:'Ink',plum:'Plum',canvas:'Editable example blog canvas',empty:'Select text on the canvas to edit it.'},
 ja:{name:'ブログキャンバス',demo:'操作デモ',edit:'編集',preview:'プレビュー',layers:'レイヤー',title:'タイトル',intro:'紹介',note:'メモ',add:'文字を追加',undo:'元に戻す',reset:'キャンバスをリセット',content:'テキスト',color:'文字色',hint:'文字をドラッグ、または選択して矢印キーで移動',local:'変更はこのデモ内だけに反映されます',resetDone:'キャンバスをリセットしました',added:'文字を追加しました',moved:'位置を更新しました',undone:'元に戻しました',initialTitle:'アイデアを、\n自分らしいページに。',initialIntro:'発見を記録し、作品を共有。\nそれぞれの経験に、居場所を。',initialNote:'好奇心のままに。',newText:'あなたの物語を。',blue:'青',ink:'墨色',plum:'紫',canvas:'編集できるブログのサンプル',empty:'キャンバスの文字を選択して編集。'}
};
type Copy=typeof words.zh;
type DemoNode={id:string;kind:string;label:string;text:string;frame:{x:number;y:number;w:number;h:number};style:{fontSize:number;color:string}};
type Design={version:number;width:number;autoLayout:boolean;nodes:DemoNode[]};
const HEIGHT=380;
function initial(c:Copy):Design{return {version:1,width:560,autoLayout:false,nodes:[
 {id:'title',kind:'text',label:c.title,text:c.initialTitle,frame:{x:40,y:72,w:460,h:112},style:{fontSize:38,color:'#244c8e'}},
 {id:'intro',kind:'text',label:c.intro,text:c.initialIntro,frame:{x:42,y:208,w:430,h:70},style:{fontSize:17,color:'#545b65'}},
 {id:'note',kind:'text',label:c.note,text:c.initialNote,frame:{x:346,y:306,w:170,h:40},style:{fontSize:18,color:'#244c8e'}}
]};}
const same=(a:Design,b:Design)=>JSON.stringify(a)===JSON.stringify(b);

/** A local, bounded sample of BlogCanvas. It shares page geometry, never account data or saving APIs. */
export function HomeBlogCanvasDemo({locale='zh'}:{locale?:string}){
 const c=words[locale as keyof typeof words]||words.en,id=useId();
 const [design,setDesign]=useState(()=>initial(c)),[selected,setSelected]=useState('title'),[preview,setPreview]=useState(false),[past,setPast]=useState<Design[]>([]),[scale,setScale]=useState(.5),[message,setMessage]=useState('');
 const stage=useRef<HTMLDivElement>(null),live=useRef(design),serial=useRef(0),editStart=useRef<Design|null>(null),drag=useRef<{id:string;x:number;y:number;before:Design;pointer:number}|null>(null);
 live.current=design;
 useEffect(()=>{const element=stage.current;if(!element)return;const measure=()=>{const next=Math.max(.15,Math.min(1,(element.clientWidth-28)/560,(element.clientHeight-28)/HEIGHT));setScale(value=>Math.abs(next-value)<.001?value:next)};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect()},[]);
 const active=design.nodes.find(node=>node.id===selected);
 function remember(before:Design){if(!same(before,live.current))setPast(items=>[...items.slice(-19),before])}
 function commit(next:Design){const before=live.current;if(same(next,before))return;setPast(items=>[...items.slice(-19),before]);live.current=next;setDesign(next)}
 function updateText(text:string){const next={...live.current,nodes:live.current.nodes.map(node=>node.id===selected?{...node,text}:node)};live.current=next;setDesign(next)}
 function finishText(){if(editStart.current){remember(editStart.current);editStart.current=null}}
 function undo(){const editing=editStart.current;editStart.current=null;const draft=editing&&!same(editing,live.current)?editing:null,previous=draft||past.at(-1);if(!previous)return;if(!draft)setPast(items=>items.slice(0,-1));live.current=previous;setDesign(previous);setSelected(value=>previous.nodes.some(node=>node.id===value)?value:previous.nodes[0].id);setMessage(c.undone)}
 function reset(){drag.current=null;editStart.current=null;const next=initial(c);live.current=next;setDesign(next);setSelected('title');setPast([]);setPreview(false);setMessage(c.resetDone)}
 function add(){finishText();if(live.current.nodes.length>=6)return;const node:DemoNode={id:'text-'+(++serial.current),kind:'text',label:c.add,text:c.newText,frame:{x:76+(serial.current%3)*24,y:276-(serial.current%3)*40,w:300,h:52},style:{fontSize:22,color:'#244c8e'}};commit({...live.current,nodes:[...live.current.nodes,node]});setSelected(node.id);setMessage(c.added)}
 function position(before:Design,nodeId:string,x:number,y:number){const node=before.nodes.find(item=>item.id===nodeId)!;return moveDesignNode(before,nodeId,{x:Math.max(0,Math.min(before.width-node.frame.w,x)),y:Math.max(0,Math.min(HEIGHT-node.frame.h,y))}) as Design}
 function down(event:PointerEvent<HTMLDivElement>,node:DemoNode){if(preview||event.button>0)return;finishText();setSelected(node.id);event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:node.id,x:event.clientX,y:event.clientY,before:live.current,pointer:event.pointerId};event.preventDefault()}
 function move(event:PointerEvent<HTMLDivElement>){const current=drag.current;if(!current||current.pointer!==event.pointerId)return;const node=current.before.nodes.find(item=>item.id===current.id)!;const next=position(current.before,current.id,node.frame.x+(event.clientX-current.x)/scale,node.frame.y+(event.clientY-current.y)/scale);live.current=next;setDesign(next)}
 function end(event:PointerEvent<HTMLDivElement>,cancel=false){const current=drag.current;if(!current||current.pointer!==event.pointerId)return;drag.current=null;if(cancel){live.current=current.before;setDesign(current.before)}else{remember(current.before);if(!same(current.before,live.current))setMessage(c.moved)}if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 function keys(event:KeyboardEvent<HTMLDivElement>,node:DemoNode){if(preview||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?10:1;commit(position(live.current,node.id,node.frame.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),node.frame.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0)));setMessage(c.moved)}
 return <div className="home-blog-demo" data-preview={preview} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='z'&&!(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)){event.preventDefault();undo()}}}>
  <header className="hbd-header"><span><Icon name="grid"/>{c.name}</span><span className="hbd-demo-label">{c.demo}</span></header>
  <div className="hbd-toolbar"><div className="hbd-tabs" role="tablist" aria-label={c.name}>{[false,true].map(value=><button key={String(value)} id={id+(value?'-preview':'-edit')} role="tab" aria-selected={preview===value} aria-controls={id+'-canvas'} onClick={()=>{finishText();setPreview(value)}} type="button"><Icon name={value?'eye':'cursor'}/>{value?c.preview:c.edit}</button>)}</div><div className="hbd-actions"><button type="button" onClick={undo} disabled={!past.length&&!(editStart.current&&!same(editStart.current,design))} aria-label={c.undo} title={c.undo}><Icon name="undo"/></button><button type="button" onClick={reset} aria-label={c.reset} title={c.reset}><Icon name="redo"/></button></div></div>
  <div className="hbd-workspace">
   {!preview&&<aside className="hbd-layers" aria-label={c.layers}><span>{c.layers}</span>{design.nodes.map(node=><button key={node.id} type="button" aria-pressed={selected===node.id} onClick={()=>{finishText();setSelected(node.id)}}><Icon name="text"/><span>{node.label}</span></button>)}<button type="button" className="hbd-add" onClick={add} disabled={design.nodes.length>=6}><Icon name="plus"/><span>{c.add}</span></button></aside>}
   <div ref={stage} className="hbd-stage" role="tabpanel" id={id+'-canvas'} aria-labelledby={id+(preview?'-preview':'-edit')} aria-label={c.canvas}>
    <div className="hbd-paper-wrap" style={{width:560*scale,height:HEIGHT*scale}}><div className="hbd-paper" style={{width:560,height:HEIGHT,transform:`scale(${scale})`}}>
     <div className="hbd-paper-brand" aria-hidden="true">SpaceYew<span>Blog / 560 px</span></div>
     {design.nodes.map(node=><div key={node.id} className="hbd-node" data-node-id={node.id} data-selected={!preview&&selected===node.id} role={preview?undefined:'button'} tabIndex={preview?undefined:0} aria-label={preview?undefined:node.label+': '+node.text} aria-pressed={preview?undefined:selected===node.id} style={{transform:`translate(${node.frame.x}px,${node.frame.y}px)`,width:node.frame.w,height:node.frame.h,fontSize:node.style.fontSize,color:node.style.color} as CSSProperties} onFocus={()=>{if(!preview)setSelected(node.id)}} onPointerDown={event=>down(event,node)} onPointerMove={move} onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onKeyDown={event=>keys(event,node)}>{node.text}{!preview&&selected===node.id&&<span className="hbd-selection-label" aria-hidden="true">{node.label}</span>}</div>)}
    </div></div>
   </div>
  </div>
  {!preview&&<div className="hbd-inspector">{active?<><label className="hbd-text-field"><span>{c.content}</span><input value={active.text} aria-label={c.content} maxLength={active.id==='title'?38:120} onFocus={()=>{editStart.current=live.current}} onBlur={finishText} onChange={event=>updateText(event.target.value)}/></label><div className="hbd-color-group" role="group" aria-label={c.color}><span>{c.color}</span>{[['#244c8e',c.blue],['#323840',c.ink],['#754b72',c.plum]].map(([color,label])=><button key={color} type="button" className="hbd-swatch" style={{'--hbd-color':color} as CSSProperties} aria-label={label} aria-pressed={active.style.color===color} onClick={()=>{finishText();commit({...live.current,nodes:live.current.nodes.map(node=>node.id===selected?{...node,style:{...node.style,color}}:node)})}}/>)}</div></>:<span>{c.empty}</span>}<button className="hbd-mobile-add" type="button" onClick={add} disabled={design.nodes.length>=6} aria-label={c.add}><Icon name="plus"/></button></div>}
  <footer className="hbd-footer"><span>{preview?c.local:c.hint}</span><span className="hbd-scale" aria-hidden="true">{Math.round(scale*100)}%</span></footer>
  <span className="hbd-sr-only" role="status" aria-live="polite">{message}</span>
 </div>;
}
