'use client';
import {useEffect,useState} from 'react';
import {Icon} from './Icons';

// Palette and hash adapted from the user-provided SocialKit template (MIT).
const palette=['#2c7fff','#8e51ff','#ff2056','#00bc7d','#fe9a00','#0092b8','#e12bfb','#00bba7'];
export function FeedAvatar({name,avatarId,className='',guest=false}:{name:string;avatarId?:string|null;className?:string;guest?:boolean}){
 const[failed,setFailed]=useState(0);
 useEffect(()=>setFailed(0),[avatarId,name]);
 let hash=0;for(let i=0;i<name.length;i++)hash=(hash*31+name.charCodeAt(i))%997;
 const tone=hash%palette.length;
 const initials=/[\u3400-\u9fff]/.test(name)?Array.from(name)[0]:name.trim().split(/\s+/).map(s=>Array.from(s)[0]).slice(0,2).join('').toUpperCase();
 return <span className={'feed-avatar '+className} style={{'--avatar-color':palette[tone],'--avatar-ink':[3,4,7].includes(tone)?'#111827':'#ffffff'} as React.CSSProperties} aria-hidden="true">
  {guest?<Icon name="user"/>:avatarId&&failed===0?<img src={'/media/'+avatarId} alt="" width="256" height="256" onError={()=>setFailed(1)}/>:initials||'U'}
 </span>;
}
