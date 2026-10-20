// Request-scoped preload keys ignore query ordering, without caching account data globally.
export function resourceKey(path){const url=new URL(path,'http://site.local');for(const key of new Set(url.searchParams.keys()))if(url.searchParams.getAll(key).every(value=>value===''))url.searchParams.delete(key);url.searchParams.sort();return url.pathname+(url.searchParams.size?'?'+url.searchParams:'')}
