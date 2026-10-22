import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {startServer,stopServer,loginServer} from './server.mjs';
import {catalogEditorUrl} from '../src/lib/catalog-presentation.mjs';
import {translate} from '../src/lib/i18n.mjs';
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
 for(const locale of ['zh','en','ja'])for(const [kind,title,history] of [['docs','发布文档','我的文档'],['skills','分享 Skill','我的 Skill'],['resources','分享资源','我的资源']]){
  const headers={Cookie:member+'; site-locale='+locale},list=await(await fetch(base+'/'+kind,{headers})).text(),editor=await(await fetch(base+catalogEditorUrl(kind),{headers})).text();
  assert.ok(list.includes('href="'+catalogEditorUrl(kind)+'"'),'catalog has its own publish action');
  assert.ok(!list.includes(translate(locale,'我的发布')),'global publications entry is removed');
  assert.ok(editor.includes('<h1>'+translate(locale,title)+'</h1>')&&editor.includes('<h2>'+translate(locale,history)+'</h2>'),'contextual editor and history');
  assert.ok(editor.includes('noindex, nofollow'),'private composer is not indexable');
  assert.ok(!editor.includes('<label>'+translate(locale,'发布到')+'<select'),'content kind is fixed by its catalog');
 }
 for(const kind of ['docs','skills','resources']){
  const legacy=await fetch(base+'/publish?kind='+kind,{redirect:'manual'});assert.equal(legacy.status,307);assert.equal(legacy.headers.get('location'),catalogEditorUrl(kind));
 }
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
 const resource=(await call('/api/catalog/save',{...input,kind:'resources',title:'Private resource draft'},member)).data;
 for(const [kind,present,absent] of [['docs',input.title,'Reviewed third-party Skill'],['skills','Reviewed third-party Skill',input.title],['resources',resource.draft.title,input.title]]){
  const html=await(await fetch(base+catalogEditorUrl(kind),{headers:{Cookie:member}})).text(),history=html.match(/<aside class="publisher-history">([\s\S]*?)<\/aside>/)?.[1];
  assert.ok(history?.includes(present)&&!history.includes(absent),'history stays inside its catalog');
 }
 const legacy=await fetch(base+'/publish/'+skill.id,{headers:{Cookie:member},redirect:'manual'});assert.equal(legacy.status,307);assert.equal(legacy.headers.get('location'),catalogEditorUrl('skills',skill.id));
 assert.equal((await fetch(base+'/publish/'+skill.id,{headers:{Cookie:owner},redirect:'manual'})).status,404,'legacy redirect does not expose another author’s draft');
 const wrongCatalog=await(await fetch(base+catalogEditorUrl('docs',skill.id),{headers:{Cookie:member+'; site-locale=en'}})).text();assert.ok(wrongCatalog.includes(translate('en','此内容位于其他栏目。'))&&!wrongCatalog.includes('class="publisher-layout"'),'wrong catalog cannot edit the item');
 assert.equal((await get('/api/admin/catalog',member)).status,403);assert.equal((await get('/api/admin/catalog',owner)).data.items.some(entry=>entry.id===skill.id),true);
 skill=(await call('/api/admin/catalog/'+skill.id,{action:'approve',version:skill.version,checked:true,reason:'Checked this fixture source, license and command for integration testing.'},owner)).data;assert.equal(skill.status,'published');assert.ok((await(await fetch(base+skill.url)).text()).includes('Reviewed third-party Skill'));
 const skillPost=skill.communityPostId;
 let revision=(await call('/api/catalog/save',{...skill.published,kind:'skills',id:skill.id,version:skill.version,title:'Reviewed Skill revised'},member)).data;
 revision=(await call('/api/catalog/'+revision.id+'/action',{...accepted,action:'submit',version:revision.version},member)).data;
 assert.equal(revision.status,'pending');assert.equal((await get('/api/community/posts/'+skillPost)).data.title,'Reviewed third-party Skill');
 assert.equal((await call('/api/catalog/'+revision.id+'/action',{...accepted,action:'submit',version:revision.version},member)).status,409,'pending versions cannot create duplicate shares');
 skill=(await call('/api/admin/catalog/'+revision.id,{action:'approve',version:revision.version,checked:true,reason:'Checked the revised source and text for lifecycle verification.'},owner)).data;
 assert.equal(skill.communityPostId,skillPost);assert.equal((await get('/api/community/posts/'+skillPost)).data.title,'Reviewed Skill revised');
 assert.equal((await call('/api/catalog/'+skill.id+'/action',{action:'offline',version:skill.version},member)).status,200);assert.equal((await get('/api/catalog/'+skill.id)).status,404);assert.equal((await get('/api/community/posts/'+skill.communityPostId)).status,404);
 let other=(await call('/api/catalog/save',{...resource.draft,kind:'resources',id:resource.id,version:resource.version,sourceUrl:'https://example.com/official-tool'},member)).data;
 other=(await call('/api/catalog/'+other.id+'/action',{...accepted,action:'submit',version:other.version},member)).data;assert.equal(other.status,'pending');
 other=(await call('/api/admin/catalog/'+other.id,{action:'approve',version:other.version,checked:true,reason:'Verified the official resource source and rights for this test.'},owner)).data;assert.equal(other.status,'published');assert.equal((await get('/api/community/posts/'+other.communityPostId)).data.catalogKind,'resources');
 assert.equal((await call('/api/admin/community/accounts',{id:user.id,action:'status',status:'restricted',reason:'Restrict this disposable account for removal-rights verification.'},owner)).status,200);
 assert.equal((await get('/api/catalog/mine/'+other.id,member)).status,200);assert.equal((await call('/api/catalog/save',{...other.published,id:other.id,version:other.version},member)).status,403);
 assert.equal((await call('/api/catalog/'+other.id+'/action',{action:'offline',version:other.version},member)).status,200);assert.equal((await get('/api/catalog/'+other.id)).status,404);assert.equal((await get('/api/community/posts/'+other.communityPostId)).status,404);

 console.log('PASS: contextual publishing in three catalogs/locales, scoped draft histories, safe legacy redirects, catalog HTTP auth/CSRF, automatic publication, linked community share, scoped MCP, all three catalog kinds, revision reuse, review, and restricted-author coupled takedown');
}finally{await stopServer(server);await rm(directory,{recursive:true,force:true})}
