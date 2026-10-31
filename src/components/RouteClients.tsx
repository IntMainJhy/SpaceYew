'use client';

import {lazy,Suspense} from 'react';
import type {ComponentProps} from 'react';
import {useLocale} from './LocaleProvider';

function RouteLoading(){const {t}=useLocale();return <p role="status" className="small-text">{t('加载中…')}</p>;}

// A client boundary splits the catch-all graph while React retains streaming SSR.
// React.lazy also avoids next/dynamic's nonce-less script preload links, which
// our strict-dynamic CSP correctly rejects. Do not loosen that policy to preload.
const LazyBlogEditor=lazy(()=>import('./BlogEditor').then(module=>({default:module.BlogEditor})));
const LazyPublisher=lazy(()=>import('./CatalogPublisher').then(module=>({default:module.CatalogPublisher})));
const LazyAdmin=lazy(()=>import('./AdminApp').then(module=>({default:module.AdminApp})));
const LazyCommunity=lazy(()=>import('./CommunityApp').then(module=>({default:module.CommunityApp})));
const LazyTheme=lazy(()=>import('./BlogTheme').then(module=>({default:module.BlogTheme})));
export function BlogEditor(props:ComponentProps<typeof import('./BlogEditor').BlogEditor>){return <Suspense fallback={<RouteLoading/>}><LazyBlogEditor {...props}/></Suspense>;}
export function CatalogPublisher(props:ComponentProps<typeof import('./CatalogPublisher').CatalogPublisher>){return <Suspense fallback={<RouteLoading/>}><LazyPublisher {...props}/></Suspense>;}
export function AdminApp(props:ComponentProps<typeof import('./AdminApp').AdminApp>){return <Suspense fallback={<RouteLoading/>}><LazyAdmin {...props}/></Suspense>;}
export function CommunityApp(props:ComponentProps<typeof import('./CommunityApp').CommunityApp>){return <Suspense fallback={<RouteLoading/>}><LazyCommunity {...props}/></Suspense>;}
export function PublicBlogTheme(props:ComponentProps<typeof import('./BlogTheme').BlogTheme>){return <Suspense fallback={<RouteLoading/>}><LazyTheme {...props}/></Suspense>;}
