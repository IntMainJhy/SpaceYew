import {publicSpaces,publicSpace} from '@/lib/spaces.mjs';
import {guides} from '@/lib/learning.mjs';
import {publicContent} from '@/lib/db.mjs';
export const dynamic='force-dynamic';
export default function sitemap(){const base=(process.env.PUBLIC_URL||'http://localhost:3008').replace(/\/$/,'');const req=new Request(base);const boards=publicSpaces(req);return[...boards.flatMap((x:any)=>{const space=publicSpace(req,x.handle);if(space.layout.indexable===false)return[];return[{url:base+'/blog/'+x.handle},...space.content.map((item:any)=>({url:base+'/blog/'+x.handle+'/'+item.type+'/'+encodeURIComponent(item.slug),lastModified:item.updated}))]}),...['','/docs',...guides.map(guide=>'/docs/'+guide.slug),'/docs/connect','/skills','/blogs','/about','/career','/projects','/articles','/resources'].map(p=>({url:base+p})),...['projects','articles','resources'].flatMap(t=>publicContent(t).map((x:any)=>({url:base+'/'+t+'/'+encodeURIComponent(x.slug),lastModified:x.updated})))]}
