import sanitize from 'sanitize-html';
import {requireValue,cleanText} from './content.mjs';
export const IMPORT_MAX_BYTES=500000;
export const IMPORT_HTML_MAX=1000000;
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function linkUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return''}}
export function sanitizeImportedHtml(value){return sanitize(value,{
 allowedTags:['p','br','strong','em','s','u','h1','h2','h3','h4','h5','h6','blockquote','ul','ol','li','pre','code','a','hr'],
 allowedAttributes:{a:['href','target','rel'],code:['class']},allowedSchemes:['https'],allowProtocolRelative:false,
 nonTextTags:['head','script','style','textarea','option','iframe','object','embed','svg','math','form','button','select','video','audio','canvas','template'],
 transformTags:{h1:'h2',h5:'h3',h6:'h3',a:(_,attrs)=>({tagName:'a',attribs:{...(linkUrl(attrs.href)?{href:linkUrl(attrs.href)}:{}),target:'_blank',rel:'noopener noreferrer'}}),code:(_,attrs)=>({tagName:'code',attribs:/^language-[a-z0-9_-]{1,30}$/i.test(attrs.class||'')?{class:attrs.class}:{}})}
})}
function emphasis(value){return escape(value).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_\n]+)__/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>').replace(/~~([^~\n]+)~~/g,'<s>$1</s>')}
function inlinePlain(value){
 // Parse links before adding markup, so formatting can never rewrite an href.
 let result='',last=0;for(const match of value.matchAll(/(!?)\[([^\]\n]*)\]\(([^\s)]+)\)/g)){
  result+=emphasis(value.slice(last,match.index));const label=emphasis(match[2]),href=match[1]?'':linkUrl(match[3]);result+=href?'<a href="'+escape(href)+'">'+label+'</a>':label;last=match.index+match[0].length;
 }return result+emphasis(value.slice(last));
}
function inline(value){let result='',last=0;for(const match of value.matchAll(/`([^`\n]+)`/g)){result+=inlinePlain(value.slice(last,match.index))+'<code>'+escape(match[1])+'</code>';last=match.index+match[0].length}return result+inlinePlain(value.slice(last))}
export function markdownToHtml(text){
 const lines=text.replaceAll('\r\n','\n').replaceAll('\r','\n').split('\n'),output=[];let paragraph=[],list=null,quote=[];
 const flushParagraph=()=>{if(paragraph.length){output.push('<p>'+inline(paragraph.join(' '))+'</p>');paragraph=[]}};
 const flushList=()=>{if(list){output.push('<'+list.kind+'>'+list.items.map(item=>'<li>'+inline(item)+'</li>').join('')+'</'+list.kind+'>');list=null}};
 const flushQuote=()=>{if(quote.length){output.push('<blockquote><p>'+inline(quote.join(' '))+'</p></blockquote>');quote=[]}};
 const flush=()=>{flushParagraph();flushList();flushQuote()};
 for(let i=0;i<lines.length;i++){
  const line=lines[i],fence=/^ {0,3}(`{3,}|~{3,})([^`]*)$/.exec(line);
  if(fence){flush();const marker=fence[1][0],length=fence[1].length,language=/^[a-z0-9_-]{1,30}$/i.test(fence[2].trim())?fence[2].trim():'',code=[];for(i++;i<lines.length;i++){const close=new RegExp('^ {0,3}'+marker+'{'+length+',}\\s*$');if(close.test(lines[i]))break;code.push(lines[i])}output.push('<pre><code'+(language?' class="language-'+language+'"':'')+'>'+escape(code.join('\n'))+'</code></pre>');continue}
  if(!line.trim()){flush();continue}
  const heading=/^ {0,3}(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
  if(heading){flush();const level=heading[1].length<=2?2:3;output.push('<h'+level+'>'+inline(heading[2])+'</h'+level+'>');continue}
  if(i+1<lines.length&&/^ {0,3}(?:={3,}|-{3,})\s*$/.test(lines[i+1])){flush();output.push('<h2>'+inline(line.trim())+'</h2>');i++;continue}
  if(/^ {0,3}(?:\*\s*){3,}$|^ {0,3}(?:-\s*){3,}$|^ {0,3}(?:_\s*){3,}$/.test(line)){flush();output.push('<hr>');continue}
  const bullet=/^\s{0,3}[-+*]\s+(.+)$/.exec(line),numbered=/^\s{0,3}\d+[.)]\s+(.+)$/.exec(line);
  if(bullet||numbered){flushParagraph();flushQuote();const kind=bullet?'ul':'ol';if(list?.kind!==kind)flushList();if(!list)list={kind,items:[]};list.items.push((bullet||numbered)[1]);continue}
  const quoted=/^ {0,3}>\s?(.*)$/.exec(line);if(quoted){flushParagraph();flushList();quote.push(quoted[1]);continue}
  flushList();flushQuote();paragraph.push(line.trim());
 }
 flush();return output.join('\n');
}
export function importDocument(input){
 requireValue(input&&typeof input==='object'&&!Array.isArray(input),'文档导入格式无效');const name=cleanText(input.name,200);requireValue(/\.(md|markdown|txt|html?)$/i.test(name),'请选择 Markdown、TXT 或 HTML 文档');requireValue(typeof input.text==='string'&&Buffer.byteLength(input.text,'utf8')<=IMPORT_MAX_BYTES,'文档请控制在 500 KB 以内。');requireValue(input.text.trim(),'文档内容为空');
 const title=cleanText(name.split(/[\\/]/).pop().replace(/\.[^.]+$/,'').replace(/[\u0000-\u001f\u007f]/g,''),120);
 const source=/\.html?$/i.test(name)?input.text:/\.(md|markdown)$/i.test(name)?markdownToHtml(input.text):input.text.split(/\r?\n\s*\r?\n/).map(block=>'<p>'+escape(block).replace(/\r?\n/g,'<br>')+'</p>').join('\n');
 const bodyHtml=sanitizeImportedHtml(source);requireValue(bodyHtml.length<=IMPORT_HTML_MAX,'文档转换后的内容过长，请拆分后导入');requireValue(bodyHtml.replace(/<[^>]*>/g,'').trim(),'文档没有可导入的正文');return{title,bodyHtml};
}
