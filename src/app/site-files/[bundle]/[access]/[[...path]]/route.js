import {blogFileResponse} from '@/lib/blog-hosting.mjs';
import {HttpError} from '@/lib/content.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function serve(req,{params}){try{const p=await params;return await blogFileResponse(req,p.bundle,p.access,p.path||[])}catch(error){const status=error instanceof HttpError?error.status:500;return new Response(status===500?'页面暂时不可用':error.message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}})}}
export const GET=serve;export const HEAD=serve;
