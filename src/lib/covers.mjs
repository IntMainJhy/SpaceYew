import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {writeFile,unlink,statfs} from 'node:fs/promises';
import path from 'node:path';
import {db,FILES,now,hash,limited,transaction,getConfig} from './db.mjs';
import {currentUser,localRequest,serviceRequest,publishingQualified,origin} from './auth.mjs';
import {requireValue,HttpError} from './content.mjs';
import {readLimited,lock} from './uploads.mjs';

export const COVER_MAX_BYTES=5*1024*1024;
const owner=id=>'community-cover:'+id;
function author(req){const user=currentUser(req);requireValue(serviceRequest(req),'投稿封面服务暂未开放',503);requireValue(user,'请先登录',401);requireValue(publishingQualified(user,req),'确认发布资格后才能上传投稿封面',403);requireValue(!getConfig('community').paused,'社区已暂停新投稿',409);return user;}
export function ownsCover(actor,id){return !!db().prepare("SELECT 1 FROM refs WHERE owner=? AND file=? AND visibility='private'").get(owner(actor),id);}
export function canReadCover(req,id){
 if(!serviceRequest(req))return false;
 const user=currentUser(req);
 if(user?.status==='active'&&(ownsCover(user.id,id)||['owner','reviewer'].includes(user.role)&&db().prepare("SELECT 1 FROM catalog_entries WHERE json_extract(pending,'$.coverId')=? LIMIT 1").get(id)||user.role==='reviewer'&&db().prepare("SELECT 1 FROM community_revisions WHERE json_extract(data,'$.coverId')=? LIMIT 1").get(id)))return true;
 const verification=localRequest(req)?"IN ('verified','local_test')":"= 'verified'";
 return !!db().prepare(`SELECT 1 FROM community_posts p JOIN community_revisions r ON r.id=p.public_revision JOIN community_users u ON u.id=p.author WHERE p.visibility='public' AND u.status='active' AND (u.role='owner' OR u.verification ${verification}) AND json_extract(r.data,'$.coverId')=? AND NOT EXISTS(SELECT 1 FROM community_cases c WHERE c.post=p.id AND c.frozen=1) LIMIT 1`).get(id);
}
export async function uploadCover(req){
 origin(req);const user=author(req);
 return lock('cover-user:'+user.id,async()=>{
  author(req);requireValue(!limited('cover-upload:'+user.id,40,86400000),'今天上传的图片较多，请稍后再试',429);
  requireValue(db().prepare('SELECT COUNT(*) n FROM refs WHERE owner=?').get(owner(user.id)).n<200,'每个账号最多保存200张封面，请联系站长清理未使用图片',429);
  requireValue(['image/jpeg','image/png','image/webp'].includes((req.headers.get('content-type')||'').split(';')[0]),'封面仅支持 JPG、PNG、WebP');
  const input=await readLimited(req,COVER_MAX_BYTES);requireValue(input.length>0,'请选择图片');
  const output=await lock('avatar-image-decoder',async()=>{try{
   const image=sharp(input,{limitInputPixels:20000000,failOn:'warning'}).timeout({seconds:10}),meta=await image.metadata();
   requireValue(['jpeg','png','webp'].includes(meta.format)&&!(meta.pages>1),'请选择有效的静态 JPG、PNG、WebP 图片');
   requireValue(meta.width>=160&&meta.height>=90,'封面至少需要160×90像素');
   return await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).flatten({background:'#fff'}).jpeg({quality:85}).toBuffer();
  }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'无法读取图片，请选择有效的 JPG、PNG 或 WebP 静态图片');}});
  const disk=await statfs(FILES);requireValue(Number(disk.bavail)*Number(disk.bsize)>output.length+32*1024*1024,'可用磁盘不足，请联系站长',507);
  const id=randomUUID(),destination=path.join(FILES,id);await writeFile(destination,output,{flag:'wx',mode:0o600});
  try{transaction(d=>{author(req);d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'community-cover.jpg',output.length,'image/jpeg',hash(output),now());d.prepare('INSERT INTO refs VALUES(?,?,?)').run(owner(user.id),id,'private');});}catch(error){await unlink(destination).catch(()=>{});throw error;}
  return{id,url:'/media/'+id};
 });
}
