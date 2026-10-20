import {fileURLToPath} from 'node:url';
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,copyFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {DATA} from '../src/lib/db.mjs';
export async function backupSite(source,destination){const target=path.resolve(destination);try{await access(target);throw new Error('备份目标已存在，请使用新的目录')}catch(e){if(e.code!=='ENOENT')throw e}await mkdir(path.join(target,'files'),{recursive:true,mode:0o700});const live=new DatabaseSync(path.join(source,'site.sqlite'),{readOnly:true});try{await backup(live,path.join(target,'site.sqlite'))}finally{live.close()}const snapshot=new DatabaseSync(path.join(target,'site.sqlite'),{readOnly:true});let files;try{files=snapshot.prepare('SELECT * FROM files').all()}finally{snapshot.close()}for(const file of files)await copyFile(path.join(source,'files',file.id),path.join(target,'files',file.id));await writeFile(path.join(target,'manifest.json'),JSON.stringify({version:1,created:new Date().toISOString(),files},null,2),{mode:0o600});console.log('备份完成：'+target);return target}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(!process.argv[2])throw new Error('用法：npm run backup -- /独立备份目录/日期（操作前停止应用以确保文件一致）');await backupSite(DATA,process.argv[2])}
