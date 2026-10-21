'use client';
import {useState} from 'react';
import {useLocale} from './LocaleProvider';
import {Icon} from './Icons';

type Method={id:string;label:string;where:string;commands:string[];note:string;sourceUrl:string};
type Installation={supportNote:string;requirements:string;after:string;methods:Method[]};

function CopyCommand({command,index}:{command:string;index:number}){
 const {t}=useLocale(),[status,setStatus]=useState<'idle'|'copied'|'error'>('idle');
 return <div className="skill-command" role="group" aria-label={t('安装命令 {0}',[index+1])}><div className="skill-command-toolbar"><span>{t('命令 {0}',[index+1])}</span><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(command);setStatus('copied')}catch{setStatus('error')}}} aria-label={t('复制安装命令 {0}',[index+1])}><Icon name={status==='copied'?'check':'file'}/>{t(status==='copied'?'已复制':'复制命令')}</button></div><pre tabIndex={0}><code>{command}</code></pre><p className={status==='error'?'skill-command-error':'skill-search-label'} role="status">{status==='copied'?t('已复制'):status==='error'?t('复制失败，请手动选择代码。'):''}</p></div>;
}

export function SkillInstallation({installation}:{installation:Installation}){
 const {t}=useLocale(),[selected,setSelected]=useState(installation.methods[0].id);
 const method=installation.methods.find(item=>item.id===selected)||installation.methods[0];
 return <div className="skill-install-guide"><div className="skill-install-choice"><label htmlFor="skill-install-tool">{t('选择 AI 工具')}</label><select id="skill-install-tool" value={selected} onChange={event=>setSelected(event.target.value)}>{installation.methods.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></div><p className="skill-run-location">{t('执行位置：{0}',[t(method.where)])}</p><p>{t(method.note)}</p>{method.commands.map((command,index)=><CopyCommand key={method.id+command} command={command} index={index}/>)}{!method.commands.length&&<a className="space-btn" href={method.sourceUrl} target="_blank" rel="noopener noreferrer">{t('打开官方操作指南')}<Icon name="link"/></a>}<p className="skill-install-after">{t(installation.after)}</p><a className="space-link" href={method.sourceUrl} target="_blank" rel="noopener noreferrer">{t('核对官方安装说明')}<Icon name="link"/></a></div>;
}
