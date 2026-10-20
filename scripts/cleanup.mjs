import {db,DATA,PARTIAL} from '../src/lib/db.mjs';
import {unlink,readdir} from 'node:fs/promises';
import path from 'node:path';
const d=db(),cutoff=Date.now()-(Number(process.env.UPLOAD_EXPIRE_DAYS)||7)*86400000;let cleaned=0;
for(const row of d.prepare("SELECT * FROM uploads WHERE status IN ('pending','assembling','cancelled') AND updated<?").all(cutoff)){const result=d.prepare("UPDATE uploads SET status='cancelled' WHERE id=? AND updated<?").run(row.id,cutoff);if(result.changes){await unlink(path.join(PARTIAL,row.id)).catch(e=>{if(e.code!=='ENOENT')throw e});d.prepare('DELETE FROM chunks WHERE upload=?').run(row.id);cleaned++}}
d.prepare('DELETE FROM email_challenges WHERE expires<?').run(Date.now());const outbox=path.join(DATA,'mail-outbox');for(const name of await readdir(outbox).catch(()=>[]))if(/^\d+-[a-f0-9-]+\.json$/.test(name)&&Number(name.split('-')[0])<Date.now()-600000)await unlink(path.join(outbox,name));
d.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());d.prepare('DELETE FROM limits WHERE reset<?').run(Date.now());const before=new Date(Date.now()-(Number(process.env.ANALYTICS_RETENTION_DAYS)||180)*86400000).toISOString();d.prepare('DELETE FROM events WHERE at<?').run(before);d.prepare('DELETE FROM traffic WHERE at<?').run(before);console.log(`清理 ${cleaned} 个过期上传任务，旧统计与会话已按保留期处理。`);
