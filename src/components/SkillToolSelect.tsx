'use client';
import {useEffect,useState} from 'react';
import {useLocale} from './LocaleProvider';

export function SkillToolSelect({selected,options}:{selected:string;options:{id:string;label:string;count:number}[]}){
 const {t}=useLocale(),[value,setValue]=useState(selected);
 useEffect(()=>setValue(selected),[selected]);
 return <div className="skill-tool-filter"><label htmlFor="skill-tool">{t('按 AI 工具筛选')}</label><select id="skill-tool" name="tool" value={value} onChange={event=>{setValue(event.target.value);event.currentTarget.form?.requestSubmit();}}>{options.map(option=><option key={option.id} value={option.id}>{t(option.label)} · {option.count}</option>)}</select></div>;
}
