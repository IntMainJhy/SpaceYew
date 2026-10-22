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
 for(const asset of ['/icon.svg','/apple-icon.png','/favicon.ico','/brand/spaceyew-icon.png'])assert.equal((await fetch(adminServer.base+asset,{redirect:'manual'})).status,200,'Admin branding must stay on its own origin: '+asset);
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
 // The actual upstream-derived template uses the member's reviewed snapshot, not source-author data.
 let anx=await json('/api/spaces/mine',undefined,member);
 anx=await json('/api/spaces/save',{...anx,profile:{...anx.profile,name:'Taylor Quinn',intro:'Independent designer building useful tools.',github:'https://github.com/example',skills:['TypeScript','Interface design'],experiences:[{id:randomUUID(),title:'Independent developer',type:'Design & engineering',start:'2024-01',end:'',description:'Building small, thoughtful products.',visible:true,career:true}]},layout:{...anx.layout,blog:{mode:'theme',theme:'anx',bundleId:'',sections:['projects','articles']}}},member);
 let anxReview=await json('/api/spaces/submit',{revision:anx.revision,accepted:true},member);
 assert.equal((await fetch(base+'/blog/'+anx.handle)).status,404,'An unapproved theme stays private');
 const pendingAnx=anxReview.reviews.find(x=>x.kind==='board'&&x.status==='pending');
 await json('/api/admin/spaces/reviews',{id:pendingAnx.id,action:'approve',checked:true,reason:'Checked Anx template and member-owned data'},owner);
 for(const language of ['en','zh']){
  const themed=await fetch(base+'/blog/'+anx.handle,{headers:{Cookie:'site-locale='+language}});assert.equal(themed.status,200);const html=await themed.text();
  assert.match(html,/data-home-theme="anx"/);assert.match(html,/Taylor Quinn/);assert.match(html,/Independent designer building useful tools/);assert.match(html,/anx-portfolio/);assert.match(html,/anx-body-/);assert.doesNotMatch(html,/Avatar with sketch|4498 contributions|USER\.avatar/);
  assert.match(html,language==='en'?/Template adapted from/:/模板改编自/);
 }
 assert.equal((await fetch(base+'/api/spaces/blog-qr/'+anx.handle)).status,200);
 const changed=await json('/api/spaces/mine',undefined,member);await json('/api/spaces/save',{...changed,profile:{...changed.profile,name:'Unreviewed replacement'}},member);
 const stillReviewed=await(await fetch(base+'/blog/'+anx.handle)).text();assert.match(stillReviewed,/Taylor Quinn/);assert.doesNotMatch(stillReviewed,/Unreviewed replacement/);
 const ownerHome=await(await fetch(base+'/blogs')).text();assert.match(ownerHome,/data-home-theme="anx"/);assert.doesNotMatch(ownerHome,/homepage-studio|homepage-theme-picker|space-tabs|Unreviewed replacement/);assert.doesNotMatch(ownerHome,/workspace\/blog\?template=anx/);
 for(const route of ['/workspace/profile','/workspace/library','/workspace/files','/workspace/insights','/workspace/connect','/workspace/preview']){const redirect=await fetch(base+route,{redirect:'manual',headers:{Cookie:member}});assert.equal(redirect.status,307);assert.equal(new URL(redirect.headers.get('location'),base).pathname,'/workspace/blog');}const editor=await fetch(base+'/workspace/blog?template=anx',{redirect:'manual',headers:{Cookie:member}});assert.equal(editor.status,200);assert.match(await editor.text(),/blog-editor/);const legacyHome=await fetch(base+'/my-space',{redirect:'manual'});assert.equal(new URL(legacyHome.headers.get('location'),base).pathname,'/blogs');
 const ownerData=await json('/api/admin/bootstrap',undefined,owner);const ownerHandle=ownerData.profile.alias.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'member';
 const ownerCanonical=await(await fetch(base+'/blog/'+ownerHandle)).text();assert.match(ownerCanonical,/data-home-theme="anx"/);assert.doesNotMatch(ownerCanonical,/blog-create-link|homepage-studio/);
 const finalAnx=await json('/api/spaces/mine',undefined,member);await json('/api/spaces/offline',{revision:finalAnx.revision},member);assert.equal((await fetch(base+'/blog/'+anx.handle)).status,404);
 const ownerMine=await json('/api/spaces/mine',undefined,owner);await json('/api/spaces/offline',{revision:ownerMine.revision},owner);assert.equal((await fetch(base+'/blogs')).status,404,'Owner takedown must also hide the direct blog entry');
 console.log('Homepage HTTP checks passed: static uploads, sandbox, reviewed Anx template, bilingual content, stable sharing and takedown.');
}finally{if(adminServer)await stopServer(adminServer);if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
