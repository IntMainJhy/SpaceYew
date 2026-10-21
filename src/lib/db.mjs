import {catalogSchema} from './catalog-schema.mjs';
import {spacesSchema} from './spaces-schema.mjs';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,existsSync,writeFileSync,readdirSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {randomBytes,scryptSync,createHash,timingSafeEqual} from 'node:crypto';

export const DATA=path.resolve(process.env.APP_DATA_DIR||path.join(process.cwd(),'..','.site-v1-data'));
export const FILES=path.join(DATA,'files'),PARTIAL=path.join(DATA,'partial');
export const now=()=>new Date().toISOString();
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return`v2:${salt}:${scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`}
export function passwordMatches(password,stored){try{const parts=stored.split(':'),v2=parts[0]==='v2';const [salt,value]=v2?parts.slice(1):parts;if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(value))return false;const expected=Buffer.from(value,'hex'),actual=scryptSync(password,salt,64,v2?{N:32768,r:8,p:3,maxmem:64*1024*1024}:{});return timingSafeEqual(expected,actual)}catch{return false}}
export function db(){
 if(globalThis.__personalSiteDb?.path===DATA)return globalThis.__personalSiteDb.db;
 for(const dir of [DATA,FILES,PARTIAL]){mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(dir,0o700)}
 const d=new DatabaseSync(path.join(DATA,'site.sqlite'));
 d.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY CHECK(id=1),username TEXT NOT NULL UNIQUE,password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS session_realms(token TEXT PRIMARY KEY REFERENCES sessions(token) ON DELETE CASCADE,realm TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS config(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY,type TEXT NOT NULL,slug TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',published TEXT,draft TEXT,revision INTEGER NOT NULL DEFAULT 1,updated TEXT NOT NULL,published_at TEXT,public_updated TEXT,deleted TEXT,UNIQUE(type,slug));
 CREATE INDEX IF NOT EXISTS content_public ON content(type,status,deleted,updated);
 CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY,name TEXT NOT NULL,size INTEGER NOT NULL,mime TEXT NOT NULL,sha256 TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS refs(owner TEXT NOT NULL,file TEXT NOT NULL REFERENCES files(id),visibility TEXT NOT NULL,PRIMARY KEY(owner,file,visibility));
 CREATE TABLE IF NOT EXISTS uploads(id TEXT PRIMARY KEY,name TEXT NOT NULL,size INTEGER NOT NULL,fingerprint TEXT NOT NULL,chunk_size INTEGER NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,file_id TEXT,UNIQUE(fingerprint,size));
 CREATE TABLE IF NOT EXISTS chunks(upload TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,idx INTEGER NOT NULL,size INTEGER NOT NULL,sha256 TEXT NOT NULL,PRIMARY KEY(upload,idx));
 CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,kind TEXT NOT NULL,path TEXT NOT NULL,content_id TEXT,visitor TEXT NOT NULL,source TEXT NOT NULL,device TEXT NOT NULL,browser TEXT NOT NULL,at TEXT NOT NULL,resource_kind TEXT);
 CREATE INDEX IF NOT EXISTS events_range ON events(at,kind);
 CREATE TABLE IF NOT EXISTS traffic(id TEXT PRIMARY KEY,file_id TEXT,bytes INTEGER NOT NULL,source TEXT NOT NULL,at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS traffic_range ON traffic(at,source);
 CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS community_users(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE COLLATE NOCASE,password TEXT NOT NULL,nickname TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member',status TEXT NOT NULL DEFAULT 'active',verification TEXT NOT NULL DEFAULT 'pending',verification_note TEXT NOT NULL DEFAULT '',created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS community_invites(id TEXT PRIMARY KEY,token TEXT NOT NULL UNIQUE,label TEXT NOT NULL,expires INTEGER NOT NULL,used_by TEXT,revoked INTEGER NOT NULL DEFAULT 0,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS community_posts(id TEXT PRIMARY KEY,author TEXT NOT NULL REFERENCES community_users(id),draft TEXT,public_revision TEXT,pending_revision TEXT,visibility TEXT NOT NULL DEFAULT 'private',version INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS community_revisions(id TEXT PRIMARY KEY,post TEXT NOT NULL REFERENCES community_posts(id),number INTEGER NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',reviewer TEXT,created TEXT NOT NULL,decided TEXT,UNIQUE(post,number));
 CREATE UNIQUE INDEX IF NOT EXISTS community_one_pending ON community_revisions(post) WHERE status IN ('pending','reviewing');
 CREATE INDEX IF NOT EXISTS community_posts_author ON community_posts(author,updated);
 CREATE TABLE IF NOT EXISTS community_cases(id TEXT PRIMARY KEY,token TEXT NOT NULL,kind TEXT NOT NULL,post TEXT,revision TEXT,author TEXT,reporter TEXT,contact TEXT NOT NULL DEFAULT '',identity_info TEXT NOT NULL DEFAULT '',category TEXT NOT NULL,description TEXT NOT NULL,evidence TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open',version INTEGER NOT NULL DEFAULT 1,priority TEXT NOT NULL DEFAULT 'normal',frozen INTEGER NOT NULL DEFAULT 0,decision TEXT NOT NULL DEFAULT '',response TEXT NOT NULL DEFAULT '',counter_notice TEXT NOT NULL DEFAULT '',delivery TEXT NOT NULL DEFAULT '',due TEXT NOT NULL DEFAULT '',handler TEXT,created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS community_cases_post ON community_cases(post,frozen);
 CREATE TABLE IF NOT EXISTS community_notifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,href TEXT NOT NULL,created TEXT NOT NULL,read_at TEXT);
 CREATE INDEX IF NOT EXISTS community_notifications_user ON community_notifications(user_id,created DESC,id DESC);
 CREATE INDEX IF NOT EXISTS community_notifications_unread ON community_notifications(user_id) WHERE read_at IS NULL;
 CREATE TABLE IF NOT EXISTS content_case_targets(case_id TEXT PRIMARY KEY REFERENCES community_cases(id),content TEXT NOT NULL REFERENCES content(id),revision INTEGER NOT NULL,snapshot TEXT NOT NULL,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS content_case_content ON content_case_targets(content);
 CREATE TABLE IF NOT EXISTS community_audit(id TEXT PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,details TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS community_reactions(actor TEXT NOT NULL,post TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,kind TEXT NOT NULL CHECK(kind IN ('like','bookmark')),created TEXT NOT NULL,PRIMARY KEY(actor,post,kind));
 CREATE INDEX IF NOT EXISTS community_reactions_post ON community_reactions(post,kind);
 CREATE TABLE IF NOT EXISTS community_reposts(actor TEXT NOT NULL,post TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,created TEXT NOT NULL,PRIMARY KEY(actor,post));
 CREATE INDEX IF NOT EXISTS community_reposts_post ON community_reposts(post,created);
 CREATE TABLE IF NOT EXISTS community_follows(follower TEXT NOT NULL,following TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(follower,following),CHECK(follower<>following));
 CREATE INDEX IF NOT EXISTS community_follows_target ON community_follows(following);
 CREATE TABLE IF NOT EXISTS community_comments(id TEXT PRIMARY KEY,post TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,author TEXT NOT NULL,parent TEXT REFERENCES community_comments(id),body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn','removed')),reason TEXT NOT NULL DEFAULT '',reviewer TEXT,version INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,decided TEXT);
 CREATE INDEX IF NOT EXISTS community_comments_post ON community_comments(post,status,created);
 CREATE TABLE IF NOT EXISTS community_acceptances(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,version TEXT NOT NULL,document_hash TEXT NOT NULL,kind TEXT NOT NULL,created TEXT NOT NULL);
 `);
 for(const table of ['admins','community_users']){for(const [name,type] of [['email','TEXT'],['email_verified_at','TEXT']])if(!d.prepare(`PRAGMA table_info(${table})`).all().some(column=>column.name===name))d.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);d.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${table}_email ON ${table}(email) WHERE email IS NOT NULL`)}
 d.exec(`CREATE TABLE IF NOT EXISTS email_challenges(id TEXT PRIMARY KEY,email TEXT NOT NULL,purpose TEXT NOT NULL,actor TEXT NOT NULL,context TEXT NOT NULL,code_hash TEXT NOT NULL,expires INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,sent INTEGER NOT NULL DEFAULT 0,consumed INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS email_challenges_expiry ON email_challenges(expires)`);
 if(!d.prepare('PRAGMA table_info(sessions)').all().some(column=>column.name==='user_id'))d.exec('ALTER TABLE sessions ADD COLUMN user_id TEXT');
 if(!d.prepare('PRAGMA table_info(session_realms)').all().some(column=>column.name==='authentication'))d.exec("ALTER TABLE session_realms ADD COLUMN authentication TEXT NOT NULL DEFAULT 'legacy'");
 if(!d.prepare('PRAGMA table_info(community_users)').all().some(column=>column.name==='avatar_id'))d.exec('ALTER TABLE community_users ADD COLUMN avatar_id TEXT REFERENCES files(id)');
 if(!d.prepare('PRAGMA table_info(community_notifications)').all().some(column=>column.name==='event_key'))d.exec('ALTER TABLE community_notifications ADD COLUMN event_key TEXT');
 d.exec('CREATE UNIQUE INDEX IF NOT EXISTS community_notification_event ON community_notifications(event_key) WHERE event_key IS NOT NULL');
 if(!d.prepare('PRAGMA table_info(events)').all().some(column=>column.name==='resource_kind'))d.exec('ALTER TABLE events ADD COLUMN resource_kind TEXT');
 spacesSchema(d);
 catalogSchema(d);
 chmodSync(path.join(DATA,'site.sqlite'),0o600);
 for(const name of readdirSync(FILES)){const match=/^\.delete-([a-f0-9-]{36})$/.exec(name);if(match){if(d.prepare('SELECT 1 FROM files WHERE id=?').get(match[1]))renameSync(path.join(FILES,name),path.join(FILES,match[1]));else unlinkSync(path.join(FILES,name))}}
 for(const row of d.prepare("SELECT id,status FROM uploads WHERE status IN ('pending','assembling')").all()){if(existsSync(path.join(PARTIAL,row.id))){if(row.status==='assembling')d.prepare("UPDATE uploads SET status='pending' WHERE id=?").run(row.id)}else{d.prepare("UPDATE uploads SET status='cancelled' WHERE id=?").run(row.id);d.prepare('DELETE FROM chunks WHERE upload=?').run(row.id)}}
 globalThis.__personalSiteDb={path:DATA,db:d};
 if(!d.prepare('SELECT id FROM admins LIMIT 1').get()){
  const password=process.env.INITIAL_ADMIN_PASSWORD||randomBytes(24).toString('base64url');
  if(password.length<12)throw new Error('初始管理员密码至少需要12位');
  d.prepare('INSERT INTO admins(id,username,password) VALUES(1,?,?)').run(process.env.INITIAL_ADMIN_USERNAME||'admin',passwordHash(password));
  if(!process.env.INITIAL_ADMIN_PASSWORD)writeFileSync(path.join(DATA,'initial-admin.txt'),`管理员账号：${process.env.INITIAL_ADMIN_USERNAME||'admin'}\n密码：${password}\n请登录后修改密码，然后删除此凭据文件。\n`,{mode:0o600});
 }
 const defaults={
  profile:{name:'余江昊',alias:'IntMainJhy',intro:'在这里记录开发过程、分享项目与资源，也留下成长中的每一个重要节点。',avatarId:'',skills:['HarmonyOS','前端开发','AI 探索'],email:'',github:'',socials:[],experiences:[]},
  site:{name:'SpaceYew',tagline:'开发、记录与分享',description:'余江昊的项目、经历与资源分享。',shareImageId:'',resumeId:''},
  taxonomy:{categories:['开发资源','素材合集','实用网站','技术笔记'],tags:['HarmonyOS','前端','设计','工具','学习']},
  secret:randomBytes(32).toString('hex'),
  community:{paused:false}
 };
 for(const[key,value]of Object.entries(defaults))d.prepare('INSERT OR IGNORE INTO config VALUES(?,?)').run(key,JSON.stringify(value));
 return d;
}
export function getConfig(key){return JSON.parse(db().prepare('SELECT value FROM config WHERE key=?').get(key).value)}
export function setConfig(key,value){db().prepare('UPDATE config SET value=? WHERE key=?').run(JSON.stringify(value),key)}
const transactionDepth=new WeakMap();
export function transaction(fn){const d=db(),depth=transactionDepth.get(d)||0,savepoint='site_nested_'+depth;d.exec(depth?'SAVEPOINT '+savepoint:'BEGIN IMMEDIATE');transactionDepth.set(d,depth+1);try{const result=fn(d);d.exec(depth?'RELEASE SAVEPOINT '+savepoint:'COMMIT');return result}catch(error){d.exec(depth?'ROLLBACK TO SAVEPOINT '+savepoint:'ROLLBACK');if(depth)d.exec('RELEASE SAVEPOINT '+savepoint);throw error}finally{transactionDepth.set(d,depth)}}
export function limited(key,max,ms,activeDb){const time=Date.now(),count=d=>{const row=d.prepare('SELECT * FROM limits WHERE key=?').get(key);if(row&&row.reset>time){if(row.count>=max)return true;d.prepare('UPDATE limits SET count=count+1 WHERE key=?').run(key)}else d.prepare('INSERT OR REPLACE INTO limits VALUES(?,1,?)').run(key,time+ms);return false};return activeDb?count(activeDb):transaction(count)}
export function contentHeld(id){return !!db().prepare('SELECT 1 FROM content_case_targets t JOIN community_cases c ON c.id=t.case_id WHERE t.content=? AND c.frozen=1 LIMIT 1').get(id)}
export function recordAudit(actor,action,target,details={}){db().prepare('INSERT INTO community_audit VALUES(?,?,?,?,?,?)').run(randomBytes(16).toString('hex'),typeof actor==='string'?actor:actor.id,action,target,JSON.stringify(details),now())}
export function publicContent(type){return db().prepare("SELECT * FROM content WHERE type=? AND status='published' AND deleted IS NULL AND NOT EXISTS(SELECT 1 FROM content_case_targets t JOIN community_cases c ON c.id=t.case_id WHERE t.content=content.id AND c.frozen=1) ORDER BY public_updated DESC,rowid DESC").all(type).map(row=>({...JSON.parse(row.published),id:row.id,slug:row.slug,type:row.type,updated:row.public_updated||row.published_at,publishedAt:row.published_at}))}
export function publicBySlug(type,slug){const row=db().prepare("SELECT * FROM content WHERE type=? AND slug=? AND status='published' AND deleted IS NULL AND NOT EXISTS(SELECT 1 FROM content_case_targets t JOIN community_cases c ON c.id=t.case_id WHERE t.content=content.id AND c.frozen=1)").get(type,slug);return row?{...JSON.parse(row.published),id:row.id,slug:row.slug,type:row.type,updated:row.public_updated||row.published_at,publishedAt:row.published_at}:null}
export function adminRow(row){return {...row,published:row.published?JSON.parse(row.published):null,draft:row.draft?JSON.parse(row.draft):null}}
export function fileInfo(id){return db().prepare('SELECT * FROM files WHERE id=?').get(id)||null}
export function isFilePublic(id){return !!db().prepare("SELECT 1 FROM refs WHERE file=? AND visibility='public' AND owner NOT LIKE 'ergathia:%' AND NOT EXISTS(SELECT 1 FROM content_case_targets t JOIN community_cases c ON c.id=t.case_id WHERE t.content=refs.owner AND c.frozen=1) LIMIT 1").get(id)}
export function fileRefs(document){const result=new Set();for(const key of ['coverId','attachmentId','avatarId','shareImageId','resumeId'])if(document[key])result.add(document[key]);for(const version of [document,...['en','zh','ja'].map(locale=>document.translations?.[locale])])for(const m of String(version?.bodyHtml||'').matchAll(/\/media\/([a-f0-9-]{36})/g))result.add(m[1]);return [...result]}
export function syncRefs(owner,document,visibility){const d=db();d.prepare('DELETE FROM refs WHERE owner=? AND visibility=?').run(owner,visibility);for(const id of fileRefs(document)){if(!fileInfo(id))throw new Error('引用的文件不存在或尚未上传完成');d.prepare('INSERT INTO refs VALUES(?,?,?)').run(owner,id,visibility)}}
