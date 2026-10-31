'use client';
import Link from 'next/link';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {api,post,sendFile} from '@/lib/client';
import {useLocale} from './LocaleProvider';
import {useUnsaved} from './useUnsaved';
import {BlogTheme} from './BlogTheme';
import {BlogShare} from './BlogShare';
import {ResumeImport} from './ResumeImport';
import {FileChoice} from './Upload';
import {Icon} from './Icons';
import {BlogCanvas} from './BlogCanvas';
import {BlogPreview} from './BlogPreview';
import {canvasResume,previewCanvasProfile,previewCanvasLayout} from '@/lib/blog-canvas.mjs';
import {defaultBlogDesign,withBlogDecorations,canvasDraftSignature} from '@/lib/blog-design.mjs';
type Data=Record<string,any>;
function Field({label,value='',onChange,max=200}:{label:string;value?:string;onChange:(value:string)=>void;max?:number}){return <label className="be-field"><span>{label}</span><textarea value={value} maxLength={max} rows={2} onChange={e=>onChange(e.target.value)}/></label>}
function Media({owner,value,onChange,label,pdf=false,onBusy}:{owner:boolean;value:string;onChange:(id:string)=>void;label:string;pdf?:boolean;onBusy:(busy:boolean)=>void}){
 const{locale}=useLocale(),en=locale==='en',[busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(0),controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{onBusy(busy);return()=>onBusy(false)},[busy]);
 if(owner)return <FileChoice mode={pdf?'pdf':'image'} label={label} value={value||''} onChange={onChange} max={pdf?8000000:25000000} onBusy={onBusy}/>;
 return <div className="be-media"><span>{label}</span>{value&&<div>{pdf?<a href={'/download/'+value} target="_blank" rel="noreferrer">PDF</a>:<img src={'/media/'+value} alt={label}/>}<button type="button" disabled={busy} onClick={()=>onChange('')}>{en?'Remove':'移除'}</button></div>}<input aria-label={label} disabled={busy} type="file" accept={pdf?'application/pdf':'image/png,image/jpeg,image/webp'} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>(pdf?8000000:25000000)){setError(en?'File too large.':'文件过大。');return}setError('');setBusy(true);controller.current=new AbortController();try{const saved=await sendFile(file,controller.current.signal,x=>setProgress(x.progress),()=>{},'/api/spaces/uploads');if(pdf?saved.mime!=='application/pdf':!saved.mime.startsWith('image/'))throw Error(en?'Unsupported file format.':'文件格式不支持。');onChange(saved.id)}catch(e:any){if(e.name!=='AbortError')setError(e.message)}finally{setBusy(false)}}}/>{busy&&<p role="status">{progress}% <button type="button" onClick={()=>controller.current?.abort()}>{en?'Cancel':'取消'}</button></p>}{error&&<p role="alert">{error}</p>}</div>;
}

