import {catalogCover} from '@/lib/catalog-cover.mjs';
export const runtime='nodejs';
export function GET(req:Request){const q=new URL(req.url).searchParams;return new Response(catalogCover({kind:q.get('kind')||'docs',title:q.get('title')||'SpaceYew',category:q.get('category')||''}),{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=86400','Content-Security-Policy':"default-src 'none'; sandbox",'X-Content-Type-Options':'nosniff'}})}
