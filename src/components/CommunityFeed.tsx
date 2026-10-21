'use client';
import {localeDate} from '@/lib/i18n.mjs';
import {useLocale} from './LocaleProvider';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Icon} from './Icons';
import {type Doc,primary,Logout} from './CommunityUI';
import {FeedAvatar} from './FeedAvatar';
import {PostCover} from './PostCover';
import {PostActions} from './CommunityActions';
import {api} from '@/lib/client';
import {usePageSeed} from './PageResources';

function AccountIdentity({user}:{user:Doc|null}){const {t:tr,locale}=useLocale();
 const menu=useRef<HTMLDetailsElement>(null);
 const name=user?.displayName||user?.nickname||tr('登录 / 注册');
 const handle=user?.handle||user?.username;
 const role=user?({owner:'站长',reviewer:'社区审核员',member:'社区成员'} as Doc)[user.role]||'社区成员':'';
 const profile=user?'/community/members/'+user.id:'/login?next=/community';
 const settings=user?.role==='owner'?'/admin/profile':'/workspace/account';
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))menu.current.open=false};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[]);
 return <div className="feed-identity">
  <Link className="feed-account-link" href={profile} aria-label={user?tr('查看{0}的个人资料',[name]):tr("登录或注册社区账号")} title={user?name+(handle?' · @'+handle:''):tr("登录 / 注册")}>
   <FeedAvatar name={name} avatarId={user?.avatarId} guest={!user} className="feed-account-avatar"/><span className="feed-account-copy"><strong>{name}</strong><small>{user?(handle?'@'+handle:role):tr("整理自己的分享")}</small></span>
  </Link>
  {user&&<details className="feed-account-menu" ref={menu}><summary aria-label={tr('{0}的账号选项',[name])} title={tr("账号选项")}><svg className="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></summary>
   <div className="feed-account-popover" role="group" aria-label={tr("账号菜单")}><p>{name}<small>{tr(role)}</small></p><Link href={profile}><Icon name="user"/>{tr("社区名片")}</Link><Link href={settings}><Icon name="eye"/>{tr("修改头像与资料")}</Link><Link href="/workspace/account"><Icon name="settings"/>{tr("账号与安全")}</Link>{['owner','reviewer'].includes(user.role)&&<Link href={user.role==='owner'?'/admin':'/admin/community'}><Icon name="shield"/>{user.role==='owner'?tr("管理中心"):tr("社区审核")}</Link>}<Logout/></div>
  </details>}
 </div>;
}

function MobileAccountMenu({user,active}:{user:Doc|null;active:string}){const {t:tr,locale}=useLocale();
 const menu=useRef<HTMLDetailsElement>(null),name=user?.displayName||user?.nickname||tr('登录社区');
 const login=(next:string)=>user?next:'/login?next='+encodeURIComponent(next);
 const close=()=>{if(menu.current)menu.current.open=false;};
 useEffect(()=>{close();},[active]);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))close();};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.current?.open){close();menu.current.querySelector('summary')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 return <details className="feed-mobile-account" ref={menu}><summary aria-label={tr("我的账号与更多功能")} aria-current={['account','posts','profile','following'].includes(active)?'page':undefined}><FeedAvatar name={name} avatarId={user?.avatarId} guest={!user}/><span>{tr("我的")}</span></summary><div className="feed-mobile-panel" role="group" aria-label={tr("我的社区菜单")}><header><FeedAvatar name={name} avatarId={user?.avatarId} guest={!user}/><div><strong>{name}</strong><small>{user?tr("管理分享与个人账号"):tr("登录后分享、收藏与关注")}</small></div><button type="button" onClick={()=>{close();menu.current?.querySelector('summary')?.focus();}} aria-label={tr("关闭我的菜单")}>{tr("关闭")}</button></header><div className="feed-mobile-menu-links"><Link href={login('/workspace/blog')} onClick={close}><Icon name="grid"/>{tr("我的个人主页")}</Link><Link href={login('/workspace/library')} onClick={close}><Icon name="file"/>{tr("内容库")}</Link><Link href={login('/workspace/files')} onClick={close}><Icon name="folder"/>{tr('我的文件')}</Link><Link href={user?'/community/members/'+user.id:login('/workspace/account')} onClick={close}><Icon name="user"/>{tr("社区名片")}</Link><Link href={login('/workspace')} onClick={close}><Icon name="file"/>{tr("我的投稿")}</Link><Link href={login('/community?feed=following')} onClick={close}><Icon name="heart"/>{tr("关注动态")}</Link><Link href={login('/workspace/account')} onClick={close}><Icon name="settings"/>{tr("个人账号")}</Link>{user&&['owner','reviewer'].includes(user.role)&&<Link href="/admin/community" onClick={close}><Icon name="shield"/>{tr("社区审核")}</Link>}</div><footer>{user?<Logout/>:<Link href="/login?next=/community" onClick={close}>{tr("登录 / 注册")}</Link>}</footer></div></details>;
}

