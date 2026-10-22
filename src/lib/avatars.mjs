import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {writeFile,unlink,statfs} from 'node:fs/promises';
import path from 'node:path';
import {db,FILES,now,hash,limited,transaction,syncRefs} from './db.mjs';
import {currentUser,serviceRequest,publishingQualified,origin,clientIp} from './auth.mjs';
import {requireValue,HttpError} from './content.mjs';
import {readLimited,lock} from './uploads.mjs';

export const AVATAR_MAX_BYTES=2*1024*1024;
const permitted=new Set(['image/jpeg','image/png','image/webp']);
function avatarUser(req,upload=false){
 requireValue(serviceRequest(req),'头像服务暂未开放',503);
 const user=currentUser(req);requireValue(user,'请先登录',401);
 requireValue(user.role!=='owner','站长头像请在个人资料中更换',403);
 requireValue(user.status==='active'&&(!upload||publishingQualified(user,req)),'账号暂不能更换头像，请先确认发布资格或联系站长',403);
 return user;
}
function record(actor,action,target,details={}){db().prepare('INSERT INTO community_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),actor,action,target,JSON.stringify(details),now())}
// Caller supplies a transaction, so profile and public-file references change together.
export function clearAvatar(id){const d=db();d.prepare('UPDATE community_users SET avatar_id=NULL,updated=? WHERE id=?').run(now(),id);d.prepare('DELETE FROM refs WHERE owner=?').run('community-avatar:'+id)}

export async function changeAvatar(req){
 origin(req);
 const user=avatarUser(req,req.method==='PUT');
 requireValue(['PUT','DELETE'].includes(req.method),'头像操作无效',405);
 return lock('avatar-user:'+user.id,async()=>{
  avatarUser(req,req.method==='PUT');
  requireValue(!limited('avatar-user:'+user.id,20,86400000)&&!limited('avatar-ip:'+hash(clientIp(req)),60,3600000),'更换头像过于频繁，请稍后再试',429);
  if(req.method==='DELETE'){transaction(()=>{clearAvatar(user.id);record(user.id,'avatar_removed',user.id)});return{user:currentUser(req)}}
  requireValue(permitted.has((req.headers.get('content-type')||'').split(';')[0].toLowerCase()),'头像仅支持 JPG、PNG、WebP 图片');
  const input=await readLimited(req,AVATAR_MAX_BYTES);requireValue(input.length>0,'请选择非空图片');
  const signature=input.subarray(0,12);
  requireValue(signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||signature[0]===255&&signature[1]===216&&signature[2]===255||signature.subarray(0,4).toString()==='RIFF'&&signature.subarray(8,12).toString()==='WEBP','文件内容不是支持的头像图片');
  // ponytail: serialize small-image decoding in this single-process app to bound memory.
  const output=await lock('avatar-image-decoder',async()=>{
   try{
    const image=sharp(input,{limitInputPixels:16000000,failOn:'warning'}).timeout({seconds:10});
    const meta=await image.metadata();
    requireValue(['jpeg','png','webp'].includes(meta.format)&&!(meta.pages>1),'请选择有效的静态 JPG、PNG、WebP 图片');
    requireValue(meta.width>=32&&meta.height>=32,'图片至少需要 32 × 32 像素');
    return await image.rotate().resize(256,256,{fit:'cover'}).flatten({background:'#ffffff'}).jpeg({quality:85}).toBuffer();
   }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'无法读取图片，请选择有效的 JPG、PNG 或 WebP 静态图片')}
  });
  const disk=await statfs(FILES);requireValue(Number(disk.bavail)*Number(disk.bsize)>output.length+32*1024*1024,'可用磁盘不足，请联系站长',507);
  const id=randomUUID(),destination=path.join(FILES,id);
  await writeFile(destination,output,{flag:'wx',mode:0o600});
  try{transaction(d=>{
   // Recheck after asynchronous decoding so restrictions/logout cannot race publication.
   avatarUser(req,true);
   d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'community-avatar.jpg',output.length,'image/jpeg',hash(output),now());
   d.prepare('UPDATE community_users SET avatar_id=?,updated=? WHERE id=?').run(id,now(),user.id);
   syncRefs('community-avatar:'+user.id,{avatarId:id},'public');
   record(user.id,'avatar_updated',user.id,{file:id});
  })}catch(error){await unlink(destination).catch(()=>{});throw error}
  return{user:currentUser(req)};
 });
}
