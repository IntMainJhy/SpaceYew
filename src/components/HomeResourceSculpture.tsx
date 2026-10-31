'use client';

import {Component,Suspense,lazy,useEffect,useRef,useState} from 'react';
import type {MutableRefObject,PointerEvent as ReactPointerEvent,ReactNode} from 'react';
import type * as Three from 'three';
import '@/app/home-resource-sculpture.css';

type Interaction={x:number;y:number;drag:number;pressed:boolean;lastX:number;invalidate:()=>void};
type SceneProps={running:boolean;interactive:boolean;reduced:boolean;posterSrc:string;interaction:MutableRefObject<Interaction>;onReady:()=>void;onError:()=>void};
type SculptureProps={posterSrc:string;label:string;pauseLabel:string;playLabel:string};

/** Fiber and the optical renderer are fetched only when this card approaches the viewport. */
const ResourceCanvas=lazy(async()=>{
 const [{Canvas,useFrame,useThree},THREE,{GLTFLoader},{RoomEnvironment}]=await Promise.all([import('@react-three/fiber'),import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/environments/RoomEnvironment.js')]);
 const sample='return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );',chunk=THREE.ShaderChunk.transmission_pars_fragment;
 // Polished glass can use hardware mip filtering: three RGB fetches instead of
 // r187's 24 bicubic fetches. Keep native refraction and fail open on version drift.
 const linearTransmission=THREE.REVISION==='187'&&chunk.split(sample).length===2?chunk.replace(sample,'return textureLod( transmissionSamplerMap, fragCoord.xy, lod );'):null;
 const glyphPlaces=[[-1.86,1.15,.7],[1.87,.52,.85],[1.17,-1.57,.8]];
 const disposeObject=(object:Three.Object3D)=>{
  const geometries=new Set<Three.BufferGeometry>(),materials=new Set<Three.Material>(),textures=new Set<Three.Texture>();
  object.traverse(node=>{if(!(node instanceof THREE.Mesh)&&!(node instanceof THREE.Points))return;geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material]){materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);}});
  textures.forEach(texture=>texture.dispose());materials.forEach(material=>material.dispose());geometries.forEach(geometry=>geometry.dispose());return textures;
 };
 function SculptureScene({running,interactive,reduced,posterSrc,interaction,onReady,onError}:SceneProps){
  const {gl,scene,camera,invalidate}=useThree(),[world,setWorld]=useState<Three.Group|null>(null);
  const runtime=useRef<{content:Three.Group;glyphs:Three.Group[];wall:Three.ShaderMaterial;time:number;rotationX:number;rotationY:number;ready:boolean}|null>(null);
  const callbacks=useRef({onReady,onError});callbacks.current={onReady,onError};
  useEffect(()=>{
   let alive=true,owned:Three.Group|null=null,parsed:Three.Group|null=null,poster:Three.Texture|null=null,environment:Three.WebGLRenderTarget|null=null;
   const abort=new AbortController(),previousEnvironment=scene.environment;
   interaction.current.invalidate=invalidate;
   const lost=(event:Event)=>{event.preventDefault();callbacks.current.onError();};gl.domElement.addEventListener('webglcontextlost',lost);
   const load=async()=>{
    try{
     const response=await fetch('/models/spaceyew-resources.glb',{signal:abort.signal});if(!response.ok)throw Error('Resource sculpture unavailable');
     parsed=(await new GLTFLoader().parseAsync(await response.arrayBuffer(),'')).scene;
     if(!alive){disposeObject(parsed);parsed=null;return;}
     try{poster=await new THREE.TextureLoader().loadAsync(posterSrc);}catch{poster=null;}
     if(!alive){if(parsed){disposeObject(parsed);parsed=null;}poster?.dispose();poster=null;return;}
     const model=parsed;
     const source=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(gl);
     try{environment=pmrem.fromScene(source,.04);scene.environment=environment.texture;}finally{source.dispose();pmrem.dispose();}
     gl.transmissionResolutionScale=.5;
     const content=new THREE.Group(),root=new THREE.Group();owned=root;root.add(content);
     model.position.sub(new THREE.Box3().setFromObject(model,true).getCenter(new THREE.Vector3()));model.scale.setScalar(.86);content.add(model);parsed=null;
     let foremost:Three.Mesh|null=null;
     model.traverse(node=>{
      if(!(node instanceof THREE.Mesh))return;
      if(node.name==='Resource_crystal_page_3')foremost=node;
      for(const material of Array.isArray(node.material)?node.material:[node.material])if(material instanceof THREE.MeshPhysicalMaterial){
       material.color.set('#ffffff');material.toneMapped=false;material.transmission=1;material.ior=1.46;material.thickness=.24;material.roughness=.025;material.envMapIntensity=.72;material.dispersion=.35;material.attenuationColor.set('#c8e4f7');material.attenuationDistance=9;
       if(linearTransmission){material.onBeforeCompile=shader=>{const include='#include <transmission_pars_fragment>';if(shader.fragmentShader.split(include).length===2)shader.fragmentShader=shader.fragmentShader.replace(include,linearTransmission);};material.customProgramCacheKey=()=> 'spaceyew-resource-linear-volume-r187';}
      }
     });
     if(poster&&foremost){
      poster.colorSpace=THREE.SRGBColorSpace;poster.anisotropy=Math.min(4,gl.capabilities.getMaxAnisotropy());
      const image=poster.image as HTMLImageElement,ratio=Math.max(.8,(image.naturalWidth||image.width)/(image.naturalHeight||image.height));
      const print=new THREE.Mesh(new THREE.PlaneGeometry(2.17,Math.min(2.7,2.17/ratio)),new THREE.MeshBasicMaterial({map:poster,toneMapped:false}));print.position.set(0,.108,0);print.rotation.x=-Math.PI/2;
      (foremost as Three.Mesh).add(print);
     }
     const cobalt=new THREE.MeshPhysicalMaterial({color:'#3768a0',roughness:.24,metalness:.18}),porcelain=new THREE.MeshPhysicalMaterial({color:'#f3f7fb',roughness:.24,metalness:.08});
     const shape=(points:number[][],depth=.075)=>{const path=new THREE.Shape();points.forEach(([x,y],index)=>{if(index)path.lineTo(x,y);else path.moveTo(x,y);});path.closePath();return new THREE.ExtrudeGeometry(path,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025});};
     const glyphs=[new THREE.Group(),new THREE.Group(),new THREE.Group()];glyphs.forEach(glyph=>content.add(glyph));
     const document=new THREE.Mesh(shape([[-.26,-.34],[.26,-.34],[.26,.19],[.11,.34],[-.26,.34]]),porcelain);glyphs[0].add(document);
     for(let row=0;row<3;row++){const rule=new THREE.Mesh(new THREE.BoxGeometry(row===2?.22:.31,.025,.018),cobalt);rule.position.set(row===2?-.045:0,.12-row*.115,.13);glyphs[0].add(rule);}
     const bracket=shape([[-.02,.25],[-.22,0],[-.02,-.25],[.06,-.18],[-.08,0],[.06,.18]]);
     const left=new THREE.Mesh(bracket,cobalt),right=new THREE.Mesh(bracket,porcelain);left.position.x=-.10;right.rotation.z=Math.PI;right.position.x=.15;glyphs[1].add(left,right);
     glyphs[2].add(new THREE.Mesh(shape([[-.21,.32],[.21,.32],[.21,-.32],[0,-.17],[-.21,-.32]]),cobalt));
     const clock={value:0},wallMaterial=new THREE.ShaderMaterial({depthWrite:false,toneMapped:false,uniforms:{uTime:clock},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
      varying vec2 vUv;uniform float uTime;
      void main(){
       vec2 p=vUv*2.-1.;vec2 flow=vec2(sin(p.y*3.+uTime*.16),cos(p.x*2.5-uTime*.12))*.22;
       float wash=smoothstep(-.9,.8,p.x*.48+p.y*.68+flow.x+flow.y);
       vec3 color=mix(vec3(.69,.81,.92),vec3(.89,.94,.97),wash);
       float lilac=smoothstep(.05,1.4,p.x-p.y*.55+flow.y);
       color=mix(color,vec3(.79,.80,.91),lilac*.24);
       gl_FragColor=vec4(color,1.);
       #include <colorspace_fragment>
      }
     `});
     const wall=new THREE.Mesh(new THREE.PlaneGeometry(24,18),wallMaterial);wall.position.z=-4;wall.renderOrder=-10;root.add(wall);
     // A sparse, non-emissive current adds depth around the pages, behind every solid glyph.
     const particleBase=new Float32Array(30*3),particlePhase=new Float32Array(30);
     for(let index=0;index<30;index++){particleBase[index*3]=((index*.61803398875)%1-.5)*6.4;particleBase[index*3+1]=((index*.38196601125+.17)%1-.5)*4.5;particleBase[index*3+2]=-1.55+(index%5)*.08;particlePhase[index]=index*.65;}
     const particleGeometry=new THREE.BufferGeometry();particleGeometry.setAttribute('position',new THREE.BufferAttribute(particleBase,3));particleGeometry.setAttribute('aPhase',new THREE.BufferAttribute(particlePhase,1));
     const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.NormalBlending,toneMapped:false,uniforms:{uTime:clock,uSize:{value:2.1*gl.getPixelRatio()},uColor:{value:new THREE.Color('#5b8db7')}},vertexShader:'uniform float uSize,uTime;attribute float aPhase;void main(){float phase=uTime*.12+aPhase;vec3 drift=vec3(sin(phase)*.12,cos(phase)*.18,sin(phase)*.04);vec4 p=modelViewMatrix*vec4(position+drift,1.);gl_Position=projectionMatrix*p;gl_PointSize=uSize*(8./max(1.,-p.z));}',fragmentShader:`
      uniform vec3 uColor;
      void main(){float coverage=1.-smoothstep(.08,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(uColor,coverage*.26);
       #include <colorspace_fragment>
      }
     `});
     const particles=new THREE.Points(particleGeometry,particleMaterial);particles.frustumCulled=false;root.add(particles);
     const key=new THREE.DirectionalLight('#f5faff',2.2);key.position.set(-4,5,7);root.add(key);
     const rim=new THREE.DirectionalLight('#bddbfa',.8);rim.position.set(4,-1,3);root.add(rim);
     // Prepare programs while the nearby poster is still visible. Drivers with
     // parallel shader compilation need not block the first animated frame.
     await gl.compileAsync(root,camera,scene);if(!alive)return;
     runtime.current={content,glyphs,wall:wallMaterial,time:0,rotationX:.02,rotationY:-.13,ready:false};setWorld(root);invalidate();
    }catch{if(alive)callbacks.current.onError();}
   };
   void load();
   return()=>{if(!alive)return;alive=false;abort.abort();runtime.current=null;interaction.current.invalidate=()=>{};gl.domElement.removeEventListener('webglcontextlost',lost);const disposedTextures=owned?disposeObject(owned):new Set<Three.Texture>();owned=null;if(parsed){disposeObject(parsed);parsed=null;}if(poster&&!disposedTextures.has(poster))poster.dispose();poster=null;if(environment){if(scene.environment===environment.texture)scene.environment=previousEnvironment;environment.dispose();}};
  },[gl,scene,camera,invalidate,posterSrc,interaction]);
  useFrame((_,delta)=>{
   const state=runtime.current;if(!state)return;
   if(running&&!reduced)state.time+=Math.min(delta,.05);
   const input=interaction.current,time=reduced?0:state.time;
   const targetX=.02+(reduced?0:input.y*.09),targetY=-.13+(reduced?0:input.x*.13+input.drag);
   state.rotationX=reduced?targetX:THREE.MathUtils.damp(state.rotationX,targetX,7,Math.min(delta,.05));state.rotationY=reduced?targetY:THREE.MathUtils.damp(state.rotationY,targetY,7,Math.min(delta,.05));
   state.content.rotation.set(state.rotationX,state.rotationY,-.08+(reduced?0:Math.sin(time*.35)*.018));state.content.position.y=reduced?0:Math.sin(time*.5)*.035;
   state.glyphs.forEach((glyph,index)=>{glyph.position.set(glyphPlaces[index][0],glyphPlaces[index][1]+(reduced?0:Math.sin(time*.7+index*2)*.075),glyphPlaces[index][2]);glyph.rotation.set(.08,.10+(reduced?0:Math.sin(time*.45+index)*.12),(index-1)*.15);});
   state.wall.uniforms.uTime.value=time;scene.environmentRotation.y=reduced?0:Math.sin(time*.17)*.075;
   if(!state.ready){state.ready=true;queueMicrotask(()=>{if(runtime.current===state)callbacks.current.onReady();});}
   if(!running&&interactive&&(Math.abs(state.rotationX-targetX)+Math.abs(state.rotationY-targetY)>.001))invalidate();
  });
  return world?<primitive object={world} dispose={null}/>:null;
 }
 return{default:function ResourceScene(props:SceneProps){return <Canvas className="home-resource-canvas" aria-hidden="true" dpr={[1,1.5]} camera={{position:[0,.02,7.4],fov:38,near:.1,far:35}} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} frameloop={props.running?'always':'demand'} resize={{scroll:false,debounce:{scroll:0,resize:120}}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1;}}><SculptureScene {...props}/></Canvas>;}};
});

class SculptureBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return{failed:true};}
 componentDidCatch(){this.props.onError();}
 render(){return this.state.failed?null:this.props.children;}
}

export function HomeResourceSculpture({posterSrc,label,pauseLabel,playLabel}:SculptureProps){
 const host=useRef<HTMLDivElement>(null),interaction=useRef<Interaction>({x:0,y:0,drag:0,pressed:false,lastX:0,invalidate:()=>{}});
 const [enabled,setEnabled]=useState(false),[visible,setVisible]=useState(false),[hidden,setHidden]=useState(false),[reduced,setReduced]=useState(true),[printing,setPrinting]=useState(false),[paused,setPaused]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>setReduced(preference.matches),visibility=()=>setHidden(document.hidden),beforePrint=()=>setPrinting(true),afterPrint=()=>setPrinting(false);motion();visibility();
  const nearby=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setEnabled(true);nearby.disconnect();}},{rootMargin:'220px'}),viewport=new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{threshold:.01});nearby.observe(element);viewport.observe(element);
  preference.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
  return()=>{nearby.disconnect();viewport.disconnect();preference.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);};
 },[]);
 const move=(event:ReactPointerEvent<HTMLDivElement>)=>{if(reduced)return;const rect=event.currentTarget.getBoundingClientRect(),state=interaction.current;if(event.pointerType!=='touch'){state.x=(event.clientX-rect.left)/Math.max(1,rect.width)*2-1;state.y=(event.clientY-rect.top)/Math.max(1,rect.height)*2-1;}if(state.pressed){state.drag+=(event.clientX-state.lastX)*.005;state.lastX=event.clientX;}state.invalidate();};
 const down=(event:ReactPointerEvent<HTMLDivElement>)=>{if(reduced||event.button>0)return;interaction.current.pressed=true;interaction.current.lastX=event.clientX;event.currentTarget.setPointerCapture(event.pointerId);};
 const leave=()=>{interaction.current.x=interaction.current.y=0;interaction.current.pressed=false;interaction.current.invalidate();};
 const interactive=visible&&!hidden&&!reduced&&!printing,running=interactive&&!paused;
 return <div ref={host} className="home-resource-sculpture" data-ready={ready&&!failed?'true':'false'}>
  <div className="home-resource-art" role="img" aria-label={label} onPointerMove={move} onPointerDown={down} onPointerUp={()=>{interaction.current.pressed=false;}} onPointerCancel={leave} onPointerLeave={leave}>
   <img className="home-resource-poster" src={posterSrc} alt="" loading="lazy" decoding="async"/>
   {enabled&&!failed&&<SculptureBoundary onError={()=>setFailed(true)}><Suspense fallback={null}><ResourceCanvas running={running} interactive={interactive} reduced={reduced} posterSrc={posterSrc} interaction={interaction} onReady={()=>setReady(true)} onError={()=>setFailed(true)}/></Suspense></SculptureBoundary>}
  </div>
  {ready&&!failed&&!reduced&&<button className="home-resource-pause" type="button" aria-label={paused?playLabel:pauseLabel} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{paused?<path d="m9 5 10 7-10 7Z"/>:<path d="M9 5v14M15 5v14"/>}</svg></button>}
 </div>;
}