export function CommunityNavigation({user,active='feed',compose=true}:{user:Doc|null,active?:string,compose?:boolean}){const {t:tr,locale}=useLocale();
 const seed=usePageSeed('/api/community/notification-count'),[unread,setUnread]=useState(seed?.data?.unread||0);
 useEffect(()=>{if(!user){setUnread(0);return;}let live=true;const refresh=()=>{if(!document.hidden)api('/api/community/notification-count').then(result=>{if(live)setUnread(result.unread);}).catch(()=>{});};refresh();const timer=window.setInterval(refresh,60000);window.addEventListener('community-social-change',refresh);return()=>{live=false;window.clearInterval(timer);window.removeEventListener('community-social-change',refresh);};},[user?.id]);
 const login=(next:string)=>user?next:'/login?next='+encodeURIComponent(next);
 const router=useRouter();
 function mobileNavigate(href:string,event:{preventDefault:()=>void}){
  if(document.documentElement.dataset.ui!=='x-social'||!window.matchMedia('(max-width:767px)').matches)return;
  event.preventDefault();
  if(window.location.pathname+window.location.search===href)window.scrollTo({top:0});
  else router.push(href,{scroll:true});
 }
 const items=[['studio','我的个人主页','grid',login('/workspace/blog')],['library','内容库','file',login('/workspace/library')],['files','我的文件','folder',login('/workspace/files')],['feed','社区动态','home','/community'],['members','发现成员','search','/community/members'],['following','关注动态','user',login('/community?feed=following')],['bookmarks','我的收藏','bookmark',login('/workspace/bookmarks')],['posts','我的投稿','file',login('/workspace')],['notifications','消息通知','bell',login('/workspace/notifications')],['account','个人账号','user',login('/workspace/account')]];
 const staff=user&&['owner','reviewer'].includes(user.role);
 return <aside className="feed-navigation"><nav aria-label={tr("社区导航")} className="feed-nav-links"><span className="feed-active-indicator" aria-hidden="true"/>{items.map(([key,label,icon,href])=><Link key={key} href={href} scroll={false} onNavigate={event=>mobileNavigate(href,event)} data-nav-key={key} aria-label={tr(label)} aria-current={active===key?'page':undefined} title={tr(label)}><Icon name={icon}/><span>{tr(label)}</span><span className="feed-mobile-label">{tr(({feed:'社区',members:'发现',bookmarks:'收藏',notifications:'通知'} as Doc)[key])}</span>{key==='notifications'&&unread>0&&<span className="feed-unread" aria-label={tr('{0} 条未读消息',[unread])}>{unread>99?'99+':unread}</span>}</Link>)}{staff&&<Link href="/admin/community"><Icon name="shield"/><span>{tr("社区审核")}</span></Link>}<MobileAccountMenu user={user} active={active}/></nav>
 <Link className={primary+' feed-write'} href={login('/workspace/submissions/new')}><Icon name={'plus'}/>{tr("写一份分享")}</Link>
 {compose&&<Link className={primary+' feed-mobile-compose'} href={login('/workspace/submissions/new')} aria-label={tr("写一份分享")}><Icon name={'plus'}/><span>{tr("投稿")}</span></Link>}
 <AccountIdentity user={user}/>
 </aside>;
}

export function FeedPost({item,user,onBookmarkRemoved}:{item:Doc;user:Doc|null;onBookmarkRemoved?:()=>void}){const {t:tr,locale}=useLocale();
 return <article className="feed-post">{item.repostedBy&&<p className="feed-reposted"><Icon name="repost"/><Link href={'/community/members/'+item.repostedBy.id}>{item.repostedBy.name}</Link> {tr(" 转发了这份分享")}</p>}<div className="feed-author"><FeedAvatar name={item.authorName||tr("社区成员")} avatarId={item.authorAvatarId}/><div><Link href={'/community/members/'+item.authorId}><strong>{item.authorName}</strong></Link></div><time dateTime={item.updated}>{localeDate(item.updated,locale,true)}</time></div>
 <div className="feed-post-body"><span className="feed-category">{tr(item.category)}</span><Link className="feed-post-content" href={'/community/'+item.id}><h2>{item.title}</h2><p>{item.summary}</p><PostCover id={item.coverId} alt={item.coverAlt}/></Link>
 <Link className="feed-source" href={'/community/'+item.id}><Icon name="link"/><span><strong>{item.sourceName}</strong><small>{new URL(item.sourceUrl).hostname}</small></span></Link>
 <PostActions item={item} user={user} onBookmarkRemoved={onBookmarkRemoved}/></div></article>;
}
