import {inflateRawSync,crc32} from 'node:zlib';
import path from 'node:path';
import {requireValue,HttpError} from './content.mjs';
export const BLOG_LIMIT=50*1024*1024;
export const staticMime={'.html':'text/html; charset=utf-8','.htm':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.pdf':'application/pdf'};
export function blogPath(value){
 requireValue(typeof value==='string'&&value.length>0&&value.length<=240&&!/[\\\x00-\x1f\x7f%?#:<>"|*]/.test(value),'静态文件路径无效');
 const name=value.normalize('NFC');requireValue(!name.startsWith('/')&&name.split('/').every(part=>part&&!part.startsWith('.')&&part===part.trim())&&path.posix.normalize(name)===name,'静态文件路径无效');
 requireValue(Object.hasOwn(staticMime,path.posix.extname(name).toLowerCase()),'网站包包含不支持的文件格式');return name;
}
const utf8=bytes=>{try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch{throw new HttpError(400,'网页与文件名请使用 UTF-8 编码')}};
export function unpackBlog(bytes,name){
 requireValue(bytes.length>0&&bytes.length<=25*1024*1024,'网站包请控制在25MB以内');
 if(/\.html?$/i.test(name)){
  requireValue(bytes.length<=5*1024*1024,'单个 HTML 请控制在5MB以内');const html=utf8(bytes);requireValue(/<\s*(?:!doctype\s+html|html|head|body|main|div|section|h1)\b/i.test(html),'请选择有效的 HTML 网页');
  return new Map([['index.html',Buffer.from(html)]]);
 }
 requireValue(/\.zip$/i.test(name),'请上传 HTML 或 ZIP 静态网站包');
 const invalid=()=>{throw new HttpError(400,'ZIP 网站包损坏或使用了不支持的压缩格式')};
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50&&i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break}
 if(end<0||bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6))invalid();
 const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);
 requireValue(count>0&&count<=1000,'网站包最多包含1000个文件');if(bytes.readUInt16LE(end+8)!==count||offset+size!==end)invalid();
 let cursor=offset,total=0;const files=new Map(),names=new Set(),ranges=[];
 for(let i=0;i<count;i++){
  if(cursor+46>end||bytes.readUInt32LE(cursor)!==0x02014b50)invalid();
  const flags=bytes.readUInt16LE(cursor+8),method=bytes.readUInt16LE(cursor+10),checksum=bytes.readUInt32LE(cursor+16),packed=bytes.readUInt32LE(cursor+20),unpacked=bytes.readUInt32LE(cursor+24),n=bytes.readUInt16LE(cursor+28),extra=bytes.readUInt16LE(cursor+30),comment=bytes.readUInt16LE(cursor+32),external=bytes.readUInt32LE(cursor+38),local=bytes.readUInt32LE(cursor+42);
  if(cursor+46+n+extra+comment>end||flags&~0x080e||flags&1||![0,8].includes(method)||bytes.readUInt16LE(cursor+34))invalid();
  const raw=utf8(bytes.subarray(cursor+46,cursor+46+n));cursor+=46+n+extra+comment;
  // Ignore OS metadata, never hidden application files or symlinks.
  if(raw.startsWith('__MACOSX/')||raw.split('/').some(part=>part==='.DS_Store'))continue;
  const mode=(external>>>16)&0xf000;requireValue(!mode||mode===0x8000||mode===0x4000,'网站包不能包含符号链接或特殊文件');
  const directory=raw.endsWith('/');if(directory){blogPath(raw.slice(0,-1)+'/placeholder.txt');continue}
  const file=blogPath(raw),key=file.toLowerCase();requireValue(!names.has(key),'网站包包含重复文件路径');names.add(key);
  total+=unpacked;requireValue(total<=BLOG_LIMIT&&unpacked<=10*1024*1024,'网站包解压后最多50MB，单个文件最多10MB');
  if(local+30>offset||bytes.readUInt32LE(local)!==0x04034b50||bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method)invalid();
  const localName=bytes.readUInt16LE(local+26),localExtra=bytes.readUInt16LE(local+28),start=local+30+localName+localExtra;
  if(start+packed>offset||utf8(bytes.subarray(local+30,local+30+localName))!==raw||ranges.some(([a,b])=>local<b&&start+packed>a))invalid();ranges.push([local,start+packed]);
  let data;try{data=method===0?Buffer.from(bytes.subarray(start,start+packed)):inflateRawSync(bytes.subarray(start,start+packed),{maxOutputLength:Math.min(BLOG_LIMIT-total+unpacked,unpacked+1)})}catch{invalid()}
  if(data.length!==unpacked||crc32(data)!==checksum)invalid();
  if(/\.html?$/i.test(file))utf8(data);
  files.set(file,data);
 }
 if(cursor!==end)invalid();
 if(!files.has('index.html')&&!files.has('index.htm')){
  const roots=[...files.keys()].filter(file=>/^[^/]+\/index\.html?$/.test(file));
  if(roots.length===1){const prefix=roots[0].slice(0,roots[0].indexOf('/')+1);if([...files.keys()].every(file=>file.startsWith(prefix)))return new Map([...files].map(([file,data])=>[file.slice(prefix.length),data]));}
 }
 requireValue(files.has('index.html')||files.has('index.htm'),'ZIP 根目录需要包含 index.html');return files;
}
