'use client';
import {useLocale} from './LocaleProvider';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {post} from '@/lib/client';
import {Icon} from './Icons';
import {type Doc} from './CommunityUI';

export function ShareLink({id,title='社区分享'}:{id:string;title?:string}){const {t:tr,locale}=useLocale();
 const menu=useRef<HTMLDetailsElement>(null);
 const[notice,setNotice]=useState(''),[native,setNative]=useState(false),[manual,setManual]=useState('');
 useEffect(()=>{
  setNative(typeof navigator.share==='function');
  const outside=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))menu.current.open=false;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 const url=()=>new URL('/community/'+id,window.location.origin).href;
 async function copy(){try{await navigator.clipboard.writeText(url());setNotice('链接已复制');setManual('');if(menu.current)menu.current.open=false;}catch{setManual(url());setNotice('复制失败，请手动复制下方链接');}}
 return <span className="feed-share"><details ref={menu} className="feed-share-menu"><summary aria-label={tr("分享与更多操作")}><Icon name="share"/><span>{tr("分享")}</span></summary><div className="feed-share-popover" role="group" aria-label={tr("分享方式")}><button type="button" onClick={()=>void copy()}><Icon name="link"/>{tr("复制链接")}</button>{native&&<button type="button" onClick={async()=>{try{await navigator.share({title,url:url()});setNotice("已打开系统分享");if(menu.current)menu.current.open=false;}catch(e:any){if(e.name!=='AbortError')setNotice("系统分享暂不可用，请复制链接");}}}><Icon name="share"/>{tr("系统分享")}</button>}<Link className="feed-mobile-report" href={'/report?post='+id}>{tr("举报此内容")}</Link>{manual&&<input value={manual} readOnly aria-label={tr("可手动复制的分享链接")} onFocus={e=>e.target.select()}/>}</div></details><span className="feed-copy-notice" role="status">{tr(notice)}</span></span>;
}
export function PostActions({item,user,onBookmarkRemoved}:{item:Doc;user:Doc|null;onBookmarkRemoved?:()=>void}){const {t:tr,locale}=useLocale();
 const router=useRouter();const[state,setState]=useState<Doc>(item),[busy,setBusy]=useState(''),[error,setError]=useState('');
 useEffect(()=>setState(item),[item.id,item.likeCount,item.liked,item.bookmarked,item.reposted,item.repostCount,item.commentCount]);
 async function react(kind:string){
  if(!user){router.push('/login?next='+encodeURIComponent(window.location.pathname+window.location.search));return;}
  const flag=kind==='like'?'liked':kind==='bookmark'?'bookmarked':'reposted',active=!state[flag];setBusy(kind);setError('');
  try{const result=await post('/api/community/reactions/'+item.id,{kind,active});setState(result);window.dispatchEvent(new Event('community-social-change'));if(kind==='bookmark'&&!active)onBookmarkRemoved?.();}catch(e:any){setError(e.message);}finally{setBusy('');}
 }
 return <div className="feed-actions-wrap"><div className="feed-post-actions" aria-label={tr("分享互动")}>
  <button type="button" aria-label={state.liked?tr("取消点赞"):tr("点赞")} aria-pressed={!!state.liked} className={state.liked?'is-selected':''} disabled={!!busy} data-reaction="like" onClick={()=>void react('like')}><Icon name="heart"/><span>{state.likeCount||0}</span></button>
  <Link href={'/community/'+item.id+'#comments'} aria-label={tr('评论 {0} 条',[state.commentCount||0])}><Icon name="comment"/><span>{state.commentCount||0}</span></Link>
  <button type="button" aria-label={state.reposted?tr("取消转发"):tr("转发")} aria-pressed={!!state.reposted} className={state.reposted?'is-selected':''} disabled={!!busy} data-reaction="repost" onClick={()=>void react('repost')}><Icon name="repost"/><span>{state.repostCount||0}</span></button>
  <button type="button" aria-label={state.bookmarked?tr("取消收藏"):tr("收藏")} aria-pressed={!!state.bookmarked} className={state.bookmarked?'is-selected':''} disabled={!!busy} data-reaction="bookmark" onClick={()=>void react('bookmark')}><Icon name="bookmark"/><span>{state.bookmarked?tr("已收藏"):tr("收藏")}</span></button>
  <ShareLink id={item.id} title={item.title}/><Link href={'/report?post='+item.id} className="feed-report-link">{tr("举报")}</Link>
 </div>{busy&&<span className="community-sr" role="status">{tr("正在保存互动…")}</span>}{error&&<p role="alert" className="feed-action-error">{tr(error)}{!user&&<Link href="/login">{tr("前往登录")}</Link>}</p>}</div>;
}
export function FollowButton({person,user,onSaved}:{person:Doc;user:Doc|null;onSaved?:(person:Doc)=>void}){const {t:tr,locale}=useLocale();
 const router=useRouter();const[following,setFollowing]=useState(!!person.following),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setFollowing(!!person.following),[person.id,person.following]);
 if(user?.id===person.id)return null;
 return <span className="community-follow-control"><button className={'community-follow-button'+(following?' is-following':'')} type="button" title={following?tr("取消关注"):tr("关注这位成员")} aria-pressed={following} disabled={busy} onClick={async()=>{
  if(!user){router.push('/login?next='+encodeURIComponent(window.location.pathname+window.location.search));return;}
  setBusy(true);setError('');try{const result=await post('/api/community/follows/'+person.id,{active:!following});setFollowing(result.following);onSaved?.({...person,...result});window.dispatchEvent(new Event('community-social-change'));}catch(e:any){setError(e.message);}finally{setBusy(false);}
 }}>{busy?tr("保存中…"):following?tr("已关注"):tr("关注")}</button>{error&&<small role="alert">{tr(error)}</small>}</span>;
}
