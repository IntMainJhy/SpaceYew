// One short-lived process per document: parsing never executes inside the web request event loop.
import {readFile} from 'node:fs/promises';
const [file,format]=process.argv.slice(2);
try{
 const data=await readFile(file);let text='';
 if(format==='pdf'){
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(data),isEvalSupported:false,disableFontFace:true,useSystemFonts:false,verbosity:0});
  try{const pdf=await task.promise;if(pdf.numPages>30)throw Error('简历最多30页');const pages=[];
   for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
    // PDF streams can group glyphs by font rather than reading order. Rejoin by visual line and x position.
    const items=content.items.filter(item=>typeof item.str==='string'&&item.str.trim()).map(item=>{const [x,y]=viewport.convertToViewportPoint(item.transform[4],item.transform[5]);return{x,y,width:item.width,height:item.height,text:item.str}}).sort((a,b)=>a.y-b.y||a.x-b.x),lines=[];
    for(const item of items){const last=lines.at(-1);if(last&&Math.abs(last.y-item.y)<=2)last.items.push(item);else lines.push({y:item.y,items:[item]})}
    pages.push(lines.map(line=>{let text='',end;for(const item of line.items.sort((a,b)=>a.x-b.x)){if(end!==undefined&&item.x-end>Math.max(2,item.height*.18)&&!text.endsWith(' '))text+=' ';text+=item.text;end=item.x+item.width}return text}).join('\n'));page.cleanup();
   }text=pages.join('\n\n');
  }finally{await task.destroy()}
 }else if(format==='docx'){
  // Reject expansion bombs before the Word parser opens any member.
  let end=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--)if(data.readUInt32LE(i)===0x06054b50&&i+22+data.readUInt16LE(i+20)===data.length){end=i;break}
  if(end<0)throw Error('Word 文件损坏');const count=data.readUInt16LE(end+10);if(!count||count>2000)throw Error('Word 文件内容过多');let cursor=data.readUInt32LE(end+16),total=0;
  for(let i=0;i<count;i++){if(cursor+46>end||data.readUInt32LE(cursor)!==0x02014b50)throw Error('Word 文件损坏');const size=data.readUInt32LE(cursor+24);total+=size;if(size>12*1024*1024||total>40*1024*1024)throw Error('Word 文件解压内容过大');cursor+=46+data.readUInt16LE(cursor+28)+data.readUInt16LE(cursor+30)+data.readUInt16LE(cursor+32)}
  const {default:JSZip}=await import('jszip'),{Parser}=await import('htmlparser2');
  const zip=await JSZip.loadAsync(data,{checkCRC32:true}),entry=zip.file('word/document.xml');if(!entry)throw Error('Word 文件缺少正文');
  const xml=await entry.async('string');if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('不支持含自定义实体的 Word 文件');let inside=false;
  const parser=new Parser({onopentag(name){if(name==='w:t')inside=true;if(name==='w:tab')text+='\t';if(name==='w:br')text+='\n'},ontext(value){if(inside)text+=value},onclosetag(name){if(name==='w:t')inside=false;if(name==='w:p'||name==='w:tr')text+='\n'}},{xmlMode:true,decodeEntities:true});parser.write(xml);parser.end();
 }else{text=new TextDecoder('utf-8',{fatal:true}).decode(data)}
 if(text.length>150000)throw Error('简历文字过多');process.stdout.write(JSON.stringify({text}));
}catch(error){process.stdout.write(JSON.stringify({error:error.message?.slice(0,200)||'无法读取此简历'}));process.exitCode=1}
