'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import styles from './CharacterCompanion.module.css';

const portrait='/images/companion/leaf-traveler.webp';
const base='/images/companion/leaf-traveler-base.webp';
const body='/images/companion/leaf-traveler-body.webp';
type Action='blink'|'greet'|'turn';
const headPose=(yaw:number,pitch=0,roll=0)=>`perspective(1800px) rotateY(${yaw}deg) rotateX(${pitch}deg) rotateZ(${roll}deg)`;

/** Original artwork stays the no-script / failed-layer fallback. Eyes are composited
 * from that same artwork, so blinking preserves its painted identity. */
export function CharacterCompanion(){
  const {locale}=useLocale();
  const copy=locale==='zh'?{
    title:'一片叶子，\n一点好奇。',intro:'一个会回应你的陪伴角色。',hint:'移动鼠标，它会看向你；轻点一下，和它打个招呼。',
    name:'星芽旅人',greet:'和星芽旅人打招呼',hello:'看到你了，很高兴见到你。',blink:'眨眨眼',turn:'转转头',pause:'暂停动作',resume:'继续动作',
    background:'背景',light:'浅色背景',dark:'深色背景',transparent:'透明底素材 · 头部、眼睛与身体独立运动',reduced:'已跟随系统减少动态效果',loading:'正在准备角色动作…',failed:'动态素材加载失败，已显示原画。',
  }:locale==='ja'?{
    title:'一枚の葉、\n小さな好奇心。',intro:'あなたに応える、小さな仲間。',hint:'ポインターを動かすと目で追います。タップして挨拶しましょう。',
    name:'葉の旅人',greet:'葉の旅人に挨拶する',hello:'会えてうれしいです。',blink:'まばたき',turn:'首をかしげる',pause:'動きを一時停止',resume:'動きを再開',
    background:'背景',light:'明るい背景',dark:'暗い背景',transparent:'透過素材 · 頭、目と体が別々に動きます',reduced:'システム設定に合わせて動きを抑えています',loading:'動きを準備しています…',failed:'動きを読み込めませんでした。元のイラストを表示しています。',
  }:{
    title:'A little leaf.\nA curious soul.',intro:'A small companion that notices you.',hint:'Move your pointer to catch its eye. Tap the character to say hello.',
    name:'Leaf traveler',greet:'Say hello to the leaf traveler',hello:'There you are. Lovely to see you.',blink:'Blink',turn:'Turn head',pause:'Pause motion',resume:'Resume motion',
    background:'Background',light:'Light background',dark:'Dark background',transparent:'Transparent artwork · Independent head, eyes and body motion',reduced:'Following your reduced motion preference',loading:'Preparing character motion…',failed:'Motion artwork could not load. Showing the original illustration.',
  };
  const id=useId().replaceAll(':','');
  const root=useRef<HTMLDivElement>(null),figure=useRef<HTMLSpanElement>(null);
  const left=useRef<SVGGElement>(null),right=useRef<SVGGElement>(null),lids=useRef<SVGGElement>(null);
  const action=useRef<(action?:Action)=>void>(()=>{});
  const head=useRef<HTMLSpanElement>(null);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(true),[visible,setVisible]=useState(true),[inView,setInView]=useState(false);
  const [dark,setDark]=useState(false),[greeting,setGreeting]=useState(0);
  const active=ready&&!paused&&!reduced&&visible&&inView;

  useEffect(()=>{
    let disposed=false;
    // Decode every layer before replacing the complete, already-visible portrait.
    Promise.all([portrait,base,body].map(src=>{const image=new Image();image.src=src;return image.decode();}))
      .then(()=>{if(!disposed)setReady(true);},()=>{if(!disposed)setFailed(true);});
    return()=>{disposed=true;};
  },[]);

  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(preference.matches),visibility=()=>setVisible(!document.hidden);
    change();visibility();
    preference.addEventListener('change',change);document.addEventListener('visibilitychange',visibility);
    const observer=new IntersectionObserver(entries=>setInView(entries.some(entry=>entry.isIntersecting)),{threshold:.15});
    if(root.current)observer.observe(root.current);
    return()=>{observer.disconnect();preference.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);};
  },[]);

  useEffect(()=>{
    if(!active){action.current=()=>{};for(const key of ['--look-x','--look-y','--head-yaw','--head-pitch','--head-roll'])root.current?.style.removeProperty(key);return;}
    let timer:ReturnType<typeof setTimeout>;
    const animations=new Set<Animation>();
    const play=(node:Element|null,frames:Keyframe[],duration:number)=>{
      if(!node?.animate)return;
      const animation=node.animate(frames,{duration,easing:'ease-in-out'});
      animations.add(animation);animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation));
    };
    // A short follow-up blink is occasional, never an endlessly rapid loop.
    const schedule=(quick=false)=>{timer=setTimeout(()=>{blink();schedule(!quick&&Math.random()<.22);},quick?320:1600+Math.random()*2200);};
    const blink=(hello=false)=>{
      animations.forEach(animation=>animation.cancel());animations.clear();
      const duration=hello?680:210;
      for(const eye of [left.current,right.current])play(eye,[
        {transform:'scaleY(1)',offset:0},{transform:'scaleY(.025)',offset:hello ? .25 : .45},
        {transform:'scaleY(.025)',offset:hello ? .7 : .55},{transform:'scaleY(1)',offset:1},
      ],duration);
      play(lids.current,[{opacity:0,offset:0},{opacity:1,offset:.45},{opacity:1,offset:.55},{opacity:0,offset:1}],duration);
      if(hello)play(figure.current,[
        {transform:'rotate(0deg) translateY(0)',offset:0},{transform:'rotate(-3deg) translateY(-7px)',offset:.3},
        {transform:'rotate(2deg) translateY(-3px)',offset:.65},{transform:'rotate(0deg) translateY(0)',offset:1},
      ],720);
    };
    action.current=(kind='blink')=>{
      clearTimeout(timer);blink(kind==='greet');
      if(kind==='turn'){
        play(head.current,[
          {transform:headPose(0),offset:0},{transform:headPose(-12,3,-3),offset:.28},
          {transform:headPose(12,-3,3),offset:.7},{transform:headPose(0),offset:1},
        ],1250);
      }
      schedule();
    };
    schedule();
    return()=>{clearTimeout(timer);animations.forEach(animation=>animation.cancel());action.current=()=>{};};
  },[active]);

  useEffect(()=>{
    const node=root.current;
    if(!active||!node)return;
    let frame=0;
    const move=(event:PointerEvent)=>{
      if(event.pointerType==='touch')return;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const bounds=node.getBoundingClientRect();
        const x=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
        const y=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1));
        node.style.setProperty('--look-x',`${x*7}px`);node.style.setProperty('--look-y',`${y*5}px`);
        node.style.setProperty('--head-yaw',`${x*10}deg`);node.style.setProperty('--head-pitch',`${-y*6}deg`);node.style.setProperty('--head-roll',`${x*3}deg`);
      });
    };
    const reset=()=>{cancelAnimationFrame(frame);for(const key of ['--look-x','--look-y'])node.style.setProperty(key,'0px');for(const key of ['--head-yaw','--head-pitch','--head-roll'])node.style.setProperty(key,'0deg');};
    window.addEventListener('pointermove',move);window.addEventListener('pointerleave',reset);window.addEventListener('blur',reset);
    return()=>{reset();window.removeEventListener('pointermove',move);window.removeEventListener('pointerleave',reset);window.removeEventListener('blur',reset);};
  },[active]);

  useEffect(()=>{
    if(!greeting)return;
    const timer=setTimeout(()=>setGreeting(0),2200);
    return()=>clearTimeout(timer);
  },[greeting]);

  const greet=()=>{setGreeting(value=>value+1);action.current('greet');};
  return <section className={styles.page} aria-labelledby={`${id}-title`}>
    <div className={styles.copy}>
      <h1 id={`${id}-title`}>{copy.title}</h1>
      <p className={styles.intro}>{copy.intro}</p>
      <p className={styles.hint}>{copy.hint}</p>
      <div className={styles.actions}>
        <button type="button" onClick={()=>action.current('blink')} disabled={!active}>{copy.blink}</button>
        <button type="button" onClick={()=>action.current('turn')} disabled={!active}>{copy.turn}</button>
        <button type="button" onClick={()=>setPaused(value=>!value)} disabled={!ready||reduced}>{paused?copy.resume:copy.pause}</button>
      </div>
      <p className={styles.note}>{failed?copy.failed:!ready?copy.loading:reduced?copy.reduced:copy.transparent}</p>
    </div>
    <div className={styles.stage} ref={root} data-active={active} data-background={dark?'dark':'light'}>
      <fieldset className={styles.backgrounds}>
        <legend>{copy.background}</legend>
        <label title={copy.light}><input type="radio" name={`${id}-background`} aria-label={copy.light} checked={!dark} onChange={()=>setDark(false)}/><span className={styles.lightSwatch}/></label>
        <label title={copy.dark}><input type="radio" name={`${id}-background`} aria-label={copy.dark} checked={dark} onChange={()=>setDark(true)}/><span className={styles.darkSwatch}/></label>
      </fieldset>
      <button type="button" className={styles.character} onClick={greet} aria-label={copy.greet}>
        <span className={styles.breathe}><span className={styles.figure} ref={figure}>
          <img className={styles.portrait} src={ready?body:portrait} width="1254" height="1254" alt="" draggable={false}/>
          {ready&&<span className={styles.head} ref={head}><svg className={styles.face} viewBox="0 0 1254 1254" aria-hidden="true">
            <defs>
              {/* Keep the original alpha silhouette; only separate the neck seam. */}
              <clipPath id={`${id}-head`}><path d="M0 0 H1254 V620 H1075 C1065 652 1036 675 1000 685 C981 709 957 719 935 724 C880 739 795 750 730 741 C681 736 650 719 635 708 L620 715 L605 731 H0Z"/></clipPath>
              <clipPath id={`${id}-left`}><path d="M831 557 C850 556 863 578 864 607 C866 636 855 651 832 651 C809 652 797 635 797 610 C797 582 810 558 831 557Z"/></clipPath>
              <clipPath id={`${id}-right`}><path d="M990 498 C1004 494 1016 517 1025 544 C1032 568 1024 580 1013 579 C1001 578 989 558 984 536 C978 516 980 503 990 498Z"/></clipPath>
            </defs>
            <image href={base} width="1254" height="1254" clipPath={`url(#${id}-head)`}/>
            <g className={styles.gaze}>
              <g className={styles.leftEye} ref={left}><image href={portrait} width="1254" height="1254" clipPath={`url(#${id}-left)`}/></g>
              <g className={styles.rightEye} ref={right}><image href={portrait} width="1254" height="1254" clipPath={`url(#${id}-right)`}/></g>
            </g>
            <g className={styles.lids} ref={lids} fill="none" stroke="#55517c" strokeWidth="7" strokeLinecap="round">
              <path d="M804 607 Q830 626 857 605"/><path d="M989 540 Q1007 555 1023 542"/>
            </g>
          </svg></span>}
        </span></span>
      </button>
      <div className={styles.caption}><span>{copy.name}</span><span className={styles.greeting} role="status">{greeting?copy.hello:''}</span></div>
    </div>
  </section>;
}
