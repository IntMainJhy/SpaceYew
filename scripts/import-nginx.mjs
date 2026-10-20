import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {db,now} from '../src/lib/db.mjs';
export async function importLog(filename){const d=db();let count=0;for await(const line of createInterface({input:createReadStream(filename),crlfDelay:Infinity})){if(!line.trim())continue;let x;try{x=JSON.parse(line)}catch{continue}if(!/^[\da-zA-Z-]{16,120}$/.test(x.id||'')||!/^\/(?:download|media)\/[a-f0-9-]{36}$/.test(x.path||'')||!Number.isSafeInteger(x.bytes)||x.bytes<0||!Number.isFinite(Date.parse(x.at)))continue;const result=d.prepare('INSERT OR IGNORE INTO traffic VALUES(?,?,?,?,?)').run('nginx:'+x.id,x.path.split('/').at(-1),x.bytes,'nginx',new Date(x.at).toISOString());count+=Number(result.changes)}d.prepare('INSERT OR REPLACE INTO config VALUES(?,?)').run('nginx_import',JSON.stringify({updated:now(),source:'nginx'}));console.log(`导入 ${count} 条新的 Nginx 文件流量记录。`);return count}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(!process.argv[2])throw new Error('用法：node scripts/import-nginx.mjs /var/log/nginx/personal-files.json');await importLog(process.argv[2])}
