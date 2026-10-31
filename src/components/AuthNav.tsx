'use client';
import {useEffect,useRef} from 'react';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import {Logout} from './CommunityUI';
import Link from 'next/link';
import {FeedAvatar} from './FeedAvatar';
import {Icon} from './Icons';
export function AuthNav({mobile=false}:{mobile?:boolean}){const {t:tr}=useLocale();
 const auth=useResource('/api/auth/me'),user=auth.data?.user,menu=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const close=(event:PointerEvent)=>{if(menu.current&&!menu.current.contains(event.target as Node))menu.current.open=false;};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.current?.open){menu.current.open=false;menu.current.querySelector('summary')?.focus();}};document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};},[]);
 if(!user)return <Link className={mobile?'':'organic-login-nav'} href="/login">{tr('登录')}</Link>;
 const close=()=>{if(menu.current)menu.current.open=false;};
 return <details className={'site-account-menu'+(mobile?' is-mobile':'')} ref={menu}><summary aria-label={tr('我的账号')}><FeedAvatar name={user.displayName||user.nickname} avatarId={user.avatarId}/><span>{tr('我的账号')}</span><svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5"/></svg></summary><div className="site-account-panel"><p>{user.displayName||user.nickname}<small>{user.role==='owner'?tr('站长'):user.username}</small></p><Link href="/workspace/account" onClick={close}><Icon name="user"/>{tr('账号与安全')}</Link><Link href="/workspace/blog" onClick={close}><Icon name="grid"/>{tr('我的博客')}</Link>{user.role==='owner'&&<Link href="/admin" onClick={close}><Icon name="shield"/>{tr('管理中心')}</Link>}<Logout/></div></details>;
}
