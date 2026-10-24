// A page design is shared by the editor, private preview and reviewed public release.
export const designParts=['header','contacts','cover','about','skills','metrics','certificates','gallery','updated','legacy','credit'];
export function defaultBlogDesign(profile,layout={},content=[]){
 const r=profile.resume,parts=['header','contacts',...(layout.coverId?['cover']:[]),'about','skills',...(r?.metrics?.length?['metrics']:[]),...(r?.sections||[]).map(s=>'section:'+s.id),...(r?.certificates?.length?['certificates']:[]),...(r?.gallery?.length?['gallery']:[]),...(r?.updated?['updated']:[]),...((!r||layout.blog?.showLegacyContent)&&profile.experiences?.length?['legacy']:[]),...((!r||layout.blog?.showLegacyContent)?(layout.blog?.sections||['projects','articles','resources']).filter(key=>content.some(item=>item.type===key)).map(key=>'content:'+key):[]),'credit'];
 return {version:1,width:940,background:'#ffffff',autoLayout:true,nodes:parts.map((part,i)=>({id:'template-'+i,kind:'template',part,label:'',hidden:false,frame:{x:0,y:i*300,w:940,h:part==='header'?440:300},style:{}}))};
}
export const designAssetIds=design=>(design?.nodes||[]).filter(n=>n.kind==='image'&&n.assetId).map(n=>n.assetId);
export function publicBlogDesign(design){return {...design,nodes:design.nodes.filter(n=>!n.hidden)}}
export const designOrder=nodes=>nodes.filter(n=>!n.hidden).map((n,i)=>({...n,order:i})).sort((a,b)=>a.frame.y-b.frame.y||a.frame.x-b.frame.x||a.order-b.order);
export function designHeight(design){return Math.max(500,...design.nodes.filter(n=>!n.hidden).map(n=>n.frame.y+n.frame.h))+24}
export function arrangeBlogDesign(design){let y=0;return {...design,autoLayout:true,nodes:design.nodes.map(n=>{const next={...n,frame:{...n.frame,x:0,y,w:design.width}};if(!n.hidden)y+=n.frame.h;return next})}}
