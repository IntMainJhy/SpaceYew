'use client';

import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import type * as Three from 'three';
import {useLocale} from './LocaleProvider';
import '@/app/home-wind.css';

export type HomeWindItem={title:string;category:string;description:string;href:string};

/** Wrap beyond both screen edges, so a panel never teleports inside the view. */
export function windTrackX(index:number,offset:number,spacing:number){
 const length=spacing*4;return((index*spacing+spacing*.5-offset)%length+length)%length-length*.5;
}
export function windCableY(x:number){return 1.4+.30*Math.sin(x*.52-.2)+.10*Math.sin(x*1.04+1.2);}

/** The original cloth motion, evaluated on the GPU with its analytic normal Jacobian. */
export function windVertexShader(source:string){
 const anchors=['#include <common>','#include <beginnormal_vertex>','#include <begin_vertex>'];
 if(!anchors.every(anchor=>source.split(anchor).length===2))return source;
 return source.replace(anchors[0],anchors[0]+`
  uniform float uWindTime,uWindIndex,uWindStrength,uWindReduced;
  uniform vec2 uWindHit;
  struct WindWarp { vec2 offset; float dxdy; vec2 dz; };
  WindWarp windWarp(vec3 point){
   float loose=max(0.,(1.28-point.y)/2.56),dy=point.y<1.28?-1./2.56:0.;
   float a=uWindTime*1.25+point.x*2.1+loose*3.+uWindIndex*1.8;
   float b=uWindTime*2.+point.x*5.+loose*2.;
   float c=uWindTime*.85+uWindIndex+loose*2.;
   float wind=sin(a)*.075+sin(b)*.022;
   vec2 hit=point.xy-uWindHit;
   float pressure=exp(-dot(hit,hit)*3.)*uWindStrength*.19;
   float moving=1.-uWindReduced;
   WindWarp warp;
   warp.offset=vec2(sin(c)*.035*loose*loose,wind*loose*loose+pressure*loose)*moving;
   warp.dxdy=.035*(cos(c)*2.*loose*loose+sin(c)*2.*loose)*dy*moving;
   warp.dz.x=((cos(a)*.1575+cos(b)*.11)*loose*loose-6.*hit.x*pressure*loose)*moving;
   warp.dz.y=(((cos(a)*.225+cos(b)*.044)*loose*loose+wind*2.*loose)*dy+pressure*(dy-6.*hit.y*loose))*moving;
   return warp;
  }
 `).replace(anchors[1],anchors[1]+`
  WindWarp normalWarp=windWarp(position);
  objectNormal=vec3(objectNormal.x-normalWarp.dz.x*objectNormal.z,
   objectNormal.y-normalWarp.dxdy*objectNormal.x+(normalWarp.dxdy*normalWarp.dz.x-normalWarp.dz.y)*objectNormal.z,objectNormal.z);
 `).replace(anchors[2],anchors[2]+`
  transformed+=vec3(normalWarp.offset.x,0.,normalWarp.offset.y);
 `);
}

