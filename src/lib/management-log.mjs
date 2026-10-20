import {admin} from './auth.mjs';
import {db} from './db.mjs';
import {cleanText,requireValue} from './content.mjs';

export function managementLog(req,params){
 admin(req);
 const scope=params.get('scope')||'all',action=cleanText(params.get('action'),80),actor=cleanText(params.get('actor'),80),q=cleanText(params.get('q'),100),where=[],args=[];
 requireValue(['all','site','space','community'].includes(scope),'日志范围无效');
 if(scope==='site')where.push("a.action GLOB 'site_*'");
 if(scope==='space')where.push("a.action GLOB 'space_*'");
 if(scope==='community')where.push("a.action NOT GLOB 'site_*' AND a.action NOT GLOB 'space_*'");
 for(const [key,field]of [[action,'a.action'],[actor,'a.actor']])if(key){where.push(field+'=?');args.push(key)}
 if(q){where.push("(a.target LIKE ? ESCAPE '\\' OR a.action LIKE ? ESCAPE '\\')");const value='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(value,value)}
 for(const [key,operator,offset]of [['start','>=',0],['end','<',86400000]]){const value=params.get(key);if(value){const time=new Date(value+'T00:00:00+08:00');requireValue(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(+time)&&new Date(+time+28800000).toISOString().slice(0,10)===value,'日志日期无效');where.push('a.created'+operator+'?');args.push(new Date(+time+offset).toISOString())}}
 if(params.get('start')&&params.get('end'))requireValue(params.get('start')<=params.get('end'),'开始日期不能晚于结束日期');
 const d=db(),filter=where.length?'WHERE '+where.join(' AND '):'',total=d.prepare('SELECT COUNT(*) n FROM community_audit a '+filter).get(...args).n,pages=Math.max(1,Math.ceil(total/50)),page=Math.max(1,Math.min(pages,Math.floor(Number(params.get('page')))||1));
 const name=id=>id==='owner'?'站长':id==='guest'?'访客':d.prepare('SELECT nickname FROM community_users WHERE id=?').get(id)?.nickname||'历史账号';
 return{items:d.prepare('SELECT a.* FROM community_audit a '+filter+' ORDER BY a.created DESC,a.rowid DESC LIMIT 50 OFFSET ?').all(...args,(page-1)*50).map(row=>({...row,actorName:name(row.actor),details:JSON.parse(row.details)})),total,pages,page,actions:d.prepare('SELECT DISTINCT action FROM community_audit ORDER BY action LIMIT 200').all().map(row=>row.action),actors:d.prepare('SELECT DISTINCT actor FROM community_audit ORDER BY actor LIMIT 500').all().map(row=>({id:row.actor,name:name(row.actor)}))};
}

// Values are deliberately omitted: settings can contain contact information and signed URLs.
export function changedFields(before,after){return [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(key=>JSON.stringify(before?.[key])!==JSON.stringify(after?.[key]))}
