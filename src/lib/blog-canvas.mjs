import {localizeProfile} from './content-locales.mjs';
export function moveCanvasSection(items,from,to){
 if(from<0||to<0||from>=items.length||to>=items.length||from===to)return items;
 const next=[...items];next.splice(to,0,next.splice(from,1)[0]);return next;
}
export function canvasResume(profile){
 return profile.resume||{version:1,updated:'',resumeId:'',metrics:[],certificates:[],gallery:[],sections:[]};
}
export function canvasText(item,key,language=''){return language?item.translations?.[language]?.[key]??item[key]??'':item[key]??''}
export function editCanvasText(item,key,value,language=''){return language?{...item,translations:{...item.translations,[language]:{...item.translations?.[language],[key]:value}}}:{...item,[key]:value}}

export function previewCanvasProfile(profile,language){
 const result={...localizeProfile(profile,language),translations:{}};
 const translated=(value,fields)=>{const next={...value,translations:{}};for(const key of fields){const text=value.translations?.[language]?.[key];if(typeof text==='string'&&text.trim())next[key]=text}return next};
 if(profile.resume){const r=profile.resume;result.resume={...r,metrics:r.metrics.map(x=>translated(x,['label','value','note'])),sections:r.sections.map(x=>({...translated(x,['title']),items:x.items.map(item=>translated(item,['title','subtitle','period','description','caption']))})),certificates:r.certificates.map(x=>translated(x,['caption'])),gallery:r.gallery.map(x=>translated(x,['caption']))}}
 return result;
}
