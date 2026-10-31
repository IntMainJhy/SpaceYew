'use client';

import Link from 'next/link';
import {useEffect,useId,useRef} from 'react';
import type * as Three from 'three';
import '@/app/home-wind.css';

export type HomeWindItem={title:string;category:string;description:string;href:string};

/** The HTML links remain usable before the lazy, Blender-authored scene is ready. */
export function HomeWindGallery({items,heading,hint}:{items:HomeWindItem[];heading:string;hint:string}){
 const root=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),links=useRef<(HTMLAnchorElement|null)[]>([]),headingId=useId();
 const entries=items.slice(0,4);
 useEffect(()=>{
  const host=stage.current,surface=canvas.current;if(!host||!surface)return;
  let disposed=false,failed=false,started=false,visible=false,release=()=>{},wake=()=>{};
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialize=async()=>{
   if(started||disposed)return;started=true;
   try{
    const [THREE,{GLTFLoader}]=await Promise.all([import('three'),import('three/examples/jsm/loaders/GLTFLoader.js')]);
    if(disposed)return;
    const renderer=new THREE.WebGLRenderer({canvas:surface,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;renderer.setClearColor(0x000000,0);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6.6,6.6,3.3,-3.3,.1,30);
    camera.position.set(0,0,15);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight(0xffffff,0x8398bd,.85));
    const key=new THREE.DirectionalLight(0xffffff,1.4);key.position.set(-4,5,8);scene.add(key);
    const fill=new THREE.DirectionalLight(0xdceaff,.35);fill.position.set(4,-2,4);scene.add(fill);
    let frame=0,last=0,time=0,hover=-1,focused=-1,width=1,height=1,small=false,reduced=preference.matches,lost=false,printing=false;
    const pointer=new THREE.Vector2(10,10),raycaster=new THREE.Raycaster(),point=new THREE.Vector3();
    const cloths:{mesh:Three.Mesh<Three.BufferGeometry,Three.MeshPhysicalMaterial>;group:Three.Group;base:Float32Array;strength:number;hit:Three.Vector3}[]=[];
    let mobileCable:Three.Mesh|null=null,model:Three.Group|null=null,touchRelease:ReturnType<typeof setTimeout>|undefined;
    const disposeObject=(object:Three.Object3D)=>object.traverse(child=>{if(!(child instanceof THREE.Mesh))return;child.geometry.dispose();for(const material of Array.isArray(child.material)?child.material:[child.material]){for(const value of Object.values(material))if(value instanceof THREE.Texture)value.dispose();material.dispose();}});
    const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=0;};
    const ready=()=>!disposed&&!failed&&!lost&&!printing&&visible&&!document.hidden;
    const positionLinks=()=>{
     cloths.forEach(({group},index)=>{
      const link=links.current[index];if(!link)return;
      point.set(0,-1.28,.25);group.localToWorld(point);point.project(camera);
      const pixels=width/(camera.right-camera.left);
      link.style.left=((point.x*.5+.5)*width)+'px';link.style.top=((-point.y*.5+.5)*height)+'px';
      link.style.width=(2.12*pixels)+'px';link.style.height=(2.56*pixels)+'px';link.style.setProperty('--wind-turn',(-group.rotation.z*180/Math.PI)+'deg');
     });
    };
    const draw=(delta=1/30)=>{
     if(!model)return;
     cloths.forEach((cloth,index)=>{
      const active=hover===index||focused===index;
      cloth.strength=THREE.MathUtils.damp(cloth.strength,active?1:0,8,delta);
      const positions=cloth.mesh.geometry.getAttribute('position') as Three.BufferAttribute;
      for(let vertex=0;vertex<positions.count;vertex++){
       const offset=vertex*3,x=cloth.base[offset],y=cloth.base[offset+1],z=cloth.base[offset+2],loose=Math.max(0,(1.28-y)/2.56);
       const wind=reduced?0:Math.sin(time*1.1+x*2.4+loose*3.5+index*1.7)*.19+Math.sin(time*1.8+x*4.4+index)*.055;
       const distance=(x-cloth.hit.x)**2+(y-cloth.hit.y)**2;
       const pressure=reduced?0:Math.exp(-distance*2.5)*cloth.strength*.29;
       positions.setXYZ(vertex,x+(reduced?0:Math.sin(time*.8+index+loose*2)*.075*loose*loose),y,z+wind*loose*loose+pressure*loose);
      }
      positions.needsUpdate=true;cloth.mesh.geometry.computeVertexNormals();
      cloth.group.rotation.z=reduced?0:Math.sin(time*.65+index*1.6)*.018+cloth.strength*(index%2?-.025:.025);
      cloth.mesh.material.emissiveIntensity=cloth.strength*.08;
     });
     scene.updateMatrixWorld();positionLinks();renderer.render(scene,camera);
    };
    const tick=(now:number)=>{
     frame=0;if(!ready())return;
     const elapsed=last?(now-last)/1000:1/30;if(elapsed<1/30-.002){frame=requestAnimationFrame(tick);return;}
     const delta=Math.min(elapsed,.07);last=now;if(!reduced)time+=delta;draw(delta);
     if(!reduced||cloths.some((cloth,index)=>Math.abs(cloth.strength-((hover===index||focused===index)?1:0))>.005))frame=requestAnimationFrame(tick);
    };
    wake=()=>{if(ready()&&!frame)frame=requestAnimationFrame(tick);else if(!ready())stop();};
    const measure=()=>{
     const rect=host.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);small=width<=760;
     const span=small?5.55:13.1,vertical=span*height/width;
     camera.left=-span/2;camera.right=span/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.position.y=small?.65:0;camera.updateProjectionMatrix();
     renderer.setSize(width,height,false);
     const places=small?[[-1.34,3.5],[1.34,3.0],[-1.34,-.1],[1.34,-.6]]:[[-4.2,1.96],[-1.4,1.26],[1.4,1.86],[4.2,1.18]];
     cloths.forEach(({group},index)=>group.position.set(places[index][0],places[index][1]-.035,0));
     const cable=model?.getObjectByName('WindCable');if(cable)cable.visible=!small;
     if(mobileCable)mobileCable.visible=small;
     draw();wake();
    };
    const move=(event:PointerEvent)=>{
     if(event.pointerType==='touch')return;
     const rect=host.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
     raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(cloths.map(cloth=>cloth.mesh),false)[0];
     hover=hit?cloths.findIndex(cloth=>cloth.mesh===hit.object):-1;
     if(hit&&hover>=0)cloths[hover].hit.copy(cloths[hover].mesh.worldToLocal(hit.point.clone()));
     wake();
    };
    const leave=()=>{hover=-1;wake();};
    const press=(event:PointerEvent)=>{
     if(event.pointerType!=='touch')return;
     if(touchRelease)clearTimeout(touchRelease);
     const anchor=(event.target as HTMLElement).closest('a'),index=links.current.indexOf(anchor as HTMLAnchorElement);
     if(index<0||!cloths[index])return;
     hover=index;cloths[index].hit.set(0,-.25,0);cloths[index].strength=.55;draw();wake();
    };
    const lift=()=>{touchRelease=setTimeout(leave,180);};
    const focus=(event:FocusEvent)=>{focused=links.current.indexOf(event.target as HTMLAnchorElement);if(focused>=0)cloths[focused]?.hit.set(0,0,0);wake();};
    const blur=()=>{focused=-1;wake();};
    const motion=()=>{reduced=preference.matches;draw();wake();};
    const visibility=()=>{if(document.hidden)stop();else wake();};
    const contextLost=(event:Event)=>{event.preventDefault();lost=true;stop();host.dataset.wind='fallback';};
    const beforePrint=()=>{printing=true;stop();host.dataset.wind='print';};
    const afterPrint=()=>{printing=false;if(!lost){host.dataset.wind='ready';wake();}};
    const resize=new ResizeObserver(measure);
    release=()=>{stop();if(touchRelease)clearTimeout(touchRelease);resize.disconnect();host.removeEventListener('pointerdown',press);host.removeEventListener('pointerup',lift);host.removeEventListener('pointercancel',leave);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('focusin',focus);host.removeEventListener('focusout',blur);surface.removeEventListener('webglcontextlost',contextLost);preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);disposeObject(scene);renderer.dispose();host.removeAttribute('data-wind');};
    resize.observe(host);host.addEventListener('pointerdown',press,{passive:true});host.addEventListener('pointerup',lift,{passive:true});host.addEventListener('pointercancel',leave);host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);host.addEventListener('focusin',focus);host.addEventListener('focusout',blur);surface.addEventListener('webglcontextlost',contextLost);preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
    const gltf=await new GLTFLoader().loadAsync('/models/spaceyew-home-wind.glb');
    if(disposed){disposeObject(gltf.scene);return;}
    await document.fonts.ready;if(disposed){disposeObject(gltf.scene);return;}
    model=gltf.scene;scene.add(model);
    for(let index=entries.length;index<4;index++){const unused=model.getObjectByName('WindFabric_'+index);if(unused){disposeObject(unused);unused.removeFromParent();}}
    entries.forEach((entry,index)=>{
     const mesh=model!.getObjectByName('WindFabric_'+index) as Three.Mesh<Three.BufferGeometry,Three.MeshPhysicalMaterial>|undefined;if(!mesh)return;
     const original=mesh.material;original.dispose();
     const texture=new THREE.CanvasTexture(fabricPrint(entry,index));texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
     mesh.material=new THREE.MeshPhysicalMaterial({map:texture,color:0xffffff,roughness:.92,metalness:0,sheen:.35,sheenRoughness:.85,sheenColor:new THREE.Color(0xffffff),side:THREE.DoubleSide,emissive:0x789bd2,emissiveIntensity:0});
     mesh.position.y=-1.28;
     const group=new THREE.Group();group.add(mesh);scene.add(group);
     cloths.push({mesh,group,base:new Float32Array(mesh.geometry.getAttribute('position').array),strength:0,hit:new THREE.Vector3()});
    });
    const path=new THREE.CatmullRomCurve3([new THREE.Vector3(-3.7,4.1,-.08),new THREE.Vector3(-1.34,3.5,-.04),new THREE.Vector3(1.34,3,-.04),new THREE.Vector3(3.7,2,-.08),new THREE.Vector3(3.5,.2,-.05),new THREE.Vector3(1.34,-.6,-.04),new THREE.Vector3(-1.34,-.1,-.04),new THREE.Vector3(-3.7,-1.1,-.08)]);
    mobileCable=new THREE.Mesh(new THREE.TubeGeometry(path,140,.014,6,false),new THREE.MeshStandardMaterial({color:0x355b9b,roughness:.5}));scene.add(mobileCable);
    measure();host.dataset.wind='ready';wake();
   }catch{failed=true;release();if(!disposed)host.dataset.wind='fallback';}
  };
  const observer=new IntersectionObserver(records=>{visible=records.some(record=>record.isIntersecting);if(visible)void initialize();wake();},{rootMargin:'180px',threshold:0});observer.observe(host);
  return()=>{disposed=true;observer.disconnect();release();};
 },[items]);
 return <section ref={root} className="home-wind-section" aria-labelledby={headingId} data-home-reveal="wind">
  <div className="home-wind-heading"><h2 id={headingId}>{heading}</h2><p>{hint}</p></div>
  <div ref={stage} className="home-wind-stage"><canvas ref={canvas} aria-hidden="true" className="home-wind-canvas"/>
   <div className="home-wind-links">{entries.map((entry,index)=><Link ref={element=>{links.current[index]=element;}} key={entry.href+'-'+index} href={entry.href} className={'home-wind-link home-wind-link-'+index}><span className="home-wind-category">{entry.category}</span><strong>{entry.title}</strong><span className="home-wind-description">{entry.description}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>)}</div>
  </div>
 </section>;
}

