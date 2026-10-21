'use client';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import {bytes} from '@/lib/client';
import {localeDate} from '@/lib/i18n.mjs';

export function AdminOverview(){
 const {t,locale}=useLocale(),r=useResource('/api/admin/overview');
 const queues=[['posts','待审投稿','reviews'],['comments','待审评论','comments'],['spaces','待审主页','spaces'],['reports','待处理反馈','reports']];
 const types:Record<string,string>={projects:'项目',articles:'文章',resources:'资源'};
 const statuses:Record<string,string>={published:'已发布',draft:'草稿',offline:'已下架'};
 return <section className="admin-overview" aria-labelledby="admin-overview-title">
  <header className="admin-overview-heading"><div><h1 id="admin-overview-title">{t('管理中心')}</h1></div><Link className="btn primary" href="/admin/articles/new">{t('新建内容')}</Link></header>
  {r.error?<div className="app-feedback error" role="alert">{t(r.error)} <button className="btn small" onClick={r.refresh}>{t('重试')}</button></div>:!r.data?<div className="skeleton" aria-label={t('内容加载中')}/>:<>
   <dl className="admin-summary-grid">{[['内容总数',r.data.totals.content],['社区成员',r.data.totals.members],['个人主页',r.data.totals.spaces],['文件存储',bytes(r.data.totals.bytes)]].map(([label,value])=><div key={label}><dt>{t(String(label))}</dt><dd>{String(value)}</dd></div>)}</dl>
   <div className="admin-management-grid"><section aria-labelledby="admin-tasks-title"><h2 id="admin-tasks-title">{t('待办')}</h2><div className="admin-task-list">{queues.map(([key,label,path])=><Link key={key} href={'/admin/community/'+path}><span>{t(label)}</span><strong className={r.data.pending[key]>0?'has-work':''}>{r.data.pending[key]}</strong></Link>)}</div><div className="admin-quick-links"><Link href="/admin/settings">{t('网站设置')}</Link><Link href="/admin/community/accounts">{t('成员管理')}</Link><Link href="/admin/files">{t('文件素材')}</Link></div></section>
   <section aria-labelledby="admin-recent-title"><h2 id="admin-recent-title">{t('最近编辑')}</h2>{r.data.recent.length?<div className="admin-recent-list">{r.data.recent.map((item:any)=><Link key={item.id} href={'/admin/'+item.type+'/edit/'+item.id}><div><strong>{item.title||t('未命名内容')}</strong><span>{t(types[item.type])} · {t(statuses[item.status]||item.status)}</span></div><time dateTime={item.updated}>{localeDate(item.updated,locale,true)}</time></Link>)}</div>:<p className="admin-empty">{t('还没有内容，从新建内容开始。')}</p>}</section></div>
   <section className="admin-services" aria-labelledby="admin-services-title"><div><h2 id="admin-services-title">{t('服务状态')}</h2><span>{t(r.data.services.environment==='demo'?'演示环境':'标准环境')}</span></div><dl>{[
    ['社区访问',({local:'仅本机开放',paused:'仅本机 · 暂停投稿',closed:'暂未开放'} as Record<string,string>)[r.data.services.community]],
    ['验证码邮件',({capture:'本地收件箱',smtp:'SMTP 已配置',unconfigured:'未配置'} as Record<string,string>)[r.data.services.mail]],
    ['macOS 下载',r.data.services.downloads.macos?'已配置':'未配置'],
    ['Windows 下载',r.data.services.downloads.windows?'已配置':'未配置']
   ].map(([label,value])=><div key={label}><dt>{t(label)}</dt><dd>{t(value)}</dd></div>)}</dl></section>
  </>}
 </section>;
}
