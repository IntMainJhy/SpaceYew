'use client';
import {actionNames} from './CommunityAdmin';
import {useState} from 'react';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import {localeDate} from '@/lib/i18n.mjs';

const labels:Record<string,string>={site_content_save:'保存内容草稿',site_content_publish:'发布内容',site_content_offline:'下架内容',site_content_delete:'移入回收站',site_content_restore:'恢复内容草稿',site_config_update:'更新网站设置',site_file_upload:'上传站点文件',site_file_delete:'删除站点文件',site_upload_create:'创建上传任务',site_upload_cancel:'取消上传任务',space_file_upload:'上传空间文件',space_file_delete:'删除空间文件',site_case_link:'关联投诉内容',site_content_case_offline:'投诉处置下架',site_content_case_restore:'投诉复核恢复'};
export function ManagementLog(){
 const {t,locale}=useLocale(),[query,setQuery]=useState('page=1'),r=useResource('/api/admin/logs?'+query),data=r.data;
 function page(value:number){const params=new URLSearchParams(query);params.set('page',String(value));setQuery(params.toString())}
 return <section className="management-log" aria-busy={r.refreshing}><div className="page-head"><h1>{t('管理日志')}</h1></div>
  <form className="management-filters" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget),params=new URLSearchParams();for(const [key,value]of form)if(value)params.set(key,String(value));params.set('page','1');setQuery(params.toString())}}>
   <label>{t('操作范围')}<select name="scope"><option value="all">{t('全部操作')}</option><option value="site">{t('站点管理')}</option><option value="space">{t('个人空间')}</option><option value="community">{t('社区治理')}</option></select></label>
   <label>{t('操作人')}<select name="actor"><option value="">{t('全部账号')}</option>{data?.actors.map((actor:any)=><option key={actor.id} value={actor.id}>{t(actor.name)}</option>)}</select></label>
   <label>{t('操作类型')}<select name="action"><option value="">{t('全部操作')}</option>{data?.actions.map((action:string)=><option key={action} value={action}>{t(labels[action]||actionNames[action]||actionNames[action.replace(/^space_/,'')]||action)}</option>)}</select></label>
   <label>{t('搜索对象')}<input type="search" name="q" maxLength={100}/></label><label>{t('开始日期')}<input type="date" name="start"/></label><label>{t('结束日期')}<input type="date" name="end"/></label><button className="btn">{t('筛选')}</button>
  </form>
  {r.error&&<p role="alert" className="app-feedback error">{t(r.error)} <button className="btn small" onClick={r.refresh}>{t('重试')}</button></p>}
  {!data&&!r.error?<p role="status">{t('加载中…')}</p>:data&&<><div className="table-wrap" tabIndex={0} role="region" aria-label={t('管理日志列表')}><table><thead><tr><th>{t('时间')}</th><th>{t('操作人')}</th><th>{t('操作')}</th><th>{t('对象')}</th><th>{t('操作详情')}</th></tr></thead><tbody>{data.items.map((row:any)=><tr key={row.id}><td><time dateTime={row.created} title={row.created}>{localeDate(row.created,locale)}</time></td><td>{t(row.actorName)}</td><td>{t(labels[row.action]||actionNames[row.action]||actionNames[row.action.replace(/^space_/,'')]||row.action)}</td><td><code className="log-target">{row.target}</code></td><td><details><summary>{t('查看记录')}</summary><pre>{JSON.stringify(row.details,null,2)}</pre></details></td></tr>)}</tbody></table></div>{!data.items.length&&<p className="management-empty">{t('没有匹配的管理记录。')}</p>}<nav className="management-pagination" aria-label={t('日志分页')}><button className="btn" disabled={data.page<=1} onClick={()=>page(data.page-1)}>{t('上一页')}</button><span>{data.total} · {data.page} / {data.pages}</span><button className="btn" disabled={data.page>=data.pages} onClick={()=>page(data.page+1)}>{t('下一页')}</button></nav></>}
 </section>;
}
