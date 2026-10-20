import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
const directory=await mkdtemp(path.join(tmpdir(),'personal-site-core-'));process.env.APP_DATA_DIR=path.join(directory,'data');process.env.INITIAL_ADMIN_PASSWORD='test-password-strong-2026';process.env.PUBLIC_URL='http://localhost:3008';process.env.UPLOAD_CHUNK_BYTES='1048576';
const D=await import('../src/lib/db.mjs'),C=await import('../src/lib/content.mjs'),U=await import('../src/lib/uploads.mjs'),A=await import('../src/lib/auth.mjs'),M=await import('../src/lib/media.mjs'),N=await import('../src/lib/analytics.mjs');
const checksum=b=>createHash('sha256').update(b).digest('hex');
const request=(url='/api/admin',options={})=>new Request('http://localhost:3008'+url,{...options,headers:{origin:'http://localhost:3008','user-agent':'IntegrationBrowser/1.0',...options.headers}});
let fileId,resource,token;
test('authentication, CSRF and session revocation',()=>{D.db();assert.throws(()=>A.admin(request()),e=>e.status===401);assert.throws(()=>A.origin(request('/',{headers:{origin:'https://untrusted.example'}})),e=>e.status===403);assert.throws(()=>A.login(request(),{username:'admin',password:'bad'}));token=A.login(request(),{username:'admin',password:process.env.INITIAL_ADMIN_PASSWORD});assert.equal(A.session(request('/',{headers:{cookie:'site_admin='+token}})),true);const identity=A.currentUser(request('/',{headers:{cookie:'site_admin='+token}}));assert.equal(identity.nickname,'站长');assert.equal(identity.displayName,D.getConfig('profile').name);assert.equal(identity.handle,D.getConfig('profile').alias);assert.equal(identity.avatarId,D.getConfig('profile').avatarId);assert.equal(identity.role,'owner');assert.equal('password' in identity,false)});
test('sanitization, draft isolation, concurrent editing and publication',()=>{const doc={title:'测试项目',bodyHtml:'<h2>安全标题</h2><p>正文<script>alert(1)</script><img src="https://bad.example/a"><a href="javascript:bad()">bad</a></p>',category:'技术笔记',tags:[],role:'开发'};const draft=C.writeContent({type:'projects',data:doc,action:'save'});assert.equal(D.publicContent('projects').length,0);assert.doesNotMatch(draft.draft.bodyHtml,/<script|https:\/\/bad|javascript:/);const pub=C.writeContent({id:draft.id,revision:draft.revision,data:doc,action:'publish'});assert.equal(D.publicContent('projects')[0].title,'测试项目');const originalUpdated=D.publicContent('projects')[0].updated;const edited=C.writeContent({id:pub.id,revision:pub.revision,data:{...doc,title:'未公开修改'},action:'save'});assert.equal(D.publicContent('projects')[0].title,'测试项目');assert.equal(D.publicContent('projects')[0].updated,originalUpdated);assert.throws(()=>C.writeContent({id:pub.id,revision:pub.revision,data:doc,action:'save'}),e=>e.status===409);const published=C.writeContent({id:edited.id,revision:edited.revision,action:'publish'});assert.equal(D.publicContent('projects')[0].title,'未公开修改');const deleted=C.writeContent({id:published.id,revision:published.revision,action:'delete'});assert.equal(D.publicContent('projects').length,0);const restored=C.writeContent({id:deleted.id,revision:deleted.revision,action:'restore'});assert.equal(restored.status,'draft');assert.equal(D.publicContent('projects').length,0)});
test('real chunk upload, duplicate retry, restart resume, validation and range download',async()=>{const buffer=randomBytes(2*1048576+37),fp=checksum(buffer),task=await U.createUpload({name:'资源包.zip',size:buffer.length,fingerprint:fp});await assert.rejects(U.completeUpload(task.id),e=>e.status===400);let part=buffer.subarray(0,1048576);await assert.rejects(U.putChunk(task.id,0,request('/',{method:'PUT',body:part,headers:{'x-chunk-sha256':'0'.repeat(64)}})),e=>e.status===400);const first=await U.putChunk(task.id,0,request('/',{method:'PUT',body:part,headers:{'x-chunk-sha256':checksum(part)}}));assert.equal(first.received,1048576);await U.putChunk(task.id,0,request('/',{method:'PUT',body:part,headers:{'x-chunk-sha256':checksum(part)}}));D.db().close();delete globalThis.__personalSiteDb;const resumed=await U.createUpload({name:'资源包.zip',size:buffer.length,fingerprint:fp});assert.equal(resumed.id,task.id);assert.equal(resumed.chunks.length,1);for(let i=1;i<3;i++){part=buffer.subarray(i*1048576,Math.min(buffer.length,(i+1)*1048576));await U.putChunk(task.id,i,request('/',{method:'PUT',body:part,headers:{'x-chunk-sha256':checksum(part)}}))}const complete=await U.completeUpload(task.id);assert.equal(complete.file.sha256,checksum(buffer));fileId=complete.file_id;assert.deepEqual(await readFile(path.join(D.FILES,fileId)),buffer);await assert.rejects(M.fileResponse(request('/download/'+fileId),fileId),e=>e.status===404);resource=C.writeContent({type:'resources',action:'publish',data:{title:'真实资源',bodyHtml:'<p>说明</p>',kind:'file',attachmentId:fileId,tags:[]}});const response=await M.fileResponse(request('/download/'+fileId,{headers:{range:'bytes=100-199'}}),fileId);assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 100-199/${buffer.length}`);assert.deepEqual(Buffer.from(await response.arrayBuffer()),buffer.subarray(100,200));const suffix=await M.fileResponse(request('/',{headers:{range:'bytes=-37'}}),fileId);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),buffer.subarray(-37));assert.equal((await M.fileResponse(request('/',{headers:{range:'bytes=999999999-'}}),fileId)).status,416);await assert.rejects(U.removeFile(fileId),e=>e.status===409);resource=C.writeContent({id:resource.id,revision:resource.revision,action:'offline'});await assert.rejects(M.fileResponse(request(),fileId),e=>e.status===404)});
test('analytics records real events, range UV is deduplicated and admins are excluded',()=>{const req=request('/api/analytics');let visitor='';for(let i=0;i<3;i++){const result=N.track(request('/api/analytics',{headers:{cookie:visitor}}),{id:randomUUID(),kind:'view',path:'/',referrer:'https://search.example/results'});if(result.cookie)visitor=result.cookie.split(';')[0]}N.track(request('/api/analytics',{headers:{cookie:'site_admin='+token}}),{id:randomUUID(),kind:'view',path:'/'});const result=N.analytics(new URLSearchParams());assert.equal(result.totals.pv,3);assert.equal(result.totals.uv,1);assert.ok(result.totals.bytes>=137);assert.throws(()=>N.analytics(new URLSearchParams({start:'2026-02-31',end:'2026-03-01'})),e=>e.status===400)});
test('backup and independent restore verify database and file hashes',async()=>{const{backupSite}=await import('../scripts/backup.mjs'),{restoreSite}=await import('../scripts/restore.mjs');const backup=path.join(directory,'backup'),restored=path.join(directory,'restored');await backupSite(D.DATA,backup);await restoreSite(backup,restored);assert.equal(checksum(await readFile(path.join(restored,'files',fileId))),D.fileInfo(fileId).sha256);A.changePassword({current:process.env.INITIAL_ADMIN_PASSWORD,password:'new-test-password-2026'});assert.equal(A.session(request('/',{headers:{cookie:'site_admin='+token}})),false)});
test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});

// A resource can change delivery type; historical clicks keep the type at click time.
test('resource click types survive changes and repeated event delivery',()=>{
 resource=C.writeContent({id:resource.id,revision:resource.revision,action:'publish',data:{...resource.published,kind:'website',attachmentId:'',url:'https://example.com/resource'}});
 const event={id:randomUUID(),kind:'download',path:'/resources/'+encodeURIComponent(resource.slug)};
 N.track(request('/api/analytics'),event);N.track(request('/api/analytics'),event);
 resource=C.writeContent({id:resource.id,revision:resource.revision,action:'publish',data:{...resource.published,kind:'file',attachmentId:fileId,url:''}});
 N.track(request('/api/analytics'),{...event,id:randomUUID()});
 const rows=N.analytics(new URLSearchParams()).resourceDownloads.filter(x=>x.content_id===resource.id);
 assert.equal(rows.find(x=>x.resource_kind==='website').count,1);assert.equal(rows.find(x=>x.resource_kind==='file').count,1);
});

// Public promotion config uses the existing authenticated site settings path.
test('promotion settings validate links and preserve choices during older settings saves',()=>{
 const before=D.getConfig('site');
 const promotionBar={enabled:true,items:[{title:'社区推荐',url:'/community',kind:'recommendation'},{title:'推广示例',url:'https://example.com/offer',kind:'ad'},{title:'纯文字',url:'',kind:'ad'}]};
 const saved=C.saveConfiguration('site',{...before,promotionBar});
 assert.deepEqual(saved.promotionBar,promotionBar);
 const {promotionBar:omitted,...legacy}=saved;
 assert.deepEqual(C.saveConfiguration('site',legacy).promotionBar,promotionBar);
 for(const url of ['javascript:alert(1)','//evil.example','/\\evil.example','http://example.com','/hello world']){
  assert.throws(()=>C.promotionData({enabled:true,items:[{title:'拒绝危险链接',url,kind:'ad'}]}),e=>e.status===400);
 }
 for(const input of [{enabled:true,items:Array(6).fill(promotionBar.items[0])},{enabled:true,items:[{title:'',url:'',kind:'ad'}]},{enabled:true,items:[{title:'测试',url:'',kind:'unlabelled'}]},{enabled:'true',items:[]}])assert.throws(()=>C.promotionData(input),e=>e.status===400);
 assert.deepEqual(C.saveConfiguration('site',{...before,promotionBar:{enabled:false,items:[]}}).promotionBar,{enabled:false,items:[]});
});

test('desktop releases preserve omitted settings and reject unsafe installer addresses',()=>{
 const before=D.getConfig('site');
 const releases={macos:{url:'https://example.com/SpaceYew.dmg',version:'1.0 · Apple silicon'},windows:{url:'https://example.com/SpaceYew.exe',version:'1.0 · x64'}};
 const saved=C.saveConfiguration('site',{...before,desktopDownloads:releases});
 assert.deepEqual(saved.desktopDownloads,releases);
 const {desktopDownloads:omitted,...legacy}=saved;
 assert.deepEqual(C.saveConfiguration('site',legacy).desktopDownloads,releases);
 for(const url of ['http://example.com/app','javascript:alert(1)','//example.com/app','https://example.com/a b','https://example.com\\evil','https://name:password@example.com/app']){
  assert.throws(()=>C.saveConfiguration('site',{...saved,desktopDownloads:{macos:{url}}}),e=>e.status===400);
  assert.deepEqual(D.getConfig('site').desktopDownloads,releases);
 }
 for(const input of [[],null,{linux:{}},{macos:[]},{macos:{url:'',version:'x'.repeat(81)}}])assert.throws(()=>C.desktopDownloadsData(input),e=>e.status===400);
 const cleared=C.saveConfiguration('site',{...saved,desktopDownloads:{}});
 assert.deepEqual(cleared.desktopDownloads,{macos:{url:'',version:''},windows:{url:'',version:''}});
 C.saveConfiguration('site',before);
});
