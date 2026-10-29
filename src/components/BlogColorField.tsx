'use client';
import {useEffect,useId,useState} from 'react';
export function BlogColorField({label,value,fallback,disabled,onChange,say}:{label:string;value?:string;fallback:string;disabled:boolean;onChange:(value:string)=>void;say:(zh:string,en:string)=>string}){
 const id=useId(),[hex,setHex]=useState(value||fallback),[error,setError]=useState(false);
 useEffect(()=>{setHex(value||fallback);setError(false)},[value,fallback]);
 function commit(){const next=hex.startsWith('#')?hex:'#'+hex;if(/^#[a-f0-9]{6}$/i.test(next)){setError(false);if(next.toLowerCase()!==(value||fallback).toLowerCase())onChange(next.toLowerCase())}else setError(true)}
 return <fieldset className="bt-color-field" disabled={disabled}><legend>{label}</legend><div><input aria-label={label+say('取色器',' picker')} type="color" value={value||fallback} onChange={e=>onChange(e.target.value)}/><input aria-label={label+' HEX'} aria-invalid={error} aria-describedby={error?id:undefined} value={hex} maxLength={7} spellCheck={false} onChange={e=>{setHex(e.target.value);setError(false)}} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit()}}}/><button type="button" disabled={disabled||!value} onClick={()=>onChange('')}>{say('跟随主题','Theme')}</button></div>{error&&<small id={id} role="alert">{say('请输入六位 HEX 色值，如 #2454a4。','Enter six HEX digits, e.g. #2454a4.')}</small>}</fieldset>;
}
