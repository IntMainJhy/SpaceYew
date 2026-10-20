import QRCode from 'qrcode';
import {limited,hash} from './db.mjs';
import {clientIp} from './auth.mjs';
import {requireValue} from './content.mjs';
import {publicSpace} from './spaces.mjs';
export async function spaceQr(req,handle){requireValue(!limited('space-qr:'+hash(clientIp(req)),30,60000),'请求过于频繁，请稍后再试',429);const space=publicSpace(req,decodeURIComponent(handle||''));const url=new URL(space.url,process.env.PUBLIC_URL||'http://localhost:3008').href;const svg=await QRCode.toString(url,{type:'svg',errorCorrectionLevel:'M',margin:4,width:256,color:{dark:'#17202aff',light:'#ffffffff'}});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store','Content-Disposition':'inline; filename="spaceyew-showcase.svg"','X-Content-Type-Options':'nosniff'}})}
