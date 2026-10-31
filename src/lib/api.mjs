import {importResumeFile,parseResume} from './resume-import.mjs';
import {catalogApi} from './catalog.mjs';
import {blogBundles} from './blog-hosting.mjs';
import {accessConfig,apiAllowed,registrationEnabled,appSurface} from './app-access.mjs';
import {managementLog,changedFields} from './management-log.mjs';
import {spaceFiles} from './space-files.mjs';
import {connectApi,manageKeys} from './connect.mjs';
import {spaceQr,blogQr} from './spaces-qr.mjs';
import {spacesApi,spaceActor,ensureSpace} from './spaces.mjs';
import {spaceUploads} from './spaces-uploads.mjs';
import {emailStatus,requestEmail,bindEmail,resetEmailPassword} from './email-auth.mjs';
import {db,getConfig,hash,adminRow,fileInfo,DATA,FILES,transaction,recordAudit} from './db.mjs';
import {admin,origin,session,currentUser,login,sessionCookie,changePassword,COOKIE,cookie} from './auth.mjs';
import {communityApi} from './community.mjs';
import {changeAvatar} from './avatars.mjs';
import {uploadCover} from './covers.mjs';
import {HttpError,requireValue,listContent,writeContent,saveConfiguration,contentData} from './content.mjs';
import {createUpload,putChunk,completeUpload,cancelUpload,uploadInfo,removeFile,readLimited,MAX,CHUNK} from './uploads.mjs';
import {track,analytics} from './analytics.mjs';
import {adminOverview} from './admin-overview.mjs';
import {statfs} from 'node:fs/promises';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
async function body(req,max=2200000){try{requireValue((req.headers.get('content-type')||'').split(';')[0].trim()==='application/json','请使用JSON请求',415);const value=JSON.parse((await readLimited(req,max)).toString());requireValue(value&&typeof value==='object'&&!Array.isArray(value),'请求格式无效');return value}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'请求格式无效')}}
export async function handle(req){try{const url=new URL(req.url),p=url.pathname.split('/').filter(Boolean).slice(1),method=req.method,apiPath='/api/'+p.join('/');requireValue(apiAllowed(apiPath),'接口不存在',404);requireValue(registrationEnabled()||apiPath!=='/api/community/register','注册暂未开放',403);if(!registrationEnabled()&&p[0]==='auth'&&p[1]==='email'&&method==='POST'){const preview=req.clone();const input=await body(preview,8192);requireValue(input.purpose!=='register','注册暂未开放',403);}const principal=currentUser(req);if(principal?.experience)requireValue(!/^\/api\/(?:auth\/email\/(?:request|bind|reset)|community\/account|spaces\/keys)(?:\/|$)/.test(apiPath),'体验账号暂不支持此操作',403);if(p[0]==='connect'){requireValue(method==='POST','请使用POST调用工具接口',405);return json(await connectApi(req,await body(req,2200000)))}if(method!=='GET')origin(req);
 if(p[0]==='auth'&&p[1]==='login'&&method==='POST'){const token=login(req,await body(req,4096));return json({ok:true},200,{'Set-Cookie':sessionCookie(token)})}
 if(p[0]==='auth'&&p[1]==='email'&&p.length===3){if(p[2]==='status'&&method==='GET')return json(emailStatus(req));const input=await body(req,8192);if(p[2]==='request'&&method==='POST')return json(await requestEmail(req,input));if(p[2]==='bind'&&method==='POST')return json(bindEmail(req,input));if(p[2]==='reset'&&method==='POST')return json(resetEmailPassword(req,input),200,{'Set-Cookie':sessionCookie('',true)});throw new HttpError(404,'接口不存在')}
 if(p[0]==='auth'&&p[1]==='me'&&method==='GET')return json({user:currentUser(req),access:accessConfig()});
 if(p[0]==='auth'&&p[1]==='logout'&&method==='POST'){db().prepare('DELETE FROM sessions WHERE token=? AND COALESCE((SELECT realm FROM session_realms WHERE session_realms.token=sessions.token),\'combined\')=?').run(hash(cookie(req,COOKIE)),appSurface());return json({ok:true},200,{'Set-Cookie':sessionCookie('',true)})}
 if(p.length===2&&p[0]==='community'&&p[1]==='avatar'&&['PUT','DELETE'].includes(method))return json(await changeAvatar(req));
 if(p.length===2&&p[0]==='community'&&p[1]==='covers'&&method==='PUT')return json(await uploadCover(req));
 if(p[0]==='catalog'||p[0]==='admin'&&p[1]==='catalog')return json(catalogApi(req,p,method==='GET'?{}:await body(req,2200000),url));
 if(p[0]==='community'||p[0]==='admin'&&p[1]==='community'){const input=method==='GET'?{}:await body(req,p[1]==='register'?8192:2200000);return json(communityApi(req,p,input,url))}
 if(p[0]==='admin'&&p[1]==='blog'&&p.length===3){admin(req);requireValue(['mine','save','offline','restore','export'].includes(p[2]),'接口不存在',404);return json(spacesApi(req,['spaces',p[2]],method==='GET'?{}:await body(req,650000),url))}
 if(p[0]==='admin'&&p[1]==='spaces'&&p[2]==='blog-preview'&&p.length===4&&method==='POST'){requireValue(principal,'请先登录',401);requireValue(['owner','reviewer'].includes(principal.role),'没有审核权限',403);return json(await blogBundles(req,['spaces','blog-bundles',p[3],'preview'],await body(req,8192)))}
 if(p[0]==='spaces'&&p[1]==='blog-bundles')return json(await blogBundles(req,p,method==='GET'?{}:await body(req,8192)));
 if(p[0]==='spaces'&&p[1]==='blog-qr'&&p.length===3&&method==='GET')return await blogQr(req,p[2]);
 if(p[0]==='spaces'&&p[1]==='qr'&&p.length===3&&method==='GET')return await spaceQr(req,p[2]);
 if(p[0]==='spaces'&&p[1]==='keys')return json(manageKeys(req,method==='GET'?{}:await body(req,8192)));
 if(p[0]==='spaces'&&p[1]==='files')return json(await spaceFiles(req,p,{},url));
 if(p[0]==='spaces'&&p[1]==='resume'&&p.length===3&&method==='POST'){const user=spaceActor(req),input=await body(req,650000);if(p[2]==='parse')return json(parseResume(input.text));if(p[2]==='import'){const space=ensureSpace(user);requireValue(typeof input.fileId==='string'&&db().prepare('SELECT 1 FROM space_assets WHERE space=? AND file=?').get(space.id,input.fileId),'只能导入自己上传的简历',403);return json(await importResumeFile(input.fileId,user))}throw new HttpError(404,'接口不存在')}
 if(p[0]==='spaces'&&p[1]==='uploads')return json(await spaceUploads(req,p,req.method==='POST'&&p.length===2?await body(req):{},url));
 if(p[0]==='spaces'||p[0]==='admin'&&p[1]==='spaces')return json(spacesApi(req,p,method==='GET'?{}:await body(req,9000000),url));
 if(p[0]==='analytics'&&method==='POST'){const result=track(req,await body(req));return json({ok:true},200,result.cookie?{'Set-Cookie':result.cookie}:{})}
 admin(req);
 const actor=currentUser(req);
 if(p.length===3&&p[0]==='admin'&&p[1]==='resume'&&method==='POST'){const input=await body(req,650000);if(p[2]==='import')return json(await importResumeFile(input.fileId,actor));if(p[2]==='parse')return json(parseResume(input.text));throw new HttpError(404,'接口不存在')}

 if(p[0]==='admin'&&p[1]==='logs'&&p.length===2&&method==='GET')return json(managementLog(req,url.searchParams));
 if(p[0]==='admin'&&p[1]==='overview'&&p.length===2&&method==='GET')return json(adminOverview(req));
 if(p[0]==='auth'&&p[1]==='password'&&method==='POST'){changePassword(await body(req),req);return json({ok:true},200,{'Set-Cookie':sessionCookie('',true)})}
 if(p[0]==='admin'&&p[1]==='bootstrap'&&method==='GET'){return json({profile:getConfig('profile'),site:getConfig('site'),taxonomy:getConfig('taxonomy'),counts:db().prepare('SELECT type,status,COUNT(*) count FROM content WHERE deleted IS NULL GROUP BY type,status').all(),maxFileBytes:MAX,chunkBytes:CHUNK,username:actor.email||actor.username})}
 if(p[0]==='admin'&&p[1]==='preview'&&method==='POST'){const input=await body(req,9000000);return json(contentData(input.data,input.type))}
 if(p[0]==='admin'&&p[1]==='content'){
  if(method==='GET'){if(p[2]){const row=db().prepare('SELECT * FROM content WHERE id=?').get(p[2]);requireValue(row,'内容不存在',404);return json(adminRow(row))}return json(listContent({type:url.searchParams.get('type'),q:url.searchParams.get('q')||'',status:url.searchParams.get('status')||'all',page:url.searchParams.get('page')||1,trash:url.searchParams.get('trash')==='1'}))}
  if(method==='POST'){const input=await body(req,9000000);return json(transaction(()=>{const before=typeof input.id==='string'?db().prepare('SELECT * FROM content WHERE id=?').get(input.id):null,result=writeContent(input);recordAudit(actor,'site_content_'+(input.action||'save'),result.id,{type:result.type,revision:result.revision,from:before?.status||'new',to:result.deleted?'deleted':result.status,fields:changedFields(before?JSON.parse(before.draft||before.published):{},result.draft||result.published)});return result}))}
 }
 if(p[0]==='admin'&&p[1]==='config'&&method==='POST'){const input=await body(req);return json(transaction(()=>{const before=['site','profile','taxonomy'].includes(input.key)?getConfig(input.key):{},result=saveConfiguration(input.key,input.value);recordAudit(actor,'site_config_update',input.key,{fields:changedFields(before,result)});return result}))}
 if(p[0]==='admin'&&p[1]==='statistics'&&method==='GET')return json(analytics(url.searchParams));
 if(p[0]==='admin'&&p[1]==='files'){
  if(method==='DELETE')return json(await removeFile(p[2],{actor}));
  if(method==='GET'){if(p[2]){const file=fileInfo(p[2]);requireValue(file,'文件不存在',404);return json(file)}const total=db().prepare('SELECT COUNT(*) n FROM files').get().n,page=Math.max(1,Math.min(Math.max(1,Math.ceil(total/20)),Math.floor(Number(url.searchParams.get('page')))||1)),items=db().prepare('SELECT f.*, (SELECT COUNT(*) FROM refs WHERE file=f.id) refs FROM files f ORDER BY created DESC LIMIT 20 OFFSET ?').all((page-1)*20).map(f=>({...f,references:db().prepare("SELECT r.owner,r.visibility,c.type,c.deleted,json_extract(COALESCE(c.draft,c.published),'$.title') title FROM refs r LEFT JOIN content c ON r.owner=c.id WHERE r.file=?").all(f.id)}));const disk=await statfs(FILES);return json({items,total,page,pages:Math.max(1,Math.ceil(total/20)),used:db().prepare('SELECT COALESCE(SUM(size),0) n FROM files').get().n,available:Number(disk.bavail)*Number(disk.bsize)})}
 }
 if(p[0]==='admin'&&p[1]==='uploads'){
  if(p.length===2&&method==='GET')return json(db().prepare("SELECT * FROM uploads WHERE status NOT IN ('complete','cancelled') ORDER BY updated DESC LIMIT 30").all().map(uploadInfo));
  if(p.length===2&&method==='POST')return json(await createUpload(await body(req),actor));
  const id=p[2];requireValue(/^[a-f0-9-]{36}$/.test(id||''),'上传任务标识无效');
  if(method==='GET'){const row=db().prepare('SELECT * FROM uploads WHERE id=?').get(id);requireValue(row,'上传任务不存在',404);return json(uploadInfo(row))}
  if(method==='PUT')return json(await putChunk(id,url.searchParams.get('index'),req));
  if(method==='POST'&&p[3]==='complete'){const result=await completeUpload(id,actor);return json(result);}
  if(method==='DELETE')return json(await cancelUpload(id,actor));
 }
 return json({error:'接口不存在'},404)
 }catch(error){const status=error instanceof HttpError?error.status:error?.code==='SQLITE_CONSTRAINT_UNIQUE'?409:500;if(status===500)console.error('[site-api]',error);return json({error:status===500?'操作失败，请重试；如持续失败，请检查服务器日志':error.message},status)}}
