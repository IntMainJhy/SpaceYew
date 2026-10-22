import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,lstat,rename,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

const root=await mkdtemp(path.join(tmpdir(),'spaceyew-demo-cleanup-'));
const data=path.join(root,'data');process.env.APP_DATA_DIR=data;process.env.INITIAL_ADMIN_PASSWORD='isolated-owner-password-2026';
const D=await import('../src/lib/db.mjs');
const {cleanupDemoData}=await import('../scripts/remove-demo-data.mjs');
const stamp='2026-10-22T00:00:00.000Z';
const demoPassword='synthetic-fixture-password-2026';
let fixture;

async function createFixture(){
 const d=D.db(),insert=(table,row)=>d.prepare(`INSERT INTO ${table}(${Object.keys(row).join(',')}) VALUES(${Object.keys(row).map(()=>'?').join(',')})`).run(...Object.values(row));
 const file=async name=>{const id=randomUUID(),body=Buffer.from(name);insert('files',{id,name,size:body.length,mime:'image/png',sha256:D.hash(body),created:stamp});await writeFile(path.join(data,'files',id),body);return id};
 const f={demo:await file('synthetic-avatar'),shared:await file('owner-shared-image'),raw:await file('owner-original-resume'),orphan:await file('unreferenced-owner-certificate-source'),space:await file('synthetic-static-archive'),legacy:await file('synthetic-legacy-cover'),real:await file('real-avatar'),upload:await file('unknown-upload')};
 const member=(username,extras={})=>{const id=randomUUID();insert('community_users',{id,username,password:D.passwordHash(demoPassword),nickname:'a renamed display name',created:stamp,updated:stamp,...extras});return id};
 const users={demo:member('demo_member',{avatar_id:f.demo}),bannedDemo:member('demo_waiting',{status:'banned'}),real:member('real_member',{email:'real@example.test',email_verified_at:stamp,avatar_id:f.real}),email:member('demo_design',{email:'retained@example.test'}),changed:member('demo_dev',{password:D.passwordHash('a-new-real-account-password-2026')})};
 insert('community_users',{id:'owner',username:'owner-identity',password:'!managed-owner!',nickname:'Real owner',role:'owner',created:stamp,updated:stamp});
 D.setConfig('profile',{name:'Real owner',avatarId:f.shared});D.setConfig('site',{name:'Actual website',resumeId:f.raw});
 const post=author=>{const id=randomUUID();insert('community_posts',{id,author,draft:JSON.stringify({coverId:f.demo}),created:stamp,updated:stamp});insert('community_revisions',{id:randomUUID(),post:id,number:1,data:'{}',status:'approved',created:stamp});return id};
 const posts={demo:post(users.demo),real:post(users.real)};d.prepare('UPDATE community_posts SET draft=? WHERE id=?').run(JSON.stringify({coverId:f.real}),posts.real);
 const catalog=randomUUID();insert('catalog_entries',{id:catalog,author:users.demo,kind:'skills',draft:'{}',community_post:posts.demo,created:stamp,updated:stamp});insert('catalog_revisions',{id:randomUUID(),entry:catalog,data:'{}',status:'approved',reason:'',created:stamp});
 const content=(slug,body,status='draft')=>{const id=randomUUID();insert('content',{id,type:'articles',slug,status,draft:JSON.stringify(body),updated:stamp});return id};
 const contents={demo:content('demo-articles-0',{coverId:f.legacy}),private:content('多语言界面验收-私人项目草稿',{}),unknown:content('demo-business',{coverId:f.real}),real:content('owner-real-project',{coverId:f.shared})};
 const space=owner=>{const id=randomUUID();insert('spaces',{id,owner,handle:'h-'+id,profile:'{}',layout:'{}',created:stamp,updated:stamp});insert('space_handles',{handle:'h-'+id,space:id});return id};
 const spaces={demo:space(users.demo),owner:space('owner'),real:space(users.real)};
 for(const [name,id] of Object.entries(spaces)){insert('space_versions',{id:randomUUID(),space:id,revision:1,data:JSON.stringify({resumeId:name==='demo'?f.shared:f.raw}),created:stamp});insert('space_content',{id:randomUUID(),space:id,type:'articles',slug:'first',draft:'{}',created:stamp,updated:stamp});insert('space_reviews',{id:randomUUID(),space:id,kind:'profile',version:1,data:'{}',created:stamp})}
 insert('space_assets',{space:spaces.demo,file:f.space,created:stamp});const bundle=randomUUID();insert('blog_bundles',{id:bundle,space:spaces.demo,file:f.space,manifest:'{}',size:1,entry:'index.html',created:stamp});insert('blog_previews',{token:randomUUID(),bundle,session:'demo-session',actor:users.demo,expires:Date.now()+60000});
 const upload=randomUUID();insert('uploads',{id:upload,name:'demo-upload',size:1,fingerprint:randomUUID(),chunk_size:1,status:'complete',created:Date.now(),updated:Date.now(),file_id:f.space,space_id:spaces.demo});insert('chunks',{upload,idx:0,size:1,sha256:'fixture'});
 insert('uploads',{id:randomUUID(),name:'unknown-upload',size:1,fingerprint:randomUUID(),chunk_size:1,status:'complete',created:Date.now(),updated:Date.now(),file_id:f.upload});
 for(const [owner,file] of [['community-avatar:'+users.demo,f.demo],['community-cover:'+users.demo,f.shared],[contents.demo,f.legacy],['ergathia:asset:'+spaces.demo,f.space],['config:profile',f.shared],['community-avatar:'+users.real,f.real]])insert('refs',{owner,file,visibility:'private'});
 const comments={demo:randomUUID(),real:randomUUID(),post:randomUUID()};
 insert('community_comments',{id:comments.demo,post:posts.real,author:users.demo,body:'synthetic parent',created:stamp});insert('community_comments',{id:comments.real,post:posts.real,author:users.real,parent:comments.demo,body:'real retained reply',created:stamp});insert('community_comments',{id:comments.post,post:posts.demo,author:users.real,body:'reply to retired post',created:stamp});
 insert('community_reactions',{actor:users.demo,post:posts.real,kind:'like',created:stamp});insert('community_reactions',{actor:users.real,post:posts.demo,kind:'bookmark',created:stamp});insert('community_reactions',{actor:users.real,post:posts.real,kind:'like',created:stamp});insert('community_reposts',{actor:users.demo,post:posts.real,created:stamp});insert('community_follows',{follower:users.real,following:users.demo,created:stamp});
 const cases={demo:randomUUID(),real:randomUUID()};for(const [kind,id] of Object.entries(cases))insert('community_cases',{id,token:randomUUID(),kind:'report',author:kind==='demo'?users.demo:users.real,category:'test',description:'fixture',created:stamp,updated:stamp});insert('content_case_targets',{case_id:cases.demo,content:contents.demo,revision:1,snapshot:'{}',created:stamp});insert('space_case_targets',{case_id:cases.demo,space:spaces.demo});
 for(const [kind,id] of Object.entries(cases))insert('community_audit',{id:randomUUID(),actor:'owner',action:'case_review',target:id,details:'{}',created:stamp});
 insert('community_notifications',{id:randomUUID(),user_id:users.real,title:'demo post',message:'fixture',href:'/community/'+posts.demo,event_key:'comment:'+comments.post,created:stamp});insert('community_notifications',{id:randomUUID(),user_id:users.real,title:'real post',message:'fixture',href:'/community/'+posts.real,event_key:'real-event',created:stamp});
 insert('sessions',{token:'demo-session',expires:Date.now()+60000,user_id:users.demo});insert('session_realms',{token:'demo-session',realm:'community'});insert('sessions',{token:'real-session',expires:Date.now()+60000,user_id:users.real});
 insert('community_acceptances',{id:randomUUID(),user_id:users.demo,version:'fixture',document_hash:'fixture',kind:'registration',created:stamp});insert('email_challenges',{id:randomUUID(),email:'synthetic@example.test',purpose:'fixture',actor:users.demo,context:'{}',code_hash:'fixture',expires:Date.now()+60000,created:Date.now()});
 const key=randomUUID();insert('connect_keys',{id:key,actor:users.demo,name:'synthetic key',hash:'fixture',scopes:'[]',expires:Date.now()+60000,created:stamp});insert('connect_requests',{key_id:key,request_id:'fixture',fingerprint:'fixture',response:'{}',created:Date.now()});
 insert('community_invites',{id:randomUUID(),token:'demo-invite',label:'fixture',expires:Date.now()+60000,used_by:users.demo,created:stamp});insert('community_invites',{id:randomUUID(),token:'real-invite',label:'actual pending invitation',expires:Date.now()+60000,created:stamp});
 const seededInvite=randomUUID();insert('community_invites',{id:seededInvite,token:'old-unused-demo-invite',label:'开发交流邀请',expires:Date.now()+60000,created:'2000-01-01T00:00:00.000Z'});insert('community_audit',{id:randomUUID(),actor:'owner',action:'invite_created',target:seededInvite,details:'{}',created:stamp});insert('community_invites',{id:randomUUID(),token:'new-invite-with-old-label',label:'开发交流邀请',expires:Date.now()+60000,created:'2999-01-01T00:00:00.000Z'});
 insert('community_invites',{id:randomUUID(),token:'old-unused-local-demo-invite',label:'待使用的本地演示邀请',expires:Date.now()+60000,created:'2000-01-01T00:00:00.000Z'});insert('community_invites',{id:randomUUID(),token:'new-local-demo-labeled-invite',label:'待使用的本地演示邀请',expires:Date.now()+60000,created:'2999-01-01T00:00:00.000Z'});
 for(const visitor of ['demo-visitor-1','real-visitor']){insert('events',{id:randomUUID(),kind:'view',path:'/',visitor,source:'direct',device:'desktop',browser:'test',at:stamp});insert('space_events',{id:randomUUID(),space:spaces.owner,path:'/',visitor,created:stamp})}
 for(const file of [f.demo,f.real])insert('traffic',{id:randomUUID(),file_id:file,bytes:1,source:'test',at:stamp});
 const manifest={allSynthetic:true,data,member:'demo_member',memberPassword:demoPassword,ownerPassword:'private-fixture-owner-password'};const manifestText=JSON.stringify(manifest,null,2);await writeFile(path.join(data,'demo-manifest.json'),manifestText);
 const owner=d.prepare('SELECT * FROM admins').get(),profile=d.prepare("SELECT value FROM config WHERE key='profile'").get().value;d.close();delete globalThis.__personalSiteDb;
 return {f,users,posts,contents,spaces,comments,cases,bundle,upload,owner,profile,manifestText};
}

