import Link from 'next/link';
import {publicSpace,publicSpaces} from '@/lib/spaces.mjs';
import {localizeContent,localizeProfile} from '@/lib/content-locales.mjs';
import {serverI18n} from '@/lib/server-i18n';
import {FeedAvatar} from './FeedAvatar';
import {Icon} from './Icons';
import {BlogSpacesJourney,type BlogSpacePreview} from './BlogSpacesJourney';

/** Only reviewed, public and discoverable snapshots enter this directory or its film. */
export async function BlogSpacesPage({req}:{req:Request}){
 const {t,locale}=await serverI18n();
 const spaces:BlogSpacePreview[]=publicSpaces(req).map((space:any,index:number)=>{
  const profile=localizeProfile(space.profile,locale);
  const preview:BlogSpacePreview={handle:space.handle,name:profile.name||space.handle,intro:profile.intro||'',avatarId:profile.avatarId||'',coverId:space.coverId||'',href:'/blog/'+encodeURIComponent(space.handle)};
  if(index<8)try{
   // Resolve only the bounded film subset through the same published-page boundary.
   const published=publicSpace(req,space.handle),design=published.layout.blog?.design,visible=new Set((design?.nodes||[]).filter((node:any)=>!node.hidden).map((node:any)=>node.part));
   const section=published.profile.resume?.sections?.find((item:any)=>/project|作品|项目/i.test(item.id+' '+item.title)&&(!design||visible.has('section:'+item.id)));
   const project=section?.items?.find((item:any)=>item.title&&item.coverId)||section?.items?.find((item:any)=>item.title);
   const document=published.content.find((item:any)=>item.type==='projects'&&item.coverId)||published.content.find((item:any)=>item.type==='projects');
   if(project){preview.coverId||=project.coverId||'';preview.projectTitle=project.translations?.[locale]?.title?.trim()||project.title;preview.projectSummary=project.translations?.[locale]?.description?.trim()||project.description||'';}
   else if(document){const localized=localizeContent(document,locale);preview.coverId||=localized.coverId||'';preview.projectTitle=localized.title;preview.projectSummary=localized.summary||'';}
  }catch{/* A concurrent publication change must not turn a directory read into an error. */}
  return preview;
 });
 return <div className="blog-spaces-page" data-blog-spaces>
  <div className="blog-spaces-opening">
   <BlogSpacesJourney spaces={spaces.slice(0,8)} labels={{open:t('进入博客空间'),skip:t('跳过动画，浏览空间')}}/>
   <header className="blog-spaces-heading"><h1>{t('博客空间')}</h1><p>{t('发现不同的创作者，走进他们的空间。')}</p><div className="blog-spaces-actions"><Link className="space-btn primary" href="/workspace/blog">{t('创建我的空间')}<Icon name="plus"/></Link><a className="blog-spaces-text-link" href="#blog-spaces-directory">{t('浏览全部空间')}<Icon name="arrow"/></a></div></header>
  </div>
  <section className="blog-spaces-directory" id="blog-spaces-directory" data-blog-directory aria-labelledby="blog-spaces-directory-title">
   <div className="blog-spaces-directory-heading"><div><h2 id="blog-spaces-directory-title">{t('走进一个新的空间。')}</h2><p>{t('作品、经历与想法，在这里相遇。')}</p></div><Link className="blog-spaces-text-link" href="/workspace/blog">{t('设置我的空间')}<Icon name="arrow"/></Link></div>
   {spaces.length?<div className="blog-spaces-grid">{spaces.map(space=><Link className="blog-spaces-card" href={space.href} key={space.handle}>
    <div className={'blog-spaces-card-art'+(!space.coverId?' is-profile':'')}>{space.coverId?<img src={'/media/'+encodeURIComponent(space.coverId)} alt="" width={960} height={600} loading="lazy"/>:<div className="blog-spaces-profile-art"><FeedAvatar name={space.name} avatarId={space.avatarId}/><span>@{space.handle}</span></div>}</div>
    <div className="blog-spaces-card-title"><h3>{space.name}</h3><Icon name="arrow"/></div><span className="blog-spaces-handle">@{space.handle}</span>{space.projectTitle&&<span className="blog-spaces-project-label">{space.projectTitle}</span>}<p>{space.intro}</p><span className="blog-spaces-card-enter">{t('进入博客空间')}<Icon name="arrow"/></span>
   </Link>)}</div>:<div className="blog-spaces-empty"><p>{t('暂时没有公开博客空间。')}</p><Link className="space-btn primary" href="/workspace/blog">{t('创建我的空间')}</Link></div>}
  </section>
 </div>;
}
