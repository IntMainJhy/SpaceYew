// Browser storage can contain truncated or older copies; validate before rendering them.
export function validContentDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!['title','summary','bodyHtml'].every(key=>typeof value[key]==='string')||!Array.isArray(value.tags)||!value.tags.every(tag=>typeof tag==='string'))return false;
 if(value.translations!=null){
  if(typeof value.translations!=='object'||Array.isArray(value.translations))return false;
  for(const [locale,translation] of Object.entries(value.translations))if(!['en','zh','ja'].includes(locale)||!translation||typeof translation!=='object'||Array.isArray(translation)||Object.values(translation).some(text=>typeof text!=='string'))return false;
 }
 return true;
}
// Local recovery never selects another record or replaces the current server revision.
export function restoreContentDraft(raw,current){
 try{
  const value=JSON.parse(raw);
  if(!validContentDraft(value)||!['projects','articles','resources'].includes(value.type)||String(value.id||'')!==String(current.id||''))return null;
  return {...current,...value,id:current.id,revision:current.revision,published:current.published,visibility:current.visibility,pending:current.pending,...(current.id?{type:current.type,slug:current.slug}:{})};
 }catch{return null;}
}
