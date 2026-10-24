import type {ReactNode} from 'react';
import Link from 'next/link';
import {headers} from 'next/headers';
import {serverI18n} from '@/lib/server-i18n';
import {publicContent} from '@/lib/db.mjs';
import {localizeContent} from '@/lib/content-locales.mjs';
import {guides} from '@/lib/learning.mjs';
import {publicCatalog} from '@/lib/catalog.mjs';
import {DocumentOutline,DocumentShare} from './DocumentOutline';
export async function DocumentReader({title,summary='',path,headings,children,author,coverId=''}:{title:string;summary?:string;path:string;headings:{id:string;text:string;level?:number}[];children:ReactNode;author?:ReactNode;coverId?:string}){
 const{t,locale}=await serverI18n();let members:any[]=[];try{members=[...publicCatalog({kind:'docs'},new Request(process.env.PUBLIC_URL||'http://localhost:3008',{headers:await headers()})).items,...publicContent('articles').map((item:any)=>({...localizeContent(item,locale),url:'/docs/articles/'+encodeURIComponent(item.slug)}))]}catch{}
 return <div className="document-reader"><aside className="document-library"><Link href="/docs" className="document-library-home">{t('文档')}</Link><Link className="document-new" href="/docs?compose=1">{t('新建文档')}</Link><nav aria-label={t('文档导航')}><strong>{t('使用指南')}</strong>{guides.map(guide=><Link key={guide.slug} href={'/docs/'+guide.slug} aria-current={path==='/docs/'+guide.slug?'page':undefined}>{t(guide.title)}</Link>)}{members.length>0&&<strong>{t('共享文档')}</strong>}{members.map(item=><Link key={item.id} href={item.url} aria-current={path===item.url?'page':undefined}>{item.title}</Link>)}</nav></aside><div className="doc-reading-main"><div className="document-breadcrumb"><Link href="/docs">{t('文档')}</Link><span>/</span><span>{title}</span><DocumentShare path={path}/></div><article><header><h1>{title}</h1>{summary&&<p className="document-summary">{summary}</p>}{author&&<div className="document-author">{author}</div>}</header>{coverId&&<img className="document-banner" src={'/media/'+coverId} alt=""/>}<div className="document-prose prose">{children}</div></article></div><aside className="document-outline-column"><DocumentOutline headings={headings}/></aside></div>;
}
