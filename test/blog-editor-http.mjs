import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {defaultBlogDesign} from '../src/lib/blog-design.mjs';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-editor-http-')),base='http://127.0.0.1:3177';let server;
try{
 Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:base,APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'integration-only-password-2026'});
 const D=await import('../src/lib/db.mjs'),d=D.db();for(const name of ['editor_alex','editor_blair'])d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,?,?,?,'member','active','local_test',?,?)").run(name,name,D.passwordHash('editor-fixture-password-2026'),name,D.now(),D.now());d.close();delete globalThis.__personalSiteDb;
 server=await startServer(directory,3177,1048576,{APP_SURFACE:'combined',PLATFORM_LOGIN_MODE:'password',SITE_DEMO:'false',DEMO_SKIP_LOGIN:'false'});
 const call=(route,input,cookie='')=>fetch(base+route,{method:input===undefined?'GET':'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})});
 const login=async name=>{const response=await call('/api/auth/login',{username:name,password:'editor-fixture-password-2026'});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0]};
 const alex=await login('editor_alex'),blair=await login('editor_blair'),owner=await loginServer(base),png=await sharp({create:{width:60,height:40,channels:3,background:'#cddacb'}}).png().toBuffer();
 async function upload(bytes,name,cookie){const digest=createHash('sha256').update(bytes).digest('hex'),task=await(await call('/api/spaces/uploads',{name,size:bytes.length,fingerprint:digest},cookie)).json();assert.ok(task.id);assert.equal((await fetch(base+'/api/spaces/uploads/'+task.id+'?index=0',{method:'PUT',headers:{Origin:base,Cookie:cookie,'x-chunk-sha256':digest},body:bytes})).status,200);const response=await call('/api/spaces/uploads/'+task.id+'/complete',{},cookie);assert.equal(response.status,200);return(await response.json()).file.id}
 const image=await upload(png,'certificate.png',alex),foreign=await upload(png,'certificate.png',blair),source=await upload(Buffer.from('Alex Rivera\nSummary\nAn independent developer building thoughtful tools.\nEducation\nExample University\nProjects\nA useful project\nBuilt an accessible interface.'),'resume.txt',alex);
 assert.equal((await call('/api/spaces/resume/import',{fileId:foreign},alex)).status,403);assert.equal((await call('/api/spaces/resume/import',{fileId:source},alex)).status,200);assert.equal((await fetch(base+'/download/'+source)).status,404);
 let mine=await(await call('/api/spaces/mine',undefined,alex)).json();const draft={...mine,profile:{...mine.profile,name:'Alex Rivera',alias:'Independent developer',intro:'I build thoughtful tools for everyday work.',github:'https://github.com/example',email:'alex@example.org',resume:{metrics:[{label:'Released projects',value:'12',note:'Synthetic test data'}],sections:[{id:'work',title:'Selected work',items:[{title:'A useful project',description:'An accessible interface, built with care.'}]}],certificates:[{imageId:image,caption:'Synthetic certificate fixture'}]}},layout:{...mine.layout,blog:{mode:'theme',theme:'anx',sections:[]}}};
 assert.equal((await call('/api/spaces/save',{...draft,profile:{...draft.profile,resume:{certificates:[{imageId:foreign}]}}},alex)).status,403);
 const saved=await call('/api/spaces/save',draft,alex);assert.equal(saved.status,200,await saved.clone().text());mine=await saved.json();assert.equal((await call('/api/spaces/save',draft,alex)).status,409);assert.equal((await fetch(base+'/media/'+image)).status,404);
 for(const language of ['zh','en']){const response=await fetch(base+'/workspace/blog',{headers:{Cookie:alex+'; site-locale='+language}});assert.equal(response.status,200);assert.match(await response.text(),/blog-editor/)}
 assert.equal((await fetch(base+'/api/spaces/save',{method:'POST',headers:{Origin:'https://foreign.invalid',Cookie:alex,'Content-Type':'application/json'},body:JSON.stringify(mine)})).status,403);
 const submission=await(await call('/api/spaces/submit',{revision:mine.revision,accepted:true},alex)).json(),review=submission.reviews.find(x=>x.kind==='board'&&x.status==='pending');assert.ok(review);
 const approved=await call('/api/admin/spaces/reviews',{id:review.id,action:'approve',checked:true,reason:'Checked isolated synthetic certificate and profile'},owner);assert.equal(approved.status,200,await approved.clone().text());assert.equal((await fetch(base+'/media/'+image)).status,200);
 const page=await(await fetch(base+'/blog/'+mine.handle)).text();assert.match(page,/Alex Rivera/);assert.match(page,/anx-certificates/);
 // Canvas saves reuse the reviewed profile API, with translations and section order intact.
 let canvas=await(await call('/api/spaces/mine',undefined,alex)).json();
 const section=canvas.profile.resume.sections[0];
 canvas.profile.resume.sections=[{id:'notes',title:'Notes',items:[{title:'Canvas note',description:'Plain text edited in the canvas.'}]},{...section,translations:{en:{title:'Selected work in English'}}}];
 canvas.layout.blog.canvasPositions={profile:{x:-140,y:230},'s-notes':{x:720,y:420}};
 canvas.profile.translations={en:{name:'Alex English',intro:'An English introduction.'}};
 const canvasSaved=await call('/api/spaces/save',canvas,alex);assert.equal(canvasSaved.status,200);canvas=await canvasSaved.json();
 const reopened=await(await call('/api/spaces/mine',undefined,alex)).json();assert.deepEqual(reopened.profile.resume.sections.map(x=>x.id),['notes',section.id]);assert.equal(reopened.profile.resume.sections[1].translations.en.title,'Selected work in English');assert.equal(reopened.profile.resume.certificates[0].imageId,image);assert.deepEqual(reopened.layout.blog.canvasPositions,canvas.layout.blog.canvasPositions);assert.equal(reopened.profile.translations.en.intro,'An English introduction.');
 assert.doesNotMatch(await(await fetch(base+'/blog/'+canvas.handle)).text(),/Plain text edited in the canvas/,'A saved canvas remains private until review');
 // Page designs use the same ownership, revision, fixed-review and takedown boundaries.
 let designed=await(await call('/api/spaces/mine',undefined,alex)).json();
 const template=defaultBlogDesign(designed.profile,designed.layout);
 const free={...template,autoLayout:false,nodes:[...template.nodes,{id:'custom-story',kind:'text',text:'Private page design publication marker',frame:{x:50,y:4900,w:700,h:100},style:{fontSize:32,padding:24}},{id:'custom-image',kind:'image',assetId:image,alt:'Owned design image',frame:{x:50,y:5100,w:400,h:300},style:{}},{id:'hidden-text',kind:'text',text:'Hidden layer must not leak',hidden:true,frame:{x:0,y:5500,w:300,h:100},style:{}}]};
 designed.layout.blog.design=free;
 assert.equal((await call('/api/spaces/save',{...designed,layout:{...designed.layout,blog:{...designed.layout.blog,design:{...free,nodes:[{...free.nodes.at(-2),assetId:foreign}]}}}},alex)).status,403);
 assert.equal((await call('/api/spaces/save',{...designed,layout:{...designed.layout,blog:{...designed.layout.blog,design:{...free,nodes:[{...free.nodes.at(-2),assetId:source}]}}}},alex)).status,400);
 let designedSave=await call('/api/spaces/save',designed,alex);assert.equal(designedSave.status,200,await designedSave.clone().text());designed=await designedSave.json();
 assert.equal(designed.layout.blog.design.nodes.find(n=>n.id==='custom-story').frame.x,50);
 assert.doesNotMatch(await(await fetch(base+'/blog/'+designed.handle)).text(),/Private page design publication marker/);
 const designSubmit=await(await call('/api/spaces/submit',{revision:designed.revision,accepted:true},alex)).json(),designReview=designSubmit.reviews.find(x=>x.kind==='board'&&x.status==='pending');assert.ok(designReview);
 designed.profile.intro='A later draft must not change the fixed review';assert.equal((await call('/api/spaces/save',designed,alex)).status,200);
 assert.equal((await call('/api/admin/spaces/reviews',{id:designReview.id,action:'approve',checked:true,reason:'Checked layout, text, owned images and visibility'},owner)).status,200);
 const designPage=await(await fetch(base+'/blog/'+designed.handle)).text();assert.match(designPage,/Private page design publication marker/);assert.match(designPage,/--bd-x:5.319/);assert.doesNotMatch(designPage,/Hidden layer must not leak|A later draft must not change the fixed review/);
 // Keep the interactive fixture on the default template with its real reviewed data.
 designed=await(await call('/api/spaces/mine',undefined,alex)).json();designed.layout.blog.design=template;assert.equal((await call('/api/spaces/save',designed,alex)).status,200);
 // Older experience fields must remain editable without being truncated into résumé fields.
 let old=await(await call('/api/spaces/mine',undefined,blair)).json();old.profile.experiences=[{id:'legacy-work',title:'Existing experience',type:'Engineering',start:'2020-01',end:'',description:'x'.repeat(4800),visible:true}];old.layout.blog={mode:'theme',theme:'anx',showLegacyContent:true,sections:[]};old.profile.resume={sections:[{id:'new-work',title:'New section',items:[{description:'New canvas content'}]}]};
 const oldSaved=await call('/api/spaces/save',old,blair);assert.equal(oldSaved.status,200);old=await oldSaved.json();assert.equal(old.layout.blog.showLegacyContent,true);assert.equal(old.profile.experiences[0].description.length,4800);
 const oldSubmit=await(await call('/api/spaces/submit',{revision:old.revision,accepted:true},blair)).json(),oldReview=oldSubmit.reviews.find(x=>x.kind==='board'&&x.status==='pending');assert.ok(oldReview);assert.equal((await call('/api/admin/spaces/reviews',{id:oldReview.id,action:'approve',checked:true,reason:'Checked preserved legacy text and new canvas section'},owner)).status,200);
 const oldPage=await(await fetch(base+'/blog/'+old.handle)).text();assert.match(oldPage,/Existing experience/);assert.match(oldPage,/New canvas content/);
 const own=await(await call('/api/admin/blog/mine',undefined,owner)).json();assert.equal((await call('/api/admin/blog/save',{...own,profile:{...own.profile,name:'Synthetic default owner'},publish:true},owner)).status,200);assert.match(await(await fetch(base+'/blogs')).text(),/Synthetic default owner/);
 if(process.env.EDITOR_UI==='true'){console.log('UI fixture ready: http://127.0.0.1:3177/login?next=/workspace/blog · editor_alex · editor-fixture-password-2026');await new Promise(resolve=>process.once('SIGTERM',resolve))}
 mine=await(await call('/api/spaces/mine',undefined,alex)).json();const offline=await call('/api/spaces/offline',{revision:mine.revision},alex);assert.equal(offline.status,200);assert.equal((await fetch(base+'/media/'+image)).status,404);
 console.log('Blog editor HTTP passed: real account separation, private résumé extraction, scoped certificates, stale revisions, CSRF, review → publication → takedown, and owner updates.');
}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