export function BlogEditor({owner:adminEntry=false}:{owner?:boolean}){
 const{locale}=useLocale(),en=locale==='en',say=(zh:string,english:string)=>en?english:zh,base=adminEntry?'/api/admin/blog':'/api/spaces';
 const[row,setRow]=useState<Data|null>(null),[profile,setProfile]=useState<Data>({}),[layout,setLayout]=useState<Data>({}),[discoverable,setDiscoverable]=useState(true),[tab,setTab]=useState('canvas'),[language,setLanguage]=useState(''),[preview,setPreview]=useState(false),[previewDevice,setPreviewDevice]=useState('desktop'),[busy,setBusy]=useState(false),[uploads,setUploads]=useState<Record<string,boolean>>({}),[error,setError]=useState(''),[status,setStatus]=useState(''),[signedOut,setSignedOut]=useState(false),[accepted,setAccepted]=useState(false),[handle,setHandle]=useState(''),[publishMounted,setPublishMounted]=useState(false);
 const owner=adminEntry||row?.canManage===true;
 const editorRoot=useRef<HTMLDivElement>(null),publishPanel=useRef<HTMLElement>(null);
 const baseline=useRef(''),requestId=useRef(0),mounted=useRef(true),signature=canvasDraftSignature(profile,layout,discoverable),dirty=!!row&&baseline.current!==signature;
 useUnsaved(dirty);
 // The canvas stays mounted between views, preserving selection, zoom and undo history.
 useLayoutEffect(()=>{
  const root=editorRoot.current;if(!row||!root)return;
  const target=root.querySelector(preview?'.blog-effect-preview':'.be-design-stage');if(!target)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const context=gsap.context(()=>{gsap.fromTo(target,{opacity:reduced?.85:.55,clipPath:reduced?'inset(0)':'inset(0 0 1.5% 0)'},{opacity:1,clipPath:'inset(0)',duration:reduced?.08:.24,ease:'power3.out',clearProps:'opacity,clipPath'})},root);
  return()=>context.revert();
 },[preview,!!row]);
 useLayoutEffect(()=>{
  if(!row)return;
  if(tab==='publish'&&!publishMounted){setPublishMounted(true);return}
  const panel=publishPanel.current;if(!panel)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const context=gsap.context(()=>{
   if(tab==='publish')gsap.fromTo(panel,{x:reduced?0:22,opacity:.4},{x:0,opacity:1,duration:reduced?.08:.24,ease:'power3.out',clearProps:'transform,opacity'});
   else gsap.to(panel,{x:reduced?0:16,opacity:0,duration:reduced?.06:.16,ease:'power2.in',onComplete:()=>setPublishMounted(false)});
  },editorRoot);
  return()=>context.revert();
 },[tab,publishMounted,!!row]);
 function load(value:Data){setRow(value);setProfile(value.profile);const next={...value.layout,blog:{mode:'theme',theme:'anx',title:'',description:'',bundleId:'',sections:['projects','articles','resources'],...value.layout.blog,...(!value.profile.resume&&(value.profile.experiences?.length||value.content?.length||value.legacyContent?.length)?{showLegacyContent:true}:{})}};next.blog.design=next.blog.design?withBlogDecorations(next.blog.design):{...defaultBlogDesign(value.profile,next,[...(value.content||[]),...(value.legacyContent||[])]),...(!value.public&&value.visibility!=='public'?{appearance:'glass-space'}:{})};setLayout(next);setDiscoverable(value.discoverable);setHandle(value.handle);baseline.current=canvasDraftSignature(value.profile,next,value.discoverable)}
 useEffect(()=>{mounted.current=true;api(base+'/mine').then(value=>{if(mounted.current)load(value)}).catch(e=>{if(mounted.current){setSignedOut([401,403].includes(e.status));setError(e.message)}});return()=>{mounted.current=false}},[base]);
 const patch=(value:Data)=>setProfile(p=>({...p,...value})),resume=canvasResume(profile),setResume=(value:Data|null)=>patch({resume:value}),uploading=Object.values(uploads).some(Boolean),flag=(key:string)=>(value:boolean)=>setUploads(x=>({...x,[key]:value}));
 async function run(action:()=>Promise<void>){if(busy||uploading)return;setBusy(true);setError('');setStatus('');const id=++requestId.current;try{await action()}catch(e:any){if(mounted.current&&id===requestId.current)setError(e.message)}finally{if(mounted.current)setBusy(false)}}
 async function save(){const value=await post(base+'/save',{profile,layout,discoverable,revision:row!.revision,profileVersion:row!.profileVersion,...(owner?{publish:true}:{})});load(value);setStatus(say(owner?'公开主页已更新。':'草稿已保存，公开版本保持不变。',owner?'Public homepage updated.':'Draft saved. The published version is unchanged.'));return value}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'&&row){e.preventDefault();if(dirty&&!busy&&!uploading)void run(async()=>{await save()})}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 const backLabel=say(owner?'返回管理后台':'返回博客空间',owner?'Back to admin':'Back to blog spaces');
 const backLink=<Link className="bc-editor-back" href={owner?'/admin':'/blogs'} aria-label={backLabel} title={backLabel}><Icon name="arrow"/><span>{say('返回','Back')}</span></Link>;
 if(!row)return <div className="blog-editor be-loading">{backLink}<h1>{say('编辑我的博客','Edit my blog')}</h1>{error?<><p role="alert">{error}</p>{signedOut?<Link className="space-btn primary" href={(owner?'/admin/login':'/login')+'?next='+encodeURIComponent(owner?'/admin/blog':'/workspace/blog')}>{say('登录后编辑','Sign in to edit')}</Link>:<button className="space-btn" onClick={()=>location.reload()}>{say('重新加载','Reload')}</button>}</>:<p role="status">{say('正在读取你的草稿…','Loading your draft…')}</p>}</div>;
 const pending=row.reviews.find((r:Data)=>r.kind==='board'&&r.status==='pending'),publicUrl='/blog/'+row.handle;
 return <div ref={editorRoot} className="blog-editor blog-canvas-editor"><header className="be-heading"><div className="bc-editor-heading">{backLink}<div><h1>{say('空间画布','Space canvas')}</h1><p className="bc-editor-status"><span>@{row.handle}</span><span className="bc-save-state" data-dirty={dirty}><Icon name={dirty?'file':'check'}/>{dirty?say('草稿未保存','Unsaved draft'):say('已保存','Saved')}</span></p></div></div><div className="be-primary-actions">
  <div className="bc-action-group bc-action-preferences" role="group" aria-label={say('文字版本','Content language')}>

   <label className="bc-language"><span className="community-sr">{say('编辑文字版本','Content language')}</span><select aria-label={say('编辑文字版本','Content language')} value={language} disabled={busy||uploading} onChange={e=>setLanguage(e.target.value)}><option value="">{say('原文','Original')}</option><option value="zh">中文</option><option value="en">English</option><option value="ja">日本語</option></select></label>
  </div>
  <div className="bc-action-group bc-action-views" role="group" aria-label={say('查看与分享','View and share')}>
   {!owner&&<BlogShare path={publicUrl} available={row.visibility==='public'}/>}
   <button type="button" className="space-btn bc-action bc-preview-toggle" aria-label={preview?say('返回画布','Back to canvas'):say('预览效果','Preview')} title={preview?say('返回画布','Back to canvas'):say('预览效果','Preview')} aria-pressed={preview} disabled={busy||uploading} onClick={()=>{setPreview(!preview);setTab('canvas')}}><Icon name={preview?'grid':'eye'}/><span className="bc-action-label">{preview?say('返回画布','Back to canvas'):say('预览效果','Preview')}</span></button>
  </div>
  <div className="bc-action-group bc-action-commit" role="group" aria-label={say('保存与发布','Save and publish')}>
   <button type="button" className="space-btn bc-action bc-publish-toggle" aria-label={say('发布设置','Publish settings')} title={say('发布设置','Publish settings')} disabled={busy||uploading} aria-pressed={tab==='publish'} onClick={()=>setTab(tab==='publish'?'canvas':'publish')}><Icon name="upload"/><span className="bc-action-label">{say('发布设置','Publish settings')}</span></button>
   <button type="button" className="space-btn primary bc-save-action" aria-busy={busy} title={say(owner?'保存并公开（⌘ / Ctrl S）':'保存草稿（⌘ / Ctrl S）',owner?'Save & publish (⌘ / Ctrl S)':'Save draft (⌘ / Ctrl S)')} disabled={busy||uploading||!dirty} onClick={()=>void run(async()=>{await save()})}>{busy?<span className="bc-save-spinner" aria-hidden="true"/>:<Icon name="check"/>}{busy?say('保存中…','Saving…'):say(owner?'保存并公开':'保存草稿',owner?'Save & publish':'Save draft')}</button>
  </div>
 </div></header>
 <div className="be-feedback" aria-live="polite">{status&&<p role="status">{status}</p>}{error&&<p role="alert" className="space-error">{error}</p>}{language&&<span>{say('正在编辑翻译，图片与排列共用。','Editing a translation. Images and ordering are shared.')}</span>}</div>
 {preview&&<BlogPreview say={say} device={previewDevice} onDevice={setPreviewDevice}><BlogTheme data={{...row,profile:previewCanvasProfile(profile,language||locale),layout:previewCanvasLayout(layout,language||locale)}} preview/></BlogPreview>}<div className="be-design-stage" hidden={preview}><BlogCanvas data={row} profile={profile} layout={layout} language={language} onProfile={setProfile} onLayout={setLayout} say={say} disabled={busy||uploading} media={props=><Media {...props} owner={!!row.legacy} onBusy={flag('canvas-media')}/>} importControl={<ResumeImport member={!row.legacy} structured={false} resume={resume} onBusy={flag('import')} onChange={setResume} onImport={value=>{patch({...value,name:value.name||profile.name,translations:{},resume:{...value.resume,resumeId:resume.resumeId,gallery:resume.gallery,certificates:resume.certificates}});setLanguage('')}}/>}/></div>
 {publishMounted&&<aside ref={publishPanel} inert={tab!=='publish'} aria-hidden={tab!=='publish'} className="bc-publish-panel" aria-label={say('发布设置','Publish settings')}><header><h2>{say('分享与发布','Share & publish')}</h2><button className="space-icon-btn" type="button" aria-label={say('关闭发布设置','Close publish settings')} onClick={()=>setTab('canvas')}><Icon name="close"/></button></header><fieldset disabled={busy||uploading} className="be-fields">
 <><section><h2>{say('你的分享地址','Your share address')}</h2><p className="be-address">{publicUrl}</p>{row.visibility==='public'&&<Link className="space-btn" href={publicUrl} target="_blank">{say('查看公开主页','Open public homepage')}</Link>}{!owner&&!row.public&&!pending&&<div className="be-inline"><Field label={say('地址标识（首次发布前可修改）','Handle (editable before first publication)')} max={32} value={handle} onChange={setHandle}/><button type="button" disabled={dirty||handle===row.handle||uploading} onClick={()=>void run(async()=>load(await post(base+'/handle',{handle,revision:row.revision})))}>{say('更新地址','Update handle')}</button></div>}<label className="be-checkbox"><input type="checkbox" checked={discoverable} onChange={e=>setDiscoverable(e.target.checked)}/>{say('允许在平台中发现我的博客','List my blog on the platform')}</label></section><section><h2>{say('发布状态','Publication')}</h2>{!row.canPublish&&<p role="status">{say('可保存私有草稿；完成真实身份和发布资格核查后可提交公开。','You can save private drafts. Complete identity and publishing checks before submitting for publication.')}</p>}<p>{say(owner?'保存会直接更新此主页的公开内容。':'保存只更新私人草稿；提交的版本经过审核后公开。继续编辑不会改变已提交的版本。',owner?'Saving directly updates this homepage’s public content.':'Saving updates your private draft. Submitted versions go public after review. Later edits do not change a submitted version.')}</p>{!owner&&<>{pending?<><p role="status">{say('已有一个版本正在审核。','A version is awaiting review.')}</p><button type="button" onClick={()=>void run(async()=>{load(await post(base+'/withdraw',{id:pending.id}));setStatus(say('已撤回，可以重新提交。','Withdrawn. You can submit a new version.'))})}>{say('撤回待审版本','Withdraw submission')}</button></>:<><label className="be-checkbox"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>{say('我已核对内容、隐私和图片使用权，并同意社区规则。','I have checked the content, privacy and image rights, and agree to the community rules.')}</label><button className="space-btn primary" type="button" disabled={!row.canPublish||row.policy?.ready===false||!accepted||uploading} onClick={()=>void run(async()=>{const saved=await save();load(await post(base+'/submit',{revision:saved.revision,accepted:true,policyVersion:saved.policy?.version,policyHash:saved.policy?.hash}));setAccepted(false);setStatus(say('已提交审核。','Submitted for review.'))})}>{say('提交发布','Submit for publication')}</button></>}{row.reviews.filter((x:Data)=>x.kind==='board'&&['rejected','approved'].includes(x.status)).slice(0,3).map((r:Data)=><p key={r.id}>{say(r.status==='approved'?'审核通过':'需要修改',r.status==='approved'?'Approved':'Changes requested')} · {r.reason}</p>)}</>}{row.visibility==='public'&&<button className="be-offline" type="button" disabled={dirty||uploading} onClick={()=>{if(confirm(say('暂时隐藏公开主页？','Hide your public homepage?')))void run(async()=>{load(await post(base+'/offline',{revision:row.revision}));setStatus(say('公开主页已隐藏。','Public homepage hidden.'))})}}>{say('暂时下线主页','Take homepage offline')}</button>}</section></>
 </fieldset></aside>}
 </div>;
}
