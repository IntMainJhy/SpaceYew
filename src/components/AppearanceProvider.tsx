'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {appearancePreference,appearanceStorageKey,resolvedAppearance} from '@/lib/site-appearance.mjs';

export type Appearance='light'|'dark'|'system';
const Context=createContext<{preference:Appearance;select:(value:Appearance)=>void;persisted:boolean}>({preference:'system',select:()=>{},persisted:true});
function apply(preference:Appearance){
 const root=document.documentElement;
 root.dataset.colorPreference=preference;
 root.dataset.colorMode=resolvedAppearance(preference,window.matchMedia('(prefers-color-scheme: dark)').matches);
}
export function AppearanceProvider({children}:{children:React.ReactNode}){
 const [preference,setPreference]=useState<Appearance>('system'),[persisted,setPersisted]=useState(true);
 useEffect(()=>{
  const root=document.documentElement;
  const sync=()=>{const next=appearancePreference(root.dataset.colorPreference) as Appearance;setPreference(next);apply(next)};
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  const storage=(event:StorageEvent)=>{if(event.key===appearanceStorageKey||event.key===null){root.dataset.colorPreference=appearancePreference(event.newValue);sync()}};
  sync();media.addEventListener('change',sync);window.addEventListener('storage',storage);
  return()=>{media.removeEventListener('change',sync);window.removeEventListener('storage',storage)};
 },[]);
 function select(next:Appearance){setPreference(next);apply(next);try{localStorage.setItem(appearanceStorageKey,next);setPersisted(true)}catch{setPersisted(false)}}
 return <Context.Provider value={{preference,select,persisted}}>{children}</Context.Provider>;
}
export function useAppearance(){return useContext(Context)}
