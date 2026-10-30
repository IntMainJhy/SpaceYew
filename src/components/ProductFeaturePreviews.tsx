'use client';

import {useId,useLayoutEffect,useRef,useState} from 'react';
import type {KeyboardEvent,ReactNode} from 'react';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {FeedAvatar} from './FeedAvatar';
import {Icon} from './Icons';

export type PreviewPost={id:string;title:string;summary:string;coverId?:string;coverAlt?:string;authorName:string;authorAvatarId?:string};
export type PreviewExperience={id:string;title:string;start:string;end?:string;type?:string;description?:string;career?:boolean;visible?:boolean};
export type PreviewContent={id:string;type:string;slug:string;title:string;summary:string;coverId?:string;career?:boolean;role?:string;contribution?:string;outcome?:string};
export type PreviewSpace={url:string;handle:string;profile:{name:string;alias?:string;intro:string;avatarId?:string;skills?:string[];experiences?:PreviewExperience[]};content:PreviewContent[]};

function PreviewFrame({kind,label,children}:{kind:string;label:string;children:ReactNode}){
  const {t}=useLocale();
  return <div className={'product-feature-preview pfp-'+kind} aria-label={t(label)}>
    {children}
  </div>;
}

function PreviewEmpty({icon,title,description}:{icon:string;title:string;description:string}){
  const {t}=useLocale();
  return <div className="pfp-empty"><Icon name={icon}/><h3>{t(title)}</h3><p>{t(description)}</p></div>;
}

export function CommunityFeaturePreview({posts}:{posts:PreviewPost[]}){
  const {t}=useLocale();
  return <PreviewFrame kind="community" label="社区界面预览">
    <header className="pfp-feed-heading"><span><Icon name="comment"/>{t('社区动态')}</span><Link href="/community" aria-label={t('去社区看看')}><Icon name="arrow"/></Link></header>
    <div className="pfp-feed">
      {posts.length?posts.slice(0,2).map((post,index)=><article className={'pfp-post'+(index?' pfp-post-compact':'')} key={post.id}>
        <div className="pfp-person"><FeedAvatar name={post.authorName} avatarId={post.authorAvatarId}/><strong>{post.authorName}</strong></div>
        <Link className="pfp-post-content" href={'/community/'+encodeURIComponent(post.id)}>
          <div className="pfp-post-copy"><h3>{post.title}</h3><p>{post.summary}</p></div>
          {post.coverId&&<img className="pfp-post-cover" src={'/media/'+post.coverId} alt={post.coverAlt||''} width={640} height={320} loading="lazy"/>}
        </Link>
      </article>):<PreviewEmpty icon="comment" title="好想法，从分享开始。" description="发现资源，交流想法，收藏值得留下的内容。"/>}
    </div>
  </PreviewFrame>;
}

const showcaseTabs=[['projects','作品'],['experience','经历'],['resources','资源']] as const;
type ShowcaseTab=typeof showcaseTabs[number][0];

function PreviewDocument({item,base}:{item:PreviewContent;base:string}){
  return <Link className="pfp-document" href={base+'/'+item.type+'/'+encodeURIComponent(item.slug)}>
    {item.coverId?<img src={'/media/'+item.coverId} alt="" width={160} height={120} loading="lazy"/>:<span className="pfp-document-symbol" aria-hidden="true"><Icon name={item.type==='projects'?'grid':'folder'}/></span>}
    <div><h4>{item.title}</h4><p>{item.summary}</p></div>
  </Link>;
}

