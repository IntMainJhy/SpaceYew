import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-management-http-'));let server;
try{
 server=await startServer(path.join(directory,'data'),3183);const base=server.base,owner=await loginServer(base);
 async function call(url,input,token=owner,method=input===undefined?'GET':'POST'){const response=await fetch(base+url,{method,headers:{Origin:base,Cookie:token,'Content-Type':'application/json'},...(input===undefined?{}:{body:JSON.stringify(input)})});return{status:response.status,data:await response.json()}}
 // Disposable identities only. Login, origin checks, sessions and all business actions use real HTTP.
 const {passwordHash}=await import('../src/lib/db.mjs'),fixture=new DatabaseSync(path.join(directory,'data','site.sqlite'));
 const password='management-http-fixture-password';
 for(const name of ['alice_files','bob_files'])fixture.prepare("INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,'local_test',?,?)").run(randomUUID(),name,passwordHash(password),name,new Date().toISOString(),new Date().toISOString());fixture.close();
 async function login(name){const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username:name,password})});assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0]}
 const a=await login('alice_files'),b=await login('bob_files'),bytes=Buffer.from('Synthetic personal file HTTP fixture'),hash=value=>createHash('sha256').update(value).digest('hex');
 const task=await call('/api/spaces/uploads',{name:'synthetic-personal-file.txt',size:bytes.length,fingerprint:hash(bytes)},a);assert.equal(task.status,200);
 const chunk=await fetch(base+'/api/spaces/uploads/'+task.data.id+'?index=0',{method:'PUT',headers:{Origin:base,Cookie:a,'X-Chunk-Sha256':hash(bytes)},body:bytes});assert.equal(chunk.status,200);
 const complete=await call('/api/spaces/uploads/'+task.data.id+'/complete',{},a);assert.equal(complete.status,200);const file=complete.data.file;
 assert.equal((await call('/api/spaces/files',undefined,b)).data.total,0);assert.equal((await call('/api/spaces/files/'+file.id,undefined,b,'DELETE')).status,404);
 const personalFiles=await call('/api/spaces/files?q=synthetic-personal&kind=file&status=unused',undefined,a);assert.equal(personalFiles.status,200);assert.equal(personalFiles.data.total,1);assert.equal(personalFiles.data.items[0].id,file.id);assert.equal((await call('/api/spaces/files?kind=image',undefined,a)).data.total,0);
 const fileRedirect=await fetch(base+'/workspace/files',{redirect:'manual',headers:{Cookie:a+'; site-locale=en'}});assert.equal(fileRedirect.status,307);assert.equal(new URL(fileRedirect.headers.get('location'),base).pathname,'/workspace/blog');const editorHtml=await(await fetch(base+'/workspace/blog',{headers:{Cookie:a+'; site-locale=en'}})).text();assert.ok(editorHtml.includes('blog-editor'));assert.ok(!editorHtml.includes('Application error'));
 assert.equal((await call('/api/admin/logs',undefined,a)).status,401);
 const logs=(await call('/api/admin/logs?scope=space')).data;assert.ok(logs.items.some(row=>row.action==='space_file_upload'&&row.target===file.id));
 assert.equal((await call('/api/spaces/files/'+file.id,undefined,a,'DELETE')).status,200);assert.equal((await call('/api/spaces/files',undefined,a)).data.used,0);
 const created=await call('/api/admin/content',{type:'articles',slug:'linked-case-http',action:'publish',data:{title:'CASE_HTTP_PUBLIC_TITLE',bodyHtml:'<p>Fixed public body</p>'}});assert.equal(created.status,200);
 const receipt=await call('/api/community/cases',{kind:'report',target:'/articles/linked-case-http',category:'其他',description:'Synthetic complaint verifies exact original-content enforcement.'},'');assert.equal(receipt.status,200);
 async function current(){return(await call('/api/admin/community/cases')).data.items.find(row=>row.id===receipt.data.id)}
 let row=await current();assert.equal(row.target.id,created.data.id);
 async function act(action){row=await current();return call('/api/admin/community/cases/'+row.id,{version:row.version,targetRevision:row.target.revision,action,reason:'Synthetic verification of the target and all associated restrictions',checked:action==='restore'})}
 const reportHtml=await(await fetch(base+'/admin/community/reports',{headers:{Cookie:owner+'; site-locale=en'}})).text();assert.ok(reportHtml.includes('CASE_HTTP_PUBLIC_TITLE'));assert.ok(reportHtml.includes('Linked content'));assert.ok(!reportHtml.includes('Application error'));
 assert.equal((await act('freeze')).status,200);assert.equal((await fetch(base+'/articles/linked-case-http')).status,404);
 assert.equal((await call('/api/admin/content',{id:created.data.id,revision:(await current()).target.revision,action:'publish'})).status,409);
 assert.equal((await act('release')).status,200);assert.equal((await fetch(base+'/articles/linked-case-http')).status,404);
 assert.equal((await act('restore')).status,200);assert.equal((await fetch(base+'/articles/linked-case-http')).status,200);
 const logHtml=await(await fetch(base+'/admin/logs',{headers:{Cookie:owner+'; site-locale=en'}})).text();assert.ok(logHtml.includes('Management log'));assert.ok(!logHtml.includes('Application error'));
 assert.ok((await call('/api/admin/logs?scope=site')).data.items.some(row=>row.action==='site_content_case_restore'));
 // Review the stored download/link targets even after the public resource is offline.
 const payload=Buffer.from('Synthetic owner attachment preserved by complaint snapshot');
 const ownerTask=await call('/api/admin/uploads',{name:'case-snapshot.txt',size:payload.length,fingerprint:hash(payload)});assert.equal(ownerTask.status,200);
 const ownerChunk=await fetch(base+'/api/admin/uploads/'+ownerTask.data.id+'?index=0',{method:'PUT',headers:{Origin:base,Cookie:owner,'X-Chunk-Sha256':hash(payload)},body:payload});assert.equal(ownerChunk.status,200);
 const ownerFile=(await call('/api/admin/uploads/'+ownerTask.data.id+'/complete',{})).data.file;
 const resource=await call('/api/admin/content',{type:'resources',slug:'snapshot-file-http',action:'publish',data:{title:'FIXED_RESOURCE_SNAPSHOT',bodyHtml:'<p>Resource under review</p>',kind:'file',attachmentId:ownerFile.id,version:'snapshot-v1'}});assert.equal(resource.status,200);
 const resourceCase=await call('/api/community/cases',{kind:'report',target:'/resources/snapshot-file-http',category:'其他',description:'Synthetic attachment complaint checks access after enforcement.'},'');assert.equal(resourceCase.status,200);
 const resourceRow=(await call('/api/admin/community/cases')).data.items.find(item=>item.id===resourceCase.data.id);
 assert.equal((await call('/api/admin/community/cases/'+resourceRow.id,{version:resourceRow.version,targetRevision:resourceRow.target.revision,action:'freeze',reason:'Synthetic review of the fixed attachment and all target metadata'})).status,200);
 const snapshotHtml=await(await fetch(base+'/admin/community/reports',{headers:{Cookie:owner+'; site-locale=en'}})).text();
 assert.ok(snapshotHtml.includes('snapshot-v1'));assert.ok(snapshotHtml.includes('href="/download/'+ownerFile.id+'"'));
 const privateDownload=await fetch(base+'/download/'+ownerFile.id,{headers:{Cookie:owner}});assert.equal(privateDownload.status,200);assert.deepEqual(Buffer.from(await privateDownload.arrayBuffer()),payload);
 assert.equal((await fetch(base+'/download/'+ownerFile.id)).status,404);
 const project=await call('/api/admin/content',{type:'projects',slug:'snapshot-project-http',action:'publish',data:{title:'FIXED_PROJECT_SNAPSHOT',bodyHtml:'<p>Project under review</p>',url:'https://example.invalid/fixed-demo',sourceUrl:'https://example.invalid/fixed-source'}});assert.equal(project.status,200);
 const projectCase=await call('/api/community/cases',{kind:'report',target:'/projects/snapshot-project-http',category:'其他',description:'Synthetic project complaint checks stored demo and source links.'},'');assert.equal(projectCase.status,200);
 const projectHtml=await(await fetch(base+'/admin/community/reports',{headers:{Cookie:owner+'; site-locale=en'}})).text();assert.ok(projectHtml.includes('href="https://example.invalid/fixed-demo"'));assert.ok(projectHtml.includes('href="https://example.invalid/fixed-source"'));
 console.log('PASS: real HTTP personal file upload/list/filter/isolation/delete/quota, owner-only management log, SSR routes, fixed legacy case snapshot/freeze/release/restore republish hold protection and offline snapshot target/access review.');
}catch(error){console.error(server?.log()||'');throw error}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
