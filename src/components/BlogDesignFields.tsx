'use client';
import {createContext,useContext,useState,type ReactNode} from 'react';
import {BlogInlineEditor} from './BlogInlineEditor';
import {inlineKey,inlineStyle} from '@/lib/blog-inline-text.mjs';
export const BlogInlineContext=createContext<{runs:Record<string,any[]>;language:string}>({runs:{},language:''});
export type DesignEditor={write:(path:(string|number)[],value:string)=>void;image:(path:(string|number)[])=>void;label:string;setLabel:(value:string)=>void;disabled:boolean;format?:(path:(string|number)[],value:string,runs:any[])=>void;begin?:()=>void};
export const BlogDesignLabel=createContext('');
export const BlogDesignEditing=createContext<DesignEditor|null>(null);
export const useBlogEditing=()=>useContext(BlogDesignEditing);
export function DesignText({path,children,max=200,label}:{path:(string|number)[];children:ReactNode;max?:number;label:string}){
 const edit=useBlogEditing(),context=useContext(BlogInlineContext),[active,setActive]=useState(false),[selection,setSelection]=useState<{from:number;to:number}|undefined>();const value=typeof children==='string'?children:'',runs=context.runs[inlineKey(context.language,path)]||context.runs[inlineKey('',path)]||[];
 const rich=runs.length&&runs.map(r=>r.text).join('')===value?runs.map((run,i)=><span className="bd-inline-run" key={i} style={inlineStyle(run)}>{run.text}</span>):children;
 if(!edit)return <>{rich}</>;
 if(active&&!edit.disabled)return <BlogInlineEditor initialSelection={selection} value={value} runs={runs} label={label} max={max} onBegin={()=>edit.begin?.()} onClose={()=>setActive(false)} onChange={(text,segments)=>{edit.write(path,text);edit.format?.(path,text,segments)}}/>;
 return <span className="bd-inline-display nodrag nopan" role="textbox" aria-label={label} aria-multiline="true" aria-disabled={edit.disabled} tabIndex={edit.disabled?-1:0} onClick={e=>{e.stopPropagation();if(edit.disabled)return;setSelection(undefined);const selected=window.getSelection();if(selected&&!selected.isCollapsed&&selected.rangeCount){const range=selected.getRangeAt(0);if(e.currentTarget.contains(range.startContainer)&&e.currentTarget.contains(range.endContainer)){const before=range.cloneRange();before.selectNodeContents(e.currentTarget);before.setEnd(range.startContainer,range.startOffset);const from=before.toString().length+1;setSelection({from,to:from+range.toString().length})}}edit.begin?.();setActive(true)}} onFocus={e=>{if(!edit.disabled&&e.currentTarget.matches(':focus-visible')){edit.begin?.();setActive(true)}}}>{rich||<span className="bd-inline-placeholder">{label}</span>}</span>;
}
export function DesignLabel({children}:{children:string}){const edit=useBlogEditing(),label=useContext(BlogDesignLabel);return <DesignText path={['$label']} label={children} max={100}>{(edit?edit.label:label)||children}</DesignText>}
