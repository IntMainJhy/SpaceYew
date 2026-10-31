import {localizeProfile} from './content-locales.mjs';
export function moveCanvasSection(items,from,to){
 if(from<0||to<0||from>=items.length||to>=items.length||from===to)return items;
 const next=[...items];next.splice(to,0,next.splice(from,1)[0]);return next;
}
export function canvasResume(profile){
 return profile.resume||{version:1,updated:'',resumeId:'',metrics:[],certificates:[],gallery:[],sections:[]};
}
export function duplicateCanvasSection(profile,design,nodeId,newNodeId,newSectionId){
 const node=design.nodes.find(n=>n.id===nodeId),sections=profile.resume?.sections,section=sections?.find(s=>'section:'+s.id===node?.part);
 if(!section||node.locked||sections.length>=12||design.nodes.length>=60||sections.some(s=>s.id===newSectionId)||design.nodes.some(n=>n.id===newNodeId))return null;
 return {profile:{...profile,resume:{...profile.resume,sections:[...sections,{...structuredClone(section),id:newSectionId}]}},design:{...design,nodes:[...design.nodes,{...structuredClone(node),id:newNodeId,part:'section:'+newSectionId,frame:{...node.frame,y:Math.min(40000,node.frame.y+node.frame.h)}}]}};
}
export function canvasText(item,key,language=''){return language?item.translations?.[language]?.[key]??item[key]??'':item[key]??''}
export function editCanvasText(item,key,value,language=''){return language?{...item,translations:{...item.translations,[language]:{...item.translations?.[language],[key]:value}}}:{...item,[key]:value}}

export function previewCanvasProfile(profile,language){
 const result={...localizeProfile(profile,language),translations:{}};
 const translated=(value,fields)=>{const next={...value,translations:{}};for(const key of fields){const text=value.translations?.[language]?.[key];if(typeof text==='string'&&text.trim())next[key]=text}return next};
 if(profile.resume){const r=profile.resume;result.resume={...r,metrics:r.metrics.map(x=>translated(x,['label','value','note'])),sections:r.sections.map(x=>({...translated(x,['title']),items:x.items.map(item=>translated(item,['title','subtitle','period','description','caption']))})),certificates:r.certificates.map(x=>translated(x,['caption'])),gallery:r.gallery.map(x=>translated(x,['caption']))}}
 return result;
}

export function previewCanvasLayout(layout,language){if(!layout.blog?.design)return layout;return {...layout,blog:{...layout.blog,design:{...layout.blog.design,nodes:layout.blog.design.nodes.map(n=>({...n,...Object.fromEntries(['label','text','alt'].map(key=>[key,n.translations?.[language]?.[key]?.trim()?n.translations[language][key]:n[key]])),translations:{}}))}}}}

// Preserve unfinished words and spaces during typing; the server normalizes on save.
export const canvasSkills=value=>value.split(/\s*[·\n,，]\s*/).slice(0,30);

// React Flow hides unmeasured nodes. Preserve measured sizes across controlled moves.
export function recordCanvasMeasurements(previous,changes){
 let next=previous;
 for(const change of changes){
  if(change.type!=='dimensions'||!change.dimensions)continue;
  const {width,height}=change.dimensions;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)continue;
  if(next[change.id]?.width===width&&next[change.id]?.height===height)continue;
  if(next===previous)next={...previous};
  next[change.id]={width,height};
 }
 return next;
}
