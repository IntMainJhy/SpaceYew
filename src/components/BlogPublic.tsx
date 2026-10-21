import Link from 'next/link';
import {notFound} from 'next/navigation';
import {serverI18n} from '@/lib/server-i18n';
import {publicSpace,publicSpaceDocument} from '@/lib/spaces.mjs';
import {publicBlogBundle,staticPage} from '@/lib/blog-hosting.mjs';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {BlogTheme} from './BlogTheme';
import {BlogShare} from './BlogShare';
import {StaticSite} from './StaticSite';
import {SpaceVisit} from './SpaceBoard';
export async function BlogPublic({req,path,query}:{req:Request;path:string[];query:Record<string,any>}){
 const {t,locale}=await serverI18n();let data,item:any=null,bundle:any=null,page='';try{data=publicSpace(req,path[1]);if(path.length>4)notFound();if(path[2]&& !['projects','articles','resources','experience','resume'].includes(path[2]))notFound();if(path[3])item=localizeContent(publicSpaceDocument(req,path[1],path[2],path[3]),locale);if(!path[2]&&data.layout.blog?.mode==='static'){bundle=publicBlogBundle(req,path[1]);page=staticPage(query.page,bundle)}}catch{notFound()}
 const p=localizeProfile(data.profile,locale),base='/blog/'+data.handle,staticParts=page.match(/^([^?#]*)(.*)$/);
 return <div className="blog-public-shell"><SpaceVisit handle={data.handle}/><header className="blog-platform-bar"><Link href="/" className="blog-platform-logo">SpaceYew<span>{t('每个人，都有自己的空间。')}</span></Link><div><Link href={'/community/members/'+data.owner}>{t('社区名片')}</Link>{!bundle&&<BlogShare path={base+(path[2]?'/'+path.slice(2).map(encodeURIComponent).join('/'):'')}/>}<Link href="/workspace/blog" className="blog-create-link">{t('创建我的主页')} ↗</Link></div></header>
  {bundle?<StaticSite src={'/site-files/'+bundle.id+'/public/'+staticParts![1].split('/').map(encodeURIComponent).join('/')+staticParts![2]} files={bundle.files} base={base} entry={bundle.entry} initialPage={page}/>:item?<article className="homepage-document"><Link href={base}>← {p.name}</Link><header><small>{item.category}</small><h1>{item.title}</h1><p>{item.summary}</p></header>{item.coverId&&<img className="space-document-cover" src={'/media/'+item.coverId} alt=""/>}<div className="organic-prose" dangerouslySetInnerHTML={{__html:item.bodyHtml}}/>{['role','contribution','outcome'].map(key=>item[key]&&<section key={key}><h2>{t(({role:'我的角色',contribution:'本人贡献',outcome:'成果与收获'} as Record<string,string>)[key])}</h2><p className="space-preserve">{item[key]}</p></section>)}<div className="space-actions">{item.url&&<a className="space-btn" href={item.url} target="_blank" rel="noopener noreferrer">{t('访问外部链接')} ↗</a>}{item.sourceUrl&&<a className="space-btn" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{t('查看源码')}</a>}{item.attachmentId&&<a className="space-btn" href={'/download/'+item.attachmentId}>{t('下载资源')}</a>}</div>{item.license&&<p>{t('使用许可')} · {item.license}</p>}</article>:<BlogTheme data={{...data,profile:p}}/>}
  <footer className="blog-platform-footer"><Link href="/">{t('由 SpaceYew 托管')}</Link><Link href={'/report?target='+encodeURIComponent('/blog/'+data.handle+(path[3]?'/'+path[2]+'/'+path[3]:''))}>{t('举报与投诉')}</Link><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">蜀ICP备2026018870号-2</a></footer>
 </div>;
}
