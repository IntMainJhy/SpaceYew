import sharp from 'sharp';
import path from 'node:path';
import {writeFile,rename,unlink} from 'node:fs/promises';
import {db,FILES,hash,now,transaction,limited,recordAudit} from './db.mjs';
import {spaceActor,ensureSpace,spaceStorageBytes} from './spaces.mjs';
import {requireValue,HttpError} from './content.mjs';
import {createUpload,putChunk,completeUpload,cancelUpload,uploadInfo,lock} from './uploads.mjs';
export async function spaceUploads(req,p,input,url){const user=spaceActor(req),space=ensureSpace(user),d=db(),id=p[2];if(!id){requireValue(req.method==='POST','接口不存在',404);return lock('space-quota:'+space.id,async()=>{const size=Number(input.size);requireValue(Number.isSafeInteger(size)&&size>0&&size<=100000000,'个人空间单文件上限100MB');requireValue(/^[a-f0-9]{64}$/.test(input.fingerprint||''),'文件指纹无效');const fingerprint=hash(space.id+':'+input.fingerprint),existing=d.prepare('SELECT * FROM uploads WHERE fingerprint=? AND size=? AND space_id=?').get(fingerprint,size,space.id);if(existing&&existing.status!=='cancelled')return uploadInfo(existing);const used=spaceStorageBytes(space.id),pending=d.prepare("SELECT COALESCE(SUM(size),0) n,COUNT(*) c FROM uploads WHERE space_id=? AND (status IN ('pending','assembling') OR (status='complete' AND NOT EXISTS(SELECT 1 FROM space_assets a WHERE a.file=uploads.file_id)))").get(space.id);requireValue(d.prepare('SELECT COUNT(*) n FROM space_assets WHERE space=?').get(space.id).n+pending.c<1000,'个人空间最多保留1000个文件',409);requireValue(pending.c<3&&used+pending.n+size<=1000000000,'个人空间存储不足或未完成上传过多',409);requireValue(!limited('space-upload:'+user.id,50,3600000),'上传操作过于频繁',429);const task=await createUpload({...input,fingerprint});d.prepare('UPDATE uploads SET space_id=? WHERE id=?').run(space.id,task.id);return uploadInfo(d.prepare('SELECT * FROM uploads WHERE id=?').get(task.id))})}
 requireValue(/^[a-f0-9-]{36}$/.test(id),'任务不存在',404);
 const row=d.prepare('SELECT * FROM uploads WHERE id=? AND space_id=?').get(id,space.id);requireValue(row,'任务不存在',404);
 if(req.method==='GET')return uploadInfo(row);
 if(req.method==='PUT')return putChunk(id,url.searchParams.get('index'),req);
 if(req.method==='DELETE')return cancelUpload(id);
 requireValue(req.method==='POST'&&p[3]==='complete','接口不存在',404);
 return lock('space-complete:'+id,async()=>{
  const task=await completeUpload(id);
  if(!d.prepare('SELECT 1 FROM space_assets WHERE space=? AND file=?').get(space.id,task.file.id)){
   const file=task.file,target=path.join(FILES,file.id),temporary=target+'.normalized';
   try{
    if(file.mime.startsWith('image/')){
     requireValue(file.size<=25000000,'图片请控制在25MB以内');
     const data=await lock('avatar-image-decoder',async()=>{try{
      const source=sharp(target,{limitInputPixels:24000000,failOn:'warning'}).timeout({seconds:10}),meta=await source.metadata();
      requireValue(['jpeg','png','webp','gif'].includes(meta.format),'图片格式无效');
      requireValue(!meta.pages||meta.pages===1,'个人空间图片暂不支持动图');
      return await source.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
     }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'无法读取图片，请选择有效的静态图片')}});
     await writeFile(temporary,data,{mode:0o600});await rename(temporary,target);
     d.prepare('UPDATE files SET size=?,mime=?,sha256=? WHERE id=?').run(data.length,'image/webp',hash(data),file.id);
    }
    transaction(tx=>{
     const normalized=tx.prepare('SELECT size,mime FROM files WHERE id=?').get(file.id);
     requireValue(normalized,'上传文件不存在',409);
     const used=tx.prepare('SELECT COALESCE(SUM(f.size),0) bytes,COUNT(*) count FROM space_assets a JOIN files f ON f.id=a.file WHERE a.space=?').get(space.id);
     requireValue(used.count<1000,'个人空间最多保留1000个文件',409);
     requireValue(spaceStorageBytes(space.id)+normalized.size<=1000000000,'个人空间存储不足',409);
     tx.prepare('INSERT INTO space_assets VALUES(?,?,?)').run(space.id,file.id,now());
     tx.prepare('INSERT OR IGNORE INTO refs VALUES(?,?,?)').run('ergathia:asset:'+space.id,file.id,'private');recordAudit(user,'space_file_upload',file.id,{size:normalized.size,mime:normalized.mime});
    });
   }catch(error){
    await unlink(temporary).catch(()=>{});
    transaction(tx=>{
     tx.prepare("UPDATE uploads SET status='cancelled',file_id=NULL WHERE id=?").run(id);
     tx.prepare('DELETE FROM chunks WHERE upload=?').run(id);
     tx.prepare('DELETE FROM files WHERE id=?').run(file.id);
    });
    await unlink(target).catch(()=>{});throw error;
   }
  }
  return uploadInfo(d.prepare('SELECT * FROM uploads WHERE id=?').get(id));
 });
}
