import {randomUUID} from 'node:crypto';
import {handle} from './api.mjs';
import {resourceKey} from './resource-key.mjs';

// Execute the same authenticated GET handler in-process: no loopback HTTP or extra permissions.
export async function pageResources(req,path=[],query={}){
 /** @type {Record<string,{data:any,error:string,status:number}>} */
 const resources={};
 async function load(path){const key=resourceKey(path);if(resources[key])return resources[key];const response=await handle(new Request(new URL(path,req.url),{headers:req.headers})),data=await response.json();return resources[key]={data:response.ok?data:null,error:response.ok?'':data.error,status:response.status};}
 const auth=await load('/api/auth/me'),user=auth.data?.user;
 const section=path[0]||'',params=new URLSearchParams(Object.entries(query).map(([key,value])=>[key,String(value||'')]));
 if(user&&section==='workspace'&&['blog','studio','profile','library','files','insights','preview'].includes(path[1]))await load('/api/spaces/mine');
 const queue=[];
 if(user&&section==='workspace'&&path[1]==='files')queue.push(load('/api/spaces/files?page=1'));
 const add=(url)=>queue.push(load(url));
 if(section==='admin'&&!['community','catalog'].includes(path[1])){
  const boot=await load('/api/admin/bootstrap');
  if(boot.status===200){const current=path[1]||'',editor=['new','edit'].includes(path[2]||''),types=['projects','articles','resources'],type=current==='trash'?(types.includes(String(query.type))?String(query.type):'resources'):current;
   if(!current){add('/api/admin/statistics?'+params);add('/api/admin/overview');}
   else if(types.includes(current)&&!editor||current==='trash')add('/api/admin/content?'+new URLSearchParams({type,...Object.fromEntries(params),...(current==='trash'?{trash:'1'}:{})}));
   else if(editor&&path[3]){const content=await load('/api/admin/content/'+encodeURIComponent(path[3])),doc=content.data?.draft||content.data?.published;for(const id of [doc?.coverId,doc?.attachmentId].filter(Boolean))add('/api/admin/files/'+id);}
   if(current==='logs')add('/api/admin/logs?page=1');
   if(current==='files'){add('/api/admin/files?page=1');add('/api/admin/uploads');}
   for(const id of (current==='profile'?[boot.data.profile.avatarId]:current==='settings'?[boot.data.site.shareImageId,boot.data.site.resumeId]:[]).filter(Boolean))add('/api/admin/files/'+id);
  }
 }else if(['community','workspace','login','join','report','legal'].includes(section)||section==='admin'){
  const config=await load('/api/community/config');
  if(section==='legal')add('/api/community/policies/'+encodeURIComponent(path[1]||'terms'));
  else if(config.data?.mode==='local'){
   if(section==='admin'){
    if(user?.status==='active'&&['owner','reviewer'].includes(user.role)){
     const target=path[1]==='catalog'?'catalog':path[2]||'',prefix='/api/admin/community/';
     if(target==='catalog')add('/api/admin/catalog');
     else if(!target)add(prefix+'overview');
     else if(target==='spaces')add('/api/admin/spaces/reviews');
     else if(target==='comments')add(prefix+'comments?status=pending&page=1');
     else if(['reviews','reports'].includes(target))add(prefix+(target==='reports'?'cases':target));
     else if(target==='accounts'&&user.role==='owner'){add(prefix+'accounts');add(prefix+'invites');}
     else if(target==='audit'&&user.role==='owner')add(prefix+'audit');
    }
   }else if(section==='community'){
    if(path[1]==='members'){
     if(path[2]){const id=encodeURIComponent(path[2]);add('/api/community/members/'+id);}
     else add('/api/community/members?'+new URLSearchParams({q:String(query.q||''),page:'1'}));
    }else if(path[1]){const id=encodeURIComponent(path[1]);add('/api/community/posts/'+id);add('/api/community/comments/'+id+'?page=1');}
    else add('/api/community/posts?'+params);
   }else if(section==='workspace'&&user){
    add('/api/community/workspace');
    if(path[1]==='notifications')add('/api/community/notifications?status=all&page=1');
    else if(path[1]==='bookmarks')add('/api/community/bookmarks?page=1');
    else if(path[1]==='submissions'&&path[2]&&path[2]!=='new')add('/api/community/submissions/'+encodeURIComponent(path[2]));
   }
   if(['community','workspace'].includes(section))add('/api/community/members?q=&page=1');
   if(user)add('/api/community/notification-count');
  }
 }
 await Promise.all(queue);
 return{scope:randomUUID(),resources};
}
