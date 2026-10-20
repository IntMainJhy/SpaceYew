import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';

const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-storage-audit-'));
process.env.APP_DATA_DIR=directory;
process.env.INITIAL_ADMIN_PASSWORD='storage-audit-password-2026';
process.env.PUBLIC_URL='http://localhost:3188';
const D=await import('../src/lib/db.mjs'),U=await import('../src/lib/uploads.mjs'),S=await import('../src/lib/spaces.mjs'),SU=await import('../src/lib/spaces-uploads.mjs'),C=await import('../src/lib/community.mjs');
const d=D.db();
function member(name){const id=randomUUID(),token=randomUUID();d.prepare('INSERT INTO community_users(id,username,password,nickname,verification,created,updated) VALUES(?,?,?,?,?,?,?)').run(id,name,'unused',name,'local_test',D.now(),D.now());d.prepare('INSERT INTO sessions VALUES(?,?,?)').run(D.hash(token),Date.now()+600000,id);return{id,token};}
const author=member('storage-author'),quotaMember=member('quota-author');
const url=new URL('http://localhost:3188/api/spaces/uploads');
const request=(user=author,method='POST',options={})=>new Request(url,{method,...options,headers:{host:url.host,cookie:'site_admin='+user.token,...options.headers}});
const call=(action,input)=>S.spacesApi(request(),['spaces',action],input,url);

test('concurrent creation of the same upload is idempotent and leaves one partial file',async()=>{
 const input={name:'concurrent.txt',size:16,fingerprint:D.hash('same-upload')};
 const results=await Promise.allSettled([U.createUpload(input),U.createUpload(input)]);
 assert.ok(results.every(x=>x.status==='fulfilled'));
 assert.equal(results[0].value.id,results[1].value.id);
 assert.deepEqual(await readdir(D.PARTIAL),[results[0].value.id]);
 await U.cancelUpload(results[0].value.id);
});

test('history references use the inserted version even when every save has the same timestamp',t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});
 let mine=S.mine(request());
 const ids=[randomUUID(),randomUUID()];
 for(const id of ids){d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'private.png',4,'image/png',D.hash(id),D.now());d.prepare('INSERT INTO space_assets VALUES(?,?,?)').run(mine.id,id,D.now());}
 for(const avatarId of [...ids,''])mine=call('save',{...mine,profile:{...mine.profile,avatarId}});
 for(const row of d.prepare('SELECT id,data FROM space_versions WHERE space=?').all(mine.id)){
  const avatarId=JSON.parse(row.data).profile.avatarId;
  assert.deepEqual(d.prepare('SELECT file FROM refs WHERE owner=?').all('ergathia:version:'+row.id).map(x=>x.file),avatarId?[avatarId]:[]);
 }
 for(let i=0;i<80;i++)mine=call('save',mine);
 assert.equal(mine.history.length,80);
 assert.equal(mine.history[0].revision,mine.revision-1);
 assert.equal(mine.history.at(-1).revision,mine.revision-80);
 assert.equal(d.prepare("SELECT COUNT(*) n FROM refs WHERE owner LIKE 'ergathia:version:%' AND owner NOT IN (SELECT 'ergathia:version:'||id FROM space_versions)").get().n,0);
});

test('pending uploads reserve a file slot before the personal space reaches its 1000-file limit',async()=>{
 const mine=S.mine(request(quotaMember));
 D.transaction(()=>{for(let i=0;i<999;i++){const id=randomUUID();d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'reserved.txt',1,'application/octet-stream',D.hash(id),D.now());d.prepare('INSERT INTO space_assets VALUES(?,?,?)').run(mine.id,id,D.now());}});
 const create=fingerprint=>SU.spaceUploads(request(quotaMember),['spaces','uploads'],{name:'last.txt',size:1,fingerprint:D.hash(fingerprint)},url);
 const task=await create('last-slot');
 await assert.rejects(create('over-quota'),e=>e.status===409);
 const part=Buffer.from('x');
 await U.putChunk(task.id,0,request(quotaMember,'PUT',{body:part,headers:{'x-chunk-sha256':D.hash(part)}}));
 // Completion commits the file before image normalization and asset attachment.
 await U.completeUpload(task.id);
 await assert.rejects(create('over-quota-during-completion'),e=>e.status===409);
 await SU.spaceUploads(request(quotaMember),['spaces','uploads',task.id,'complete'],{},url);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM space_assets WHERE space=?').get(mine.id).n,1000);
});

