'use client';
import {useLocale} from './LocaleProvider';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {api} from '@/lib/client';
import {FeedAvatar} from './FeedAvatar';
import {type Doc,Notice,primary,secondary} from './CommunityUI';

export function MemberAvatarSettings({user,onSaved}:{user:Doc;onSaved:(user:Doc)=>void}){const {t:tr}=useLocale();
 const[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const picker=useRef<HTMLInputElement>(null);
 function clearSelection(){setFile(null);if(picker.current)picker.current.value=''}
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 const qualified=user.canPublish===true;
 async function save(remove=false){setBusy(true);setError('');setMessage('');try{
  const result=await api('/api/community/avatar',remove?{method:'DELETE'}:{method:'PUT',headers:{'Content-Type':file!.type},body:file!});
  onSaved(result.user);clearSelection();setMessage(remove?'已移除头像，恢复默认图片头像。':'头像已更新，账号区和所有投稿会同步使用新头像。');
 }catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <section className="member-avatar-settings"><h2>{tr("个人头像")}</h2><div className="member-avatar-layout">
  <div className="member-avatar-preview">{preview?<span className="feed-avatar"><img src={preview} alt={tr("待保存的新头像")}/></span>:<FeedAvatar name={user.displayName||user.nickname} avatarId={user.avatarId}/>}</div>
  <div className="member-avatar-controls">{user.id==='owner'?<><p>{tr("站长头像与主站个人资料共用。")}</p><Link className={secondary} href="/admin/profile">{tr("前往个人资料更换头像")}</Link></>:<>
   <p>{tr("JPG、PNG、WebP，最大2 MB，居中裁切。")}</p><p className="community-fine">{tr("请确保图片使用权并遵守社区规则，保存后公开显示。")}</p>
   {!qualified&&<p className="community-fine">{tr("完成发布资格核验且账号正常后，可上传头像。")}</p>}
   <div className="field"><label htmlFor="member-avatar-file">{tr("选择头像图片")}</label><input ref={picker} type="file" id="member-avatar-file" accept="image/jpeg,image/png,image/webp" disabled={busy||!qualified} onChange={event=>{
    const next=event.target.files?.[0];setError('');setMessage('');
    if(!next)return;
    if(!['image/jpeg','image/png','image/webp'].includes(next.type)||!next.size||next.size>2*1024*1024){setError("请选择不超过 2 MB 的 JPG、PNG 或 WebP 图片。");event.target.value='';setFile(null);return}
    setFile(next);
   }}/></div>
   {file&&<p className="member-avatar-pending community-fine" role="status">{tr("新头像尚未保存，点击“保存头像”后公开更新。")}</p>}<div className="organic-actions"><button type="button" className={primary} disabled={busy||!file||!qualified} onClick={()=>void save()}>{busy?tr("正在保存…"):tr("保存头像")}</button>{file&&<button type="button" className={secondary} disabled={busy} onClick={clearSelection}>{tr("取消选择")}</button>}{user.avatarId&&<button type="button" className={secondary} disabled={busy||user.status!=='active'} onClick={()=>void save(true)}>{tr("移除头像")}</button>}</div>
  </>}{error&&<Notice error>{tr(error)}</Notice>}{message&&<Notice>{tr(message)}</Notice>}</div>
 </div></section>;
}
