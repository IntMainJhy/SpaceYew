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

// Pack real measured card heights. Explicitly saved positions are respected on first open.
export function arrangeCanvasCards(nodes,saved={}){
 let rowY=0;return nodes.map((node,index)=>{const position=saved[node.id]||{x:(index%2)*648,y:rowY};if(index%2===1||index===nodes.length-1){const previous=nodes[index-1],left=previous?(saved[previous.id]?.y??rowY)+(previous.measured?.height||280):rowY;rowY=Math.max(left,position.y+(node.measured?.height||280))+40}return {...node,position}});
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
