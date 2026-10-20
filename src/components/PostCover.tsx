'use client';
import {useLocale} from './LocaleProvider';
import {useRef,useState} from 'react';
import {Icon} from './Icons';
import {inputClass,secondary,Notice} from './CommunityUI';

export function PostCover({id,alt='',className=''}:{id?:string;alt?:string;className?:string}){const {t:tr,locale}=useLocale();
 const[failed,setFailed]=useState('');
 if(!id)return null;
 if(failed===id)return <p className="community-cover-unavailable">{tr("封面暂不可用")}</p>;
 return <img className={'community-post-cover '+className} src={'/media/'+id} alt={alt||tr("投稿封面")} width={1200} height={675} loading="lazy" decoding="async" onError={()=>setFailed(id)}/>;
}
export function CoverField({id,alt,onChange,disabled,onBusy}:{id:string;alt:string;onChange:(id:string,alt:string)=>void;disabled:boolean;onBusy:(busy:boolean)=>void}){const {t:tr,locale}=useLocale();
 const input=useRef<HTMLInputElement>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function upload(file?:File){if(!file)return;setError('');if(file.size>5*1024*1024){setError('图片不能超过5MB。');return;}if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('请选择 JPG、PNG 或 WebP 图片。');return;}setBusy(true);onBusy(true);try{
  const response=await fetch('/api/community/covers',{method:'PUT',headers:{'Content-Type':file.type},body:file}),data=await response.json();if(!response.ok)throw new Error(data.error||'上传失败');onChange(data.id,alt);
 }catch(e:any){setError(e.message);}finally{setBusy(false);onBusy(false);if(input.current)input.current.value='';}}
 return <section className="community-cover-field"><h2>{tr("封面图片 ")}<span>{tr("可选")}</span></h2><p>{tr("一张图片，让分享更直观。支持 JPG、PNG、WebP，最大5MB。")}</p>{error&&<Notice error>{tr(error)}</Notice>}{id&&<PostCover id={id} alt={alt}/>}<div className="organic-actions"><input ref={input} className="community-sr" aria-label={tr("选择投稿封面")} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy} onChange={e=>void upload(e.target.files?.[0])}/><button type="button" className={secondary} disabled={disabled||busy} onClick={()=>input.current?.click()}><Icon name="image"/>{busy?tr("正在上传…"):id?tr("更换封面"):tr("上传封面")}</button>{id&&<button type="button" className="link-button" disabled={disabled||busy} onClick={()=>onChange('','')}>{tr("移除封面")}</button>}</div>{id&&<div className="field"><label htmlFor="cover-alt">{tr("图片说明 *")}</label><input id="cover-alt" className={inputClass} value={alt} maxLength={200} minLength={3} required disabled={disabled||busy} onChange={e=>onChange(id,e.target.value)} placeholder={tr("描述画面，并在来源说明中注明图片权利")}/></div>}<small>{tr("封面和正文一起审核，审核通过前仅本人和审核人员可见。")}</small></section>;
}
