// Keep login return paths within this application, including with browser URL normalization.
export function internalDestination(value,fallback='/workspace'){
 if(typeof value!=='string'||!/^\/(?!\/)/.test(value)||/[\\\u0000-\u0020\u007f]/.test(value))return fallback;
 try{const base='https://local.invalid',url=new URL(value,base);return url.origin===base?url.pathname+url.search+url.hash:fallback;}catch{return fallback;}
}
// A report's visible target is authoritative; never carry IDs from its original link.
export function caseTargetIds(value,origin){
 try{const url=new URL(value,origin);if(url.origin!==new URL(origin).origin)return{};const match=url.pathname.match(/^\/community\/([a-f0-9-]{36})$/);if(!match)return{};const comment=url.hash.match(/^#comment-([a-f0-9-]{36})$/);return{post:match[1],...(comment?{comment:comment[1]}:{})};}catch{return{}}
}

// A platform login must not use an admin/login return path, including normalized paths.
export function platformDestination(value,fallback='/workspace',surface='combined'){const target=internalDestination(value,fallback);return surface==='platform'&&/^\/(?:admin|login|join)(?:[/?#]|$)/.test(target)?'/workspace':target;}

export function communityProfileDestination(user,fallback='/workspace/account'){
 return user?.id&&user.status==='active'&&(user.role==='owner'||user.siteOwner||user.canPublish===true||user.canPublish!==false&&['verified','local_test'].includes(user.verification))?'/community/members/'+encodeURIComponent(user.id):fallback;
}
export function submissionEditDestination(row){
 return row.catalogId&&['docs','skills','resources'].includes(row.catalogKind)?'/'+row.catalogKind+'?'+new URLSearchParams({compose:'1',edit:row.catalogId}):'/workspace/submissions/'+encodeURIComponent(row.id);
}
