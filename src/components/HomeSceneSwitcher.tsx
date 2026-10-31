'use client';

import {useEffect,useState} from 'react';
import {useLocale} from './LocaleProvider';
import type {HomeSceneKind} from './V2Atmosphere';

export function HomeSceneSwitcher({initialScene='space'}:{initialScene?:HomeSceneKind}={}){
 const {locale}=useLocale(),[scene,setScene]=useState(initialScene);
 const labels=locale==='zh'?{space:'星海',moon:'月球',glass:'玻璃',group:'首页背景'}:locale==='ja'?{space:'宇宙',moon:'月',glass:'ガラス',group:'ホームの背景'}:{space:'Space',moon:'Moon',glass:'Glass',group:'Homepage background'};
 useEffect(()=>{
  setScene(initialScene);
  const change=(event:Event)=>{const next=(event as CustomEvent<unknown>).detail;if(next==='space'||next==='moon'||next==='glass')setScene(next);};
  const popstate=()=>{
   const value=new URL(window.location.href).searchParams.get('scene'),next=value==='glass'?'glass':value==='moon'?'moon':'space';
   window.dispatchEvent(new CustomEvent<HomeSceneKind>('spaceyew-home-scene',{detail:next}));
  };
  window.addEventListener('spaceyew-home-scene',change);window.addEventListener('popstate',popstate);
  return()=>{window.removeEventListener('spaceyew-home-scene',change);window.removeEventListener('popstate',popstate);};
 },[initialScene]);
 const select=(next:HomeSceneKind)=>{
  const url=new URL(window.location.href);url.searchParams.set('scene',next);
  window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  setScene(next);window.dispatchEvent(new CustomEvent<HomeSceneKind>('spaceyew-home-scene',{detail:next}));
 };
 return <div className="v2-scene-switcher" role="group" aria-label={labels.group}>{(['space','moon','glass'] as const).map(kind=><button key={kind} type="button" aria-pressed={scene===kind} onClick={()=>select(kind)}>{labels[kind]}</button>)}</div>;
}
