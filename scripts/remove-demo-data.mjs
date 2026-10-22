// One-off, conservative cleanup of the retired synthetic preview. Stop the app before --apply.
import {DatabaseSync} from 'node:sqlite';
import {readFile,writeFile,lstat,chmod,copyFile,rename,unlink,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {passwordMatches} from '../src/lib/db.mjs';
import {backupSite} from './backup.mjs';

const members=new Set(['demo_member','demo_design','demo_dev','demo_tools','demo_walk','demo_waiting']);
const legacySlugs=new Set(['projects','articles','resources'].flatMap(type=>[0,1,2].map(index=>`demo-${type}-${index}`)).concat(['demo-private-draft','demo-recycled-article']));
const inviteLabels=new Set(['完整界面演示 · 合成成员','待确认资格演示','开发交流邀请','待使用的本地演示邀请']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const markerName='demo-cleanup.json';
const ids=rows=>new Set(rows.map(row=>row.id));

async function regular(location,kind){const stat=await lstat(location);if(stat.isSymbolicLink()||!(kind==='directory'?stat.isDirectory():stat.isFile()))throw new Error(`Expected a regular ${kind}: ${location}`);return stat}
function inside(parent,child){const relative=path.relative(parent,child);return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))}
function mediaIn(value,files,result){
 if(typeof value==='string'){
  if(files.has(value))result.add(value);
  for(const match of value.matchAll(/\/(?:media|download)\/([a-f0-9-]{36})\b/gi))if(files.has(match[1]))result.add(match[1]);
  if(/^[\s]*[\[{]/.test(value)){try{mediaIn(JSON.parse(value),files,result)}catch{}}
 }else if(Array.isArray(value)){for(const item of value)mediaIn(item,files,result)}
 else if(value&&typeof value==='object'){for(const item of Object.values(value))mediaIn(item,files,result)}
}

function planCleanup(d,manifest,manifestMtime){
 const all={};for(const {name} of d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())all[name]=d.prepare(`SELECT rowid AS _cleanupRowid,* FROM "${name}"`).all();
 const select=(table,predicate)=>all[table]?.filter(predicate)||[];
 const removed={};
 removed.community_users=select('community_users',row=>members.has(row.username.toLowerCase())&&row.role==='member'&&!row.email&&!row.email_verified_at&&passwordMatches(manifest.memberPassword,row.password));
 const actors=ids(removed.community_users);
 removed.content=select('content',row=>legacySlugs.has(row.slug)||(row.slug==='多语言界面验收-私人项目草稿'&&row.status==='draft'&&row.published===null));
 const content=ids(removed.content);
 removed.community_posts=select('community_posts',row=>actors.has(row.author));const posts=ids(removed.community_posts);
 removed.catalog_entries=select('catalog_entries',row=>actors.has(row.author));const entries=ids(removed.catalog_entries);
 if(select('catalog_entries',row=>posts.has(row.community_post)&&!entries.has(row.id)).length)throw new Error('A retained catalog entry references a demo post; review it manually before cleanup');
 removed.community_revisions=select('community_revisions',row=>posts.has(row.post));
 removed.catalog_revisions=select('catalog_revisions',row=>entries.has(row.entry));
 removed.community_comments=select('community_comments',row=>posts.has(row.post)||actors.has(row.author));const comments=ids(removed.community_comments);
 removed.spaces=select('spaces',row=>actors.has(row.owner));const spaces=ids(removed.spaces);
 for(const table of ['space_content','space_reviews','space_assets','space_events','space_versions','space_handles','blog_bundles'])removed[table]=select(table,row=>spaces.has(row.space)||(table==='space_events'&&row.visitor.startsWith('demo-')));
 const spaceContent=ids(removed.space_content),bundles=ids(removed.blog_bundles);
 removed.community_cases=select('community_cases',row=>posts.has(row.post)||actors.has(row.author)||actors.has(row.reporter)||select('content_case_targets',target=>target.case_id===row.id&&content.has(target.content)).length||select('space_case_targets',target=>target.case_id===row.id&&(spaces.has(target.space)||spaceContent.has(target.content))).length);
 const cases=ids(removed.community_cases);
 removed.content_case_targets=select('content_case_targets',row=>cases.has(row.case_id));
 removed.space_case_targets=select('space_case_targets',row=>cases.has(row.case_id)||spaces.has(row.space));
 removed.community_reactions=select('community_reactions',row=>actors.has(row.actor)||posts.has(row.post));
 removed.community_reposts=select('community_reposts',row=>actors.has(row.actor)||posts.has(row.post));
 removed.community_follows=select('community_follows',row=>actors.has(row.follower)||actors.has(row.following));
 removed.community_invites=select('community_invites',row=>actors.has(row.used_by)||(!row.used_by&&inviteLabels.has(row.label)&&Date.parse(row.created)<=manifestMtime));
 removed.sessions=select('sessions',row=>actors.has(row.user_id));const sessions=new Set(removed.sessions.map(row=>row.token));
 removed.session_realms=select('session_realms',row=>sessions.has(row.token));
 removed.connect_keys=select('connect_keys',row=>actors.has(row.actor));const keys=ids(removed.connect_keys);
 removed.connect_requests=select('connect_requests',row=>keys.has(row.key_id));
 removed.email_challenges=select('email_challenges',row=>actors.has(row.actor));
 removed.community_acceptances=select('community_acceptances',row=>actors.has(row.user_id));
 removed.blog_previews=select('blog_previews',row=>actors.has(row.actor)||sessions.has(row.session)||bundles.has(row.bundle));
 removed.uploads=select('uploads',row=>spaces.has(row.space_id));const uploads=ids(removed.uploads);
 removed.chunks=select('chunks',row=>uploads.has(row.upload));
 removed.events=select('events',row=>row.visitor.startsWith('demo-'));
 const targets=new Set(Object.values(removed).flatMap(rows=>rows.map(row=>row.id).filter(id=>typeof id==='string')));
 const related=value=>typeof value==='string'&&value.split(/[:/?#=&]/).some(part=>targets.has(part));
 removed.community_notifications=select('community_notifications',row=>actors.has(row.user_id)||related(row.event_key)||related(row.href));
 removed.community_audit=select('community_audit',row=>actors.has(row.actor)||related(row.target));
 const owners=new Set([...content,...[...actors].flatMap(id=>['community-cover:'+id,'community-avatar:'+id]),...removed.spaces.flatMap(row=>['ergathia:board:'+row.id,'ergathia:asset:'+row.id]),...removed.space_content.map(row=>'ergathia:content:'+row.id),...removed.space_reviews.map(row=>'ergathia:review:'+row.id),...removed.space_versions.map(row=>'ergathia:version:'+row.id),...removed.blog_bundles.map(row=>'ergathia:blog-bundle:'+row.id)]);
 removed.refs=select('refs',row=>owners.has(row.owner));
 const fileIds=new Set(all.files.map(row=>row.id)),candidates=new Set();
 for(const rows of Object.values(removed))for(const row of rows)mediaIn(row,fileIds,candidates);
 // A retained config, space version, unknown upload or reference always wins over cleanup.
 const retained=new Set();
 for(const [table,rows] of Object.entries(all)){
  if(['files','traffic','events','space_events','community_audit','limits'].includes(table))continue;
  const deleted=new Set((removed[table]||[]).map(row=>row._cleanupRowid));
  for(const row of rows)if(!deleted.has(row._cleanupRowid))mediaIn(row,fileIds,retained);
 }
 removed.files=all.files.filter(row=>candidates.has(row.id)&&!retained.has(row.id));
 const files=ids(removed.files);
 removed.traffic=select('traffic',row=>files.has(row.file_id));
 return {removed,files,comments,retainedReplies:select('community_comments',row=>!comments.has(row.id)&&comments.has(row.parent)),summary:{members:removed.community_users.map(row=>row.username),counts:Object.fromEntries(Object.entries(removed).map(([table,rows])=>[table,rows.length])),preservedDemoNames:select('community_users',row=>members.has(row.username.toLowerCase())&&!actors.has(row.id)).map(row=>row.username)}};
}

export async function cleanupDemoData({dataDir,apply=false,backupDir}={}){
 if(typeof dataDir!=='string'||!dataDir.trim())throw new Error('An explicit dataDir / --data-dir is required');
 const source=path.resolve(dataDir);await regular(source,'directory');
 const manifestPath=path.join(source,'demo-manifest.json'),markerPath=path.join(source,markerName);
 // A durable completion marker makes retries safe even after the old credential manifest is retired.
 try{await regular(markerPath,'file');const marker=JSON.parse(await readFile(markerPath,'utf8'));if(marker.version!==1||marker.dataDir!==source||marker.completed!==true)throw new Error('Invalid cleanup marker');return {alreadyCleaned:true,applied:false,backup:marker.backup,summary:marker.summary}}catch(error){if(error.code!=='ENOENT')throw error}
 const manifestStat=await regular(manifestPath,'file');const originalManifest=await readFile(manifestPath,'utf8'),manifest=JSON.parse(originalManifest);
 if(manifest.allSynthetic!==true||typeof manifest.data!=='string'||path.resolve(manifest.data)!==source||typeof manifest.memberPassword!=='string'||!manifest.memberPassword)throw new Error('Cleanup requires the original allSynthetic=true manifest for this explicit data directory');
 await regular(path.join(source,'site.sqlite'),'file');await regular(path.join(source,'files'),'directory');
 const destination=path.resolve(backupDir||path.join(path.dirname(source),'.demo-cleanup-backups',path.basename(source)+'-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()));
 if(inside(source,destination)||inside(destination,source))throw new Error('Backup must be separate from the data directory');
 const d=new DatabaseSync(path.join(source,'site.sqlite'),{readOnly:!apply});d.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000');
 let transaction=false,committed=false,backup,plan;const staged=[];
 try{
  if(apply){d.exec('BEGIN IMMEDIATE');transaction=true}
  plan=planCleanup(d,manifest,manifestStat.mtimeMs);
  if(!apply)return {applied:false,dryRun:true,summary:plan.summary};
  backup=await backupSite(source,destination);
  await copyFile(manifestPath,path.join(backup,'demo-manifest.json'));await chmod(path.join(backup,'demo-manifest.json'),0o600);await chmod(path.join(backup,'site.sqlite'),0o600);
  for(const row of plan.retainedReplies)d.prepare('UPDATE community_comments SET parent=NULL WHERE id=?').run(row.id);
  // Null selected parents too: replies may have been inserted in any row order.
  for(const row of plan.removed.community_comments)d.prepare('UPDATE community_comments SET parent=NULL WHERE id=?').run(row.id);
  const order=['content_case_targets','space_case_targets','blog_previews','connect_requests','session_realms','chunks','community_notifications','community_audit','community_cases','community_reactions','community_reposts','community_follows','community_comments','catalog_revisions','catalog_entries','community_revisions','community_posts','space_handles','space_reviews','space_assets','space_events','space_versions','space_content','blog_bundles','uploads','spaces','connect_keys','email_challenges','community_acceptances','community_invites','sessions','refs','content','community_users','events','traffic'];
  for(const table of order){if(!plan.removed[table]?.length)continue;const remove=d.prepare(`DELETE FROM "${table}" WHERE rowid=?`);for(const row of plan.removed[table])remove.run(row._cleanupRowid)}
  for(const row of plan.removed.files){
   if(!uuid.test(row.id))throw new Error('Refusing to delete an unexpected media filename');
   const file=path.join(source,'files',row.id),tombstone=path.join(source,'files','.delete-'+row.id);
   await regular(file,'file');try{await lstat(tombstone);throw new Error('An unfinished media deletion needs recovery first')}catch(error){if(error.code!=='ENOENT')throw error}
   await rename(file,tombstone);staged.push([file,tombstone]);d.prepare('DELETE FROM files WHERE id=?').run(row.id);
  }
  if(d.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key check failed; no cleanup was committed');
  d.exec('COMMIT');transaction=false;committed=true;
 }catch(error){if(transaction)d.exec('ROLLBACK');if(!committed)for(const [file,tombstone] of staged.reverse())await rename(tombstone,file);throw error}finally{d.close()}
 const pending=[];
 for(const [,tombstone] of staged)try{await unlink(tombstone)}catch{pending.push(tombstone)}
 for(const [directory,rows] of [['partial',plan.removed.uploads],['blog-sites',plan.removed.blog_bundles]])for(const row of rows)if(uuid.test(row.id))try{await regular(path.join(source,directory),'directory');await rm(path.join(source,directory,row.id),{recursive:directory==='blog-sites',force:true})}catch(error){if(error.code!=='ENOENT')pending.push(path.join(source,directory,row.id))}
 const marker={version:1,completed:true,dataDir:source,cleanedAt:new Date().toISOString(),backup,summary:plan.summary,pendingFileRemovals:pending};
 // Write marker first so a retry cannot identify a new legitimate account by a retired demo name.
 await writeFile(markerPath,JSON.stringify(marker,null,2),{mode:0o600});
 await writeFile(manifestPath,JSON.stringify({allSynthetic:false,cleaned:true,marker:markerName},null,2),{mode:0o600});
 return {applied:true,backup,summary:plan.summary,pendingFileRemovals:pending};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options={};for(let index=2;index<process.argv.length;index++){const flag=process.argv[index];if(flag==='--apply')options.apply=true;else if(flag==='--data-dir'||flag==='--backup-dir'){const value=process.argv[++index];if(!value||value.startsWith('--'))throw new Error('Missing value for '+flag);options[flag==='--data-dir'?'dataDir':'backupDir']=value}else throw new Error('Usage: node scripts/remove-demo-data.mjs --data-dir /explicit/private/data [--apply] [--backup-dir /new/private/backup]')}
 console.log(JSON.stringify(await cleanupDemoData(options),null,2));
}