export function HomeWindGallery({items,heading,hint}:{items:HomeWindItem[];heading:string;hint:string}){
 const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),links=useRef<(HTMLAnchorElement|null)[]>([]),control=useRef(()=>{}),pausedRef=useRef(false),headingId=useId();
 const[paused,setPaused]=useState(false),{locale}=useLocale(),entries=items.slice(0,4);
 const labels=locale==='zh'?{pause:'暂停飘动',play:'继续飘动'}:locale==='ja'?{pause:'動きを止める',play:'動きを再開'}:{pause:'Pause motion',play:'Resume motion'};
 useEffect(()=>{
  const host=stage.current,surface=canvas.current;if(!host||!surface)return;
  let disposed=false,failed=false,started=false,visible=false,release=()=>{},wake=()=>{};
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialize=async()=>{
   if(started||disposed)return;started=true;
   try{
    const[THREE,{GLTFLoader}]=await Promise.all([import('three'),import('three/examples/jsm/loaders/GLTFLoader.js')]);if(disposed)return;
    const renderer=new THREE.WebGLRenderer({canvas:surface,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.setClearColor(0,0);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6.3,6.3,3,-3,.1,30);
    camera.position.set(0,.15,15);camera.lookAt(0,.15,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0xd5dfe7,.65));
    const key=new THREE.DirectionalLight(0xfffcf7,1.6);key.position.set(-4,3,6);scene.add(key);
    const fill=new THREE.DirectionalLight(0xedf5ff,.3);fill.position.set(4,-1,5);scene.add(fill);
    type Surface={mesh:Three.Mesh<Three.BufferGeometry,Three.MeshPhysicalMaterial>};
    type WindUniforms={uWindTime:{value:number};uWindIndex:{value:number};uWindStrength:{value:number};uWindReduced:{value:number};uWindHit:{value:Three.Vector2}};
    const cloths:{mesh:Three.Mesh;group:Three.Group;surfaces:Surface[];uniforms:WindUniforms;strength:number;hit:Three.Vector3}[]=[];
    let model:Three.Group|null=null,frame=0,last:number|null=null,time=0,offset=0,flow=1,hover=-1,focused=-1,width=1,height=1,small=false,reduced=preference.matches,lost=false,printing=false,touchRelease:ReturnType<typeof setTimeout>|undefined;
    const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster(),point=new THREE.Vector3();
    const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=null;};
    const ready=()=>!disposed&&!failed&&!lost&&!printing&&visible&&!document.hidden;
    const active=()=>!reduced&&!pausedRef.current&&focused<0;
    const spacing=()=>small?2.8:3.8;
    const disposeObject=(object:Three.Object3D)=>{
     const geometries=new Set<Three.BufferGeometry>(),materials=new Set<Three.Material>(),textures=new Set<Three.Texture>();
     object.traverse(child=>{if(!(child instanceof THREE.Mesh))return;geometries.add(child.geometry);for(const material of Array.isArray(child.material)?child.material:[child.material])materials.add(material);});
     for(const material of materials){for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);material.dispose();}
     for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();
    };
    const positionLinks=()=>{
     cloths.forEach(({group},index)=>{
      const link=links.current[index];if(!link)return;
      point.set(0,-1.28,.2);group.localToWorld(point);point.project(camera);
      link.style.transform=`translate3d(${(point.x*.5+.5)*width}px,${(-point.y*.5+.5)*height}px,0) translate(-50%,-50%) rotate(${-group.rotation.z}rad)`;
     });
    };
    const draw=(delta=0)=>{
     if(!model)return;
     cloths.forEach((cloth,index)=>{
      const selected=hover===index||focused===index;
      cloth.strength=THREE.MathUtils.damp(cloth.strength,selected?1:0,8,delta);
      if(reduced){
       const places=small?[[-1.35,3.45],[1.35,3.1],[-1.35,-.05],[1.35,-.4]]:[[-4.8,windCableY(-4.8)],[-1.6,windCableY(-1.6)],[1.6,windCableY(1.6)],[4.8,windCableY(4.8)]];
       cloth.group.position.set(places[index][0],places[index][1],0);cloth.group.rotation.set(0,0,0);
      }else{
       const x=windTrackX(index,offset,spacing()),slope=.156*Math.cos(x*.52-.2)+.104*Math.cos(x*1.04+1.2);
       cloth.group.position.set(x,windCableY(x),0);cloth.group.rotation.z=Math.atan(slope)*.75+Math.sin(time*.65+index*1.7)*.008;
      }
      cloth.uniforms.uWindTime.value=time;cloth.uniforms.uWindStrength.value=cloth.strength;cloth.uniforms.uWindReduced.value=reduced?1:0;cloth.uniforms.uWindHit.value.set(cloth.hit.x,cloth.hit.y);
      for(const part of cloth.surfaces)part.mesh.material.emissiveIntensity=.15+cloth.strength*.025;
     });
     renderer.render(scene,camera);positionLinks();
    };
    const tick=(now:number)=>{
     frame=0;if(!ready())return;
     const elapsed=last===null?1/120:Math.max(0,(now-last)/1000);
     const delta=Math.min(elapsed,.07);last=now;
     if(active()){time+=delta;flow=THREE.MathUtils.damp(flow,hover>=0?.08:1,5,delta);offset+=delta*(small?.17:.30)*flow;}
     draw(delta);
     if(active()||cloths.some((cloth,index)=>Math.abs(cloth.strength-((hover===index||focused===index)?1:0))>.005))frame=requestAnimationFrame(tick);
    };
    wake=()=>{if(ready()&&!frame)frame=requestAnimationFrame(tick);else if(!ready())stop();};control.current=wake;
    const measure=()=>{
     const rect=host.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);small=width<=760;
     host.dataset.windLayout=reduced?'static':'flow';
     const span=small?5.4:reduced?13.2:12.6,vertical=span*height/width;
     camera.left=-span/2;camera.right=span/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.position.y=reduced&&small?.5:.15;camera.updateProjectionMatrix();
     renderer.setSize(width,height,false);
     const pixels=width/span;
     for(const link of links.current){if(!link)continue;link.style.width=(2.12*pixels)+'px';link.style.height=(2.56*pixels)+'px';}
     const cable=model?.getObjectByName('WindCable');if(cable)cable.visible=!(reduced&&small);
     draw();wake();
    };
    const move=(event:PointerEvent)=>{
     if(event.pointerType==='touch')return;
     const rect=host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
     const hit=raycaster.intersectObjects(cloths.map(cloth=>cloth.mesh),false)[0];hover=hit?cloths.findIndex(cloth=>cloth.mesh===hit.object):-1;
     if(hit&&hover>=0)cloths[hover].hit.copy(cloths[hover].mesh.worldToLocal(hit.point.clone()));wake();
    };
    const leave=()=>{hover=-1;wake();};
    const press=(event:PointerEvent)=>{
     if(event.pointerType!=='touch')return;if(touchRelease)clearTimeout(touchRelease);
     const anchor=(event.target as HTMLElement).closest('a'),index=links.current.indexOf(anchor as HTMLAnchorElement);if(index<0||!cloths[index])return;
     hover=index;cloths[index].hit.set(0,-.3,0);cloths[index].strength=.65;draw();wake();
    };
    const lift=()=>{touchRelease=setTimeout(leave,180);};
    const focus=(event:FocusEvent)=>{
     focused=links.current.indexOf(event.target as HTMLAnchorElement);
     if(focused>=0){cloths[focused]?.hit.set(0,-.25,0);if(!reduced){const x=windTrackX(focused,offset,spacing());if(Math.abs(x)>camera.right-1.15)offset+=x;}draw();}wake();
    };
    const blur=()=>{focused=-1;wake();};
    const motion=()=>{reduced=preference.matches;measure();};
    const visibility=()=>{if(document.hidden)stop();else wake();};
    const contextLost=(event:Event)=>{event.preventDefault();lost=true;stop();host.dataset.wind='fallback';};
    const beforePrint=()=>{printing=true;stop();host.dataset.wind='print';};
    const afterPrint=()=>{printing=false;if(!lost){host.dataset.wind='ready';wake();}};
    const resize=new ResizeObserver(measure);
    release=()=>{stop();control.current=()=>{};if(touchRelease)clearTimeout(touchRelease);resize.disconnect();host.removeEventListener('pointerdown',press);host.removeEventListener('pointerup',lift);host.removeEventListener('pointercancel',leave);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('focusin',focus);host.removeEventListener('focusout',blur);surface.removeEventListener('webglcontextlost',contextLost);preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);disposeObject(scene);renderer.dispose();host.removeAttribute('data-wind');host.removeAttribute('data-wind-layout');};
    resize.observe(host);host.addEventListener('pointerdown',press,{passive:true});host.addEventListener('pointerup',lift,{passive:true});host.addEventListener('pointercancel',leave);host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);host.addEventListener('focusin',focus);host.addEventListener('focusout',blur);surface.addEventListener('webglcontextlost',contextLost);preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
    const gltf=await new GLTFLoader().loadAsync('/models/spaceyew-home-wind.glb');if(disposed){disposeObject(gltf.scene);return;}
    await document.fonts.ready;if(disposed){disposeObject(gltf.scene);return;}
    model=gltf.scene;scene.add(model);
    const weave=new THREE.CanvasTexture(silkWeave());weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(5,6);weave.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    for(let index=entries.length;index<4;index++){const unused=model.getObjectByName('WindFabric_'+index);if(unused){disposeObject(unused);unused.removeFromParent();}}
    const expandedGeometry=new Set<Three.BufferGeometry>();
    entries.forEach((entry,index)=>{
     const mesh=model!.getObjectByName('WindFabric_'+index) as Three.Mesh|undefined;if(!mesh)throw Error('Missing silk fabric');
     const texture=new THREE.CanvasTexture(fabricPrint(entry,index));texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
     const surfaces:Surface[]=[],uniforms:WindUniforms={uWindTime:{value:0},uWindIndex:{value:index},uWindStrength:{value:0},uWindReduced:{value:reduced?1:0},uWindHit:{value:new THREE.Vector2()}};
     mesh.traverse(child=>{
      if(!(child instanceof THREE.Mesh))return;
      for(const old of Array.isArray(child.material)?child.material:[child.material])old.dispose();
      child.material=new THREE.MeshPhysicalMaterial({map:texture,color:0xffffff,bumpMap:weave,bumpScale:.009,roughness:.56,metalness:0,sheen:.3,sheenRoughness:.48,sheenColor:new THREE.Color(0xffffff),specularIntensity:.18,clearcoat:0,side:THREE.DoubleSide,toneMapped:false,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.15});
      child.material.onBeforeCompile=(shader:Three.WebGLProgramParametersWithUniforms)=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=windVertexShader(shader.vertexShader);};
      child.material.customProgramCacheKey=()=> 'spaceyew-analytic-silk-r187';
      if(!expandedGeometry.has(child.geometry)){child.geometry.computeBoundingBox();child.geometry.boundingBox?.expandByScalar(.4);child.geometry.computeBoundingSphere();if(child.geometry.boundingSphere)child.geometry.boundingSphere.radius+=.4;expandedGeometry.add(child.geometry);}
      surfaces.push({mesh:child as Surface['mesh']});
     });
     // Stable native planes remain the hit proxies. The shader's <=3.5cm lateral warp
     // is smaller than the semantic link's hit area; raycasts avoid GPU readback.
     mesh.position.y=-1.28;const group=new THREE.Group();group.add(mesh);scene.add(group);cloths.push({mesh,group,surfaces,uniforms,strength:0,hit:new THREE.Vector3()});
    });
    const cable=model.getObjectByName('WindCable') as Three.Mesh|undefined;if(cable){for(const old of Array.isArray(cable.material)?cable.material:[cable.material])old.dispose();cable.material=new THREE.MeshBasicMaterial({color:0x7194b9,transparent:true,opacity:.82});}
    measure();host.dataset.wind='ready';wake();
   }catch{failed=true;release();if(!disposed)host.dataset.wind='fallback';}
  };
  const observer=new IntersectionObserver(records=>{if(records.some(record=>record.isIntersecting))void initialize();},{rootMargin:'180px',threshold:0});
  const visibility=new IntersectionObserver(records=>{visible=records.some(record=>record.isIntersecting);wake();},{threshold:0});observer.observe(host);visibility.observe(host);
  return()=>{disposed=true;observer.disconnect();visibility.disconnect();release();};
 },[items]);
 return <section className="home-wind-section" aria-labelledby={headingId} data-home-reveal="wind">
  <div className="home-wind-heading"><h2 id={headingId}>{heading}</h2><div className="home-wind-caption"><p>{hint}</p><button className="home-wind-toggle" type="button" aria-pressed={paused} onClick={()=>{pausedRef.current=!paused;setPaused(!paused);control.current();}}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paused?<path d="m7 4 8 6-8 6V4Z"/>:<path d="M7 4v12M13 4v12"/>}</svg>{paused?labels.play:labels.pause}</button></div></div>
  <div ref={stage} className="home-wind-stage"><canvas ref={canvas} aria-hidden="true" className="home-wind-canvas"/>
   <div className="home-wind-links">{entries.map((entry,index)=><Link ref={element=>{links.current[index]=element;}} key={entry.href+'-'+index} href={entry.href} className={'home-wind-link home-wind-link-'+index}><span className="home-wind-category">{entry.category}</span><strong>{entry.title}</strong><span className="home-wind-description">{entry.description}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>)}</div>
  </div>
 </section>;
}

