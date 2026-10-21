import {db,now,contentHeld,syncRefs,recordAudit} from './db.mjs';
import {currentUser} from './auth.mjs';
import {requireValue} from './content.mjs';
import {publicSpaceDocument} from './spaces.mjs';

const types=['projects','articles','resources'];
function bind(row,content,actor){
 requireValue(!row.post&&!db().prepare('SELECT 1 FROM space_case_targets WHERE case_id=?').get(row.id),'工单已关联其他内容',409);
 requireValue(!db().prepare('SELECT 1 FROM content_case_targets WHERE case_id=?').get(row.id),'工单已关联内容',409);
 if(row.kind==='appeal')requireValue(row.reporter==='owner','仅可对自己的内容或账号提出申诉',403);
 requireValue(content.published,'内容尚无公开版本，不能关联投诉处置',409);
 const snapshot=content.published;
 db().prepare('INSERT INTO content_case_targets VALUES(?,?,?,?,?)').run(row.id,content.id,content.revision,snapshot,now());
 db().prepare("UPDATE community_cases SET author='owner' WHERE id=?").run(row.id);
 syncRefs('site-case:'+row.id,JSON.parse(snapshot),'private');
 recordAudit(actor||'guest','site_case_link',content.id,{caseId:row.id,revision:content.revision});
}
export function attachContentCase(req,caseId,target){
 let url;try{url=new URL(target,process.env.PUBLIC_URL||req.url)}catch{return false}
 if(url.origin!==new URL(process.env.PUBLIC_URL||req.url).origin)return false;
 const path=url.pathname.split('/').filter(Boolean).map(part=>{try{return decodeURIComponent(part)}catch{return part}});
 let type,slug,board;
 if(path.length===2&&types.includes(path[0]))[type,slug]=path;
 else if(path.length===4&&['u','blog'].includes(path[0])&&types.includes(path[2])){board=db().prepare('SELECT s.* FROM spaces s JOIN space_handles h ON h.space=s.id WHERE h.handle=? COLLATE NOCASE').get(path[1]);if(!board?.legacy)return false;[type,slug]=path.slice(2)}else return false;
 const user=currentUser(req),content=db().prepare('SELECT * FROM content WHERE type=? AND slug=? AND deleted IS NULL').get(type,slug);
 if(!content)return false;
 if(board){
  try{const visible=publicSpaceDocument(req,path[1],type,slug);if(visible.id!==content.id)return false}catch{requireValue(user?.role==='owner','目标主页或内容暂不可用',404)}
 }
 const accessible=content.status==='published'&&!contentHeld(content.id);
 requireValue(accessible||user?.role==='owner','目标内容暂不可用',404);
 const row=db().prepare('SELECT * FROM community_cases WHERE id=?').get(caseId);
 bind(row,content,user);return true;
}
export function linkContentCase(user,row,input){
 requireValue(user.role==='owner','仅站长可关联站点内容',403);
 requireValue(typeof input.contentId==='string','请选择需要关联的内容');
 const content=db().prepare('SELECT * FROM content WHERE id=? AND deleted IS NULL').get(input.contentId);
 requireValue(content,'内容不存在',404);
 requireValue(Number(input.targetRevision)===content.revision,'内容已变化，请刷新后重新关联',409);
 bind(row,content,user);return true;
}
export function contentCaseInfo(id){
 const target=db().prepare('SELECT t.*,c.type,c.slug,c.status,c.deleted,c.revision current_revision FROM content_case_targets t JOIN content c ON c.id=t.content WHERE t.case_id=?').get(id);
 if(!target)return null;
 const snapshot=JSON.parse(target.snapshot);
 return{kind:'site',id:target.content,type:target.type,title:snapshot.title,url:'/'+target.type+'/'+encodeURIComponent(target.slug),editUrl:'/admin/'+target.type+'/edit/'+target.content,status:target.deleted?'deleted':target.status,revision:target.current_revision,snapshotRevision:target.revision,linkedAt:target.created,held:contentHeld(target.content),snapshot};
}
export function contentCaseAction(user,row,action,input){
 const target=db().prepare('SELECT * FROM content_case_targets WHERE case_id=?').get(row.id);if(!target)return false;
 const d=db(),content=d.prepare('SELECT * FROM content WHERE id=?').get(target.content);requireValue(content,'关联内容不存在',404);
 if(action==='release'){requireValue(user.role==='owner','仅站长可解除限制',403);d.prepare('UPDATE community_cases SET frozen=0 WHERE id=?').run(row.id);return true}
 requireValue(Number(input.targetRevision)===content.revision,'关联内容已更新，请刷新工单后重试',409);
 if(action==='freeze'||action==='offline'){
  d.prepare('UPDATE community_cases SET frozen=1 WHERE id=?').run(row.id);
  d.prepare("UPDATE content SET status='offline',revision=revision+1,updated=? WHERE id=?").run(now(),content.id);
  d.prepare("DELETE FROM refs WHERE owner=? AND visibility='public'").run(content.id);
 }else if(action==='restore'){
  requireValue(user.role==='owner'&&input.checked===true,'仅站长核查后可恢复已公开版本',403);
  requireValue(!contentHeld(content.id),'仍有关联工单限制，请先解除全部冻结',409);
  requireValue(!content.deleted&&content.published,'请先恢复回收站内容；尚无可恢复的公开版本',409);
  requireValue(content.published===target.snapshot,'公开版本与涉事快照不同，请在内容管理中核对',409);
  syncRefs(content.id,JSON.parse(content.published),'public');
  d.prepare("UPDATE content SET status='published',revision=revision+1,updated=?,public_updated=? WHERE id=?").run(now(),now(),content.id);
 }else return false;
 recordAudit(user,'site_content_'+(action==='restore'?'case_restore':'case_offline'),content.id,{caseId:row.id,from:content.status,to:action==='restore'?'published':'offline',revision:content.revision+1});
 return true;
}
