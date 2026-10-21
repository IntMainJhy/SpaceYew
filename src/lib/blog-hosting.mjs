import {randomBytes,randomUUID} from 'node:crypto';
import path from 'node:path';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {db,DATA,FILES,hash,now,transaction,limited} from './db.mjs';
import {spaceActor,ensureSpace,publicSpace,spaceStorageBytes} from './spaces.mjs';
import {COOKIE,cookie} from './auth.mjs';
import {requireValue} from './content.mjs';
import {lock} from './uploads.mjs';
import {blogPath,unpackBlog,staticMime} from './blog-archive.mjs';
const directory=path.join(DATA,'blog-sites');
const uuid=value=>/^[a-f0-9-]{36}$/.test(value||'');
function previewAllowed(user,bundle){return user?.status==='active'&&(user.id===db().prepare('SELECT owner FROM spaces WHERE id=?').get(bundle.space)?.owner||['owner','reviewer'].includes(user.role)&&db().prepare("SELECT 1 FROM space_reviews WHERE space=? AND json_extract(data,'$.layout.blog.bundleId')=?").get(bundle.space,bundle.id))}
function bundleView(row){return{id:row.id,file:row.file,size:row.size,entry:row.entry,created:row.created,files:JSON.parse(row.manifest)}}
export function publicBlogBundle(req,handle){const space=publicSpace(req,handle);requireValue(space.layout.blog?.mode==='static','页面不存在',404);const row=db().prepare('SELECT * FROM blog_bundles WHERE id=? AND space=?').get(space.layout.blog.bundleId,space.id);requireValue(row,'页面不存在',404);return bundleView(row)}
export function staticPage(value,bundle){if(value===undefined||value==='')return bundle.entry;requireValue(typeof value==='string'&&value.length<=2000&&!/[\x00-\x1f]/.test(value),'页面不存在',404);const name=value.split(/[?#]/)[0];requireValue(bundle.files.includes(name)&&/\.html?$/i.test(name),'页面不存在',404);return value}
export async function blogBundles(req,p,input){
 const user=spaceActor(req),space=ensureSpace(user),d=db(),id=p[2];
 if(req.method==='POST'&&id&&p[3]==='preview'){
  const bundle=d.prepare('SELECT * FROM blog_bundles WHERE id=?').get(id);requireValue(bundle&&previewAllowed(user,bundle),'网站包不存在',404);
  const session=hash(cookie(req,COOKIE));requireValue(d.prepare('SELECT 1 FROM sessions WHERE token=? AND expires>?').get(session,Date.now()),'请重新登录后预览',401);
  requireValue(!limited('blog-preview:'+user.id,30,60000),'预览操作过于频繁',429);
  const token=randomBytes(24).toString('base64url');transaction(tx=>{tx.prepare('DELETE FROM blog_previews WHERE expires<=?').run(Date.now());tx.prepare('INSERT INTO blog_previews VALUES(?,?,?,?,?)').run(hash(token),id,session,user.id,Date.now()+5*60000)});
  return{...bundleView(bundle),src:'/site-files/'+id+'/'+token+'/'+bundle.entry};
 }
 if(req.method==='GET'&&!id)return{items:d.prepare('SELECT * FROM blog_bundles WHERE space=? ORDER BY created DESC').all(space.id).map(bundleView)};
 requireValue(req.method==='POST'&&!id,'接口不存在',404);
 return lock('space-quota:'+space.id,async()=>{
  requireValue(uuid(input.fileId),'请选择自己上传的网站文件');
  const file=d.prepare('SELECT f.* FROM files f JOIN space_assets a ON a.file=f.id WHERE a.space=? AND f.id=?').get(space.id,input.fileId);requireValue(file,'只能托管自己上传的文件',403);
  const existing=d.prepare('SELECT * FROM blog_bundles WHERE space=? AND file=?').get(space.id,file.id);if(existing)return bundleView(existing);
  requireValue(d.prepare('SELECT COUNT(*) n FROM blog_bundles WHERE space=?').get(space.id).n<20,'每个主页最多保留20个静态网站版本',409);
  requireValue(file.size<=25*1024*1024,'网站包请控制在25MB以内');
  requireValue(!limited('blog-import:'+user.id,20,3600000),'网站包导入过于频繁',429);
  const files=unpackBlog(await readFile(path.join(FILES,file.id)),file.name),size=[...files.values()].reduce((sum,b)=>sum+b.length,0);
  const used=spaceStorageBytes(space.id);
  requireValue(used+size<=1000000000,'个人空间存储不足',409);
  const bundle=randomUUID(),folder=path.join(directory,bundle),entry=files.has('index.html')?'index.html':'index.htm';
  try{
   for(const[name,bytes]of files){const target=path.join(folder,name);await mkdir(path.dirname(target),{recursive:true,mode:0o700});await writeFile(target,bytes,{mode:0o600,flag:'wx'})}
   transaction(tx=>{requireValue(spaceStorageBytes(space.id)+size<=1000000000,'个人空间存储不足',409);requireValue(tx.prepare('SELECT COUNT(*) n FROM blog_bundles WHERE space=?').get(space.id).n<20,'每个主页最多保留20个静态网站版本',409);tx.prepare('INSERT INTO blog_bundles VALUES(?,?,?,?,?,?,?)').run(bundle,space.id,file.id,JSON.stringify([...files.keys()]),size,entry,now());tx.prepare('INSERT INTO refs VALUES(?,?,?)').run('ergathia:blog-bundle:'+bundle,file.id,'private')});
   return bundleView(d.prepare('SELECT * FROM blog_bundles WHERE id=?').get(bundle));
  }catch(error){await rm(folder,{recursive:true,force:true});throw error}
 });
}
function previewUser(row){if(row.actor==='owner')return{id:'owner',role:'owner',status:'active'};return db().prepare('SELECT id,role,status FROM community_users WHERE id=?').get(row.actor)}
function bridge(prefix){return `<script>(function(){var prefix=${JSON.stringify(prefix)};function report(){parent.postMessage({type:'spaceyew:page',path:location.pathname.slice(prefix.length)+location.search+location.hash},'*')}addEventListener('load',report);addEventListener('hashchange',report);addEventListener('message',function(event){if(event.source===parent&&event.data&&event.data.type==='spaceyew:request-page')report()});addEventListener('click',function(event){var anchor=event.target&&event.target.closest&&event.target.closest('a[href]');if(!anchor)return;var url;try{url=new URL(anchor.getAttribute('href'),location.href)}catch{return}if(['http:','https:','mailto:'].indexOf(url.protocol)<0)return;if(url.origin===location.origin&&url.pathname.indexOf(prefix)===0)return;event.preventDefault();parent.postMessage({type:'spaceyew:external-link',url:url.href},'*')});})();</script>`}
export async function blogFileResponse(req,bundleId,access,segments){
 requireValue(uuid(bundleId),'页面不存在',404);const d=db(),bundle=d.prepare('SELECT * FROM blog_bundles WHERE id=?').get(bundleId);requireValue(bundle,'页面不存在',404);
 const space=d.prepare('SELECT * FROM spaces WHERE id=?').get(bundle.space);let published;
 if(access==='public'){
  published=publicSpace(req,space.handle);requireValue(published.layout.blog?.mode==='static'&&published.layout.blog.bundleId===bundle.id,'页面不存在或暂未公开',404);
 }else{
  const preview=d.prepare('SELECT * FROM blog_previews WHERE token=? AND bundle=? AND expires>?').get(hash(access||''),bundle.id,Date.now());
  const session=preview&&d.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(preview.session,Date.now());
  requireValue(preview&&session&&(session.user_id||'owner')===preview.actor&&previewAllowed(previewUser(preview),bundle),'预览已失效，请重新打开',404);
 }
 let name=segments.join('/')||bundle.entry;if(name.endsWith('/'))name+='index.html';name=blogPath(name);
 requireValue(JSON.parse(bundle.manifest).includes(name),'页面不存在',404);
 const blogUrl='/blog/'+encodeURIComponent(space.handle),html=/\.html?$/i.test(name),prefix='/site-files/'+bundle.id+'/'+access+'/';
 if(published&&html&&req.headers.get('sec-fetch-dest')==='document')return Response.redirect(new URL(blogUrl+(name===bundle.entry?'':'?page='+encodeURIComponent(name)),process.env.PUBLIC_URL||req.url),307);
 const origin=new URL(process.env.PUBLIC_URL||req.url).origin,root=origin+prefix;
 const csp=["sandbox allow-scripts","default-src 'none'",`script-src 'unsafe-inline' ${root}`,`style-src 'unsafe-inline' ${root}`,`img-src ${root} data: blob: https:`,`font-src ${root} data:`,`media-src ${root}`,"connect-src 'none'","worker-src 'none'","frame-src 'none'","object-src 'none'","base-uri 'none'","form-action 'none'","frame-ancestors 'self'"].join('; ');
 const headers={'Content-Type':staticMime[path.posix.extname(name).toLowerCase()],'Content-Security-Policy':csp,'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Cross-Origin-Resource-Policy':'cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()','X-Robots-Tag':'noindex, nofollow'};
 if(req.method==='HEAD')return new Response(null,{headers});
 let data=await readFile(path.join(directory,bundle.id,name));
 if(html){const code=bridge(prefix),text=data.toString('utf8');data=Buffer.from(/<head(?:\s[^>]*)?>/i.test(text)?text.replace(/<head(?:\s[^>]*)?>/i,head=>head+code):code+text)}
 return new Response(new Uint8Array(data),{headers});
}
