import sanitize from 'sanitize-html';
import {randomUUID} from 'node:crypto';
import {db,now,transaction,adminRow,fileInfo,syncRefs,setConfig,getConfig,contentHeld} from './db.mjs';
import {defaultPromotionBar} from './promotions.mjs';
import {contentTextFields,profileTextFields} from './content-locales.mjs';
export class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
export function requireValue(condition,message,status=400){if(!condition)throw new HttpError(status,message)}
export function cleanText(value,max=200){requireValue(value==null||typeof value==='string'||typeof value==='number','文本字段格式无效');const result=String(value??'').trim();requireValue(result.length<=max,`文本长度不能超过 ${max} 字`);return result}
export function httpUrl(value){const s=cleanText(value,2000);if(!s)return '';try{const u=new URL(s);requireValue(['http:','https:'].includes(u.protocol),'链接仅支持 HTTP 或 HTTPS');return u.href}catch{throw new HttpError(400,'请填写有效的完整网址')}}
const fileId=value=>{const id=cleanText(value,50);requireValue(!id||/^[a-f0-9-]{36}$/.test(id),'附件标识无效');return id};
export function desktopDownloadsData(input){
 if(input===undefined)return getConfig('site').desktopDownloads||{macos:{url:'',version:''},windows:{url:'',version:''}};
 requireValue(input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).every(key=>['macos','windows'].includes(key)),'桌面下载设置格式无效');
 return Object.fromEntries(['macos','windows'].map(platform=>{
  const item=input[platform]??{};
  requireValue(item&&typeof item==='object'&&!Array.isArray(item),'桌面下载设置格式无效');
  const value=cleanText(item.url,2000),version=cleanText(item.version,80);
  requireValue(!value||/^https:\/\/[^\s\\]+$/i.test(value),'安装包地址仅支持完整 HTTPS 网址');
  const url=value?httpUrl(value):'';
  requireValue(!url||!new URL(url).username&&!new URL(url).password,'安装包地址不能包含账号或密码');
  return [platform,{url,version}];
 }));
}
export function promotionData(input){
 if(input===undefined)return getConfig('site').promotionBar||defaultPromotionBar;
 requireValue(input&&typeof input==='object'&&!Array.isArray(input)&&typeof input.enabled==='boolean','推广条设置格式无效');
 requireValue(Array.isArray(input.items)&&input.items.length<=5,'推广条最多设置 5 条内容');
 return {enabled:input.enabled,items:input.items.map(item=>{
  requireValue(item&&typeof item==='object'&&!Array.isArray(item),'推广内容格式无效');
  const title=cleanText(item.title,100),url=cleanText(item.url,2000);
  requireValue(title,'请填写推广文案');requireValue(['ad','recommendation'].includes(item.kind),'请选择广告或站内推荐');
  // Same-site paths exclude protocol-relative URLs and URL-parser backslash/control tricks.
  const internal=/^\/(?!\/)[^\\\s]*$/.test(url);
  requireValue(!url||internal||/^https:\/\//i.test(url),'推广链接仅支持站内路径或完整 HTTPS 网址');
  return {title,url:url?(internal?url:httpUrl(url)):'',kind:item.kind};
 })};
}
export function cleanHtml(value){requireValue(value==null||typeof value==='string','正文格式无效');requireValue(String(value||'').length<=2000000,'正文过长，请拆分后发布');return sanitize(String(value||''),{allowedTags:['p','br','strong','em','s','u','h1','h2','h3','h4','blockquote','ul','ol','li','pre','code','a','img','hr'],allowedAttributes:{a:['href','target','rel'],img:['src','alt','title'],code:['class']},allowedSchemes:['http','https','mailto'],allowProtocolRelative:false,transformTags:{a:(_,attrs)=>({tagName:'a',attribs:{...attrs,target:'_blank',rel:'noopener noreferrer'}})},exclusiveFilter:frame=>frame.tag==='img'&&!/^\/media\/[a-f0-9-]{36}$/.test(frame.attribs.src||'')})}
function translationData(input,fields,limits,extra=()=>({})){
 if(input===undefined)return {};
 requireValue(input&&typeof input==='object'&&!Array.isArray(input),'翻译内容格式无效');
 requireValue(Object.keys(input).every(locale=>['en','zh','ja'].includes(locale)),'翻译语言仅支持英文、中文和日语');
 return Object.fromEntries(Object.entries(input).map(([locale,version])=>{
  requireValue(version&&typeof version==='object'&&!Array.isArray(version),'翻译内容格式无效');
  return [locale,{...Object.fromEntries(fields.map(field=>[field,field==='bodyHtml'?cleanHtml(version[field]):cleanText(version[field],limits[field])])),...extra(version)}];
 }));
}
const documentTranslations=input=>translationData(input,contentTextFields,{title:120,summary:600,role:200,contribution:3000,outcome:3000});
function profileTranslations(input,experiences){return translationData(input,profileTextFields,{name:80,alias:80,intro:3000},version=>{
 requireValue(version.skills===undefined||Array.isArray(version.skills)&&version.skills.length<=30,'技能翻译最多 30 项');
 requireValue(version.experiences===undefined||version.experiences&&typeof version.experiences==='object'&&!Array.isArray(version.experiences)&&Object.keys(version.experiences).length<=200,'经历翻译格式无效');
 const translated={};
 for(const item of experiences){const entry=version.experiences?.[item.id];if(entry!==undefined){requireValue(entry&&typeof entry==='object'&&!Array.isArray(entry),'经历翻译格式无效');translated[item.id]={title:cleanText(entry.title,200),type:cleanText(entry.type,40),description:cleanText(entry.description,5000)};}}
 return {skills:(version.skills||[]).map(value=>cleanText(value,60)).filter(Boolean),experiences:translated};
 });}
export function contentData(input,type){requireValue(['projects','articles','resources'].includes(type),'内容类型无效');requireValue(input&&typeof input==='object'&&!Array.isArray(input),'内容格式无效');const data={translations:documentTranslations(input.translations),title:cleanText(input.title,120),summary:cleanText(input.summary,600),bodyHtml:cleanHtml(input.bodyHtml),category:cleanText(input.category,60),tags:[...new Set((Array.isArray(input.tags)?input.tags:[]).map(x=>cleanText(x,40)).filter(Boolean))].slice(0,20),coverId:fileId(input.coverId),attachmentId:fileId(input.attachmentId),pendingUploadId:fileId(input.pendingUploadId),featured:!!input.featured,career:!!input.career,order:Number.isFinite(Number(input.order))?Math.trunc(Number(input.order)):0,kind:['file','website','external'].includes(input.kind)?input.kind:'file',url:httpUrl(input.url),sourceUrl:httpUrl(input.sourceUrl),version:cleanText(input.version,80),role:cleanText(input.role,200),contribution:cleanText(input.contribution,3000),outcome:cleanText(input.outcome,3000)};requireValue(data.title,'请填写原文标题');if(data.coverId){const f=fileInfo(data.coverId);requireValue(f?.mime.startsWith('image/'),'封面需要上传可用的图片')}if(type!=='resources'||data.kind!=='file'){data.attachmentId='';data.pendingUploadId=''}return data}
export function validatePublish(data,type){requireValue(data.bodyHtml.replace(/<[^>]*>/g,'').trim()||data.bodyHtml.includes('<img'),'请填写正文或资源说明');if(type==='resources'){if(data.kind==='file'){requireValue(!data.pendingUploadId,'新附件仍在上传中，请完成后再发布');requireValue(data.attachmentId&&fileInfo(data.attachmentId),'请先完成资源文件上传')}else requireValue(data.url,'请填写外部资源地址')}}
export function listContent({type,q='',status='all',page=1,trash=false}){requireValue(['projects','articles','resources'].includes(type),'内容类型无效');const d=db(),conditions=['type=?',trash?'deleted IS NOT NULL':'deleted IS NULL'],args=[type];if(status!=='all'){requireValue(['published','draft','offline'].includes(status),'状态无效');conditions.push('status=?');args.push(status)}if(q){conditions.push("(json_extract(COALESCE(draft,published),'$.title') LIKE ? ESCAPE '\\' OR EXISTS(SELECT 1 FROM json_each(json_extract(COALESCE(draft,published),'$.translations')) version WHERE json_extract(version.value,'$.title') LIKE ? ESCAPE '\\'))");const search='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(search,search)}const where=conditions.join(' AND '),count=d.prepare(`SELECT COUNT(*) n FROM content WHERE ${where}`).get(...args).n;const current=Math.max(1,Math.min(Math.max(1,Math.ceil(count/20)),Math.floor(Number(page))||1));return{items:d.prepare(`SELECT * FROM content WHERE ${where} ORDER BY updated DESC,rowid DESC LIMIT 20 OFFSET ?`).all(...args,(current-1)*20).map(adminRow),total:count,page:current,pages:Math.max(1,Math.ceil(count/20))}}
export function writeContent(input){requireValue(input&&typeof input==='object'&&!Array.isArray(input)&&(!input.id||typeof input.id==='string'),'内容标识格式无效');return transaction(d=>{const action=input.action||'save';let row=input.id?d.prepare('SELECT * FROM content WHERE id=?').get(input.id):null;requireValue(!input.id||row,'内容不存在',404);if(row)requireValue(Number(input.revision)===row.revision,'内容已被其他页面修改，请重新载入后再编辑',409);
 if(['offline','delete','restore'].includes(action)){requireValue(row,'内容不存在',404);if(action==='offline'){d.prepare("UPDATE content SET status='offline',updated=?,revision=revision+1 WHERE id=?").run(now(),row.id);d.prepare("DELETE FROM refs WHERE owner=? AND visibility='public'").run(row.id)}else if(action==='delete'){syncRefs(row.id,JSON.parse(row.draft||row.published),'draft');d.prepare('UPDATE content SET deleted=?,revision=revision+1 WHERE id=?').run(now(),row.id);d.prepare("DELETE FROM refs WHERE owner=? AND visibility='public'").run(row.id)}else{d.prepare("UPDATE content SET deleted=NULL,status='draft',draft=COALESCE(draft,published),updated=?,revision=revision+1 WHERE id=?").run(now(),row.id);syncRefs(row.id,JSON.parse(row.draft||row.published),'draft');d.prepare("DELETE FROM refs WHERE owner=? AND visibility='public'").run(row.id)}return adminRow(d.prepare('SELECT * FROM content WHERE id=?').get(row.id))}
 requireValue(['save','publish'].includes(action),'操作无效');requireValue(!row?.deleted,'请先从回收站恢复');const type=row?.type||input.type,previous=row?JSON.parse(row.draft||row.published):null,source=input.data||(action==='publish'?previous:null),data=contentData(source?{...source,translations:source.translations===undefined?previous?.translations:source.translations}:source,type),id=row?.id||randomUUID();const slug=row?.slug||cleanText(input.slug||data.title,160).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}-]+/gu,'-').replace(/^-+|-+$/g,'')||id;requireValue(!d.prepare('SELECT id FROM content WHERE type=? AND slug=? AND id<>?').get(type,slug,id),'此内容地址已被使用，请换一个地址',409);
 if(action==='publish'){requireValue(!contentHeld(id),'内容仍有投诉限制，请先处理全部关联工单',409);validatePublish(data,type);}
 if(!row){d.prepare('INSERT INTO content(id,type,slug,status,updated) VALUES(?,?,?,?,?)').run(id,type,slug,'draft',now());row=d.prepare('SELECT * FROM content WHERE id=?').get(id)}
 syncRefs(id,data,action==='publish'?'public':'draft');
 if(action==='publish'){d.prepare("UPDATE content SET published=?,draft=NULL,status='published',updated=?,published_at=COALESCE(published_at,?),public_updated=?,revision=revision+1 WHERE id=?").run(JSON.stringify(data),now(),now(),now(),id);d.prepare("DELETE FROM refs WHERE owner=? AND visibility='draft'").run(id)}else d.prepare('UPDATE content SET draft=?,updated=?,revision=revision+1 WHERE id=?').run(JSON.stringify(data),now(),id);
 return adminRow(d.prepare('SELECT * FROM content WHERE id=?').get(id))
})}
export function saveConfiguration(key,input){requireValue(input&&typeof input==='object'&&!Array.isArray(input),'设置格式无效');for(const [field,limit] of [['skills',30],['socials',10],['experiences',200],['categories',100],['tags',200]])if(input[field]!==undefined)requireValue(Array.isArray(input[field])&&input[field].length<=limit,`${field} 必须是最多 ${limit} 项的列表`);requireValue(['profile','site','taxonomy'].includes(key),'设置类型无效');for(const field of ['socials','experiences'])if(input[field])requireValue(input[field].every(item=>item&&typeof item==='object'&&!Array.isArray(item)),'资料条目格式无效');let value;
 if(key==='profile'){value={name:cleanText(input.name,80),alias:cleanText(input.alias,80),intro:cleanText(input.intro,3000),avatarId:fileId(input.avatarId),skills:(input.skills||[]).map(x=>cleanText(x,60)).filter(Boolean).slice(0,30),email:cleanText(input.email,200),github:httpUrl(input.github),socials:(input.socials||[]).slice(0,10).map(x=>({label:cleanText(x.label,60),url:httpUrl(x.url)})),experiences:(input.experiences||[]).slice(0,200).map((x,i)=>{const start=cleanText(x.start,10),end=cleanText(x.end,10);requireValue(!end||!start||end>=start,'经历结束时间不能早于开始时间');return{id:cleanText(x.id,50)||randomUUID(),title:cleanText(x.title,200),type:cleanText(x.type,40),start,end,description:cleanText(x.description,5000),visible:x.visible!==false,order:Number.isFinite(Number(x.order))?Number(x.order):i}})};value.translations=profileTranslations(input.translations===undefined?getConfig('profile').translations:input.translations,value.experiences);requireValue(value.name,'请填写原文姓名');requireValue(!value.email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email),'邮箱格式无效')}
 else if(key==='site'){value={name:cleanText(input.name,100),tagline:cleanText(input.tagline,200),description:cleanText(input.description,1000),shareImageId:fileId(input.shareImageId),resumeId:fileId(input.resumeId),promotionBar:promotionData(input.promotionBar),desktopDownloads:desktopDownloadsData(input.desktopDownloads)};requireValue(value.name,'请填写网站名称');if(value.resumeId)requireValue(fileInfo(value.resumeId)?.mime==='application/pdf','简历必须为可用的 PDF 文件')}
 else{value={categories:[...new Set((input.categories||[]).map(x=>cleanText(x,60)).filter(Boolean))].slice(0,100),tags:[...new Set((input.tags||[]).map(x=>cleanText(x,40)).filter(Boolean))].slice(0,200)};const previous=getConfig('taxonomy');
  const documents=`SELECT draft data FROM content WHERE deleted IS NULL UNION ALL SELECT published FROM content WHERE deleted IS NULL UNION ALL SELECT draft FROM community_posts UNION ALL SELECT r.data FROM community_posts p JOIN community_revisions r ON r.id IN (p.public_revision,p.pending_revision) UNION ALL SELECT draft FROM space_content UNION ALL SELECT published FROM space_content`;
  for(const category of previous.categories.filter(x=>!value.categories.includes(x)))requireValue(!db().prepare(`SELECT 1 FROM (${documents}) WHERE json_extract(data,'$.category')=? LIMIT 1`).get(category),`分类“${category}”仍被内容使用，请先修改这些内容的分类`);
  for(const tag of previous.tags.filter(x=>!value.tags.includes(x)))requireValue(!db().prepare(`SELECT 1 FROM (${documents}) WHERE EXISTS(SELECT 1 FROM json_each(json_extract(data,'$.tags')) WHERE value=?) LIMIT 1`).get(tag),`标签“${tag}”仍被内容使用，请先处理引用`)
 }
 for(const field of ['avatarId','shareImageId'])if(value[field])requireValue(fileInfo(value[field])?.mime.startsWith('image/'),'头像和分享封面需要使用有效图片');
 return transaction(()=>{syncRefs('config:'+key,value,'public');setConfig(key,value);return value})}
