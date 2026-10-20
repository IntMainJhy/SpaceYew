import {admin,localRequest} from './auth.mjs';
import {db,now,getConfig} from './db.mjs';
import {emailStatus} from './email-auth.mjs';

export function adminOverview(req){
 admin(req);
 const d=db(),count=sql=>d.prepare(sql).get().n,downloads=getConfig('site').desktopDownloads;
 return {
  services:{
   environment:process.env.SITE_DEMO==='true'&&localRequest(req)?'demo':'standard',
   community:localRequest(req)?getConfig('community').paused?'paused':'local':'closed',
   mail:emailStatus(req).mode,
   downloads:{macos:!!downloads?.macos?.url,windows:!!downloads?.windows?.url}
  },
  totals:{
   content:count('SELECT COUNT(*) n FROM content WHERE deleted IS NULL'),
   members:count("SELECT COUNT(*) n FROM community_users WHERE status<>'closed' AND role<>'owner'"),
   spaces:count('SELECT COUNT(*) n FROM spaces'),
   bytes:count('SELECT COALESCE(SUM(size),0) n FROM files')
  },
  pending:{
   posts:count("SELECT COUNT(*) n FROM community_revisions WHERE status IN ('pending','reviewing')"),
   comments:count("SELECT COUNT(*) n FROM community_comments WHERE status='pending'"),
   spaces:count("SELECT COUNT(*) n FROM space_reviews WHERE status='pending'"),
   reports:count("SELECT COUNT(*) n FROM community_cases WHERE status<>'resolved'")
  },
  recent:d.prepare("SELECT id,type,status,updated,COALESCE(json_extract(COALESCE(draft,published),'$.title'),'') title FROM content WHERE deleted IS NULL AND type IN ('projects','articles','resources') ORDER BY updated DESC,id DESC LIMIT 5").all(),
  updated:now()
 };
}
