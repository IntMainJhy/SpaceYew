import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseDocument} from 'htmlparser2';
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
 const elements=node=>[...(node.children||[])].flatMap(child=>[child,...elements(child)]);
 const text=node=>node.type==='text'?node.data:(node.children||[]).map(text).join('');
 const hasClass=(node,name)=>(node.attribs?.class||'').split(/\s+/).includes(name);
 async function gallery(cookie=''){
  const response=await fetch(base+'/blogs',{headers:{Cookie:cookie}});assert.equal(response.status,200,'The directory stays available independently of one author');
  const html=await response.text(),nodes=elements(parseDocument(html)),directory=nodes.find(node=>Object.hasOwn(node.attribs||{},'data-blog-directory'));
  assert.ok(nodes.some(node=>Object.hasOwn(node.attribs||{},'data-blog-spaces')),'The blog-space entry must render');assert.ok(directory,'The complete accessible directory must render on the server');
  assert.ok(nodes.some(node=>node.name==='link'&&node.attribs.rel==='canonical'&&node.attribs.href===base+'/blogs'),'The directory owns its canonical URL');
  assert.ok(nodes.some(node=>node.name==='h1'&&/Blog spaces|博客空间|ブログ空間/i.test(text(node))),'The directory has its own heading');
  assert.ok(nodes.some(node=>node.name==='title'&&/Blog spaces|博客空间|ブログ空間/i.test(text(node))),'Metadata names the directory instead of a selected author');
  assert.ok(nodes.some(node=>node.name==='a'&&node.attribs.href==='/workspace/blog'),'The entry keeps a real create/edit destination');
  assert.doesNotMatch(html,/data-blog-context="(?:featured|mine)"/,'The directory cannot render a personalized author page');
  assert.equal(elements(directory).filter(node=>node.name==='iframe').length,0,'The directory does not execute embedded member sites');
  const cards=elements(directory).filter(node=>node.name==='a'&&hasClass(node,'blog-spaces-card'));
  assert.equal(new Set(cards.map(node=>node.attribs.href)).size,cards.length,'Each published space is listed once');
  return new Map(cards.map(node=>[node.attribs.href,text(node)]));
 }
 const login=await call('/api/auth/login',{username:'hosting_http',password:'hosting-http-password-2026'});assert.equal(login.status,200);const member=login.headers.get('set-cookie').split(';')[0];
 const guestEntry=await gallery(),eligible=await json('/api/spaces/public');assert.deepEqual([...guestEntry.keys()].sort(),eligible.map(space=>'/blog/'+encodeURIComponent(space.handle)).sort(),'Every discoverable public space appears in the semantic directory');
 const newMemberEntry=await gallery(member);assert.deepEqual([...newMemberEntry.keys()].sort(),[...guestEntry.keys()].sort(),'Signing in cannot substitute a private or personal entry for the public directory');
 const html=Buffer.from('<!doctype html><html><head><meta charset="utf-8"><title>Independent homepage</title></head><body><h1>Independent homepage</h1><script>document.body.dataset.interactive="yes";</script></body></html>');
 const task=await json('/api/spaces/uploads',{name:'homepage.html',size:html.length,fingerprint:D.hash(html)},member);
 assert.equal((await call('/api/spaces/uploads/'+task.id+'?index=0',html,member,'PUT',{'x-chunk-sha256':D.hash(html)})).status,200);
 const upload=await json('/api/spaces/uploads/'+task.id+'/complete',{},member),bundle=await json('/api/spaces/blog-bundles',{fileId:upload.file.id},member),preview=await json('/api/spaces/blog-bundles/'+bundle.id+'/preview',{},member);
 assert.equal((await fetch(base+preview.src)).status,200);assert.equal((await fetch(base+'/site-files/'+bundle.id+'/public/index.html')).status,404);
 let mine=await json('/api/spaces/mine',undefined,member);mine=await json('/api/spaces/save',{...mine,layout:{...mine.layout,blog:{mode:'static',theme:'journal',bundleId:bundle.id}},discoverable:true},member);
 const submitted=await json('/api/spaces/submit',{revision:mine.revision,accepted:true},member),review=submitted.reviews.find(x=>x.kind==='board'&&x.status==='pending');
 assert.equal((await gallery(member)).has('/blog/'+mine.handle),false,'Pending static sites cannot appear on flying panels or the directory');
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
 const page=await fetch(base+'/blog/'+mine.handle);assert.equal(page.status,200);const hostedPage=await page.text();assert.match(hostedPage,/sandbox="allow-scripts"/);assert.ok(hostedPage.includes('<link rel="canonical" href="'+base+'/blog/'+mine.handle+'"'));
 assert.equal((await fetch(base+'/u/'+mine.handle,{redirect:'manual'})).status,307);assert.equal((await fetch(base+'/api/spaces/blog-qr/'+mine.handle)).status,200);
 const hostedEntry=await gallery(member);assert.match(hostedEntry.get('/blog/'+mine.handle)||'',/Hosting HTTP/);
 let listing=await json('/api/spaces/mine',undefined,member);listing=await json('/api/spaces/save',{...listing,discoverable:false},member);assert.equal((await gallery()).has('/blog/'+mine.handle),false,'An unlisted public space stays out of the gallery');assert.equal((await fetch(base+'/blog/'+mine.handle)).status,200,'Unlisting is independent from a public permalink');await json('/api/spaces/save',{...listing,discoverable:true},member);assert.ok((await gallery()).has('/blog/'+mine.handle));
 const profile=await(await fetch(base+'/api/community/members/'+id)).json();assert.equal(profile.blog,'/blog/'+mine.handle);
 const latest=await json('/api/spaces/mine',undefined,member);await json('/api/spaces/offline',{revision:latest.revision},member);assert.equal((await fetch(raw)).status,404);
 assert.equal((await gallery()).has('/blog/'+mine.handle),false,'A taken-down static space is removed from discovery');
 // The actual upstream-derived template uses the member's reviewed snapshot, not source-author data.
 let anx=await json('/api/spaces/mine',undefined,member);
 anx=await json('/api/spaces/save',{...anx,profile:{...anx.profile,name:'Taylor Quinn',intro:'Independent designer building useful tools.',github:'https://github.com/example',skills:['TypeScript','Interface design'],experiences:[{id:randomUUID(),title:'Independent developer',type:'Design & engineering',start:'2024-01',end:'',description:'Building small, thoughtful products.',visible:true,career:true}]},layout:{...anx.layout,blog:{mode:'theme',theme:'anx',bundleId:'',sections:['projects','articles']}}},member);
 let anxReview=await json('/api/spaces/submit',{revision:anx.revision,accepted:true},member);
 assert.equal((await fetch(base+'/blog/'+anx.handle)).status,404,'An unapproved theme stays private');
 assert.equal((await gallery()).has('/blog/'+anx.handle),false,'An unapproved replacement cannot appear in the directory');
 const pendingAnx=anxReview.reviews.find(x=>x.kind==='board'&&x.status==='pending');
 await json('/api/admin/spaces/reviews',{id:pendingAnx.id,action:'approve',checked:true,reason:'Checked Anx template and member-owned data'},owner);
 const ownEntry=await(await fetch(base+'/blog/'+anx.handle,{headers:{Cookie:member}})).text();assert.match(ownEntry,/Taylor Quinn/);
 assert.ok(ownEntry.includes('<link rel="canonical" href="'+base+'/blog/'+anx.handle+'"'));
 assert.match((await gallery(member)).get('/blog/'+anx.handle)||'',/Taylor Quinn/);
 for(const language of ['en','zh']){
  const themed=await fetch(base+'/blog/'+anx.handle,{headers:{Cookie:'site-locale='+language}});assert.equal(themed.status,200);const html=await themed.text();
  assert.match(html,/data-home-theme="anx"/);assert.match(html,/Taylor Quinn/);assert.match(html,/Independent designer building useful tools/);assert.match(html,/anx-portfolio/);assert.match(html,/anx-body-/);assert.doesNotMatch(html,/Avatar with sketch|4498 contributions|USER\.avatar/);
  assert.match(html,language==='en'?/Template adapted from/:/模板改编自/);
 }
 assert.equal((await fetch(base+'/api/spaces/blog-qr/'+anx.handle)).status,200);
 const changed=await json('/api/spaces/mine',undefined,member);await json('/api/spaces/save',{...changed,profile:{...changed.profile,name:'Unreviewed replacement'}},member);
 const stillReviewed=await(await fetch(base+'/blog/'+anx.handle)).text();assert.match(stillReviewed,/Taylor Quinn/);assert.doesNotMatch(stillReviewed,/Unreviewed replacement/);
 const directoryAfterDraft=await gallery();assert.match(directoryAfterDraft.get('/blog/'+anx.handle)||'',/Taylor Quinn/);assert.doesNotMatch(directoryAfterDraft.get('/blog/'+anx.handle)||'',/Unreviewed replacement/,'Gallery previews use the reviewed snapshot');
 // The directory is stable while the homepage preview follows a selected reviewed author.
 function featured(handle){const database=D.db();database.prepare("INSERT OR REPLACE INTO config VALUES('featuredBlog',?)").run(JSON.stringify({handle}));database.close();delete globalThis.__personalSiteDb;}
 featured(anx.handle);
 const selectedGallery=await gallery();assert.deepEqual([...selectedGallery.keys()].sort(),[...directoryAfterDraft.keys()].sort(),'Changing the featured author cannot change directory membership');
 const selectedHome=await(await fetch(base+'/blog/'+anx.handle)).text();assert.match(selectedHome,/Taylor Quinn/);assert.doesNotMatch(selectedHome,/Unreviewed replacement/);assert.ok(selectedHome.includes('<link rel="canonical" href="'+base+'/blog/'+anx.handle+'"'));assert.ok(selectedHome.includes('<title>Taylor Quinn · SpaceYew</title>'));
 // Sharing an authored page always points at that author's permanent public URL.
 for(const [language,label] of [['en','Share homepage'],['zh','分享主页']]){
  const featuredPage=await(await fetch(base+'/blog/'+anx.handle,{headers:{Cookie:'site-locale='+language}})).text();
  assert.ok(featuredPage.includes('<link rel="canonical" href="'+base+'/blog/'+anx.handle+'"'));
  assert.ok(featuredPage.includes(label));assert.match(featuredPage,/Taylor Quinn/);assert.doesNotMatch(featuredPage,/>示例<|>Example</);
  assert.ok(featuredPage.includes('/api/spaces/blog-qr/'+anx.handle+'?path='));
  assert.ok(!featuredPage.includes('/api/spaces/blog-qr/undefined'));
 }
 const qr=await fetch(base+'/api/spaces/blog-qr/'+anx.handle+'?path='+encodeURIComponent('/blog/'+anx.handle));
 assert.equal(qr.status,200);assert.match(qr.headers.get('content-type'),/image\/svg\+xml/);
 assert.equal((await fetch(base+'/blog/unknown-public-author')).status,404);
 assert.equal((await fetch(base+'/blogs/not-a-directory-route')).status,404);
 function memberStatus(status){const database=D.db();database.prepare('UPDATE community_users SET status=? WHERE id=?').run(status,id);database.close();delete globalThis.__personalSiteDb;}
 memberStatus('restricted');try{assert.equal((await gallery()).has('/blog/'+anx.handle),false,'Restricted authors cannot remain in the cinematic gallery');assert.equal((await fetch(base+'/blog/'+anx.handle)).status,404);}finally{memberStatus('active')}
 assert.ok((await gallery()).has('/blog/'+anx.handle),'An eligible author can return to discovery');
 const landingHome=await(await fetch(base+'/')).text(),creatorPreview=elements(parseDocument(landingHome)).find(node=>hasClass(node,'v2-hero-showcase'));assert.ok(creatorPreview,'The public creator preview must exist');assert.doesNotMatch(landingHome,/v2-space-journey|v2-scene-switcher/,'The restored glass homepage has no space journey or scene controls');assert.match(text(creatorPreview),/Taylor Quinn/);assert.doesNotMatch(text(creatorPreview),/Unreviewed replacement/);

 for(const route of ['/workspace/profile','/workspace/library','/workspace/files','/workspace/insights','/workspace/connect','/workspace/preview']){const redirect=await fetch(base+route,{redirect:'manual',headers:{Cookie:member}});assert.equal(redirect.status,307);assert.equal(new URL(redirect.headers.get('location'),base).pathname,'/workspace/blog');}const editor=await fetch(base+'/workspace/blog?template=anx',{redirect:'manual',headers:{Cookie:member}});assert.equal(editor.status,200);assert.match(await editor.text(),/blog-editor/);const legacyHome=await fetch(base+'/my-space',{redirect:'manual'});assert.equal(new URL(legacyHome.headers.get('location'),base).pathname,'/blogs');
 const ownerData=await json('/api/admin/bootstrap',undefined,owner);const ownerHandle=ownerData.profile.alias.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'member';
 const ownerCanonical=await(await fetch(base+'/blog/'+ownerHandle)).text();assert.match(ownerCanonical,/data-home-theme="anx"/);assert.doesNotMatch(ownerCanonical,/blog-create-link|homepage-studio/);
 const finalAnx=await json('/api/spaces/mine',undefined,member);await json('/api/spaces/offline',{revision:finalAnx.revision},member);assert.equal((await fetch(base+'/blog/'+anx.handle)).status,404);assert.equal((await fetch(base+'/api/spaces/blog-qr/'+anx.handle)).status,404,'A hidden homepage cannot be shared via QR');assert.equal((await gallery()).has('/blog/'+anx.handle),false,'Taking down the selected author removes that card without taking down the directory');const noFeatured=await(await fetch(base+'/')).text(),emptyPreview=elements(parseDocument(noFeatured)).find(node=>hasClass(node,'v2-hero-showcase'));assert.ok(emptyPreview);assert.ok(elements(emptyPreview).some(node=>hasClass(node,'v2-hero-empty')),'A hidden featured author cannot silently fall back to a different homepage preview');featured('');assert.equal((await fetch(base+'/blogs')).status,200);
 const ownerMine=await json('/api/spaces/mine',undefined,owner);await json('/api/spaces/offline',{revision:ownerMine.revision},owner);assert.equal((await fetch(base+'/blog/'+ownerMine.handle)).status,404,'The owner permalink also respects takedown');assert.equal((await gallery()).size,0,'An empty directory remains usable without inventing a replacement profile');
 console.log('Homepage HTTP checks passed: static isolation, reviewed authored pages, bilingual sharing, full public directory, independent metadata, private/unlisted/restricted/taken-down exclusions and featured homepage selection.');
}finally{if(adminServer)await stopServer(adminServer);if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
