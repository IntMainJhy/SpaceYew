'use client';
import {useState} from 'react';
import {api,post} from '@/lib/client';
import {useLocale} from './LocaleProvider';

export function CaseContentLink({row,onSaved}:{row:any;onSaved:()=>void}){
 const {t}=useLocale(),[type,setType]=useState('articles'),[q,setQ]=useState(''),[data,setData]=useState<any>(null),[id,setId]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function search(page=1){setBusy(true);setError('');setId('');try{setData(await api('/api/admin/content?'+new URLSearchParams({type,q,page:String(page)})))}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 const selected=data?.items.find((item:any)=>item.id===id);
 return <details className="case-content-link"><summary>{t('关联站点内容')}</summary><p>{t('为旧工单选择准确内容，关联后即可在这里下架和恢复。')}</p><div className="management-filters"><label>{t('内容类型')}<select disabled={busy} value={type} onChange={e=>{setType(e.target.value);setData(null);setId('')}}>{[['articles','文章'],['projects','项目'],['resources','资源']].map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}</select></label><label>{t('搜索标题')}<input value={q} maxLength={100} disabled={busy} onChange={e=>setQ(e.target.value)}/></label><button className="btn" type="button" disabled={busy} onClick={()=>void search()}>{t('搜索')}</button></div>
  {data&&<><label>{t('关联内容')}<select value={id} disabled={busy} onChange={e=>setId(e.target.value)}><option value="">{t('选择内容')}</option>{data.items.map((item:any)=><option key={item.id} value={item.id} disabled={!item.published}>{(item.published||item.draft).title} · /{item.type}/{item.slug}</option>)}</select></label><div className="space-actions"><button type="button" className="btn small" disabled={busy||data.page<=1} onClick={()=>void search(data.page-1)}>{t('上一页')}</button><span>{data.page} / {data.pages}</span><button type="button" className="btn small" disabled={busy||data.page>=data.pages} onClick={()=>void search(data.page+1)}>{t('下一页')}</button></div></>}
  {selected&&<form inert={busy} onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await post('/api/admin/community/cases/'+row.id,{action:'link',version:row.version,contentId:id,targetRevision:selected.revision,reason});onSaved()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}><label>{t('关联依据')}<textarea value={reason} minLength={5} maxLength={3000} required rows={2} onChange={e=>setReason(e.target.value)}/></label><button className="btn primary" disabled={busy||reason.trim().length<5}>{t('确认关联')}</button></form>}
  {error&&<p className="app-feedback error" role="alert">{t(error)}</p>}
 </details>;
}
