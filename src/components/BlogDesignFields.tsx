'use client';
import {createContext,useContext,useLayoutEffect,useRef,type ReactNode} from 'react';
export type DesignEditor={write:(path:(string|number)[],value:string)=>void;image:(path:(string|number)[])=>void;label:string;setLabel:(value:string)=>void;disabled:boolean};
export const BlogDesignLabel=createContext('');
export const BlogDesignEditing=createContext<DesignEditor|null>(null);
export const useBlogEditing=()=>useContext(BlogDesignEditing);
export function DesignText({path,children,max=200,label}:{path:(string|number)[];children:ReactNode;max?:number;label:string}){
 const edit=useBlogEditing(),ref=useRef<HTMLTextAreaElement>(null);const value=typeof children==='string'?children:'';
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const resize=()=>{el.style.height='0';el.style.height=el.scrollHeight+'px'};resize();let width=el.clientWidth;const observer=new ResizeObserver(()=>{if(width!==el.clientWidth){width=el.clientWidth;resize()}});observer.observe(el);return()=>observer.disconnect()},[value,!!edit]);
 return edit?<textarea className="bd-inline nodrag nopan" ref={ref} aria-label={label} value={value} placeholder={label} maxLength={max} rows={1} disabled={edit.disabled} onChange={e=>edit.write(path,e.target.value)} spellCheck/>:<>{children}</>;
}
export function DesignLabel({children}:{children:string}){const edit=useBlogEditing(),label=useContext(BlogDesignLabel);return edit?<DesignText path={['$label']} label={children} max={100}>{edit.label||children}</DesignText>:<>{label||children}</>}
