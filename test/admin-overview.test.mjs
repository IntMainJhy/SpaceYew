import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('management overview uses real counts, excludes trash and stays owner-only',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'site-overview-'));
 process.env.APP_DATA_DIR=directory;process.env.INITIAL_ADMIN_PASSWORD='isolated-overview-test-password';
 process.env.PUBLIC_URL='http://localhost:3010';delete process.env.DEMO_SKIP_LOGIN;
 const D=await import('../src/lib/db.mjs'),A=await import('../src/lib/auth.mjs'),API=await import('../src/lib/api.mjs');
 const d=D.db(),at=D.now(),request=()=>new Request('http://localhost:3010/api/admin/overview');
 try{
  assert.equal((await API.handle(request())).status,401);
  const member={id:'test-member',role:'member',status:'active'},reviewer={id:'test-reviewer',role:'reviewer',status:'active'};
  for(const user of [member,reviewer])assert.equal((await API.handle(A.delegatedRequest(request(),user))).status,401);
  d.prepare('INSERT INTO content(id,type,slug,status,draft,updated,deleted) VALUES(?,?,?,?,?,?,?)').run('draft','articles','draft','draft',JSON.stringify({title:'Private draft'}),at,null);
  d.prepare('INSERT INTO content(id,type,slug,status,draft,updated,deleted) VALUES(?,?,?,?,?,?,?)').run('trash','articles','trash','draft',JSON.stringify({title:'Deleted draft'}),at,at);
  for(const [id,status] of [['test-member','active'],['closed-member','closed']])d.prepare('INSERT INTO community_users(id,username,password,nickname,status,created,updated) VALUES(?,?,?,?,?,?,?)').run(id,id,'!not-a-password!',id,status,at,at);
  d.prepare("INSERT INTO community_posts(id,author,created,updated) VALUES('post','test-member',?,?)").run(at,at);
  d.prepare("INSERT INTO community_revisions(id,post,number,data,status,created) VALUES('revision','post',1,'{}','pending',?)").run(at);
  d.prepare("INSERT INTO community_comments(id,post,author,body,status,created) VALUES('comment','post','test-member','Pending comment','pending',?)").run(at);
  d.prepare("INSERT INTO spaces(id,owner,handle,profile,layout,created,updated) VALUES('space','test-member','fixture-space','{}','{}',?,?)").run(at,at);
  d.prepare("INSERT INTO space_reviews(id,space,kind,version,data,status,created) VALUES('space-review','space','board',1,'{}','pending',?)").run(at);
  for(const [id,status] of [['open-report','open'],['done-report','resolved']])d.prepare('INSERT INTO community_cases(id,token,kind,category,description,status,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(id,'fixture-token','report','其他','Private evidence description',status,at,at);
  const owner=A.delegatedRequest(request(),{id:'owner',role:'owner',status:'active'}),response=await API.handle(owner),data=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(data.totals.content,1);assert.equal(data.totals.members,1);
  assert.equal(data.pending.posts,1);assert.equal(data.pending.comments,1);
  assert.equal(data.pending.spaces,1);assert.equal(data.pending.reports,1);assert.equal(data.totals.spaces,1);
  assert.equal(data.recent.length,1);assert.equal(data.recent[0].title,'Private draft');
  assert.equal(data.services.community,'local');assert.deepEqual(data.services.downloads,{macos:false,windows:false});
  process.env.MAIL_MODE='capture';process.env.SITE_DEMO='true';
  D.setConfig('site',{...D.getConfig('site'),desktopDownloads:{macos:{url:'https://example.com/test.dmg',version:'1'},windows:{url:''}}});
  D.setConfig('community',{paused:true});
  const local=(await (await API.handle(owner)).json()).services;
  assert.equal(local.environment,'standard');assert.equal(local.community,'paused');assert.equal(local.mail,'capture');assert.deepEqual(local.downloads,{macos:true,windows:false});
  process.env.PUBLIC_URL='https://example.com';
  const remote=await (await API.handle(owner)).json();
  assert.equal(remote.services.community,'closed');assert.equal(remote.services.environment,'standard');assert.equal(remote.services.mail,'unconfigured');
  process.env.MAIL_MODE='smtp';process.env.SMTP_HOST='smtp.example.com';process.env.SMTP_FROM='site@example.com';process.env.SMTP_USER='fixture';process.env.SMTP_PASSWORD='fixture-secret-never-returned';
  const smtp=await (await API.handle(owner)).json();assert.equal(smtp.services.mail,'smtp');assert.ok(!JSON.stringify(smtp).includes('fixture-secret-never-returned'));
  assert.ok(!JSON.stringify(data).includes('password'));assert.ok(!JSON.stringify(data).includes('Pending comment'));assert.ok(!JSON.stringify(data).includes('Private evidence description'));
  assert.equal((await API.handle(new Request('http://localhost:3010/api/admin/overview',{headers:{'x-role':'owner'}}))).status,401);
 }finally{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});}
});
