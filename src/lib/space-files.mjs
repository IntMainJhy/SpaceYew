import {db} from './db.mjs';
import {spaceActor,ensureSpace,spaceStorageBytes} from './spaces.mjs';
import {cleanText,requireValue} from './content.mjs';
import {removeFile,uploadInfo} from './uploads.mjs';

function reference(row){
 const owner=row.owner;
 if(owner.startsWith('ergathia:content:'))return{kind:'内容草稿',href:'/workspace/library?edit='+owner.slice('ergathia:content:'.length)};
 if(owner.startsWith('ergathia:board:'))return{kind:'展板草稿',href:'/workspace/studio'};
 if(owner.startsWith('site-case:'))return{kind:'投诉记录',href:''};
 if(owner.startsWith('ergathia:version:'))return{kind:'历史版本',href:'/workspace/studio'};
 if(owner.startsWith('ergathia:review:'))return{kind:'审核版本',href:'/workspace/studio'};
 return{kind:owner.startsWith('config:')?'站点设置':owner.startsWith('community-')?'社区内容':'其他引用',href:''};
}
export function spaceFileReferences(space,id){return db().prepare('SELECT owner,visibility FROM refs WHERE file=? AND owner<>? ORDER BY owner').all(id,'ergathia:asset:'+space).map(reference)}
export async function spaceFiles(req,p,input,url){
 const user=spaceActor(req),space=ensureSpace(user),d=db(),id=p[2];
 if(req.method==='DELETE'){
  requireValue(/^[a-f0-9-]{36}$/.test(id||''),'文件不存在',404);
  return removeFile(id,{space:space.id,actor:user});
 }
 requireValue(req.method==='GET'&&!id,'接口不存在',404);
 const q=cleanText(url.searchParams.get('q'),100),kind=url.searchParams.get('kind')||'all',status=url.searchParams.get('status')||'all';
 requireValue(['all','image','file'].includes(kind)&&['all','used','unused'].includes(status),'文件筛选无效');
 let items=d.prepare('SELECT f.*,a.created uploaded FROM files f JOIN space_assets a ON a.file=f.id WHERE a.space=? ORDER BY a.created DESC,f.id DESC').all(space.id).map(file=>({...file,references:spaceFileReferences(space.id,file.id)}));
 const used=spaceStorageBytes(space.id),count=items.length;
 items=items.filter(file=>(!q||file.name.toLowerCase().includes(q.toLowerCase()))&&(kind==='all'||(kind==='image')===file.mime.startsWith('image/'))&&(status==='all'||(status==='used')===(file.references.length>0)));
 const total=items.length,pages=Math.max(1,Math.ceil(total/20)),page=Math.max(1,Math.min(pages,Math.floor(Number(url.searchParams.get('page')))||1));
 const pending=d.prepare("SELECT * FROM uploads WHERE space_id=? AND status IN ('pending','assembling') ORDER BY updated DESC").all(space.id).map(uploadInfo);
 return{items:items.slice((page-1)*20,page*20),total,pages,page,used,count,quota:1000000000,fileLimit:1000,pending,reserved:pending.reduce((sum,task)=>sum+task.size,0)};
}