function silkWeave(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const context=canvas.getContext('2d')!;
 context.fillStyle='#808080';context.fillRect(0,0,128,128);
 for(let line=0;line<128;line+=4){context.fillStyle='#989898';context.fillRect(line,0,1,128);context.fillStyle='#6f6f6f';context.fillRect(0,line,128,1);}
 return canvas;
}

/** Printed ink follows the silk UVs; the raised hem is authored in Blender. */
function fabricPrint(item:HomeWindItem,index:number){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1280;const context=canvas.getContext('2d')!;
 const colors=['#fffdf5','#e4f0ff','#f0eaff','#e8f5ef'];context.fillStyle=colors[index%colors.length];context.fillRect(0,0,1024,1280);
 context.strokeStyle='rgba(56,91,131,.14)';context.lineWidth=1.2;context.setLineDash([2,8]);context.strokeRect(26,25,972,1230);context.setLineDash([]);
 context.fillStyle='#355879';context.font='500 54px "SpaceYew Sans", "PingFang SC", sans-serif';context.fillText(item.category,100,154);
 const wrap=(text:string,y:number,font:string,lineHeight:number,maxLines:number)=>{
  context.font=font;let line='',row=0;
  for(const character of text){if(context.measureText(line+character).width>824&&line){context.fillText(line,100,y+row*lineHeight);line='';row++;if(row>=maxLines)return;}line+=character;}
  if(line)context.fillText(line,100,y+row*lineHeight);
 };
 context.fillStyle='#173b5c';wrap(item.title,420,'600 124px "SpaceYew Sans", "PingFang SC", sans-serif',150,2);
 context.fillStyle='#365878';wrap(item.description,860,'400 58px "SpaceYew Sans", "PingFang SC", sans-serif',84,3);
 context.strokeStyle='#355879';context.lineWidth=4;context.lineCap='round';context.beginPath();context.moveTo(100,1170);context.lineTo(205,1170);context.moveTo(179,1144);context.lineTo(205,1170);context.lineTo(179,1196);context.stroke();
 return canvas;
}
