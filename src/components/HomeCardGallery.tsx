'use client';

import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import type * as Three from 'three';
import {useLocale} from './LocaleProvider';
import '@/app/home-cards.css';

export type HomeCardItem={title:string;category:string;description:string;href:string};

/** Real Blender solids keep their vertices static; only their rigid pose changes. */
export function HomeCardGallery({items,heading,hint}:{items:HomeCardItem[];heading:string;hint:string}){
 const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),control=useRef(()=>{}),pausedRef=useRef(false),headingId=useId(),hintId=useId();
 const [paused,setPaused]=useState(false),[ready,setReady]=useState(false),{locale}=useLocale(),entries=items.slice(0,4);
 const labels=locale==='zh'?{pause:'暂停浮动',play:'继续浮动',rotate:'旋转卡片',keys:'拖动旋转，或聚焦后使用方向键；Home 复位。'}:locale==='ja'?{pause:'動きを止める',play:'動きを再開',rotate:'カードを回転',keys:'ドラッグまたは矢印キーで回転。Home キーでリセット。'}:{pause:'Pause motion',play:'Resume motion',rotate:'Rotate card',keys:'Drag or use arrow keys to rotate. Home resets.'};
 useEffect(()=>{
  const host=stage.current,surface=canvas.current;if(!host||!surface)return;
  let disposed=false,started=false,visible=false,failed=false,release=()=>{},wake=()=>{};
  const abort=new AbortController(),preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const initialize=async()=>{
   if(started||disposed)return;started=true;
   try{
    const [THREE,{GLTFLoader},{RoomEnvironment}]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/environments/RoomEnvironment.js')]);if(disposed)return;
    const renderer=new THREE.WebGLRenderer({canvas:surface,alpha:true,antialias:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.transmissionResolutionScale=.45;renderer.setClearColor(0,0);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6.5,6.5,2.5,-2.5,.1,30);camera.position.set(0,0,15);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight('#f5faff','#94b3dc',1.1));
    const key=new THREE.DirectionalLight('#ffffff',2.7);key.position.set(-4,5,7);scene.add(key);
    const rim=new THREE.DirectionalLight('#c7e8ff',1.2);rim.position.set(4,-2,5);scene.add(rim);
    let environment:Three.WebGLRenderTarget|null=null,parsed:Three.Group|null=null,released=false;
    const disposeObject=(object:Three.Object3D)=>{
     const geometries=new Set<Three.BufferGeometry>(),materials=new Set<Three.Material>(),textures=new Set<Three.Texture>();
     object.traverse(node=>{if(!(node instanceof THREE.Mesh))return;geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}});
     textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());
    };
    type Card={group:Three.Group;x:number;y:number;targetX:number;targetY:number;rotationX:number;rotationY:number};
    const cards:Card[]=[],slotBounds:{left:number;top:number;width:number;height:number}[]=[];
    let frame=0,last:number|null=null,time=0,arrival=1,width=1,height=1,reduced=preference.matches,printing=false,lost=false,focused=-1,drag=-1,pointerId=-1,lastX=0,lastY=0;
    const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=null;};
    const canDraw=()=>!disposed&&!failed&&!printing&&!lost&&visible&&!document.hidden;
    const active=()=>!reduced&&!pausedRef.current&&focused<0&&drag<0;
    const unsettled=()=>cards.some(card=>Math.abs(card.rotationX-card.targetX)+Math.abs(card.rotationY-card.targetY)>.001);
    const draw=(delta=0)=>{
     cards.forEach((card,index)=>{
      card.rotationX=THREE.MathUtils.damp(card.rotationX,card.targetX,11,delta);card.rotationY=THREE.MathUtils.damp(card.rotationY,card.targetY,11,delta);
      const settle=reduced?0:Math.pow(1-arrival,3);
      card.group.position.set(card.x,card.y+(reduced?0:Math.sin(time*.7+index*1.7)*.028)-settle*.20,0);
      card.group.rotation.set(card.rotationX,card.rotationY+settle*(index%2===0?-.28:.28),(index%2===0?-.025:.025)+(reduced?0:Math.sin(time*.35+index)*.008));
     });
     scene.environmentRotation.y=reduced?0:Math.sin(time*.18)*.10;renderer.render(scene,camera);
    };
    const tick=(now:number)=>{frame=0;if(!canDraw())return;const delta=last===null?1/120:Math.min(.07,Math.max(0,(now-last)/1000));last=now;if(active())time+=delta;if(!reduced&&!pausedRef.current)arrival=Math.min(1,arrival+delta/1.1);draw(delta);if(active()||unsettled()||arrival<1&&!reduced&&!pausedRef.current)frame=requestAnimationFrame(tick);else last=null;};
    wake=()=>{if(canDraw()&&!frame)frame=requestAnimationFrame(tick);else if(!canDraw())stop();};control.current=wake;
    const measure=()=>{
     const rect=host.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
     const slots=Array.from(host.querySelectorAll<HTMLElement>('.home-card-rotation')).map(slot=>slot.getBoundingClientRect());
     // One batch of layout reads on resize, never per frame or pointer movement.
     slotBounds.length=0;slots.forEach(slot=>slotBounds.push({left:slot.left-rect.left,top:slot.top-rect.top,width:slot.width,height:slot.height}));
     const span=width<=760?5.65:13.1,vertical=span*height/width;camera.left=-span/2;camera.right=span/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();
     const ratio=Math.min(window.devicePixelRatio||1,1.6,Math.sqrt(2_000_000/(width*height)));renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);
     cards.forEach((card,index)=>{const box=slotBounds[index];if(!box)return;card.x=((box.left+box.width/2)/width-.5)*span;card.y=(.5-(box.top+box.height/2)/height)*vertical;const scale=Math.min(box.width/width*span/2.56,box.height/height*vertical/3.18);card.group.scale.setScalar(scale);});
     if(!document.hidden&&!printing&&!lost)draw();wake();
    };
    const cardIndex=(target:EventTarget|null)=>{const value=(target as HTMLElement)?.closest<HTMLElement>('[data-card-index]')?.dataset.cardIndex;return value===undefined?-1:Number(value);};
    const down=(event:PointerEvent)=>{const index=cardIndex(event.target);if(event.button>0||index<0||!cards[index])return;drag=index;pointerId=event.pointerId;lastX=event.clientX;lastY=event.clientY;host.setPointerCapture(event.pointerId);wake();};
    const move=(event:PointerEvent)=>{if(drag<0||event.pointerId!==pointerId)return;const card=cards[drag];card.targetY+=(event.clientX-lastX)*.012;card.targetX=THREE.MathUtils.clamp(card.targetX+(event.clientY-lastY)*.009,-1.1,1.1);if(reduced){card.rotationX=card.targetX;card.rotationY=card.targetY;}lastX=event.clientX;lastY=event.clientY;wake();};
    const lift=()=>{if(pointerId>=0&&host.hasPointerCapture(pointerId))host.releasePointerCapture(pointerId);drag=-1;pointerId=-1;wake();};
    const keydown=(event:KeyboardEvent)=>{
     const index=cardIndex(event.target),card=cards[index];if(!card)return;
     if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Enter',' '].includes(event.key))return;event.preventDefault();
     if(event.key==='Home'){card.targetX=.05;card.targetY=index%2===0?-.12:.12;}
     else if(event.key==='ArrowUp'||event.key==='ArrowDown')card.targetX=THREE.MathUtils.clamp(card.targetX+(event.key==='ArrowUp'?-.18:.18),-1.1,1.1);
     else card.targetY+=event.key==='ArrowLeft'?-.3:.3;
     if(reduced){card.rotationX=card.targetX;card.rotationY=card.targetY;}wake();
    };
    const focus=(event:FocusEvent)=>{focused=cardIndex(event.target);wake();},blur=()=>{focused=-1;wake();};
    const motion=()=>{reduced=preference.matches;host.dataset.cardMotion=reduced?'reduced':'full';if(reduced)cards.forEach(card=>{card.rotationX=card.targetX;card.rotationY=card.targetY;});measure();};
    const visibility=()=>{if(document.hidden){lift();stop();}else wake();};
    const contextLost=(event:Event)=>{event.preventDefault();lost=true;stop();setReady(false);host.dataset.cards='fallback';};
    const beforePrint=()=>{printing=true;stop();},afterPrint=()=>{printing=false;wake();};
    const resize=new ResizeObserver(measure);
    release=()=>{
     if(released)return;released=true;stop();control.current=()=>{};resize.disconnect();
     host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',lift);host.removeEventListener('pointercancel',lift);host.removeEventListener('lostpointercapture',lift);host.removeEventListener('keydown',keydown);host.removeEventListener('focusin',focus);host.removeEventListener('focusout',blur);
     surface.removeEventListener('webglcontextlost',contextLost);preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
     disposeObject(scene);if(parsed&&!parsed.parent)disposeObject(parsed);parsed=null;environment?.dispose();renderer.dispose();
    };
    resize.observe(host);host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerup',lift);host.addEventListener('pointercancel',lift);host.addEventListener('lostpointercapture',lift);host.addEventListener('keydown',keydown);host.addEventListener('focusin',focus);host.addEventListener('focusout',blur);
    surface.addEventListener('webglcontextlost',contextLost);preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
    const response=await fetch('/models/spaceyew-home-cards.glb',{signal:abort.signal});if(!response.ok)throw Error('Card model unavailable');
    parsed=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;if(disposed){disposeObject(parsed);parsed=null;return;}
    await document.fonts.ready;if(disposed){disposeObject(parsed);parsed=null;return;}
    const source=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);try{environment=pmrem.fromScene(source,.04);scene.environment=environment.texture;}finally{source.dispose();pmrem.dispose();}
    const originals=new Set<Three.Material>(),fontFamily=getComputedStyle(host).fontFamily;
    for(let index=0;index<4;index++){
     const body=parsed.getObjectByName('OpticalCard_'+index) as Three.Mesh|undefined;if(!body)throw Error('Missing solid optical card');
     if(index>=entries.length){body.visible=false;continue;}
     for(const material of Array.isArray(body.material)?body.material:[body.material])originals.add(material);
     body.material=new THREE.MeshPhysicalMaterial({color:'#c0d9fa',roughness:.055,metalness:0,transmission:.82,thickness:.20,ior:1.46,dispersion:.72,envMapIntensity:.95,attenuationColor:new THREE.Color('#719acd'),attenuationDistance:4,toneMapped:false});
     Object.assign(body.material,{iridescence:.3,iridescenceIOR:1.7,iridescenceThicknessMinimum:160,iridescenceThicknessMaximum:290});
     const sample='return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',chunk=THREE.ShaderChunk.transmission_pars_fragment;
     if(THREE.REVISION==='187'&&chunk.split(sample).length===2){const filtered=chunk.replace(sample,'return textureLod( transmissionSamplerMap, fragCoord.xy, lod );');body.material.onBeforeCompile=(shader:Three.WebGLProgramParametersWithUniforms)=>{shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_pars_fragment>',filtered);};body.material.customProgramCacheKey=()=> 'spaceyew-card-linear-volume-r187';}
     const group=new THREE.Group();group.add(body);scene.add(group);
     const texture=new THREE.CanvasTexture(cardPrint(entries[index],fontFamily));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
     const ink=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
     const print=new THREE.Mesh(new THREE.PlaneGeometry(2.10,2.68),ink);print.position.z=.103;group.add(print);
     const reverse=print.clone();reverse.rotation.y=Math.PI;reverse.position.z=-.103;group.add(reverse);
     const yaw=index%2===0?-.12:.12;cards.push({group,x:0,y:0,targetX:.05,targetY:yaw,rotationX:.05,rotationY:yaw});
    }
    originals.forEach(material=>material.dispose());scene.add(parsed);parsed=null;
    // An opaque receiver participates in refraction. It matches the surrounding
    // ice surface, avoiding black glass when the canvas itself is transparent.
    const receiver=new THREE.ShaderMaterial({depthWrite:false,toneMapped:false,uniforms:{uColor:{value:new THREE.Color('#e5eef9')},uAlpha:{value:1}},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 uColor;uniform float uAlpha;void main(){gl_FragColor=vec4(uColor,uAlpha);\n#include <colorspace_fragment>\ngl_FragColor.rgb*=uAlpha;\n}'});
    const wall=new THREE.Mesh(new THREE.PlaneGeometry(30,25),receiver);wall.position.z=-3;wall.onBeforeRender=()=>{receiver.uniforms.uAlpha.value=renderer.getRenderTarget()?1:0;};scene.add(wall);
    measure();await renderer.compileAsync(scene,camera);if(disposed)return;
    host.dataset.cards='ready';host.dataset.cardMotion=reduced?'reduced':'full';setReady(true);
    const replay=()=>{if(!reduced&&!pausedRef.current)arrival=0;};
    replayEntrance=replay;if(visible)replayEntrance();wake();
   }catch{failed=true;release();if(!disposed){setReady(false);host.dataset.cards='fallback';}}
  };
  const nearby=new IntersectionObserver(records=>{if(records.some(record=>record.isIntersecting)){nearby.disconnect();void initialize();}},{rootMargin:'220px',threshold:0});
  let replayEntrance=()=>{};
  const viewport=new IntersectionObserver(records=>{const next=records.some(record=>record.isIntersecting);if(next&&!visible)replayEntrance();visible=next;wake();},{threshold:0});nearby.observe(host);viewport.observe(host);
  return()=>{disposed=true;abort.abort();nearby.disconnect();viewport.disconnect();release();};
 },[items]);
 return <section className="home-card-section" aria-labelledby={headingId}>
  <div className="home-card-heading"><h2 id={headingId}>{heading}</h2><div className="home-card-caption"><p id={hintId}>{hint} <span>{labels.keys}</span></p>{ready&&<button className="home-card-toggle" type="button" aria-pressed={paused} onClick={()=>{pausedRef.current=!paused;setPaused(!paused);control.current();}}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paused?<path d="m7 4 8 6-8 6V4Z"/>:<path d="M7 4v12M13 4v12"/>}</svg>{paused?labels.play:labels.pause}</button>}</div></div>
  <div ref={stage} className="home-card-stage"><canvas ref={canvas} aria-hidden="true" className="home-card-canvas"/><div className="home-card-grid">{entries.map((entry,index)=><div key={entry.href+'-'+index} className="home-card-slot"><button type="button" className="home-card-rotation" disabled={!ready} data-card-index={index} aria-label={labels.rotate+' · '+entry.title} aria-describedby={hintId}><span>{entry.category}</span><strong>{entry.title}</strong><span>{entry.description}</span></button><Link href={entry.href} className="home-card-link"><span>{entry.category}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link></div>)}</div></div>
 </section>;
}

