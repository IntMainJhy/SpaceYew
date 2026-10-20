// Fixture-only editorial migration. Never runs against the primary data directory.
import {readFile, mkdir, writeFile, access} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {memberNames, postCopy, licenseCopy, portfolioCopy} from './demo-copy.mjs';

const folder=path.resolve('..','.site-x-demo-data');
const manifest=JSON.parse(await readFile(path.join(folder,'demo-manifest.json'),'utf8'));
assert.equal(manifest.allSynthetic,true);
assert.equal(path.resolve(manifest.data),folder);
assert.equal(manifest.url,'http://localhost:3010');
const version='natural-copy-v1', marker=path.join(folder,version+'.json');
try { await access(marker); console.log('Preview copy already updated.'); process.exit(0); } catch {}
const d=new DatabaseSync(path.join(folder,'site.sqlite'));
d.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
const backupDir=path.join(folder,'backups');await mkdir(backupDir,{recursive:true,mode:0o700});
const backup=path.join(backupDir,'before-copy-'+Date.now()+'.sqlite');
d.prepare('VACUUM INTO ?').run(backup);
const counts=()=>Object.fromEntries(['community_posts','community_reactions','community_reposts','community_follows','community_comments','community_cases','files'].map(t=>[t,d.prepare('SELECT COUNT(*) n FROM '+t).get().n]));
const before=counts();const at=new Date().toISOString();let changed=0;
const usernames=['demo_member','demo_design','demo_dev','demo_tools','demo_walk','demo_waiting'];
d.exec('BEGIN IMMEDIATE');
try {
  usernames.forEach((username,i)=>d.prepare('UPDATE community_users SET nickname=?,updated=? WHERE username=?').run(memberNames[i],at,username));
  // Append an editorial fixture revision; keep every existing review and its document intact.
  // This is a local dataset migration, not an alternative moderation API.
  const ids=[...manifest.posts,'8756872a-e34c-4593-ad95-2c7b56cad9c4'];
  ids.forEach((id,i)=>{
    const row=d.prepare('SELECT * FROM community_posts WHERE id=?').get(id);
    if(!row||row.visibility!=='public'||row.pending_revision)return;
    const previous=d.prepare('SELECT * FROM community_revisions WHERE id=?').get(row.public_revision);
    const original=JSON.parse(previous.data);
    // A user-edited item is not an untouched fixture and must not be replaced.
    if(!/合成投稿|本地演示站/.test(original.body))return;
    const revision=randomUUID(), number=d.prepare('SELECT MAX(number)+1 n FROM community_revisions WHERE post=?').get(id).n;
    const data={...original,...postCopy[i],license:licenseCopy,note:''};
    d.prepare('INSERT INTO community_revisions(id,post,number,data,status,reason,reviewer,created,decided) VALUES(?,?,?,?,?,?,?,?,?)').run(revision,id,number,JSON.stringify(data),'approved','整理正文、署名与来源说明。','owner',at,at);
    d.prepare('UPDATE community_posts SET public_revision=?,version=version+1,updated=? WHERE id=?').run(revision,at,id);
    d.prepare('INSERT INTO community_audit VALUES(?,?,?,?,?,?)').run(randomUUID(),'fixture-editor','fixture_copy_refresh',id,JSON.stringify({previous:previous.id,revision,version}),at);
    assert.deepEqual(d.prepare('SELECT * FROM community_revisions WHERE id=?').get(previous.id),previous);
    changed++;
  });
  // Draft records remain drafts; fixed pending/decided review documents are never overwritten.
  for(const id of manifest.drafts){
    const row=d.prepare('SELECT draft FROM community_posts WHERE id=?').get(id);
    if(row?.draft){const old=JSON.parse(row.draft);if(/合成投稿/.test(old.body))d.prepare('UPDATE community_posts SET draft=?,version=version+1 WHERE id=?').run(JSON.stringify({...old,body:postCopy[0].body,license:licenseCopy,note:''}),id);}
  }
  const parse=key=>JSON.parse(d.prepare('SELECT value FROM config WHERE key=?').get(key).value);
  const profile=parse('profile');
  if(profile.name==='余江昊（演示）')d.prepare('UPDATE config SET value=? WHERE key=?').run(JSON.stringify({...profile,name:'余江昊',intro:'在这里记录开发过程、分享项目与资源，也留下成长中的每一个重要节点。',experiences:profile.experiences.map((x,i)=>({...x,type:i?'学习经历':'项目经历',description:i?'持续整理组件、布局与交互实践，把日常学习写成可以回看的笔记。':'搭建个人内容工作台，持续完善作品发布、资源维护与社区交流。'}))}),'profile');
  const site=parse('site');d.prepare('UPDATE config SET value=? WHERE key=?').run(JSON.stringify({...site,description:'余江昊的项目、开发手记与资源分享。'}),'site');
  for(const type of Object.keys(portfolioCopy))portfolioCopy[type].forEach(([title,summary,paragraph],i)=>{
    const row=d.prepare('SELECT * FROM content WHERE type=? AND slug=?').get(type,'demo-'+type+'-'+i);
    if(!row||row.deleted)return;
    const update=raw=>{if(!raw)return raw;const old=JSON.parse(raw);if(!old.title.endsWith('（演示）'))return raw;return JSON.stringify({...old,title,summary,bodyHtml:'<h2>'+title+'</h2><p>'+paragraph+'</p><h2>使用与整理</h2><p>'+summary+'</p>',role:'开发与设计',contribution:paragraph,outcome:'在持续维护中整理可复用的方法与记录。'});};
    d.prepare('UPDATE content SET published=?,draft=?,revision=revision+1 WHERE id=?').run(update(row.published),update(row.draft),row.id);
  });
  const privateDraft=d.prepare("SELECT * FROM content WHERE slug='demo-private-draft'").get();
  if(privateDraft?.draft){const data=JSON.parse(privateDraft.draft);d.prepare('UPDATE content SET draft=?,revision=revision+1 WHERE id=?').run(JSON.stringify({...data,title:'正在整理：我的开发笔记方法',summary:'把问题、排查过程与最后的取舍收在同一份笔记里。'}),privateDraft.id);}
  // Replace only the seed's old, generated text attachment; it is not a user upload.
  const file=d.prepare("SELECT id FROM files WHERE name='演示资源说明.md'").get();
  if(file){
    const bytes=Buffer.from('# 资源整理说明\n\n## 名称与用途\n资源名称：\n适用场景：\n\n## 来源与版本\n来源网址：\n适用版本：\n更新日期：\n\n## 许可与使用限制\n许可名称：\n注意事项：\n');
    const {createHash}=await import('node:crypto');
    await writeFile(path.join(folder,'files',file.id),bytes,{mode:0o600});
    d.prepare('UPDATE files SET name=?,size=?,sha256=? WHERE id=?').run('资源整理说明.md',bytes.length,createHash('sha256').update(bytes).digest('hex'),file.id);
  }
  assert.deepEqual(counts(),before);
  d.exec('COMMIT');
} catch(error){d.exec('ROLLBACK');throw error;} finally {d.close();}
await writeFile(marker,JSON.stringify({version,changed,before,backup,allSynthetic:true},null,2),{mode:0o600});
console.log(JSON.stringify({updatedPosts:changed,preserved:before,backup}));