async function finishImage(data){
 const task=await SU.spaceUploads(request(),['spaces','uploads'],{name:'untrusted.png',size:data.length,fingerprint:D.hash(data)},url);
 for(let index=0;index<Math.ceil(data.length/task.chunk_size);index++){
  const part=data.subarray(index*task.chunk_size,(index+1)*task.chunk_size);
  await SU.spaceUploads(request(author,'PUT',{body:part,headers:{'x-chunk-sha256':D.hash(part)}}),['spaces','uploads',task.id],{},new URL(url+'?index='+index));
 }
 await assert.rejects(SU.spaceUploads(request(),['spaces','uploads',task.id,'complete'],{},url),e=>e.status===400);
 const stored=d.prepare('SELECT * FROM uploads WHERE id=?').get(task.id);
 assert.equal(stored.status,'cancelled');assert.equal(stored.file_id,null);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM files WHERE name=?').get('untrusted.png').n,0);
 await assert.rejects(access(path.join(D.PARTIAL,task.id)));
}
test('oversized and malformed images are rejected without complete tasks or orphan files',async()=>{
 const oversized=Buffer.alloc(25000001);Buffer.from([137,80,78,71,13,10,26,10]).copy(oversized);
 await finishImage(oversized);
 await finishImage(Buffer.from([137,80,78,71,13,10,26,10,0]));
});

test('normalized image growth is checked against the final space quota and rejected uploads are fully removed',async()=>{
 const user=member('image-quota-author'),mine=S.mine(request(user)),width=32,raw=Buffer.alloc(width*width*3);
 for(let y=0;y<width;y++)for(let x=0;x<width;x++){const i=(y*width+x)*3;raw[i]=(x*13+y*3)%256;raw[i+1]=(x*7+y*11)%256;raw[i+2]=(x*3+y*17)%256;}
 const png=await sharp(raw,{raw:{width,height:width,channels:3}}).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
 const normalized=await sharp(png).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
 assert.ok(normalized.length>png.length);
 let lastAsset;
 D.transaction(()=>{for(let i=0;i<10;i++){const id=randomUUID(),size=i===9?100000000-png.length:100000000;d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,'quota-fixture.bin',size,'application/octet-stream',D.hash(id),D.now());d.prepare('INSERT INTO space_assets VALUES(?,?,?)').run(mine.id,id,D.now());lastAsset=id;}});
 const before=await readdir(D.FILES);
 const create=()=>SU.spaceUploads(request(user),['spaces','uploads'],{name:'expanding.png',size:png.length,fingerprint:D.hash(png)},url);
 const put=task=>SU.spaceUploads(request(user,'PUT',{body:png,headers:{'x-chunk-sha256':D.hash(png)}}),['spaces','uploads',task.id],{},new URL(url+'?index=0'));
 const task=await create();await put(task);
 await assert.rejects(SU.spaceUploads(request(user),['spaces','uploads',task.id,'complete'],{},url),e=>e.status===409);
 const failed=d.prepare('SELECT * FROM uploads WHERE id=?').get(task.id);
 assert.equal(failed.status,'cancelled');assert.equal(failed.file_id,null);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM files WHERE name=?').get('expanding.png').n,0);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM chunks WHERE upload=?').get(task.id).n,0);
 assert.deepEqual(await readdir(D.FILES),before);
 d.prepare('UPDATE files SET size=size-? WHERE id=?').run(normalized.length,lastAsset);
 const retry=await create();await put(retry);
 const completed=await SU.spaceUploads(request(user),['spaces','uploads',retry.id,'complete'],{},url);
 assert.equal(completed.file.size,normalized.length);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM space_assets WHERE space=? AND file=?').get(mine.id,completed.file.id).n,1);
 assert.ok(d.prepare('SELECT SUM(f.size) n FROM space_assets a JOIN files f ON f.id=a.file WHERE a.space=?').get(mine.id).n<=1000000000);
});

test('space case targets require precise existing content, appropriate visibility and the real author for appeals',()=>{
 const mine=S.mine(request()),other=S.mine(request(quotaMember));
 const base={category:'审核或账号申诉',description:'This synthetic case checks exact target ownership and privacy.'};
 const create=(user,input)=>C.communityApi(user?request(user):new Request(url,{method:'POST'}),['community','cases'],{...base,...input},url);
 const before=d.prepare('SELECT COUNT(*) n FROM community_cases').get().n;
 assert.throws(()=>create(author,{kind:'appeal',target:other.url}),e=>e.status===403);
 assert.throws(()=>create(null,{kind:'report',target:other.url}),e=>e.status===404);
 assert.throws(()=>create(author,{kind:'appeal',target:mine.url+'/articles/missing'}),e=>e.status===404);
 assert.throws(()=>create(author,{kind:'appeal',target:mine.url+'/unknown'}),e=>e.status===404);
 assert.equal(d.prepare('SELECT COUNT(*) n FROM community_cases').get().n,before);
 const own=create(author,{kind:'appeal',target:mine.url});
 assert.equal(d.prepare('SELECT space FROM space_case_targets WHERE case_id=?').get(own.id).space,mine.id);
 assert.equal(d.prepare('SELECT author FROM community_cases WHERE id=?').get(own.id).author,author.id);
 const external=create(author,{kind:'report',target:'https://external.example'+other.url});
 assert.equal(d.prepare('SELECT 1 FROM space_case_targets WHERE case_id=?').get(external.id),undefined);
});

test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});});