function cardPrint(entry:HomeCardItem,fontFamily:string){
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=816;const context=canvas.getContext('2d')!;
 const face=context.createLinearGradient(0,0,640,816);face.addColorStop(0,'#eef6ff75');face.addColorStop(.55,'#c6ddf428');face.addColorStop(1,'#8cadde50');context.fillStyle=face;context.fillRect(0,0,640,816);
 context.fillStyle='#2d527d';context.font='500 31px '+fontFamily;context.fillText(entry.category,48,82);
 context.fillStyle='#102d59';context.font='600 62px '+fontFamily;
 const lines=(text:string,maxWidth:number)=>{const result:string[]=[];let line='';for(const char of Array.from(text)){if(context.measureText(line+char).width>maxWidth&&line){result.push(line);line=char;}else line+=char;}if(line)result.push(line);return result;};
 lines(entry.title,538).slice(0,3).forEach((line,index)=>context.fillText(line,48,215+index*77));
 context.fillStyle='#2d527d';context.font='400 30px '+fontFamily;lines(entry.description,538).slice(0,3).forEach((line,index)=>context.fillText(line,48,573+index*45));
 context.strokeStyle='#38679f';context.lineWidth=3;context.beginPath();context.moveTo(48,737);context.lineTo(103,737);context.moveTo(88,722);context.lineTo(103,737);context.lineTo(88,752);context.stroke();
 return canvas;
}
