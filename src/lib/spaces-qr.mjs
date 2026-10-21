import QRCode from 'qrcode';
import {limited,hash} from './db.mjs';
import {clientIp} from './auth.mjs';
import {requireValue} from './content.mjs';
import {publicSpace} from './spaces.mjs';
import {publicBlogBundle,staticPage} from './blog-hosting.mjs';
export async function blogQr(req,handle){
 requireValue(!limited('space-qr:'+hash(clientIp(req)),30,60000),'请求过于频繁，请稍后再试',429);
 const space=publicSpace(req,handle),base='/blog/'+space.handle,requested=new URL(req.url).searchParams.get('path')||base;
 const url=new URL(requested,process.env.PUBLIC_URL||'http://localhost:3008'),origin=new URL(process.env.PUBLIC_URL||'http://localhost:3008').origin;
 requireValue(url.origin===origin&&(url.pathname===base||url.pathname.startsWith(base+'/')),'分享地址无效');
 const parts=url.pathname.slice(base.length+1).split('/');
 if(url.pathname!==base)requireValue(parts.length===2&&space.content.some(x=>x.type===parts[0]&&x.slug===decodeURIComponent(parts[1])),'分享内容不存在',404);
 if(url.search){requireValue(space.layout.blog?.mode==='static'&&url.pathname===base&&[...url.searchParams.keys()].every(key=>key==='page'),'分享地址无效');staticPage(url.searchParams.get('page'),publicBlogBundle(req,handle))}
 const svg=await QRCode.toString(url.href,{type:'svg',errorCorrectionLevel:'M',margin:4,width:256});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store','Content-Disposition':'inline; filename="spaceyew-homepage.svg"','X-Content-Type-Options':'nosniff'}});
}
export async function spaceQr(req,handle){requireValue(!limited('space-qr:'+hash(clientIp(req)),30,60000),'请求过于频繁，请稍后再试',429);const space=publicSpace(req,decodeURIComponent(handle||''));const url=new URL(space.url,process.env.PUBLIC_URL||'http://localhost:3008').href;const svg=await QRCode.toString(url,{type:'svg',errorCorrectionLevel:'M',margin:4,width:256,color:{dark:'#17202aff',light:'#ffffffff'}});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store','Content-Disposition':'inline; filename="spaceyew-showcase.svg"','X-Content-Type-Options':'nosniff'}})}