test('retired preview cleanup is dry-run by default, backed up, narrowly scoped and idempotent',async()=>{
 fixture=await createFixture();const x=fixture,backup=path.join(root,'backup');const before=await readFile(path.join(data,'site.sqlite'));
 const dry=await cleanupDemoData({dataDir:data});assert.equal(dry.dryRun,true);assert.deepEqual(dry.summary.members.sort(),['demo_member','demo_waiting']);assert.deepEqual(dry.summary.preservedDemoNames.sort(),['demo_design','demo_dev']);assert.equal(dry.summary.counts.files,3);assert.equal(dry.summary.counts.community_invites,3);assert.deepEqual(await readFile(path.join(data,'site.sqlite')),before);assert.equal((await readdir(root)).includes('backup'),false);assert.equal((await readdir(data)).includes('demo-cleanup.json'),false);
 await rename(path.join(data,'files',x.f.demo),path.join(data,'files','.fixture-missing'));try{await assert.rejects(()=>cleanupDemoData({dataDir:data,apply:true,backupDir:path.join(root,'incomplete-backup')}),{code:'ENOENT'});const unchanged=new DatabaseSync(path.join(data,'site.sqlite'),{readOnly:true});assert.equal(unchanged.prepare('SELECT COUNT(*) n FROM community_users').get().n,6);unchanged.close()}finally{await rename(path.join(data,'files','.fixture-missing'),path.join(data,'files',x.f.demo))}
 // A failure after media staging must roll back both database rows and disk renames.
 const fail=new DatabaseSync(path.join(data,'site.sqlite'));fail.exec(`CREATE TRIGGER reject_demo_cleanup BEFORE DELETE ON files WHEN OLD.id='${x.f.space}' BEGIN SELECT RAISE(ABORT,'cleanup rollback fixture');END`);fail.close();
 await assert.rejects(()=>cleanupDemoData({dataDir:data,apply:true,backupDir:path.join(root,'rollback-backup')}),/cleanup rollback fixture/);
 const recovered=new DatabaseSync(path.join(data,'site.sqlite'));assert.equal(recovered.prepare('SELECT COUNT(*) n FROM community_users').get().n,6);assert.equal(recovered.prepare('SELECT COUNT(*) n FROM files').get().n,8);recovered.exec('DROP TRIGGER reject_demo_cleanup');recovered.close();for(const id of Object.values(x.f))assert.ok(await readFile(path.join(data,'files',id)));assert.equal((await readdir(path.join(data,'files'))).some(name=>name.startsWith('.delete-')),false);assert.equal(await readFile(path.join(data,'demo-manifest.json'),'utf8'),x.manifestText);
 const result=await cleanupDemoData({dataDir:data,apply:true,backupDir:backup});assert.equal(result.applied,true);assert.deepEqual(result.pendingFileRemovals,[]);assert.equal(await readFile(path.join(backup,'demo-manifest.json'),'utf8'),x.manifestText);assert.equal((await lstat(backup)).mode&0o077,0);assert.equal((await lstat(path.join(backup,'demo-manifest.json'))).mode&0o077,0);
 const archived=new DatabaseSync(path.join(backup,'site.sqlite'),{readOnly:true});assert.equal(archived.prepare('SELECT COUNT(*) n FROM community_users').get().n,6);archived.close();
 const d=new DatabaseSync(path.join(data,'site.sqlite'));try{
  assert.deepEqual({...d.prepare('SELECT * FROM admins').get()},{...x.owner});assert.equal(d.prepare("SELECT value FROM config WHERE key='profile'").get().value,x.profile);
  for(const id of [x.users.real,x.users.email,x.users.changed,'owner'])assert.ok(d.prepare('SELECT id FROM community_users WHERE id=?').get(id));for(const id of [x.users.demo,x.users.bannedDemo])assert.equal(d.prepare('SELECT id FROM community_users WHERE id=?').get(id),undefined);
  for(const table of ['community_posts','community_revisions','catalog_entries','catalog_revisions','community_comments','community_reactions','community_reposts','community_follows','community_cases','community_audit','community_notifications','sessions','session_realms','connect_keys','connect_requests','community_acceptances','email_challenges','community_invites','spaces','space_content','space_versions','space_reviews','space_handles','space_assets','space_case_targets','content_case_targets','blog_bundles','blog_previews','chunks','events','space_events','traffic']){
   const expected={community_posts:1,community_revisions:1,community_comments:1,community_reactions:1,community_cases:1,community_audit:1,community_notifications:1,sessions:1,community_invites:3,spaces:2,space_content:2,space_versions:2,space_reviews:2,space_handles:2,events:1,space_events:1,traffic:1}[table]||0;assert.equal(d.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,expected,table);
  }
  assert.equal(d.prepare('SELECT parent FROM community_comments WHERE id=?').get(x.comments.real).parent,null);assert.ok(d.prepare('SELECT id FROM content WHERE id=?').get(x.contents.unknown));assert.ok(d.prepare('SELECT id FROM content WHERE id=?').get(x.contents.real));assert.equal(d.prepare('SELECT COUNT(*) n FROM content').get().n,2);
  for(const id of [x.f.shared,x.f.raw,x.f.orphan,x.f.real,x.f.upload]){assert.ok(d.prepare('SELECT id FROM files WHERE id=?').get(id));assert.ok(await readFile(path.join(data,'files',id)))}for(const id of [x.f.demo,x.f.space,x.f.legacy]){assert.equal(d.prepare('SELECT id FROM files WHERE id=?').get(id),undefined);await assert.rejects(()=>readFile(path.join(data,'files',id)),{code:'ENOENT'})}
  assert.equal(d.prepare('SELECT COUNT(*) n FROM uploads').get().n,1);assert.deepEqual(d.prepare('PRAGMA foreign_key_check').all(),[]);
  // A new genuine account can adopt an old name after cleanup; retries must never re-evaluate it.
  d.prepare('INSERT INTO community_users(id,username,password,nickname,created,updated) VALUES(?,?,?,?,?,?)').run(randomUUID(),'demo_member',D.passwordHash(demoPassword),'new owner',stamp,stamp);
 }finally{d.close()}
 const retry=await cleanupDemoData({dataDir:data,apply:true,backupDir:path.join(root,'never-created')});assert.equal(retry.alreadyCleaned,true);assert.equal((await readdir(root)).includes('never-created'),false);assert.equal(JSON.parse(await readFile(path.join(data,'demo-manifest.json'),'utf8')).allSynthetic,false);const marker=await readFile(path.join(data,'demo-cleanup.json'),'utf8');assert.equal(marker.includes(demoPassword),false);
});

test('cleanup refuses absent or mismatched synthetic provenance without touching data',async()=>{
 await assert.rejects(()=>cleanupDemoData(),/explicit/);const other=await mkdtemp(path.join(root,'invalid-'));await assert.rejects(()=>cleanupDemoData({dataDir:other,apply:true}),{code:'ENOENT'});
 for(const manifest of [{allSynthetic:false,data:other,memberPassword:demoPassword},{allSynthetic:true,data:'/different/private/data',memberPassword:demoPassword},{allSynthetic:true,data:other}]){await writeFile(path.join(other,'demo-manifest.json'),JSON.stringify(manifest));await assert.rejects(()=>cleanupDemoData({dataDir:other,apply:true}),/original allSynthetic/)}
 assert.deepEqual((await readdir(other)).sort(),['demo-manifest.json']);
});

test.after(async()=>{await rm(root,{recursive:true,force:true})});
