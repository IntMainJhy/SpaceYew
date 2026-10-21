import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {crc32} from 'node:zlib';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-blog-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://localhost:3189',APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'isolated-blog-owner-password'});
const {unpackBlog}=await import('../src/lib/blog-archive.mjs');
const D=await import('../src/lib/db.mjs'),S=await import('../src/lib/spaces.mjs'),B=await import('../src/lib/blog-hosting.mjs');
const d=D.db(),tokens={owner:randomUUID(),alice:randomUUID(),bob:randomUUID()};
d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,NULL)').run(D.hash(tokens.owner),Date.now()+600000);
for(const id of ['alice','bob']){d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,?,? ,?,'member','active','local_test',?,?)").run(id,id,'not-a-real-password',id,D.now(),D.now());d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(D.hash(tokens[id]),Date.now()+600000,id)}
const req=(actor='alice',method='POST',url='/api/spaces/blog-bundles')=>new Request(process.env.PUBLIC_URL+url,{method,headers:{Origin:process.env.PUBLIC_URL,Cookie:'site_admin='+(tokens[actor]||'')}});
function zip(entries){let offset=0;const local=[],central=[];for(const [name,source,mode=0x81a40000] of entries){const file=Buffer.from(name),data=Buffer.from(source),header=Buffer.alloc(30),entry=Buffer.alloc(46);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(0x800,6);header.writeUInt32LE(crc32(data),14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(file.length,26);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(0x800,8);entry.writeUInt32LE(crc32(data),16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(file.length,28);entry.writeUInt32LE(mode>>>0,38);entry.writeUInt32LE(offset,42);local.push(header,file,data);central.push(entry,file);offset+=header.length+file.length+data.length}const tail=Buffer.alloc(22),dir=Buffer.concat(central);tail.writeUInt32LE(0x06054b50);tail.writeUInt16LE(entries.length,8);tail.writeUInt16LE(entries.length,10);tail.writeUInt32LE(dir.length,12);tail.writeUInt32LE(offset,16);return Buffer.concat([...local,dir,tail])}
async function upload(actor,name,bytes){const space=S.ensureSpace({id:actor,username:actor,nickname:actor}),id=randomUUID();await writeFile(path.join(D.FILES,id),bytes);d.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(id,name,bytes.length,'application/octet-stream',D.hash(bytes),D.now());d.prepare('INSERT INTO space_assets VALUES(?,?,?)').run(space.id,id,D.now());return id}
const html=Buffer.from('<!doctype html><html><head><title>My authored blog</title><link rel="stylesheet" href="style.css"></head><body><h1>My blog</h1><script>document.body.dataset.interactive="yes";</script></body></html>');
test('static archives preserve assets and reject traversal, duplicates, symlinks, broken data and unsupported files',()=>{
 assert.equal(unpackBlog(html,'my-site.html').get('index.html').toString(),html.toString());
 const files=unpackBlog(zip([['dist/index.html',html],['dist/style.css','body {color: navy}'],['dist/app.js','console.log(1)']]),'site.zip');assert.ok(files.has('index.html')&&files.has('style.css')&&files.has('app.js'));
 for(const entries of [[['../index.html',html]],[['/index.html',html]],[['index.html',html],['INDEX.HTML',html]],[['index.html',html],['.env','secret']],[['index.html',html],['link.css','target',0xa1ff0000]],[['index.html',html],['server.php','code']],[['index.html',html],['a%2fb.js','code']]])assert.throws(()=>unpackBlog(zip(entries),'site.zip'));
 const broken=zip([['index.html',html]]);broken[35]^=1;assert.throws(()=>unpackBlog(broken,'site.zip'));
 for(const bytes of [Buffer.alloc(0),Buffer.of(1,2,3),Buffer.alloc(30)])assert.throws(()=>unpackBlog(bytes,'site.zip'));
 assert.throws(()=>unpackBlog(Buffer.from('not html'),'site.html'));
});
let bundle;
test('imports are owned, previews are session-bound, sandboxed, and invisible before approval',async()=>{
 const source=await upload('alice','site.zip',zip([['index.html',html],['style.css','body {color:navy}']]));
 await assert.rejects(()=>B.blogBundles(req('bob'),['spaces','blog-bundles'],{fileId:source}),error=>error.status===403);
 bundle=await B.blogBundles(req(),['spaces','blog-bundles'],{fileId:source});
 const preview=await B.blogBundles(req(),['spaces','blog-bundles',bundle.id,'preview'],{}),access=preview.src.split('/')[3];
 const document=await B.blogFileResponse(req('', 'GET'),bundle.id,access,['index.html']);assert.equal(document.status,200);assert.match(document.headers.get('Content-Security-Policy'),/sandbox allow-scripts/);assert.doesNotMatch(document.headers.get('Content-Security-Policy'),/allow-same-origin/);assert.match(document.headers.get('Content-Security-Policy'),/connect-src 'none'/);assert.equal(document.headers.get('Referrer-Policy'),'no-referrer');assert.equal(document.headers.get('X-Frame-Options'),'SAMEORIGIN');const served=await document.text();assert.ok(served.includes('spaceyew:page'));assert.doesNotMatch(document.headers.get('Content-Security-Policy'),/allow-popups|allow-top-navigation/);
 const listeners={},messages=[],prefix='/site-files/'+bundle.id+'/'+access+'/',location=new URL(process.env.PUBLIC_URL+prefix+'index.html');runInNewContext(served.match(/<script>([\s\S]*?)<\/script>/)[1],{URL,location,parent:{postMessage:value=>messages.push(value)},addEventListener:(name,callback)=>{listeners[name]=callback}});
 let prevented=false;const click=href=>listeners.click({target:{closest:()=>({getAttribute:()=>href})},preventDefault:()=>{prevented=true}});click('https://example.com/project');assert.equal(prevented,true);assert.equal(messages.at(-1).type,'spaceyew:external-link');assert.equal(messages.at(-1).url,'https://example.com/project');messages.length=0;prevented=false;click('#about');assert.equal(prevented,false);assert.equal(messages.length,0);click('javascript:alert(1)');assert.equal(messages.length,0);
 assert.equal((await B.blogFileResponse(req('','GET'),bundle.id,access,['style.css'])).status,200);
 await assert.rejects(()=>B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html']),error=>error.status===404);
 await assert.rejects(()=>B.blogBundles(req('bob'),['spaces','blog-bundles',bundle.id,'preview'],{}),error=>error.status===404);
 d.prepare('DELETE FROM sessions WHERE token=?').run(D.hash(tokens.alice));await assert.rejects(()=>B.blogFileResponse(req('','GET'),bundle.id,access,['index.html']),error=>error.status===404);
 d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(D.hash(tokens.alice),Date.now()+600000,'alice');
});
test('blog settings use fixed reviews, reject foreign bundles, and publication honors takedown and account status',async()=>{
 const mine=S.mine(req()),layout={...mine.layout,blog:{mode:'static',theme:'journal',bundleId:bundle.id,title:'Authored site'}};
 const bob=S.mine(req('bob'));assert.throws(()=>S.spacesApi(req('bob'),['spaces','save'],{...bob,layout},new URL(req().url)),error=>error.status===403);
 const saved=S.spacesApi(req(),['spaces','save'],{...mine,layout},new URL(req().url));
 assert.deepEqual(saved.layout.nodes,[],'New homepages do not publish old canvas nodes');
 const pending=S.spacesApi(req(),['spaces','submit'],{revision:saved.revision,accepted:true},new URL(req().url));
 assert.throws(()=>S.spacesApi(req(),['admin','spaces','reviews'],{id:pending.reviews[0].id,action:'approve',checked:true,reason:'Checked isolated static site'},new URL(req().url)),error=>error.status===403);
 S.spacesApi(req('owner'),['admin','spaces','reviews'],{id:pending.reviews[0].id,action:'approve',checked:true,reason:'Checked isolated static site'},new URL(req().url));
 assert.equal((await B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html'])).status,200);
 assert.equal(S.canReadSpaceFile(req('','GET'),bundle.file),false,'An approved site must not expose its original source ZIP');
 const published=B.publicBlogBundle(req('','GET'),'alice');assert.equal(published.id,bundle.id);assert.equal(B.staticPage('index.html?color=dark',published),'index.html?color=dark');assert.throws(()=>B.staticPage('../index.html',published));assert.throws(()=>B.staticPage('style.css',published));
 const {blogQr}=await import('../src/lib/spaces-qr.mjs');assert.equal((await blogQr(req('','GET','/api/spaces/blog-qr/alice?path='+encodeURIComponent('/blog/alice')),'alice')).status,200);await assert.rejects(()=>blogQr(req('','GET','/api/spaces/blog-qr/alice?path='+encodeURIComponent('https://untrusted.example/blog/alice')),'alice'));
 const {backupSite}=await import('../scripts/backup.mjs'),{restoreSite}=await import('../scripts/restore.mjs'),{DatabaseSync}=await import('node:sqlite');const backup=path.join(directory,'backup'),restored=path.join(directory,'restored');await backupSite(directory,backup);await restoreSite(backup,restored);assert.match(await readFile(path.join(restored,'blog-sites',bundle.id,'index.html'),'utf8'),/My blog/);assert.equal(await readFile(path.join(restored,'blog-sites',bundle.id,'style.css'),'utf8'),'body {color:navy}');const restoredDb=new DatabaseSync(path.join(restored,'site.sqlite'));assert.equal(restoredDb.prepare('SELECT count(*) n FROM blog_previews').get().n,0);restoredDb.close();
 const caseId=randomUUID();d.prepare('INSERT INTO community_cases(id,token,kind,category,description,created,updated) VALUES(?,?,?,?,?,?,?)').run(caseId,'private-qa','report','侵权','Synthetic hosting complaint',D.now(),D.now());assert.equal(S.attachSpaceCase(caseId,'/blog/alice?page=index.html',req('','GET')),true);S.spaceCaseAction({id:'owner',role:'owner'},{id:caseId},'freeze',{});await assert.rejects(()=>B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html']),error=>error.status===404);S.spaceCaseAction({id:'owner',role:'owner'},{id:caseId},'release',{});assert.equal((await B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html'])).status,200);
 const nextSource=await upload('alice','next.html',html),nextBundle=await B.blogBundles(req(),['spaces','blog-bundles'],{fileId:nextSource});const next=S.mine(req());S.spacesApi(req(),['spaces','save'],{...next,layout:{...next.layout,blog:{...next.layout.blog,bundleId:nextBundle.id}}},new URL(req().url));assert.equal((await B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html'])).status,200);await assert.rejects(()=>B.blogFileResponse(req('','GET'),nextBundle.id,'public',['index.html']),error=>error.status===404);

 d.prepare("UPDATE spaces SET visibility='private' WHERE id=?").run(saved.id);await assert.rejects(()=>B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html']),error=>error.status===404);
 d.prepare("UPDATE spaces SET visibility='public' WHERE id=?").run(saved.id);d.prepare("UPDATE community_users SET status='banned' WHERE id='alice'").run();await assert.rejects(()=>B.blogFileResponse(req('','GET'),bundle.id,'public',['index.html']),error=>error.status===404);
});
test('new signature themes retain reviewed snapshots and cannot publish draft theme changes',()=>{
 d.prepare("UPDATE community_users SET status='active' WHERE id='alice'").run();
 for(const theme of ['anx','folio','panorama']){
  const mine=S.mine(req()),saved=S.spacesApi(req(),['spaces','save'],{...mine,layout:{...mine.layout,blog:{mode:'theme',theme,bundleId:'',title:'My reviewed blog',sections:['articles']}}},new URL(req().url));
  const pending=S.spacesApi(req(),['spaces','submit'],{revision:saved.revision,accepted:true},new URL(req().url)),review=pending.reviews.find(row=>row.kind==='board'&&row.status==='pending');
  S.spacesApi(req(),['spaces','save'],{...pending,layout:{...pending.layout,blog:{...pending.layout.blog,theme:'minimal',title:'Private changed title'}}},new URL(req().url));
  S.spacesApi(req('owner'),['admin','spaces','reviews'],{id:review.id,action:'approve',checked:true,reason:'Checked new theme snapshot'},new URL(req().url));
  const visible=S.publicSpace(req('','GET'),'alice');assert.equal(visible.layout.blog.theme,theme);assert.equal(visible.layout.blog.title,'My reviewed blog');assert.equal(S.mine(req()).layout.blog.title,'Private changed title');
 }
});
test('downloadable blog starters are self-contained importable HTML in both languages',async()=>{
 for(const theme of ['folio','panorama'])for(const language of ['zh','en']){
  const name=`blog-${theme}-${language}.html`,bytes=await readFile(new URL('../public/templates/'+name,import.meta.url));
  assert.ok(bytes.length<5*1024*1024);const imported=unpackBlog(bytes,name);assert.ok(imported.has('index.html'));
  assert.doesNotMatch(bytes.toString(),/<script[^>]*src=|<link[^>]*stylesheet|<img[^>]*src=|fetch\(/i);
  assert.match(bytes.toString(),language==='zh'?/lang="zh-CN"/:/lang="en"/);
 }
});
test.after(async()=>{d.close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
