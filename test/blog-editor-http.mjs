import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
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
 const own=await(await call('/api/admin/blog/mine',undefined,owner)).json();assert.equal((await call('/api/admin/blog/save',{...own,profile:{...own.profile,name:'Synthetic default owner'},publish:true},owner)).status,200);assert.match(await(await fetch(base+'/blogs')).text(),/Synthetic default owner/);
 if(process.env.EDITOR_UI==='true'){console.log('UI fixture ready: http://127.0.0.1:3177/login?next=/workspace/blog · editor_alex · editor-fixture-password-2026');await new Promise(resolve=>process.once('SIGTERM',resolve))}
 mine=await(await call('/api/spaces/mine',undefined,alex)).json();const offline=await call('/api/spaces/offline',{revision:mine.revision},alex);assert.equal(offline.status,200);assert.equal((await fetch(base+'/media/'+image)).status,404);
 console.log('Blog editor HTTP passed: real account separation, private résumé extraction, scoped certificates, stale revisions, CSRF, review → publication → takedown, and owner updates.');
}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
