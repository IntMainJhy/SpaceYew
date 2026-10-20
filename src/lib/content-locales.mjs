// The original document stays canonical. Translations may only replace authored text.
export const contentTextFields = ['title','summary','bodyHtml','role','contribution','outcome'];
export const profileTextFields = ['name','alias','intro'];
export function hasTranslation(value,field='') {
 if(typeof value!=='string')return false;
 return field==='bodyHtml' ? /<img\b/i.test(value)||!!value.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|#160|#xA0);/gi,' ').trim() : !!value.trim();
}
function textVersion(original,translation,fields){
 const result={...original};
 for(const field of fields)if(hasTranslation(translation?.[field],field))result[field]=translation[field];
 return result;
}
export function localizeContent(document,locale){
 if(!document)return document;
 return textVersion(document,document.translations?.[locale],contentTextFields);
}
export function localizeProfile(profile,locale){
 const translation=profile.translations?.[locale],result=textVersion(profile,translation,profileTextFields);
 if(translation?.skills?.length)result.skills=translation.skills;
 result.experiences=(profile.experiences||[]).map(item=>textVersion(item,translation?.experiences?.[item.id],['title','type','description']));
 return result;
}
