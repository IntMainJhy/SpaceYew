'use client';

import {useEffect,useRef,useState} from 'react';
import {useLocale} from './LocaleProvider';
import {mountSkillTypewriter,skillInstallCommand} from '@/lib/skill-install.mjs';

export function SkillInstall({baseUrl,animated=true}:{baseUrl:string;animated?:boolean}){
 const {t}=useLocale(),[status,setStatus]=useState<'idle'|'copied'|'error'>('idle');
 const [reading,setReading]=useState(false),root=useRef<HTMLDivElement>(null),typed=useRef<HTMLSpanElement>(null);
 const command=skillInstallCommand(baseUrl),stopped=!animated||reading||status==='error';
 useEffect(()=>{
  if(!root.current||!typed.current)return;
  if(stopped){typed.current.textContent=command;return;}
  return mountSkillTypewriter(root.current,typed.current,command);
 },[command,stopped]);
 return <div className="skill-install" ref={root} role="group" aria-label={t('安装 SpaceYew Skill')}>
  <pre tabIndex={0} aria-label={t('Skill 安装代码')} onFocus={()=>setReading(true)} onBlur={()=>setReading(false)} onPointerDown={()=>setReading(true)}><code className="skill-install-code"><span className="skill-install-measure" aria-hidden="true">{command}<span className="skill-install-caret"/></span><span className="skill-install-typing" aria-hidden="true"><span ref={typed}>{command}</span><span className="skill-install-caret"/></span><span className="community-sr">{command}</span></code></pre>
  <button type="button" onClick={async()=>{
   try{await navigator.clipboard.writeText(command);setStatus('copied');}
   catch{setStatus('error');}
  }} aria-label={t('复制安装代码')}>{t(status==='copied'?'已复制':'复制代码')}</button>
  <span className={status==='error'?'skill-install-error':'community-sr'} role="status">{status==='copied'?t('已复制'):status==='error'?t('复制失败，请手动选择代码。'):''}</span>
 </div>;
}
