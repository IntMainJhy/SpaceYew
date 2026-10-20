'use client';
import {useLocale} from './LocaleProvider';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {localeDate} from '@/lib/i18n.mjs';
import {api,post} from '@/lib/client';
import {Icon} from './Icons';
export type Doc=Record<string,any>;
export const button='organic-button px-6 py-3 rounded-full font-medium transition-colors duration-300';
export const primary=button+' is-primary',secondary=button+' is-secondary';
export const inputClass='organic-input px-5 py-3 bg-white border border-stone-200 rounded-full text-stone-800 placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition-all duration-300';
export const labels:Record<string,string>={draft:'草稿',pending:'待审核',reviewing:'审核中',returned:'退回修改',rejected:'未通过',approved:'已通过',withdrawn:'已撤回',removed:'已移除',private:'未公开',public:'已公开',paused:'暂停公开',offline:'已下架',open:'待分流',processing:'处理中',needs_info:'待补充',resolved:'已结案',active:'正常',restricted:'限制投稿',banned:'已封禁',closed:'已注销',member:'成员',reviewer:'审核员',owner:'站长',local_test:'本地测试资格',report:'举报',rights:'权利投诉',appeal:'申诉',original:'本人原创',authorized:'已获授权',official:'官方链接介绍',qualify:'资格确认'};
export const date=(s:string,locale='en')=>localeDate(s,locale);
export function CommunityBackBar({label,href='/community',backLabel='返回社区',heading=false,action}:{label:string;href?:string;backLabel?:string;heading?:boolean;action?:React.ReactNode}){const {t:tr,locale}=useLocale();return <nav className="community-route-bar" aria-label={label?tr('导航：{0}',[tr(label)]):tr(backLabel)}><Link href={href} aria-label={tr(backLabel)} title={tr(backLabel)}>{tr(backLabel)}</Link>{heading?<h1>{tr(label)}</h1>:label?<strong>{tr(label)}</strong>:null}{action&&<div className="community-route-action">{tr(action)}</div>}</nav>}
export function Badge({value}:{value:string}){const {t:tr,locale}=useLocale();return <span className={'community-badge status-'+value}>{tr(labels[value]||value)}</span>}
export function Notice({children,error=false}:{children:React.ReactNode,error?:boolean}){const {t:tr,locale}=useLocale();return <div className={'community-feedback'+(error?' is-error':'')} role={error?'alert':'status'}>{typeof children==='string'?tr(children):children}</div>}
export function Empty({title,children}:{title:string,children?:React.ReactNode}){const {t:tr,locale}=useLocale();return <div className="community-empty"><Icon name="file"/><h2>{tr(title)}</h2>{children&&<div className="community-empty-detail">{typeof children==='string'?tr(children):children}</div>}</div>}
export function CommunityField({label,name,value,onChange,area=false,type='text',required=false,help='',maxLength}:{label:string,name:string,value:string,onChange:(s:string)=>void,area?:boolean,type?:string,required?:boolean,help?:string,maxLength?:number}){const {t:tr,locale}=useLocale();return <div className="field"><label htmlFor={name}>{tr(label)}{required?' *':''}</label>{area?<textarea placeholder=" " id={name} value={value} onChange={e=>onChange(e.target.value)} maxLength={maxLength} rows={5} required={required} aria-describedby={help?name+'-help':undefined}/>:<input placeholder=" " id={name} className={inputClass} type={type} value={value} onChange={e=>onChange(e.target.value)} maxLength={maxLength} required={required} aria-describedby={help?name+'-help':undefined}/>}{help&&<small id={name+'-help'}>{tr(help)}</small>}</div>}
export function PolicyLinks(){const {t:tr,locale}=useLocale();return <span className="community-policy-links"><Link href="/legal/terms" target="_blank">{tr("用户协议")}</Link>{locale==='zh'?'、':', '}<Link href="/legal/community" target="_blank">{tr("社区规则")}</Link>{locale==='en'?' and ':tr("与")}<Link href="/legal/privacy" target="_blank">{tr("隐私政策草案")}</Link></span>}
export function CommunityText({body}:{body:string}){const {t:tr,locale}=useLocale();
 const inline=(s:string)=>s.split(/(https:\/\/[^\s<>]+)/g).map((part,i)=>part.startsWith('https://')?<a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow ugc">{part}</a>:part);
 return <div className="organic-prose community-prose">{body.split(/(```[\s\S]*?```)/g).map((block,i)=>block.startsWith('```')?<pre key={i}><code>{block.slice(3,-3).replace(/^\w+\n/,'')}</code></pre>:block.split(/\n\s*\n/).filter(Boolean).map((paragraph,j)=>{const text=paragraph.trim();if(text.startsWith('## '))return <h2 key={i+':'+j}>{text.slice(3)}</h2>;if(text.startsWith('### '))return <h3 key={i+':'+j}>{text.slice(4)}</h3>;return <p className="community-preserve" key={i+':'+j}>{inline(text)}</p>}))}</div>;
}
const legalRoutes:Record<string,string>={'用户协议.md':'terms','社区规则.md':'community','隐私政策.md':'privacy','版权投诉与申诉指引.md':'rights'};
export function LegalText({text}:{text:string}){const {t:tr,locale}=useLocale();
 const inline=(s:string)=>s.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).map((part,i)=>{const m=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);if(m){const href=legalRoutes[m[2]]?'/legal/'+legalRoutes[m[2]]:m[2].startsWith('https://')?m[2]:'';return href?<a key={i} href={href} target="_blank" rel="noopener noreferrer">{m[1]}</a>:m[1]}return part.startsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part});
 const lines=text.split('\n').slice(1),blocks:React.ReactNode[]=[];
 for(let i=0;i<lines.length;i++){const line=lines[i].trim();if(!line)continue;
  if(line.startsWith('## ')){blocks.push(<h2 key={i}>{line.slice(3)}</h2>);continue}
  if(line.startsWith('|')&&/^\|\s*:?-/.test(lines[i+1]?.trim()||'')){const cells=(s:string)=>s.trim().slice(1,-1).split('|').map(v=>v.trim()),head=cells(line),rows:string[][]=[];i+=2;while(i<lines.length&&lines[i].trim().startsWith('|'))rows.push(cells(lines[i++]));i--;blocks.push(<div className="table-wrap community-legal-table" tabIndex={0} role="region" aria-label={tr('可横向滚动的规则表格')} key={i}><table><thead><tr>{head.map((c,j)=><th key={j}>{inline(c)}</th>)}</tr></thead><tbody>{rows.map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>);continue}
  if(/^(?:- |\d+\. )/.test(line)){const ordered=/^\d/.test(line),items:string[]=[];let j=i;while(j<lines.length&&(/^(?:- |\d+\. )/.test(lines[j].trim())))items.push(lines[j++].trim().replace(/^(?:- |\d+\. )/,''));i=j-1;const children=items.map((s,k)=><li key={k}>{inline(s)}</li>);blocks.push(ordered?<ol key={i}>{typeof children==='string'?tr(children):children}</ol>:<ul key={i}>{typeof children==='string'?tr(children):children}</ul>);continue}
  blocks.push(<p key={i}>{inline(line)}</p>);
 }
 return <div className="community-policy-text">{blocks}</div>;
}
export {useResource} from './PageResources';
export function useSocialRefresh(refresh:()=>void){useEffect(()=>{window.addEventListener('community-social-change',refresh);return()=>window.removeEventListener('community-social-change',refresh);},[refresh]);}
export function Loading(){const {t:tr,locale}=useLocale();return <div className="community-loading" role="status"><div className="skeleton"/><p>{tr("加载中…")}</p></div>}
export function Retry({error,refresh}:{error:string,refresh:()=>void}){const {t:tr,locale}=useLocale();return <Notice error>{tr(error)} <button className={secondary} onClick={refresh}>{tr("重新加载")}</button></Notice>}
export function Logout(){const {t:tr,locale}=useLocale();const[error,setError]=useState('');return <><button className="link-button" onClick={()=>post('/api/auth/logout',{}).then(()=>{window.location.assign('/login')}).catch(e=>setError(e.message))}>{tr("退出登录")}</button>{error&&<span role="alert">{tr(error)}</span>}</>}
