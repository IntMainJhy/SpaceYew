import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-editable-blog-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://localhost:3197',APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'isolated-editor-password'});
const D=await import('../src/lib/db.mjs'),S=await import('../src/lib/spaces.mjs'),{handle}=await import('../src/lib/api.mjs'),{pageRedirect}=await import('../src/lib/app-access.mjs');
const d=D.db(),users=['alice','bravo'].map(name=>{const token=randomUUID();d.prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,?,?,?)').run(name,name,'unused',name,'local_test',D.now(),D.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(D.hash(token),Date.now()+600000,name);return {id:name,token}}),owner=randomUUID();d.prepare('INSERT INTO sessions VALUES(?,?,NULL)').run(D.hash(owner),Date.now()+600000);
const req=(token='',route='/api/spaces/mine',input)=>new Request(process.env.PUBLIC_URL+route,{method:input?'POST':'GET',headers:{Cookie:'site_admin='+token,Origin:process.env.PUBLIC_URL,'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{})});
const call=async(route,input,token=users[0].token)=>{const response=await handle(req(token,route,input));return {status:response.status,data:await response.json()}};
async function image(space){const id=randomUUID(),data=Buffer.from('isolated image fixture');await writeFile(path.join(D.FILES,id),data);d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'certificate.webp',data.length,'image/webp',D.hash(data),D.now());d.prepare('INSERT INTO space_assets VALUES(?,?,?)').run(space,id,D.now());return id}
test('structured blog drafts, certificates and PDF ownership are isolated and published as fixed versions',async()=>{
 let row=S.mine(req(users[0].token));const other=S.mine(req(users[1].token)),own=await image(row.id),foreign=await image(other.id),resume={metrics:[{label:'Apps',value:'12'}],sections:[{id:'work',title:'Work',items:[{title:'A project',description:'Built by Alice',coverId:own}]}],certificates:[{imageId:own,caption:'Certificate',translations:{en:{caption:'English certificate'}}}]};
 assert.equal((await call('/api/spaces/save',{...row,profile:{...row.profile,resume:{...resume,certificates:[{imageId:foreign}]}}})).status,403);
 assert.equal((await call('/api/spaces/save',{...row,profile:{...row.profile,resume:{...resume,resumeId:own}}})).status,400);
 const saved=await call('/api/spaces/save',{...row,profile:{...row.profile,resume},layout:{...row.layout,blog:{mode:'theme',theme:'anx',sections:[]}}});assert.equal(saved.status,200);row=saved.data;assert.equal(row.profile.resume.sections[0].items[0].description,'Built by Alice');assert.equal(row.profile.resume.certificates[0].imageId,own);
 assert.equal(S.canReadSpaceFile(req(),own),false);assert.equal(S.canReadSpaceFile(req(users[1].token),own),false);
 assert.equal((await call('/api/spaces/save',{...row,revision:row.revision-1})).status,409);
 const submitted=await call('/api/spaces/submit',{revision:row.revision,accepted:true}),review=submitted.data.reviews.find(x=>x.kind==='board'&&x.status==='pending');assert.ok(review);
 S.spacesApi(req(owner,'/api/admin/spaces','unused'),['admin','spaces'],{id:review.id,action:'approve',checked:true,reason:'Verified synthetic certificate and content'},null);
 assert.equal(S.canReadSpaceFile(req(),own),true);assert.equal(S.publicSpace(req(),'alice').profile.resume.certificates.length,1);
 await call('/api/spaces/save',{...row,profile:{...row.profile,resume:{...row.profile.resume,certificates:[]}}});assert.equal(S.publicSpace(req(),'alice').profile.resume.certificates.length,1,'Private edits do not change approved certificates');
 const latest=S.mine(req(users[0].token));await call('/api/spaces/offline',{revision:latest.revision});assert.equal(S.canReadSpaceFile(req(),own),false);
});
test('owner editor is privileged, checks CSRF and synchronizes the default public homepage',async()=>{
 assert.ok([401,403].includes((await call('/api/admin/blog/mine',undefined)).status));
 const row=(await call('/api/admin/blog/mine',undefined,owner)).data;
 const forbidden=await handle(new Request(process.env.PUBLIC_URL+'/api/admin/blog/save',{method:'POST',headers:{Cookie:'site_admin='+owner,Origin:'https://foreign.invalid','Content-Type':'application/json'},body:JSON.stringify(row)}));assert.equal(forbidden.status,403);
 const stale=await call('/api/admin/blog/save',{...row,profileVersion:'stale'},owner);assert.equal(stale.status,409);
 const saved=await call('/api/admin/blog/save',{...row,publish:true,profile:{...row.profile,name:'Default site owner',resume:{sections:[]}}},owner);assert.equal(saved.status,200);assert.equal(D.getConfig('profile').name,'Default site owner');assert.equal(S.publicSpace(req(),row.handle).profile.name,'Default site owner');
});
test('admin branding stays on its own origin without opening arbitrary public routes',()=>{
 Object.assign(process.env,{APP_SURFACE:'admin',PLATFORM_URL:'http://localhost:3010',ADMIN_URL:'http://localhost:3011'});
 try{for(const asset of ['/icon.svg','/favicon.ico','/apple-icon.png','/brand/spaceyew-icon.png','/brand/spaceyew-symbol.svg'])assert.equal(pageRedirect(asset),null);assert.equal(pageRedirect('/blogs'),'http://localhost:3010/blogs');assert.equal(pageRedirect('/brand/private.svg'),'http://localhost:3010/brand/private.svg')}finally{process.env.APP_SURFACE='combined'}
});
test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
