'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {api,bytes,sendFile} from '@/lib/client';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import {localeDate} from '@/lib/i18n.mjs';

export function SpaceFiles(){
 const {t,locale}=useLocale(),[query,setQuery]=useState('page=1'),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[progress,setProgress]=useState(0),control=useRef<AbortController|null>(null),r=useResource('/api/spaces/files?'+query);
 useEffect(()=>()=>control.current?.abort(),[]);
 async function upload(file:File){
  if(busy)return;setBusy('upload');setError('');setMessage('');setProgress(0);control.current=new AbortController();
  try{await sendFile(file,control.current.signal,value=>setProgress(value.progress),()=>{},'/api/spaces/uploads');setMessage('文件已上传。');r.refresh()}catch(e:any){setError(e.name==='AbortError'?'上传已暂停，重新选择原文件可以续传。':e.message);r.refresh()}finally{setBusy('')}
 }
 async function remove(id:string){
  if(!confirm(t('永久删除此文件并释放空间？此操作无法撤销。')))return;
  setBusy(id);setError('');setMessage('');try{await api('/api/spaces/files/'+id,{method:'DELETE'});setMessage('文件已删除，空间已释放。');r.refresh()}catch(e:any){setError(e.message);r.refresh()}finally{setBusy('')}
 }
 function page(value:number){const params=new URLSearchParams(query);params.set('page',String(value));setQuery(params.toString())}
 const data=r.data;
 return <section className="space-panel personal-files" aria-busy={r.refreshing||!!busy}>
  <div className="space-panel-heading"><h1>{t('我的文件')}</h1><label className="space-btn primary file-upload-control">{t('上传文件')}<input type="file" disabled={!!busy} aria-label={t('上传文件')} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file)}}/></label></div>
  {data&&<div className="file-storage"><p>{t('已用空间')} <strong>{bytes(data.used)}</strong> / {bytes(data.quota)}<span>{data.count} / {data.fileLimit} {t('个文件')}</span></p><progress aria-label={t('已用空间')} max={data.quota} value={data.used}/>{data.reserved>0&&<small>{t('上传预留')} {bytes(data.reserved)}</small>}</div>}
  <form className="management-filters" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);setQuery(new URLSearchParams({q:String(form.get('q')||''),kind:String(form.get('kind')),status:String(form.get('status')),page:'1'}).toString())}}>
   <label>{t('搜索文件')}<input name="q" maxLength={100} type="search"/></label><label>{t('文件类型')}<select name="kind"><option value="all">{t('全部文件')}</option><option value="image">{t('图片')}</option><option value="file">{t('其他文件')}</option></select></label><label>{t('引用状态')}<select name="status"><option value="all">{t('全部状态')}</option><option value="unused">{t('未引用')}</option><option value="used">{t('已引用')}</option></select></label><button className="space-btn" disabled={!!busy}>{t('筛选')}</button>
  </form>
  {error&&<p className="space-error" role="alert">{t(error)}</p>}{message&&<p role="status">{t(message)}</p>}
  {busy==='upload'&&<div className="file-transfer" role="status"><span>{t('上传中')} {progress}%</span><button type="button" className="space-btn" onClick={()=>control.current?.abort()}>{t('暂停')}</button></div>}
  {!data?r.error?<p role="alert">{t(r.error)} <button className="space-btn" onClick={r.refresh}>{t('重试')}</button></p>:<p role="status">{t('加载中…')}</p>:<>
   {r.error&&<p className="space-error" role="alert">{t(r.error)}</p>}
   <div className="personal-file-list">{data.items.map((file:any)=><article key={file.id} className="personal-file-row">
    <div className="personal-file-preview">{file.mime.startsWith('image/')?<img src={'/media/'+file.id} alt="" loading="lazy"/>:<span>{file.name.split('.').pop()?.slice(0,8).toUpperCase()||t('文件')}</span>}</div>
    <div className="personal-file-copy"><h2>{file.name}</h2><p>{bytes(file.size)} · {localeDate(file.created,locale,true)}</p>{file.references.length?<details><summary>{t('查看引用')} · {file.references.length}</summary><ul>{file.references.map((ref:any,index:number)=><li key={index}>{ref.href?<Link href={ref.href}>{t(ref.kind)}</Link>:t(ref.kind)}</li>)}</ul></details>:<span className="file-unused">{t('未引用')}</span>}</div>
    <div className="space-actions"><a className="space-btn" href={'/download/'+file.id}>{t('下载')}</a><button className="space-btn" disabled={!!busy||file.references.length>0} title={file.references.length?t('仍有引用，不能删除'):undefined} onClick={()=>void remove(file.id)}>{busy===file.id?t('处理中…'):t('删除')}</button></div>
   </article>)}</div>
   {!data.items.length&&<p className="management-empty">{t(data.count?'没有匹配的文件。':'还没有文件，上传后即可在内容和展板中使用。')}</p>}
   {data.pages>1&&<nav className="management-pagination" aria-label={t('文件分页')}><button className="space-btn" disabled={data.page<=1||!!busy} onClick={()=>page(data.page-1)}>{t('上一页')}</button><span>{data.page} / {data.pages}</span><button className="space-btn" disabled={data.page>=data.pages||!!busy} onClick={()=>page(data.page+1)}>{t('下一页')}</button></nav>}
   {!!data.pending.length&&<section className="file-pending"><h2>{t('未完成上传')}</h2><p>{t('重新选择原文件可以续传。')}</p>{data.pending.map((task:any)=><div className="file-pending-row" key={task.id}><div><strong>{task.name}</strong><p>{bytes(task.received)} / {bytes(task.size)}</p></div><button className="space-btn" disabled={!!busy} onClick={async()=>{setBusy(task.id);setError('');try{await api('/api/spaces/uploads/'+task.id,{method:'DELETE'});r.refresh()}catch(e:any){setError(e.message)}finally{setBusy('')}}}>{t('取消任务')}</button></div>)}</section>}
  </>}
 </section>;
}
