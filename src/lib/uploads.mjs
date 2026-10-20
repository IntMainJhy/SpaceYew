import {randomUUID,createHash} from 'node:crypto';
import {open,rename,unlink,statfs,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {db,FILES,PARTIAL,now,hash,fileInfo,transaction,recordAudit} from './db.mjs';
import {requireValue,HttpError,cleanText} from './content.mjs';
export const MAX=Number(process.env.MAX_FILE_BYTES)||10000000000;
export const CHUNK=Math.min(16*1024*1024,Math.max(1024*1024,Number(process.env.UPLOAD_CHUNK_BYTES)||8388608));
const locks=globalThis.__siteUploadLocks||new Map();globalThis.__siteUploadLocks=locks;
export async function lock(id,fn){const previous=locks.get(id)||Promise.resolve();let done;const current=new Promise(r=>done=r);locks.set(id,current);await previous;try{return await fn()}finally{done();if(locks.get(id)===current)locks.delete(id)}}
export function uploadInfo(row){if(!row)return null;const chunks=db().prepare('SELECT idx,size,sha256 FROM chunks WHERE upload=? ORDER BY idx').all(row.id);return{...row,file:row.file_id?fileInfo(row.file_id):null,chunks,received:chunks.reduce((a,c)=>a+c.size,0),progress:Math.floor(chunks.reduce((a,c)=>a+c.size,0)/row.size*100)}}
export async function createUpload(input,actor){
 // ponytail: serialize creation only; per-upload locks still allow chunks to transfer independently.
 return lock('upload-create',async()=>{
  const size=Number(input.size),fingerprint=String(input.fingerprint||'');
  requireValue(Number.isSafeInteger(size)&&size>0&&size<=MAX,`请选择非空且不超过 ${(MAX/1e9).toFixed(0)} GB 的文件`);
  requireValue(/^[a-f0-9]{64}$/.test(fingerprint),'文件指纹无效');
  const name=cleanText(input.name,250).replace(/[\x00-\x1f/\\]/g,'_');requireValue(name,'文件名不能为空');
  const d=db(),existing=d.prepare('SELECT * FROM uploads WHERE fingerprint=? AND size=?').get(fingerprint,size);
  if(existing&&existing.status!=='cancelled'&&(existing.status!=='complete'||d.prepare('SELECT id FROM files WHERE id=?').get(existing.file_id)))return uploadInfo(existing);
  if(existing)d.prepare('DELETE FROM uploads WHERE id=?').run(existing.id);
  requireValue(d.prepare("SELECT COUNT(*) n FROM uploads WHERE status IN ('pending','assembling')").get().n<10,'未完成上传过多，请先取消或完成现有任务',409);
  const disk=await statfs(PARTIAL),reserved=d.prepare("SELECT COALESCE(SUM(size),0) n FROM uploads WHERE status IN ('pending','assembling')").get().n;
  requireValue(Number(disk.bavail)*Number(disk.bsize)>size+reserved+128*1024*1024,'可用磁盘不足，请清理空间后再上传',507);
  const id=randomUUID(),time=Date.now(),partial=path.join(PARTIAL,id),f=await open(partial,'wx',0o600);
  try{
   try{await f.truncate(size)}finally{await f.close()}
   transaction(()=>{ d.prepare('INSERT INTO uploads(id,name,size,fingerprint,chunk_size,status,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,name,size,fingerprint,CHUNK,'pending',time,time);if(actor)recordAudit(actor,'site_upload_create',id,{size});});
  }catch(error){await unlink(partial).catch(()=>{});throw error}
  return uploadInfo(d.prepare('SELECT * FROM uploads WHERE id=?').get(id));
 });
}
export async function readLimited(req,limit){requireValue(Number(req.headers.get('content-length')||0)<=limit,'请求内容过大',413);const reader=req.body?.getReader();if(!reader)return Buffer.alloc(0);let total=0;const pieces=[];try{for(;;){const{done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new HttpError(413,'请求内容过大')}pieces.push(Buffer.from(value))}}finally{reader.releaseLock()}return Buffer.concat(pieces,total)}
export async function putChunk(id,index,req){return lock(id,async()=>{const d=db(),row=d.prepare('SELECT * FROM uploads WHERE id=?').get(id);requireValue(row,'上传任务不存在',404);requireValue(row.status==='pending','此任务不能继续上传',409);const idx=Number(index);requireValue(Number.isInteger(idx)&&idx>=0&&idx<Math.ceil(row.size/row.chunk_size),'分片序号无效');const expected=Math.min(row.chunk_size,row.size-idx*row.chunk_size),checksum=req.headers.get('x-chunk-sha256');requireValue(/^[a-f0-9]{64}$/.test(checksum||''),'缺少有效的分片校验值');const data=await readLimited(req,expected);requireValue(data.length===expected,'分片长度不正确');requireValue(hash(data)===checksum,'分片校验失败，请重试');const old=d.prepare('SELECT * FROM chunks WHERE upload=? AND idx=?').get(id,idx);if(old){requireValue(old.sha256===checksum,'原文件与已上传内容不一致',409);return uploadInfo(row)}const f=await open(path.join(PARTIAL,id),'r+');try{let offset=0;while(offset<data.length){const result=await f.write(data,offset,data.length-offset,idx*row.chunk_size+offset);requireValue(result.bytesWritten>0,'写入失败',500);offset+=result.bytesWritten}await f.sync()}finally{await f.close()}d.prepare('INSERT INTO chunks VALUES(?,?,?,?)').run(id,idx,data.length,checksum);d.prepare('UPDATE uploads SET updated=? WHERE id=?').run(Date.now(),id);return uploadInfo(d.prepare('SELECT * FROM uploads WHERE id=?').get(id))})}
function mimeFrom(bytes){if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return'image/png';if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image/jpeg';if(bytes.subarray(0,6).toString().startsWith('GIF8'))return'image/gif';if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return'image/webp';if(bytes.subarray(0,5).toString()==='%PDF-')return'application/pdf';return'application/octet-stream'}
export async function completeUpload(id,actor){return lock(id,async()=>{const d=db(),row=d.prepare('SELECT * FROM uploads WHERE id=?').get(id);requireValue(row,'上传任务不存在',404);if(row.status==='complete')return uploadInfo(row);requireValue(row.status==='pending','上传任务不可完成',409);const chunks=d.prepare('SELECT * FROM chunks WHERE upload=?').all(id);requireValue(chunks.length===Math.ceil(row.size/row.chunk_size)&&chunks.reduce((a,c)=>a+c.size,0)===row.size,'文件尚未上传完整');d.prepare("UPDATE uploads SET status='assembling',updated=? WHERE id=?").run(Date.now(),id);const partial=path.join(PARTIAL,id);try{const sha=createHash('sha256');for await(const buffer of createReadStream(partial))sha.update(buffer);const f=await open(partial,'r');const head=Buffer.alloc(32);try{await f.read(head,0,32,0)}finally{await f.close()}const fileId=randomUUID();await rename(partial,path.join(FILES,fileId));d.exec('BEGIN IMMEDIATE');try{d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(fileId,row.name,row.size,mimeFrom(head),sha.digest('hex'),now());d.prepare("UPDATE uploads SET status='complete',file_id=?,updated=? WHERE id=?").run(fileId,Date.now(),id);if(actor)recordAudit(actor,'site_file_upload',fileId,{size:row.size,mime:mimeFrom(head)});d.exec('COMMIT')}catch(error){d.exec('ROLLBACK');await rename(path.join(FILES,fileId),partial);throw error}return uploadInfo(d.prepare('SELECT * FROM uploads WHERE id=?').get(id))}catch(error){d.prepare("UPDATE uploads SET status='pending',updated=? WHERE id=? AND status='assembling'").run(Date.now(),id);throw error}})}
export async function cancelUpload(id,actor){return lock(id,async()=>{const d=db(),row=d.prepare('SELECT * FROM uploads WHERE id=?').get(id);requireValue(row,'上传任务不存在',404);requireValue(row.status!=='complete','已完成文件请在文件管理中处理',409);d.prepare("UPDATE uploads SET status='cancelled',updated=? WHERE id=?").run(Date.now(),id);await unlink(path.join(PARTIAL,id)).catch(error=>{if(error.code!=='ENOENT')throw error});d.prepare('DELETE FROM chunks WHERE upload=?').run(id);if(actor)recordAudit(actor,'site_upload_cancel',id,{});return{ok:true}})}
export async function removeFile(id,{space,actor}={}){return lock('file-delete:'+id,async()=>{
 const d=db(),file=fileInfo(id);requireValue(file,'文件不存在',404);
 const ownership=space?'ergathia:asset:'+space:null;
 const check=()=>{if(space)requireValue(d.prepare('SELECT 1 FROM space_assets WHERE space=? AND file=?').get(space,id),'文件不存在或无权操作',404);requireValue(!d.prepare('SELECT 1 FROM refs WHERE file=? AND (? IS NULL OR owner<>?) LIMIT 1').get(id,ownership,ownership),'文件仍被草稿、公开内容、审核或历史版本引用，请先处理引用',409)};
 check();const original=path.join(FILES,id),staged=path.join(FILES,'.delete-'+id);await rename(original,staged);
 try{transaction(tx=>{check();if(space){tx.prepare('DELETE FROM refs WHERE owner=? AND file=?').run(ownership,id);tx.prepare('DELETE FROM space_assets WHERE space=? AND file=?').run(space,id)}tx.prepare('DELETE FROM files WHERE id=?').run(id);tx.prepare('DELETE FROM chunks WHERE upload IN (SELECT id FROM uploads WHERE file_id=?)').run(id);tx.prepare("UPDATE uploads SET status='cancelled',file_id=NULL WHERE file_id=?").run(id);if(actor)recordAudit(actor,space?'space_file_delete':'site_file_delete',id,{size:file.size,mime:file.mime});})}catch(error){await rename(staged,original);throw error}
 // A failed unlink is retried on next startup; the committed file is already inaccessible.
 await unlink(staged).catch(error=>console.error('[file-cleanup]',id,error.code));return{ok:true,released:file.size};
})}
