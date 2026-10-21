export function spacesSchema(d){d.exec(`
 CREATE TABLE IF NOT EXISTS spaces(id TEXT PRIMARY KEY,owner TEXT NOT NULL UNIQUE,handle TEXT NOT NULL UNIQUE COLLATE NOCASE,profile TEXT NOT NULL,layout TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,public_release TEXT,visibility TEXT NOT NULL DEFAULT 'private',legacy INTEGER NOT NULL DEFAULT 0,discoverable INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS space_handles(handle TEXT PRIMARY KEY COLLATE NOCASE,space TEXT NOT NULL REFERENCES spaces(id));
 CREATE TABLE IF NOT EXISTS space_content(id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id),type TEXT NOT NULL,slug TEXT NOT NULL,draft TEXT NOT NULL,published TEXT,visibility TEXT NOT NULL DEFAULT 'private',revision INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL,UNIQUE(space,type,slug));
 CREATE TABLE IF NOT EXISTS space_reviews(id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id),kind TEXT NOT NULL,target TEXT,version INTEGER NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reason TEXT NOT NULL DEFAULT '',reviewer TEXT,created TEXT NOT NULL,decided TEXT);
 CREATE UNIQUE INDEX IF NOT EXISTS space_pending_review ON space_reviews(space,kind,COALESCE(target,'')) WHERE status='pending';
 CREATE INDEX IF NOT EXISTS space_review_queue ON space_reviews(status,created);
 CREATE TABLE IF NOT EXISTS space_assets(space TEXT NOT NULL REFERENCES spaces(id),file TEXT NOT NULL REFERENCES files(id),created TEXT NOT NULL,PRIMARY KEY(space,file));
 CREATE TABLE IF NOT EXISTS space_events(id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id),path TEXT NOT NULL,visitor TEXT NOT NULL,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS space_event_range ON space_events(space,created);
 CREATE TABLE IF NOT EXISTS connect_keys(id TEXT PRIMARY KEY,actor TEXT NOT NULL,name TEXT NOT NULL,hash TEXT NOT NULL UNIQUE,scopes TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,last_used TEXT,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS connect_requests(key_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,response TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(key_id,request_id));
 CREATE TABLE IF NOT EXISTS space_versions(id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id),revision INTEGER NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS space_case_targets(case_id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id),content TEXT);
 CREATE TABLE IF NOT EXISTS blog_bundles(id TEXT PRIMARY KEY,space TEXT NOT NULL REFERENCES spaces(id),file TEXT NOT NULL REFERENCES files(id),manifest TEXT NOT NULL,size INTEGER NOT NULL,entry TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS blog_previews(token TEXT PRIMARY KEY,bundle TEXT NOT NULL REFERENCES blog_bundles(id) ON DELETE CASCADE,session TEXT NOT NULL,actor TEXT NOT NULL,expires INTEGER NOT NULL);
 `);if(!d.prepare('PRAGMA table_info(uploads)').all().some(x=>x.name==='space_id'))d.exec('ALTER TABLE uploads ADD COLUMN space_id TEXT');}
