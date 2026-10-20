'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {api} from '@/lib/client';
import {resourceKey} from '@/lib/resource-key.mjs';

type Result={data:any;error:string;status:number};
type Snapshot=Result&{key:string;family:string;loading:boolean;refreshing:boolean};
export type PageSeed={scope:string;resources:Record<string,Result>};
const Context=createContext<(PageSeed&{read:(path:string)=>Promise<any>})|null>(null);
export function PageResources({seed,children}:{seed:PageSeed;children:React.ReactNode}){
 const value=useMemo(()=>{const pending=new Map<string,Promise<any>>();return{...seed,read:(path:string)=>{const key=resourceKey(path);if(!pending.has(key)){const request=api(path).finally(()=>pending.delete(key));pending.set(key,request);}return pending.get(key)!;}};},[seed]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePageSeed(path:string){const context=useContext(Context);return context?.resources[resourceKey(path)];}
export function useResource(path:string|null){
 const context=useContext(Context),normalized=path?resourceKey(path):'',key=(context?.scope||'client')+':'+normalized,family=(context?.scope||'client')+':'+normalized.split('?')[0],seed=context?.resources[normalized];
 const initial:Snapshot={key,family,data:seed?.data??null,error:seed?.error||'',status:seed?.status||0,loading:!!path&&!seed,refreshing:false};
 const[state,setState]=useState<Snapshot>(initial),[revision,setRevision]=useState({key,version:0});
 const version=revision.key===key?revision.version:0;
 const active=(previous:Snapshot)=>previous.key===key?previous:!seed&&previous.family===family&&previous.data?{...previous,key,refreshing:true}:initial;
 const current=active(state);
 useEffect(()=>{
  if(!path||seed&&[401,403].includes(seed.status)&&version===0)return;
  let live=true;
  setState(previous=>{const next=active(previous);return{...next,loading:!next.data&&!next.error,refreshing:true};});
  // Fresh SSR content stays visible while permissions/data are revalidated in parallel.
  // Explicit refreshes must not reuse a GET that began before a mutation or session change.
  (context&&version===0?context.read(path):api(path)).then(data=>{if(live)setState({key,family,data,error:'',status:200,loading:false,refreshing:false});}).catch(error=>{if(live)setState({key,family,data:null,error:error.message,status:error.status||0,loading:false,refreshing:false});});
  return()=>{live=false;};
 },[key,version]);
 const refresh=useCallback(()=>setRevision(previous=>({key,version:previous.key===key?previous.version+1:1})),[key]);
 useEffect(()=>{
  if(normalized!=='/api/auth/me')return;
  window.addEventListener('session-expired',refresh);
  return()=>window.removeEventListener('session-expired',refresh);
 },[normalized,refresh]);
 return{...current,refresh};
}
