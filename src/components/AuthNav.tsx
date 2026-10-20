'use client';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import Link from 'next/link';
export function AuthNav({mobile=false}:{mobile?:boolean}){const {t:tr}=useLocale();
 const auth=useResource('/api/auth/me'),user=auth.data?.user;
 return <Link className={mobile?'':'organic-login-nav'} href={user?.role==='owner'?'/admin':user?'/workspace':'/login'}>{user?.role==='owner'?tr("管理中心"):user?tr("我的工作台"):tr("登录")}</Link>;
}
