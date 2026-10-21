import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'site-catalog-http-'));let server;
try{
 server=await startServer(path.join(directory,'data'),3136);const base=server.base,owner=await loginServer(base);
 async function call(url,input,token='',method='POST',headers={}){const response=await fetch(base+url,{method,headers:{Origin:base,Cookie:token,'Content-Type':'application/json',...headers},...(input===undefined?{}:{body:JSON.stringify(input)})});return{status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]}}
 const get=(url,token='')=>call(url,undefined,token,'GET');
 const config=(await get('/api/community/config')).data,accepted={accepted:true,policyVersion:config.policyVersion,policyHash:config.policyHash};
 const invite=(await call('/api/admin/community/invites',{label:'Shared catalog HTTP verification'},owner)).data,email='catalog-http@example.com';
 const challenge=(await call('/api/auth/email/request',{purpose:'register',email,invite:invite.token})).data;
 const outbox=path.join(directory,'data','mail-outbox'),mail=JSON.parse(await readFile(path.join(outbox,(await readdir(outbox))[0]),'utf8')),code=mail.text.match(/\d{6}/)[0];
 const password='catalog-http-password-2026';
 assert.equal((await call('/api/community/register',{...accepted,adult:true,email,code,challenge:challenge.challenge,username:'catalog_member',password,nickname:'Catalog tester',invite:invite.token})).status,200);
 const member=(await call('/api/auth/login',{username:'catalog_member',password})).cookie,user=(await get('/api/auth/me',member)).data.user;
 assert.equal((await call('/api/admin/community/accounts',{id:user.id,action:'qualify',checked:true,reason:'Local-only integration test account qualification'},owner)).status,200);
 const input={kind:'docs',title:'Build an accessible form',summary:'A short tutorial covering labels, clear errors and keyboard interaction.',bodyHtml:'<h2>Clear labels</h2><p>Connect every field to a visible label and explain each validation error in plain language.</p>',category:'Frontend',license:'Original test content; no external assets.'};
 assert.equal((await call('/api/catalog/save',input)).status,401);
 assert.equal((await call('/api/catalog/save',input,member,'POST',{Origin:'https://foreign.example'})).status,403);
 let response=await call('/api/catalog/save',input,member);assert.equal(response.status,200);let item=response.data;
 assert.equal((await get('/api/catalog/'+item.id)).status,404);assert.equal((await get('/api/catalog/mine/'+item.id)).status,401);
 response=await call('/api/catalog/'+item.id+'/action',{...accepted,action:'submit',version:item.version},member);assert.equal(response.status,200);item=response.data;assert.equal(item.status,'published');assert.ok(item.communityPostId);
 assert.equal((await get('/api/catalog?kind=docs')).data.items.some(entry=>entry.id===item.id),true);assert.equal((await get('/api/community/posts/'+item.communityPostId)).data.catalogUrl,item.url);
 const html=await(await fetch(base+item.url)).text();assert.ok(html.includes(input.title));assert.ok(html.includes('Clear labels'));
 const credential=(await call('/api/spaces/keys',{action:'create',name:'Catalog MCP test',current:password,scopes:['catalog','submit']},member)).data;
 const bridge=spawn(process.execPath,['integrations/spaceyew-mcp.mjs'],{env:{...process.env,SPACEYEW_URL:base,SPACEYEW_TOKEN:credential.token},stdio:['pipe','pipe','pipe']});const replies=new Map();let serial=0;const reader=createInterface({input:bridge.stdout});reader.on('line',line=>{const message=JSON.parse(line);replies.get(message.id)?.(message);replies.delete(message.id)});
 function rpc(method,params={}){const id=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('MCP response timeout')),10000);replies.set(id,result=>{clearTimeout(timer);resolve(result)});bridge.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n')})}
 try{
  assert.equal((await rpc('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'Catalog integration',version:'1'}})).result.serverInfo.name,'SpaceYew');
  const tools=(await rpc('tools/list')).result.tools;assert.equal(tools.length,6);assert.ok(tools.some(tool=>tool.name==='spaceyew_submit_catalog'));assert.ok(!tools.some(tool=>tool.name==='spaceyew_save_library_draft'));
  const saved=await rpc('tools/call',{name:'spaceyew_save_catalog_draft',arguments:{...input,title:'MCP published tutorial',requestId:'catalog-mcp-save-001'}});assert.equal(saved.result.isError,false);const draft=saved.result.structuredContent;
  const args={id:draft.id,version:draft.version,confirmed:true,policyVersion:config.policyVersion,policyHash:config.policyHash,requestId:'catalog-mcp-submit-001'};
  const first=(await rpc('tools/call',{name:'spaceyew_submit_catalog',arguments:args})).result,again=(await rpc('tools/call',{name:'spaceyew_submit_catalog',arguments:args})).result;assert.equal(first.isError,false);assert.equal(first.structuredContent.status,'published');assert.equal(first.structuredContent.communityPostId,again.structuredContent.communityPostId);
 }finally{bridge.stdin.end();bridge.kill();reader.close()}
 // External source and installation commands are never auto-published by the local rule pass.
 let skill=(await call('/api/catalog/save',{...input,kind:'skills',title:'Reviewed third-party Skill',sourceUrl:'https://github.com/example/project',installCommand:'npx skills add example/project',supportedTools:['Codex','Claude Code'],prompts:[{title:'Try it',text:'Review the labels and keyboard interaction in this form.'}]},member)).data;
 skill=(await call('/api/catalog/'+skill.id+'/action',{...accepted,action:'submit',version:skill.version},member)).data;assert.equal(skill.status,'pending');assert.equal((await get('/api/catalog/'+skill.id)).status,404);
 assert.equal((await get('/api/admin/catalog',member)).status,403);assert.equal((await get('/api/admin/catalog',owner)).data.items.some(entry=>entry.id===skill.id),true);
 skill=(await call('/api/admin/catalog/'+skill.id,{action:'approve',version:skill.version,checked:true,reason:'Checked this fixture source, license and command for integration testing.'},owner)).data;assert.equal(skill.status,'published');assert.ok((await(await fetch(base+skill.url)).text()).includes('Reviewed third-party Skill'));
 assert.equal((await call('/api/catalog/'+skill.id+'/action',{action:'offline',version:skill.version},member)).status,200);assert.equal((await get('/api/catalog/'+skill.id)).status,404);assert.equal((await get('/api/community/posts/'+skill.communityPostId)).status,404);
 console.log('PASS: catalog HTTP auth/CSRF, draft isolation, automatic publication, one linked community share, shared detail rendering, scoped MCP draft/submit/retry, external-content review, and coupled takedown');
}finally{await stopServer(server);await rm(directory,{recursive:true,force:true})}
