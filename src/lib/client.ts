export class ApiError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status}}
function sessionStatus(path:string,status:number){if(status===401&&!path.startsWith('/api/auth/login')&&typeof window!=='undefined')window.dispatchEvent(new Event('session-expired'))}
export async function api(path:string,options:RequestInit={}){
 const headers=new Headers(options.headers);
 if(options.body&&typeof options.body==='string'&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 const response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',headers});
 sessionStatus(path,response.status);
 const result=await response.json().catch(()=>{throw new ApiError(response.status,'服务器响应异常，请重试')});
 if(!response.ok)throw new ApiError(response.status,result?.error||'操作失败，请重试');
 return result;
}
export const post=(path:string,value:unknown)=>api(path,{method:'POST',body:JSON.stringify(value)});
export const bytes=(n:number)=>n>=1e9?`${(n/1e9).toFixed(1)} GB`:n>=1e6?`${(n/1e6).toFixed(1)} MB`:n>=1000?`${(n/1000).toFixed(1)} KB`:`${Math.round(n)} B`;
export async function fingerprint(file:File){const first=new Uint8Array(await file.slice(0,1048576).arrayBuffer()),last=new Uint8Array(await file.slice(Math.max(0,file.size-1048576)).arrayBuffer()),meta=new TextEncoder().encode(`${file.size}:${file.lastModified}`),all=new Uint8Array(first.length+last.length+meta.length);all.set(first);all.set(last,first.length);all.set(meta,first.length+last.length);return hex(await crypto.subtle.digest('SHA-256',all))}
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
const paused=()=>new DOMException('已暂停','AbortError');
function checkSignal(signal:AbortSignal){if(signal.aborted)throw paused()}
function retryDelay(signal:AbortSignal,delay:number){return new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(paused())},timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},delay);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort()})}
export async function sendFile(file:File,signal:AbortSignal,onUpdate:(value:any)=>void,onTask:(id:string)=>void,endpoint='/api/admin/uploads'){
 if(file.size<=0)throw new Error('请选择非空文件');
 checkSignal(signal);
 const fp=await fingerprint(file);checkSignal(signal);
 let task=await api(endpoint,{method:'POST',body:JSON.stringify({name:file.name,size:file.size,fingerprint:fp}),signal});
 checkSignal(signal);onTask(task.id);onUpdate({...task,status:'uploading',progress:task.progress});
 if(task.status==='complete')return task.file;
 const done=new Set(task.chunks.map((x:any)=>x.idx));let received=task.received,started=performance.now(),base=received;
 for(let index=0;index<Math.ceil(file.size/task.chunk_size);index++){
  checkSignal(signal);if(done.has(index))continue;
  const chunk=await file.slice(index*task.chunk_size,Math.min(file.size,(index+1)*task.chunk_size)).arrayBuffer(),checksum=hex(await crypto.subtle.digest('SHA-256',chunk));
  checkSignal(signal);let attempt=0;
  for(;;){try{
   task=await new Promise<any>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('PUT',`${endpoint}/${task.id}?index=${index}`);xhr.setRequestHeader('X-Chunk-Sha256',checksum);xhr.withCredentials=true;xhr.timeout=120000;
    const abort=()=>xhr.abort(),cleanup=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});
    xhr.upload.onprogress=event=>{if(!signal.aborted)onUpdate({...task,name:file.name,status:'uploading',progress:Math.min(99,Math.floor((received+event.loaded)/file.size*100)),speed:(received+event.loaded-base)/Math.max(1,(performance.now()-started)/1000)})};
    xhr.onload=()=>{cleanup();sessionStatus(endpoint,xhr.status);if(signal.aborted){reject(paused());return}let result;try{result=JSON.parse(xhr.responseText)}catch{reject(new ApiError(xhr.status,'服务器响应异常'));return}if(xhr.status>=200&&xhr.status<300)resolve(result);else reject(new ApiError(xhr.status,result?.error||'分片上传失败'))};
    xhr.onerror=()=>{cleanup();reject(new Error('网络中断，请重试'))};xhr.ontimeout=()=>{cleanup();reject(new Error('上传分片超时，请重试'))};xhr.onabort=()=>{cleanup();reject(paused())};
    if(signal.aborted){cleanup();reject(paused());return}xhr.send(chunk);
   });
   received=task.received;break;
  }catch(error:any){if(signal.aborted||[400,401,403,409].includes(error.status)||++attempt>=3)throw error;onUpdate({...task,status:'retrying',progress:Math.floor(received/file.size*100)});await retryDelay(signal,attempt*750)}}
 }
 checkSignal(signal);onUpdate({...task,status:'verifying',progress:100});
 const complete=await api(`${endpoint}/${task.id}/complete`,{method:'POST',body:'{}',signal});checkSignal(signal);return complete.file;
}
