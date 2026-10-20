import messages from './locales/messages.json' with {type:'json'};
export const locales=['en','zh','ja'];
export const normalizeLocale=value=>locales.includes(value)?value:'en';
export const htmlLocale=value=>({en:'en',zh:'zh-CN',ja:'ja'}[normalizeLocale(value)]);
const key=text=>text.replace(/\s+/g,' ').trim();
const interpolate=(text,values)=>text.replace(/\{(\d+)\}/g,(whole,n)=>values[n]===undefined?whole:String(values[n]));
// Stored system notifications retain their original payload; only the surrounding UI is localized.
const patterns=Object.entries(messages).filter(([source])=>/\{\d+\}/.test(source)).map(([source,value])=>({expression:new RegExp('^'+source.split(/(\{\d+\})/).map(part=>/^\{\d+\}$/.test(part)?'([\\s\\S]+?)':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$'),value}));
export function translate(locale,text,values=[]){
 if(typeof text!=='string')return text;
 const language=normalizeLocale(locale);if(language==='zh')return interpolate(text,values);
 const source=key(text),entry=messages[source];let translated=entry?.[language==='ja'?1:0];
 if(!translated){for(const pattern of patterns){const match=source.match(pattern.expression);if(match){translated=pattern.value[language==='ja'?1:0];values=match.slice(1).map(value=>messages[value]?.[language==='ja'?1:0]||value);break;}}}
 if(!translated)return interpolate(text,values);
 return text.match(/^\s*/)[0]+interpolate(translated,values)+text.match(/\s*$/)[0];
}
export function localeDate(value,locale='en',dateOnly=false){
 if(!value)return '—';const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
 return new Intl.DateTimeFormat(htmlLocale(locale),{timeZone:'Asia/Shanghai',year:'numeric',month:'short',day:'numeric',...(!dateOnly?{hour:'2-digit',minute:'2-digit',hour12:false}:{})}).format(date);
}
