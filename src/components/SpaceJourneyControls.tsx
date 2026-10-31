'use client';

import {useEffect,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';

type JourneyState={ready:boolean;focus:boolean;phase:'far'|'belt'|'near';compact:boolean;failed:boolean};
const initialState:JourneyState={ready:false,focus:false,phase:'far',compact:true,failed:false};
const isPhase=(value:unknown):value is JourneyState['phase']=>value==='far'||value==='belt'||value==='near';
const labels={
 zh:{group:'太空漫游',far:'远观银河',belt:'穿越小行星带',near:'抵近月面',pointer:'向下滚动前进 · 拖动环顾 · 点击小行星',touch:'向下滑动，驶向月面',start:'进入星海',loading:'场景载入中…',fallback:'交互场景暂不可用，可继续浏览内容。',focus:'观察小行星',reset:'返回航线',skip:'跳过漫游'},
 en:{group:'Space journey',far:'Distant galaxy',belt:'Asteroid belt',near:'Lunar arrival',pointer:'Scroll to advance · Drag to look · Click an asteroid',touch:'Swipe down to approach the Moon',start:'Enter the stars',loading:'Loading scene…',fallback:'The interactive scene is unavailable. You can continue browsing.',focus:'Observe an asteroid',reset:'Return to flight',skip:'Skip journey'},
 ja:{group:'宇宙の旅',far:'遠くの銀河',belt:'小惑星帯を抜けて',near:'月面へ接近',pointer:'スクロールで前進 · ドラッグで見渡す · 小惑星をクリック',touch:'下にスワイプして月面へ',start:'星の海へ',loading:'シーンを読み込み中…',fallback:'インタラクティブなシーンは利用できません。引き続きコンテンツをご覧いただけます。',focus:'小惑星を観察',reset:'航路に戻る',skip:'旅をスキップ'},
};

export function SpaceJourneyControls(){
 const {locale}=useLocale(),copy=labels[locale],element=useRef<HTMLDivElement>(null),[state,setState]=useState<JourneyState>(initialState);
 useEffect(()=>{
  const host=element.current?.closest<HTMLElement>('.v2-home');
  if(host){
   const ready=host.dataset.journeyReady==='true';
   setState({ready,focus:host.dataset.journeyFocus==='true',phase:isPhase(host.dataset.journeyPhase)?host.dataset.journeyPhase:'far',compact:host.dataset.journeyCompact==='true'||!ready,failed:host.dataset.journeyFailed==='true'});
  }
  const change=(event:Event)=>{
   const detail=(event as CustomEvent<unknown>).detail;
   if(!detail||typeof detail!=='object')return;
   const value=detail as Partial<JourneyState>;
   setState(current=>{
    const next={ready:typeof value.ready==='boolean'?value.ready:current.ready,focus:typeof value.focus==='boolean'?value.focus:current.focus,phase:isPhase(value.phase)?value.phase:current.phase,compact:typeof value.compact==='boolean'?value.compact:current.compact,failed:typeof value.failed==='boolean'?value.failed:current.failed};
    return Object.keys(next).every(key=>next[key as keyof JourneyState]===current[key as keyof JourneyState])?current:next;
   });
  };
  window.addEventListener('spaceyew-space-state',change);
  return()=>window.removeEventListener('spaceyew-space-state',change);
 },[]);
 const command=(detail:'focus'|'reset'|'start')=>window.dispatchEvent(new CustomEvent('spaceyew-space-command',{detail}));
 return <div ref={element} className="v2-journey-controls" role="group" aria-label={copy.group} data-ready={state.ready} data-focus={state.focus} data-phase={state.phase} data-compact={state.compact} data-failed={state.failed}>
  <div className="v2-journey-phases">{(['far','belt','near'] as const).map((phase,index)=><span className="v2-journey-phase" data-phase={phase} key={phase}><span aria-hidden="true">0{index+1}/03</span> {copy[phase]}</span>)}</div>
  <p className="v2-journey-hint">{state.failed?copy.fallback:<><span className="v2-journey-hint-pointer">{copy.pointer}</span><span className="v2-journey-hint-touch">{copy.touch}</span></>}</p>
  <div className="v2-journey-actions">
   {!state.failed&&(!state.ready||state.compact)&&<button className="v2-journey-start" type="button" disabled={!state.ready} onClick={()=>command('start')}>{state.ready?copy.start:copy.loading}</button>}
   {state.ready&&!state.compact&&state.phase==='belt'&&!state.focus&&<button className="v2-journey-focus" type="button" onClick={()=>command('focus')}>{copy.focus}</button>}
   {state.focus&&<button className="v2-journey-reset" type="button" onClick={()=>command('reset')}>{copy.reset}</button>}
   <a className="v2-journey-skip" href="#creators">{copy.skip}</a>
  </div>
 </div>;
}
