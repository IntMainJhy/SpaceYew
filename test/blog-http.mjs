import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {startServer,stopServer,loginServer} from './server.mjs';

// Separate from the unit suite: exercises the built Next server and real response headers.
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-homepage-http-')),base='http://127.0.0.1:3129';let server,adminServer;
try{
 Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:base,APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'integration-only-password-2026'});
 const D=await import('../src/lib/db.mjs'),d=D.db(),id=randomUUID();
 d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,?,?,?,'member','active','local_test',?,?)").run(id,'hosting_http',D.passwordHash('hosting-http-password-2026'),'Hosting HTTP',D.now(),D.now());d.close();delete globalThis.__personalSiteDb;
 server=await startServer(directory,3129,1048576,{APP_SURFACE:'combined',PLATFORM_LOGIN_MODE:'password',SITE_DEMO:'false',DEMO_SKIP_LOGIN:'false'});
 const owner=await loginServer(base);
 async function call(url,input,cookie='',method=input===undefined?'GET':'POST',extra={}){return fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,...(Buffer.isBuffer(input)?{}:{'Content-Type':'application/json'}),...extra},...(input===undefined?{}:{body:Buffer.isBuffer(input)?input:JSON.stringify(input)})})}
 async function json(url,input,cookie){const response=await call(url,input,cookie),data=await response.json();assert.ok(response.ok,url+' '+JSON.stringify(data));return data}
 const login=await call('/api/auth/login',{username:'hosting_http',password:'hosting-http-password-2026'});assert.equal(login.status,200);const member=login.headers.get('set-cookie').split(';')[0];
 const html=Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Independent homepage</title></head><body><h1>Independent homepage</h1><script>document.body.dataset.interactive="yes";</script></body></html>');
 const task=await json('/api/spaces/uploads',{name:'homepage.html',size:html.length,fingerprint:D.hash(html)},member);
 assert.equal((await call('/api/spaces/uploads/'+task.id+'?index=0',html,member,'PUT',{'x-chunk-sha256':D.hash(html)})).status,200);
 const upload=await json('/api/spaces/uploads/'+task.id+'/complete',{},member),bundle=await json('/api/spaces/blog-bundles',{fileId:upload.file.id},member),preview=await json('/api/spaces/blog-bundles/'+bundle.id+'/preview',{},member);
 assert.equal((await fetch(base+preview.src)).status,200);assert.equal((await fetch(base+'/site-files/'+bundle.id+'/public/index.html')).status,404);
 let mine=await json('/api/spaces/mine',undefined,member);mine=await json('/api/spaces/save',{...mine,layout:{...mine.layout,blog:{mode:'static',theme:'journal',bundleId:bundle.id}},discoverable:true},member);
 const submitted=await json('/api/spaces/submit',{revision:mine.revision,accepted:true},member),review=submitted.reviews.find(x=>x.kind==='board'&&x.status==='pending');
 assert.equal((await call('/api/admin/spaces/blog-preview/'+bundle.id,{},member)).status,403);
 const staffPreview=await json('/api/admin/spaces/blog-preview/'+bundle.id,{},owner);assert.equal((await fetch(base+staffPreview.src)).status,200);
 adminServer=await startServer(directory,3130,1048576,{APP_SURFACE:'admin',PLATFORM_URL:base,ADMIN_URL:'http://127.0.0.1:3130',PLATFORM_LOGIN_MODE:'password'});
 const adminOwner=await loginServer(adminServer.base),adminPreviewResponse=await fetch(adminServer.base+'/api/admin/spaces/blog-preview/'+bundle.id,{method:'POST',headers:{Origin:adminServer.base,Cookie:adminOwner,'Content-Type':'application/json'},body:'{}'});assert.equal(adminPreviewResponse.status,200);const adminPreview=await adminPreviewResponse.json();assert.equal((await fetch(adminServer.base+adminPreview.src)).status,200,'Admin surface serves isolated previews without redirecting to the platform');
 assert.equal((await call('/api/admin/spaces/reviews',{id:review.id,action:'approve',checked:true,reason:'Cannot approve my own upload'},member)).status,403);
 await json('/api/admin/spaces/reviews',{id:review.id,action:'approve',checked:true,reason:'Checked isolated HTTP hosting fixture'},owner);
 const raw=base+'/site-files/'+bundle.id+'/public/index.html',response=await fetch(raw);
 assert.equal(response.status,200);assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');assert.equal(response.headers.get('cross-origin-resource-policy'),'cross-origin');assert.equal(response.headers.get('access-control-allow-origin'),'*');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/sandbox allow-scripts/);assert.doesNotMatch(response.headers.get('content-security-policy'),/allow-same-origin/);
 const direct=await fetch(raw,{redirect:'manual',headers:{'sec-fetch-dest':'document'}});assert.equal(direct.status,307);assert.ok(direct.headers.get('location').includes('/blog/'+mine.handle));
 assert.equal((await fetch(base+'/blog/'+mine.handle+'?page=missing.html')).status,404);assert.equal((await fetch(base+'/download/'+upload.file.id)).status,404);
 const anchored=await fetch(base+'/blog/'+mine.handle+'?page='+encodeURIComponent('index.html?view=full#anchor'));assert.equal(anchored.status,200);assert.match(await anchored.text(),/index\.html\?view=full#anchor/);
 const page=await fetch(base+'/blog/'+mine.handle);assert.equal(page.status,200);assert.match(await page.text(),/sandbox="allow-scripts"/);
 assert.equal((await fetch(base+'/u/'+mine.handle,{redirect:'manual'})).status,307);assert.equal((await fetch(base+'/api/spaces/blog-qr/'+mine.handle)).status,200);
 const profile=await(await fetch(base+'/api/community/members/'+id)).json();assert.equal(profile.blog,'/blog/'+mine.handle);
 const latest=await json('/api/spaces/mine',undefined,member);await json('/api/spaces/offline',{revision:latest.revision},member);assert.equal((await fetch(raw)).status,404);
 console.log('Homepage HTTP checks passed: upload, private preview, review, headers, sharing, redirects and takedown.');
}finally{if(adminServer)await stopServer(adminServer);if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
