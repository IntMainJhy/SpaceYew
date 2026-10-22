import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {crc32} from 'node:zlib';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-resume-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://localhost:3194',APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'isolated-resume-password'});
const D=await import('../src/lib/db.mjs'),C=await import('../src/lib/content.mjs'),R=await import('../src/lib/resume-import.mjs'),{handle}=await import('../src/lib/api.mjs'),S=await import('../src/lib/spaces.mjs');
const d=D.db(),owner=randomUUID(),member=randomUUID();
d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,NULL)').run(D.hash(owner),Date.now()+600000);
d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES('reader','reader','fixture','Reader','member','active','local_test',?,?)").run(D.now(),D.now());
d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(D.hash(member),Date.now()+600000,'reader');
const source='Alex Example\nalex@example.com\nhttps://github.com/example\n手机号：13800000000\n出生日期：2000-01-01\n政治面貌：共青团员\n个人简介\n独立开发者，累计上架 139 款应用。\n教育背景\nExample University\n2025 至今\n专业技能\nReact, Node.js, Python\n项目经历\nAn honest example\nBuilt a useful app with accessible interactions.';
const call=(route,input,token=owner,origin=process.env.PUBLIC_URL)=>handle(new Request(process.env.PUBLIC_URL+route,{method:'POST',headers:{Origin:origin,Cookie:'site_admin='+token,'Content-Type':'application/json'},body:JSON.stringify(input)}));
async function file(name,bytes,mime='application/octet-stream'){const id=randomUUID();await writeFile(path.join(D.FILES,id),bytes);d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,name,bytes.length,mime,D.hash(bytes),D.now());return id}
function docx(xml){const name=Buffer.from('word/document.xml'),data=Buffer.from(xml),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);local.writeUInt32LE(0x04034b50);local.writeUInt32LE(crc32(data),14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);central.writeUInt32LE(0x02014b50);central.writeUInt32LE(crc32(data),16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);return Buffer.concat([local,name,data,central,name,end])}

test('heading extraction creates a reviewable draft with privacy defaults and preserves long sections',()=>{
 const result=R.parseResume(source);assert.equal(result.profile.name,'Alex Example');assert.equal(result.profile.email,'alex@example.com');assert.equal(result.profile.github,'https://github.com/example');assert.equal(result.profile.resume.metrics[0].value,'139');assert.deepEqual(result.profile.skills,['React','Node.js','Python']);assert.doesNotMatch(result.text,/13800000000|2000-01-01|共青团员/);assert.match(result.profile.resume.sections.find(x=>x.id==='projects').items[0].description,/accessible/);
 const long=R.parseResume('Alex Example\n项目经历\n'+('An extended project description.\n'.repeat(250)));assert.ok(long.profile.resume.sections[0].items.length>1);assert.equal(long.profile.resume.sections[0].items.flatMap(x=>[x.title,x.description]).filter(Boolean).join('\n').split('\n').length,250);
 assert.throws(()=>R.parseResume('small'),e=>e.status===400);assert.throws(()=>C.resumeData({sections:[null]}),e=>e.status===400);assert.throws(()=>C.resumeData({sections:[{id:'bad/id'}]}),e=>e.status===400);
});
test('import API is owner-only, checks origin and never publishes or publicly references the original',async()=>{
 const before=D.getConfig('profile'),id=await file('resume.md',Buffer.from(source));
 for(const token of ['',member])assert.ok([401,403].includes((await call('/api/admin/resume/import',{fileId:id},token)).status));
 assert.equal((await call('/api/admin/resume/parse',{text:source},owner,'https://example.invalid')).status,403);
 assert.equal((await call('/api/admin/resume/import',{fileId:{}},owner)).status,400);
 const response=await call('/api/admin/resume/import',{fileId:id});assert.equal(response.status,200);const result=await response.json();assert.equal(result.sourceName,'resume.md');assert.equal(result.profile.name,'Alex Example');assert.deepEqual(D.getConfig('profile'),before);assert.equal(d.prepare('SELECT COUNT(*) n FROM refs WHERE file=?').get(id).n,0);
 const invalid=await file('resume.docx',Buffer.from('not a Word file'));assert.equal((await call('/api/admin/resume/import',{fileId:invalid})).status,422);
});
test('DOCX is read as plain text in the bounded child process',async()=>{
 const xml='<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+source.split('\n').map(s=>'<w:p><w:r><w:t>'+s+'</w:t></w:r></w:p>').join('')+'</w:body></w:document>',id=await file('resume.docx',docx(xml));
 const result=await R.importResumeFile(id,{id:'owner'});assert.equal(result.profile.name,'Alex Example');assert.match(result.text,/accessible interactions/);assert.doesNotMatch(result.text,/13800000000/);
});
test('saved résumé sections and media are public only through validated references and survive ordinary profile saves',async()=>{
 const original=D.getConfig('profile'),pdf=await file('public-resume.pdf',Buffer.from('%PDF-1.7\nfixture'),'application/pdf'),image=await file('portrait.png',Buffer.from('image fixture'),'image/png'),result=R.parseResume(source);
 const saved=C.saveConfiguration('profile',{...original,...result.profile,resume:{...result.profile.resume,resumeId:pdf,gallery:[{imageId:image,caption:'Public event'}]}});assert.equal(d.prepare("SELECT visibility FROM refs WHERE owner='config:profile' AND file=?").get(pdf).visibility,'public');
 const {resume,...legacySave}=saved;C.saveConfiguration('profile',legacySave);assert.equal(D.getConfig('profile').resume.resumeId,pdf);const publicData=S.publicSpace(new Request(process.env.PUBLIC_URL+'/blogs'),S.ownerSpace().handle);assert.equal(publicData.profile.resume.sections[1].id,'projects');assert.equal(publicData.profile.resume.resumeId,pdf);
 assert.throws(()=>C.saveConfiguration('profile',{...saved,resume:{...resume,resumeId:image}}),e=>e.status===400);C.saveConfiguration('profile',{...saved,resume:null});assert.equal(d.prepare("SELECT COUNT(*) n FROM refs WHERE owner='config:profile' AND file=?").get(pdf).n,0);
});
test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
