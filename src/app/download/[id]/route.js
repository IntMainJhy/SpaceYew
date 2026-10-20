import {fileResponse} from '@/lib/media.mjs';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function handle(req,{params},head=false){try{return await fileResponse(req,(await params).id,false,head)}catch(error){return Response.json({error:error.status?error.message:'文件读取失败'},{status:error.status||500,headers:{'Cache-Control':'no-store'}})}}
export const GET=(req,context)=>handle(req,context);export const HEAD=(req,context)=>handle(req,context,true);
