'use client';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import Link from 'next/link';
export function AuthNav({mobile=false}:{mobile?:boolean}){const {t:tr}=useLocale();
 const auth=useResource('/api/auth/me'),user=auth.data?.user;
 if(user&&user.role!=='owner')return null;
 return <Link className={mobile?'':'organic-login-nav'} href={user?'/admin':'/login'}>{user?tr("管理中心"):tr("登录")}</Link>;
}
