'use client';
import {useLocale} from './LocaleProvider';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Icon} from './Icons';
import {PostCover} from './PostCover';
import {post} from '@/lib/client';
import {Badge,CommunityBackBar,Doc,Empty,Notice,Loading,Retry,useResource,primary,secondary,date} from './CommunityUI';
import {Pager} from './CommunitySocial';

export function SubmissionList({user,data}:{user:Doc;data:Doc}){const {t:tr,locale}=useLocale();
 const[tab,setTab]=useState('all'),[query,setQuery]=useState('');
 const rows=data.posts as Doc[],content=(row:Doc)=>row.draft||row.pending?.data||row.public||{};
 const matches=(row:Doc,key:string)=>key==='all'||(key==='pending'?!!row.pending:key==='public'?row.visibility==='public':!row.pending&&(!!row.draft||row.visibility!=='public'));
 const items=rows.filter(row=>matches(row,tab)&&[content(row).title,content(row).summary].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));
 return <section className="community-workspace-page workspace-submissions"><CommunityBackBar label={tr("我的投稿")} heading action={user.role!=='owner'&&<Link className={primary} href="/workspace/submissions/new"><Icon name="plus"/><span>{tr("写一份分享")}</span></Link>}/>
 {user.verification==='pending'&&<Notice>{tr("账号已注册，尚待站长审核昵称并确认本地测试资格。请稍后再开始投稿。")}</Notice>}{user.status!=='active'&&<Notice>{tr("账号当前")}{user.status==='restricted'?tr("限制投稿"):tr("已被封禁")}{tr("，仍可查看消息并")}<Link href="/report?kind=appeal">{tr("提出申诉")}</Link>{locale==='en'?'.':'。'}</Notice>}{user.role==='owner'&&<Notice>{tr("主站作品、手记和资源继续在 ")}<Link href="/admin">{tr("内容管理后台")}</Link>{tr("维护；社区审核与邀请使用独立入口。")}</Notice>}
 <nav className="feed-tabs workspace-tabs" aria-label={tr("投稿状态")}>{[['all','全部'],['draft','待处理'],['pending','待审核'],['public','已公开']].map(([key,label])=><button type="button" key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{tr(label)}<span>{rows.filter(row=>matches(row,key)).length}</span></button>)}</nav><div className="workspace-search"><Icon name="search"/><label htmlFor="workspace-post-search" className="community-sr">{tr("搜索我的投稿")}</label><input id="workspace-post-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={tr("搜索标题或摘要")} type="search"/></div>
 <div className="workspace-list-content" aria-label={tr("投稿列表")}>{items.length?items.map(row=>{const doc=content(row);return <article className="workspace-post-row" key={row.id}><div className="workspace-post-copy"><div className="workspace-row-meta"><Badge value={row.visibility}/>{row.pending?<Badge value={row.pending.status}/>:row.latestStatus&&row.latestStatus!=='approved'?<Badge value={row.latestStatus}/>:null}<time dateTime={row.updated}>{date(row.updated,locale)}</time></div><Link href={'/workspace/submissions/'+row.id}><h2>{doc.title||tr("待审分享")}</h2><p>{doc.summary||tr("查看审核记录")}</p></Link><div className="workspace-row-actions"><Link href={'/workspace/submissions/'+row.id}>{tr("编辑")}</Link>{row.visibility==='public'&&<Link href={'/community/'+row.id}>{tr("查看公开版本 ")}<Icon name="eye"/></Link>}</div></div>{doc.coverId&&<Link className="workspace-post-thumbnail" href={'/workspace/submissions/'+row.id} aria-label={tr("打开投稿")}><PostCover id={doc.coverId} alt={doc.coverAlt}/></Link>}</article>}):<Empty title={query||tab!=='all'?tr("暂无匹配投稿"):tr("从第一份分享开始")}>{query||tab!=='all'?<button className={secondary} onClick={()=>{setQuery('');setTab('all');}}>{tr("查看全部投稿")}</button>:tr("保存草稿，准备好后提交审核。")}</Empty>}</div>
 {data.cases.length>0&&<section className="community-history workspace-case-history"><h2>{tr("处理进展")}</h2>{data.cases.map((item:Doc)=><div className="community-history-row" key={item.id}><div><strong>{tr(item.category)}</strong> <Badge value={item.status}/><p>{item.response||tr("已收到，等待工作人员核查。")}</p><small>{tr("回执 ")}{item.id}</small></div></div>)}</section>}</section>;
}

export function Notifications(){const {t:tr,locale}=useLocale();
 const router=useRouter(),inFlight=useRef(false);
 const[tab,setTab]=useState('all'),[page,setPage]=useState(1),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const r=useResource('/api/community/notifications?'+new URLSearchParams({status:tab,page:String(page)}));
 async function mark(id?:string){
  if(inFlight.current)return false;
  inFlight.current=true;setBusy(id||'all');setError('');setMessage('');
  try{await post('/api/community/notifications',id?{id}:{});r.refresh();window.dispatchEvent(new Event('community-social-change'));setMessage(id?'消息已标为已读。':'所有消息已标为已读。');return true;}
  catch(e:any){setError(e.message);return false;}
  finally{inFlight.current=false;setBusy('');}
 }
 return <section className="community-workspace-page workspace-notifications" aria-busy={r.refreshing}><CommunityBackBar label={tr("消息通知")} heading action={<button type="button" className={secondary} disabled={!!busy||!r.data?.unread} onClick={()=>void mark()}>{busy==='all'?tr("正在处理…"):tr("全部标为已读")}</button>}/>{error&&<Notice error>{tr(error)}</Notice>}{message&&<Notice>{tr(message)}</Notice>}<nav className="feed-tabs workspace-tabs" aria-label={tr("消息筛选")}><button type="button" aria-pressed={tab==='all'} onClick={()=>{setTab('all');setPage(1);}}>{tr("全部")}</button><button type="button" aria-pressed={tab==='unread'} onClick={()=>{setTab('unread');setPage(1);}}>{tr("未读 ")}<span>{r.data?.unread??0}</span></button></nav>
 {r.loading?<Loading/>:r.error?<Retry error={r.error} refresh={r.refresh}/>:<><div className="workspace-list-content" aria-label={tr("消息列表")}>{r.data.items.length?r.data.items.map((item:Doc)=><article className={'workspace-notification'+(!item.read_at?' is-unread':'')} key={item.id}><span className="workspace-notification-icon"><Icon name={item.href?.includes('/submissions/')?'file':'bell'}/></span><div className="workspace-notification-body"><Link href={item.href} aria-disabled={!!busy} onNavigate={async event=>{if(item.read_at&&!inFlight.current)return;event.preventDefault();if(await mark(item.id))router.push(item.href);}}><div className="workspace-row-meta"><span>{item.read_at?tr("已读"):tr("未读")}</span><time dateTime={item.created}>{date(item.created,locale)}</time></div><h2>{tr(item.title)}</h2><p>{tr(item.message)}</p><span className="workspace-notification-open">{tr("查看相关内容 ")}</span></Link>{!item.read_at&&<button type="button" className="workspace-notification-read link-button" disabled={!!busy} onClick={()=>void mark(item.id)}>{busy===item.id?tr("正在处理…"):tr("标为已读")}</button>}</div></article>):<Empty title={tab==='unread'?tr("没有未读消息"):tr("暂时没有新消息")}/>}</div><Pager data={r.data} setPage={setPage}/></>}
 </section>;
}
