import test from 'node:test';
import assert from 'node:assert/strict';
import {api,sendFile} from '../src/lib/client.ts';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
const file=new File(['upload regression'], 'fixture.txt', {lastModified:1});
const task={id:'fixture-task',status:'uploading',chunks:[],received:0,progress:0,chunk_size:1024};
const aborted=()=>new DOMException('Aborted','AbortError');
const originalFetch=globalThis.fetch,originalXHR=globalThis.XMLHttpRequest,originalWindow=globalThis.window;
test.afterEach(()=>{globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR;if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow});

test('API rejects an HTML success response and preserves explicitly supplied Headers',async()=>{
 globalThis.fetch=async(_path,options)=>{assert.equal(options.headers.get('X-Fixture'),'retained');assert.equal(options.headers.get('Content-Type'),'application/json');return new Response('<html>proxy error</html>')};
 await assert.rejects(api('/api/fixture',{method:'POST',headers:new Headers({'X-Fixture':'retained'}),body:'{}'}),/服务器响应异常/);
 globalThis.fetch=async(_path,options)=>{assert.equal(options.headers.has('Content-Type'),false);return json({ok:true})};
 assert.deepEqual(await api('/api/fixture',{method:'POST',body:new FormData()}),{ok:true});
});

test('pausing upload during task creation cancels the request and never calls completion callbacks',async()=>{
 const control=new AbortController();let notified=false;
 globalThis.fetch=async(_path,options)=>{assert.equal(options.signal,control.signal);control.abort();throw aborted()};
 await assert.rejects(sendFile(file,control.signal,()=>{notified=true},()=>{notified=true}),{name:'AbortError'});assert.equal(notified,false);
});

test('pausing during file finalization cancels completion and does not return a completed file',async()=>{
 const control=new AbortController();let calls=0;
 globalThis.fetch=async(path,options)=>{calls++;assert.equal(options.signal,control.signal);if(!path.endsWith('/complete'))return json({...task,chunks:[{idx:0}],received:file.size});control.abort();throw aborted()};
 await assert.rejects(sendFile(file,control.signal,()=>{},()=>{}),{name:'AbortError'});assert.equal(calls,2);
});

test('expired chunk upload emits the same session event as normal API requests and never retries',async()=>{
 globalThis.window=new EventTarget();let expired=0,chunks=0;window.addEventListener('session-expired',()=>expired++);
 globalThis.fetch=async()=>json(task);
 globalThis.XMLHttpRequest=class{upload={};open(){}setRequestHeader(){}send(){chunks++;this.status=401;this.responseText=JSON.stringify({error:'请登录'});queueMicrotask(()=>this.onload())}abort(){this.onabort?.()}};
 await assert.rejects(sendFile(file,new AbortController().signal,()=>{},()=>{}),error=>error.status===401);assert.equal(expired,1);assert.equal(chunks,1);
});

test('pause during retry backoff ends promptly without starting another chunk',async()=>{
 const control=new AbortController();let chunks=0;
 globalThis.fetch=async()=>json(task);
 globalThis.XMLHttpRequest=class{upload={};open(){}setRequestHeader(){}send(){chunks++;queueMicrotask(()=>this.onerror())}abort(){this.onabort?.()}};
 const started=Date.now();
 await assert.rejects(sendFile(file,control.signal,update=>{if(update.status==='retrying')control.abort()},()=>{}),{name:'AbortError'});assert.equal(chunks,1);assert.ok(Date.now()-started<500);
});