export function ShowcaseFeaturePreview({space}:{space?:PreviewSpace}){
  const {t,locale}=useLocale(),[tab,setTab]=useState<ShowcaseTab>('projects'),id=useId();
  const tabsRef=useRef<HTMLDivElement>(null),markerRef=useRef<HTMLSpanElement>(null);
  const content=space?.content.filter(item=>item.type===tab).slice(0,2)||[];
  const experiences=space?.profile.experiences?.filter(item=>item.visible!==false).slice(0,2)||[];
  useLayoutEffect(()=>{
    const list=tabsRef.current,marker=markerRef.current;
    if(!list||!marker)return;
    const measure=()=>{
      const selected=list.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if(!selected?.offsetWidth)return;
      marker.style.transform=`translateX(${selected.offsetLeft}px) scaleX(${selected.offsetWidth/32})`;
      list.dataset.markerReady='true';
    };
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll('button').forEach(button=>observer.observe(button));
    return()=>observer.disconnect();
  },[tab,locale,space]);
  const changeTab=(event:KeyboardEvent<HTMLDivElement>)=>{
    const direction=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
    if(!direction&&!['Home','End'].includes(event.key))return;
    event.preventDefault();
    const current=showcaseTabs.findIndex(([key])=>key===tab),next=event.key==='Home'?0:event.key==='End'?showcaseTabs.length-1:(current+direction+showcaseTabs.length)%showcaseTabs.length;
    setTab(showcaseTabs[next][0]);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  return <PreviewFrame kind="showcase" label="个人展板界面预览">
    {space?<div className="pfp-showcase-body">
      <header className="pfp-showcase-profile"><FeedAvatar name={space.profile.name} avatarId={space.profile.avatarId}/><div><h3>{space.profile.name}</h3><span>@{space.handle}</span></div></header>
      {space.profile.intro&&<p className="pfp-showcase-intro">{space.profile.intro}</p>}
      <div className="pfp-tabs" ref={tabsRef} role="tablist" aria-label={t('展板内容')} onKeyDown={changeTab}>{showcaseTabs.map(([key,label])=><button id={id+'-'+key} role="tab" type="button" key={key} aria-selected={tab===key} aria-controls={id+'-panel'} tabIndex={tab===key?0:-1} onClick={()=>setTab(key)}>{t(label)}</button>)}<span className="pfp-tab-marker" ref={markerRef} aria-hidden="true"/></div>
      <div className="pfp-tab-panel" id={id+'-panel'} role="tabpanel" aria-labelledby={id+'-'+tab} tabIndex={0}>
        {tab==='experience'?experiences.length?<div className="pfp-experiences">{experiences.map(item=><article key={item.id}><time>{item.start}{item.start?' — ':''}{item.end||t('至今')}</time><h4>{item.title}</h4>{item.description&&<p>{item.description}</p>}</article>)}</div>:<p className="pfp-tab-empty">{t('新的经历，会在这里慢慢积累。')}</p>:content.length?<div className="pfp-documents">{content.map(item=><PreviewDocument key={item.id} item={item} base={space.url}/>)}</div>:<p className="pfp-tab-empty">{t('内容正在整理中。')}</p>}
      </div>
      <Link className="pfp-open-showcase" href={space.url}>{t('查看个人展板')}</Link>
    </div>:<PreviewEmpty icon="grid" title="你的内容，你来定义。" description="自由组合经历、作品与资源，搭建自己的个人展板。"/>}
  </PreviewFrame>;
}

export function ResumeFeaturePreview({space}:{space?:PreviewSpace}){
  const {t}=useLocale(),profile=space?.profile;
  const experiences=profile?.experiences?.filter(item=>item.visible!==false&&item.career!==false).slice(0,1)||[];
  const projects=space?.content.filter(item=>item.type==='projects'&&item.career).slice(0,1)||[];
  return <PreviewFrame kind="resume" label="简历界面预览">
    {space&&profile?<div className="pfp-resume-body"><article className="pfp-resume-paper">
      <header><h3>{profile.name}</h3>{profile.alias&&<p className="pfp-resume-alias">{profile.alias}</p>}{profile.intro&&<p className="pfp-resume-intro">{profile.intro}</p>}</header>
      {!!profile.skills?.length&&<section className="pfp-resume-section"><h4>{t('技能')}</h4><p className="pfp-resume-skills">{profile.skills.slice(0,6).join(' · ')}</p></section>}
      {!!experiences.length&&<section className="pfp-resume-section"><h4>{t('成长经历')}</h4>{experiences.map(item=><article className="pfp-resume-entry" key={item.id}><div><h5>{item.title}</h5><time>{item.start}{item.start?' — ':''}{item.end||t('至今')}</time></div>{item.type&&<small>{item.type}</small>}{item.description&&<p>{item.description}</p>}</article>)}</section>}
      {!!projects.length&&<section className="pfp-resume-section"><h4>{t('精选项目与本人贡献')}</h4>{projects.map(item=><article className="pfp-resume-entry" key={item.id}><Link href={space.url+'/projects/'+encodeURIComponent(item.slug)}><h5>{item.title}</h5></Link>{item.role&&<small>{t('我的角色')} · {item.role}</small>}<p>{item.contribution||item.summary}</p></article>)}</section>}
      {!profile.skills?.length&&!experiences.length&&!projects.length&&<p className="pfp-resume-pending">{t('经历、技能与精选作品，汇成一份完整简历。')}</p>}
    </article></div>:<PreviewEmpty icon="file" title="个人简历" description="经历、技能与精选作品，汇成一份完整简历。"/>}
  </PreviewFrame>;
}
