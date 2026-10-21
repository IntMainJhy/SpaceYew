export function catalogSchema(d){
 d.exec(`CREATE TABLE IF NOT EXISTS catalog_entries(
 id TEXT PRIMARY KEY,author TEXT NOT NULL REFERENCES community_users(id),kind TEXT NOT NULL CHECK(kind IN ('docs','skills','resources')),
 draft TEXT,published TEXT,pending TEXT,status TEXT NOT NULL DEFAULT 'draft',visibility TEXT NOT NULL DEFAULT 'private',
 version INTEGER NOT NULL DEFAULT 1,moderation TEXT NOT NULL DEFAULT '{}',community_post TEXT UNIQUE REFERENCES community_posts(id),created TEXT NOT NULL,updated TEXT NOT NULL,public_updated TEXT);
 CREATE INDEX IF NOT EXISTS catalog_author ON catalog_entries(author,updated);
 CREATE INDEX IF NOT EXISTS catalog_public ON catalog_entries(kind,visibility,updated);
 CREATE TABLE IF NOT EXISTS catalog_revisions(id TEXT PRIMARY KEY,entry TEXT NOT NULL REFERENCES catalog_entries(id),data TEXT NOT NULL,status TEXT NOT NULL,reason TEXT NOT NULL,reviewer TEXT,created TEXT NOT NULL,decided TEXT);
 CREATE INDEX IF NOT EXISTS catalog_revision_entry ON catalog_revisions(entry,created);
 CREATE UNIQUE INDEX IF NOT EXISTS catalog_one_pending ON catalog_revisions(entry) WHERE status='pending';`);
 if(!d.prepare('PRAGMA table_info(catalog_entries)').all().some(column=>column.name==='public_updated'))d.exec('ALTER TABLE catalog_entries ADD COLUMN public_updated TEXT');
}
