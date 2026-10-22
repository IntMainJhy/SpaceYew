import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-resume-http-')),base='http://127.0.0.1:3138';let server;
function pdf(){const stream='BT /F1 12 Tf 80 750 Td (Example) Tj ET BT /F1 12 Tf 50 750 Td (Alex ) Tj 0 -20 Td (Summary) Tj 0 -20 Td (Independent developer building useful applications.) Tj 0 -20 Td (Education) Tj 0 -20 Td (Example University) Tj ET',objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let text='%PDF-1.4\n',offsets=[0];objects.forEach((x,i)=>{offsets.push(text.length);text+=`${i+1} 0 obj\n${x}\nendobj\n`});const start=text.length;text+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;return Buffer.from(text)}
try{
 server=await startServer(directory,3138,1048576,{APP_SURFACE:'combined',SITE_DEMO:'false',PLATFORM_LOGIN_MODE:'password'});const cookie=await loginServer(base);
 const call=(route,input,authenticated=true,extra={})=>fetch(base+route,{method:input===undefined?'GET':'POST',headers:{Origin:base,...(authenticated?{Cookie:cookie}:{}),'Content-Type':'application/json',...extra},...(input===undefined?{}:{body:JSON.stringify(input)})});
 const before=await(await call('/api/admin/bootstrap')).json(),bytes=pdf(),digest=createHash('sha256').update(bytes).digest('hex');
 const task=await(await call('/api/admin/uploads',{name:'resume.pdf',size:bytes.length,fingerprint:digest})).json();assert.ok(task.id);
 assert.equal((await fetch(base+'/api/admin/uploads/'+task.id+'?index=0',{method:'PUT',headers:{Origin:base,Cookie:cookie,'x-chunk-sha256':digest},body:bytes})).status,200);
 const uploaded=await(await call('/api/admin/uploads/'+task.id+'/complete',{})).json();
 const parsed=await call('/api/admin/resume/import',{fileId:uploaded.file.id});assert.equal(parsed.status,200,await parsed.clone().text());const draft=await parsed.json();assert.equal(draft.profile.name,'Alex Example');assert.match(draft.text,/Independent developer/);
 assert.equal((await fetch(base+'/download/'+uploaded.file.id)).status,404,'Original résumé remains private');
 const after=await(await call('/api/admin/bootstrap')).json();assert.deepEqual(before.profile,after.profile,'Import never auto-publishes');
 const save=await call('/api/admin/config',{key:'profile',value:{...before.profile,...draft.profile,alias:'Example developer',resume:{...draft.profile.resume,metrics:[{label:'Released apps',value:'12',note:'Synthetic fixture'}]}}});assert.equal(save.status,200,await save.clone().text());
 for(const locale of ['en','zh']){const html=await(await fetch(base+'/blogs',{headers:{Cookie:'site-locale='+locale}})).text();assert.match(html,/Alex Example/);assert.match(html,/Example University/);assert.match(html,/anx-resume-items/);assert.doesNotMatch(html,/homepage-studio/)}
 assert.ok([401,403].includes((await call('/api/admin/resume/parse',{text:draft.text},false)).status));console.log('Résumé HTTP: PDF upload → private extraction → explicit save → public Anx page passed.');
}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true})}