/** Printed type and a restrained woven surface travel with the actual mesh UVs. */
function fabricPrint(item:HomeWindItem,index:number){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=960;const context=canvas.getContext('2d')!;
 const colors=['#f4f0e5','#c8dcf5','#e1dcef','#e1e9dd'];context.fillStyle=colors[index%colors.length];context.fillRect(0,0,768,960);
 context.lineWidth=1;context.strokeStyle='rgba(30,60,100,.035)';context.beginPath();for(let x=0;x<768;x+=4){context.moveTo(x,0);context.lineTo(x,960);}for(let y=0;y<960;y+=4){context.moveTo(0,y);context.lineTo(768,y);}context.stroke();
 context.strokeStyle='rgba(35,62,100,.2)';context.setLineDash([3,7]);context.strokeRect(20,20,728,920);context.setLineDash([]);
 context.fillStyle='#294d79';context.font='500 38px "SpaceYew Sans", "PingFang SC", sans-serif';context.fillText(item.category,74,112);
 const wrap=(text:string,y:number,font:string,lineHeight:number,maxLines:number)=>{
  context.font=font;let line='',row=0;
  for(const character of text){if(context.measureText(line+character).width>620&&line){context.fillText(line,74,y+row*lineHeight);line='';row++;if(row>=maxLines)return;}line+=character;}
  if(line)context.fillText(line,74,y+row*lineHeight);
 };
 context.fillStyle='#102c4a';wrap(item.title,294,'600 77px "SpaceYew Sans", "PingFang SC", sans-serif',100,3);
 context.fillStyle='#294663';wrap(item.description,650,'400 37px "SpaceYew Sans", "PingFang SC", sans-serif',56,3);
 context.strokeStyle='#294d79';context.lineWidth=5;context.beginPath();context.moveTo(74,850);context.lineTo(152,850);context.moveTo(130,829);context.lineTo(152,850);context.lineTo(130,871);context.stroke();
 return canvas;
}
