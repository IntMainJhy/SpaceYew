// Explicit 10 GB acceptance test. Creates and removes only its own temporary directory.
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startServer,stopServer,loginServer} from './server.mjs';
const total=Number(process.env.LARGE_TEST_BYTES)||10000000000,chunkSize=8388608;
const directory=await mkdtemp(path.join(tmpdir(),'personal-site-large-'));const started=Date.now();let server;
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 server=await startServer(path.join(directory,'data'),3110,chunkSize);const base=server.base,cookie=await loginServer(base);
 const post=async(url,value)=>{const r=await fetch(base+url,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(value)});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data};
 const fingerprint=sha(Buffer.from('large-file-acceptance:'+total));const task=await post('/api/admin/uploads',{name:'10GB-acceptance.bin',size:total,fingerprint});const block=Buffer.alloc(chunkSize,97),blockSha=sha(block),expected=createHash('sha256');let next=25;
 console.log(`开始真实上传 ${(total/1e9).toFixed(1)} GB，分片 ${(chunkSize/1048576).toFixed(0)} MiB。`);
 for(let index=0;index<Math.ceil(total/chunkSize);index++){
  const part=index===Math.floor(total/chunkSize)?block.subarray(0,total-index*chunkSize):block;expected.update(part);
  const r=await fetch(base+`/api/admin/uploads/${task.id}?index=${index}`,{method:'PUT',headers:{Origin:base,Cookie:cookie,'X-Chunk-Sha256':part.length===block.length?blockSha:sha(part)},body:part});if(r.status!==200)throw new Error(await r.text());await r.arrayBuffer();
  if(index===3){await stopServer(server);server=await startServer(path.join(directory,'data'),3110,chunkSize);const resumed=await post('/api/admin/uploads',{name:'10GB-acceptance.bin',size:total,fingerprint});assert.equal(resumed.id,task.id);assert.equal(resumed.chunks.length,4);console.log('已在进程重启后恢复4个已完成分片。')}
  const percent=Math.floor(Math.min(total,(index+1)*chunkSize)/total*100);if(percent>=next){console.log('实际上传 '+percent+'%');next+=25}
 }
 const complete=await post('/api/admin/uploads/'+task.id+'/complete',{});assert.equal(complete.file.size,total);const digest=expected.digest('hex');assert.equal(complete.file.sha256,digest);console.log('10 GB 已完成写盘和 SHA-256 校验。');
 await post('/api/admin/content',{type:'resources',slug:'large-acceptance',action:'publish',data:{title:'10 GB 验收文件',bodyHtml:'<p>仅用于本地验收。</p>',kind:'file',attachmentId:complete.file_id,tags:[]}});
 const url=base+'/download/'+complete.file_id,downloadHash=createHash('sha256');let received=0;
 const initial=await fetch(url),reader=initial.body.getReader();const first=await reader.read();downloadHash.update(first.value);received+=first.value.byteLength;await reader.cancel();
 const resumed=await fetch(url,{headers:{Range:`bytes=${received}-`}});assert.equal(resumed.status,206);assert.ok(resumed.headers.get('content-range').startsWith(`bytes ${received}-`));console.log(`下载在 ${received} 字节处中断并恢复。`);next=25;
 for await(const buffer of resumed.body){downloadHash.update(buffer);received+=buffer.byteLength;const percent=Math.floor(received/total*100);if(percent>=next){console.log('实际下载 '+percent+'%');next+=25}}
 assert.equal(received,total);assert.equal(downloadHash.digest('hex'),digest);
 const report={date:new Date().toISOString(),bytes:total,chunkBytes:chunkSize,restarted:true,downloadResumed:true,sha256:digest,seconds:Math.round((Date.now()-started)/1000),result:'passed',scope:'本机目标环境的真实HTTP传输；远程服务器尚待同样验收'};
 await writeFile('test/large-upload-result.json',JSON.stringify(report,null,2));console.log('PASS：10 GB 真实上传、重启恢复、完整校验、断点下载与完整文件哈希一致。耗时 '+report.seconds+' 秒。');
}catch(error){console.error(server?.log()||'');throw error}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
