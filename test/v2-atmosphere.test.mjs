import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {Box3,Mesh,MeshPhysicalMaterial,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/V2Atmosphere.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function mount({reduced=false,width=1400,height=900,loading=false,failed=false,animated=false}={}){
 class Target extends EventTarget{
  listeners=new Set();dataset={};style={};
  addEventListener(name,fn,options){super.addEventListener(name,fn,options);this.listeners.add(name)}
  removeEventListener(name,fn){super.removeEventListener(name,fn);this.listeners.delete(name)}
  getBoundingClientRect(){return{left:0,top:this.top||0,width,height}}
 }
 const preference=Object.assign(new Target(),{matches:reduced}),root=new Target(),host=new Target(),document=Object.assign(new Target(),{hidden:false,documentElement:root}),window=Object.assign(new Target(),{devicePixelRatio:3,matchMedia:()=>preference});
 const surface=new Target(),canvas=Object.assign(new Target(),{parentElement:surface,closest:selector=>selector==='.v2-home'?host:null});
 const draws=[],sizes=[];let releases=0,resolve,reject,signal;
 const adapter={animated,resize:(...args)=>sizes.push(args),render:(...args)=>draws.push(args),dispose:()=>releases++};
 let resize,intersection,theme,now=0,id=0;const frames=new Map();
 class Resize{constructor(fn){this.fn=fn;resize=this}observe(){}disconnect(){this.disconnected=true}}
 class Intersection{constructor(fn){this.fn=fn;intersection=this}observe(){}disconnect(){this.disconnected=true}set(value){this.fn([{isIntersecting:value}])}}
 class Mutation{constructor(fn){this.fn=fn;theme=this}observe(){}disconnect(){this.disconnected=true}}
 const exports={};
 vm.runInNewContext(source,{exports,window,document,AbortController,Math,ResizeObserver:Resize,IntersectionObserver:Intersection,MutationObserver:Mutation,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:key=>frames.delete(key),require:name=>{
  if(name==='react')return{useEffect(){},useRef(){}};
  if(name==='react/jsx-runtime')return{jsx(){}};
  throw Error('Unexpected dependency '+name);
 }});
 const cleanup=exports.mountV2Atmosphere(canvas,(_,abortSignal)=>{
  signal=abortSignal;
  if(failed)return Promise.reject(Error('Model or WebGL unavailable'));
  return loading?new Promise((a,b)=>{resolve=a;reject=b}):Promise.resolve(adapter);
 });
 const step=(ms=35)=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now))};
 const move=(x=width,y=height,pointerType='mouse')=>host.dispatchEvent(Object.assign(new Event('pointermove'),{clientX:x,clientY:y,pointerType}));
 return{canvas,host,window,document,root,preference,get resize(){return resize},intersection,theme,frames,draws,sizes,cleanup,step,move,signal,adapter,get releases(){return releases},resolve:()=>resolve(adapter),reject:()=>reject(Error('Load failed'))};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve()};

test('glass follows the pointer with damping, caps redraws and resolution, and stops when idle or outside the viewport',async()=>{
 const s=mount();s.intersection.set(true);await flush();
 assert.ok(1400*900*s.sizes.at(-1)[2]**2<=8000001);assert.equal(s.draws.length,1);assert.equal(s.frames.size,0,'no continuous idle GPU loop');
 s.move();s.step(16);assert.ok(s.draws.at(-1)[0]>0&&s.draws.at(-1)[0]<1,'smooth rather than instant camera motion');
 const first=s.draws.length;s.step(16);assert.equal(s.draws.length,first,'draws capped near 30 fps');
 for(let i=0;i<100;i++)s.step();assert.equal(s.frames.size,0,'settled camera sleeps');
 s.host.dispatchEvent(new Event('pointerleave'));assert.equal(s.frames.size,1);
 s.intersection.set(false);assert.equal(s.frames.size,0);
 const offscreen=s.draws.length;s.move(0,0);s.theme.fn();assert.equal(s.draws.length,offscreen);
 s.intersection.set(true);assert.equal(s.frames.size,1);
 s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,0);
 s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,1);
 s.window.dispatchEvent(new Event('beforeprint'));assert.equal(s.frames.size,0);
 s.window.dispatchEvent(new Event('afterprint'));assert.equal(s.frames.size,1);
 s.root.dataset.colorMode='dark';s.theme.fn();assert.equal(s.draws.at(-1)[2],true);
 s.cleanup();assert.equal(s.releases,1);assert.equal(s.signal.aborted,true);assert.equal(s.frames.size,0);
 assert.ok(s.resize.disconnected&&s.intersection.disconnected&&s.theme.disconnected);
 assert.equal(s.host.listeners.size+s.canvas.listeners.size+s.document.listeners.size+s.window.listeners.size+s.preference.listeners.size,0);
});

test('touch and reduced motion keep the glass static, including preference changes during movement',async()=>{
 const s=mount({reduced:true,width:390,height:844});s.intersection.set(true);await flush();
 assert.deepEqual(s.sizes.at(-1),[390,844,2]);assert.equal(s.draws.length,1);s.move();assert.equal(s.frames.size,0);
 s.preference.matches=false;s.preference.dispatchEvent(new Event('change'));s.move(390,844,'touch');assert.equal(s.frames.size,0);
 s.move();s.step();assert.ok(s.draws.at(-1)[0]>0);
 s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));
 assert.deepEqual(s.draws.at(-1),[0,0,false,0,true]);assert.equal(s.frames.size,0);s.cleanup();
});

test('scrolling below the hero redraws the same viewport canvas and coalesces scroll events, including reduced motion',async()=>{
 const s=mount({reduced:true});s.intersection.set(true);await flush();
 s.host.top=-1800;for(let i=0;i<12;i++)s.window.dispatchEvent(new Event('scroll'));
 assert.equal(s.frames.size,1,'scroll events share one pending frame');
 const before=s.draws.length;s.step();assert.equal(s.draws.length,before+1);
 assert.deepEqual(s.draws.at(-1),[0,0,false,2,true],'reading colors update without enabling spatial motion');
 assert.equal(s.frames.size,0);assert.deepEqual(s.sizes.at(-1).slice(0,2),[1400,900],'GPU target stays viewport-sized');
 s.window.dispatchEvent(new Event('scroll'));s.step(16);assert.equal(s.draws.length,before+1,'independent scroll events still respect the 30fps ceiling');s.step(19);assert.equal(s.draws.length,before+2);
 s.intersection.set(false);s.host.top=-2700;s.window.dispatchEvent(new Event('scroll'));s.step();assert.equal(s.draws.length,before+2);
 s.intersection.set(true);assert.equal(s.draws.at(-1)[3],3);s.cleanup();assert.equal(s.window.listeners.size,0);
});

test('interaction cadence retains 30fps on a 60Hz display, bounds pixels, and lowers resolution under sustained load',async()=>{
 const s=mount({animated:true,width:2560,height:1440});s.intersection.set(true);await flush();
 assert.ok(2560*1440*s.sizes.at(-1)[2]**2<=8000001,'large displays retain a high-resolution total pixel budget');
 const start=s.draws.length;for(let i=0;i<600;i++){s.window.dispatchEvent(new Event('scroll'));s.step(1000/60);}
 assert.ok(s.draws.length-start>=299&&s.draws.length-start<=301,'30fps does not fall to 20fps through floating-point drift');
 const before=s.draws.at(-1)[5],dpr=s.sizes.at(-1)[2];for(let i=0;i<30;i++){s.window.dispatchEvent(new Event('scroll'));s.step(100);}
 assert.ok(s.draws.at(-1)[5]-before>2.8,'visible animation time does not slow to half speed when frames are late');
 assert.ok(s.sizes.at(-1)[2]<dpr&&s.sizes.at(-1)[2]>=dpr*.85,'sustained late frames use a bounded reduction that preserves fine edges');
 const sizes=s.sizes.length;s.resize.fn();assert.equal(s.sizes.length,sizes,'unchanged bounds do not rebuild render targets');s.cleanup();
});

test('load failures, context loss and unmount during a late load preserve the CSS fallback and release resources',async()=>{
 const failed=mount({failed:true});await flush();assert.equal(failed.canvas.dataset.atmosphere,'fallback');assert.equal(failed.host.listeners.size,0);failed.cleanup();
 const pending=mount({loading:true});pending.cleanup();assert.equal(pending.signal.aborted,true);pending.resolve();await flush();assert.equal(pending.releases,1);assert.equal(pending.draws.length,0);
 const lost=mount();lost.intersection.set(true);await flush();lost.move();
 lost.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(lost.frames.size,0);assert.equal(lost.canvas.style.opacity,'0');assert.equal(lost.canvas.dataset.atmosphere,'fallback');
 lost.cleanup();assert.equal(lost.releases,1);
});

test('the shipped original GLB loads as two bounded glass meshes with real transmission and volume',async()=>{
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-glass.glb',import.meta.url));
 assert.ok(bytes.length<64*1024,'small self-contained model');
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const meshes=[];gltf.scene.traverse(node=>{if(node instanceof Mesh)meshes.push(node)});assert.equal(meshes.length,2);
 const size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());assert.ok(size.x>2&&size.y>3&&size.z>.4);
 for(const mesh of meshes){assert.ok(mesh.material instanceof MeshPhysicalMaterial);assert.equal(mesh.material.transmission,1);assert.ok(mesh.material.thickness>.4);mesh.geometry.dispose();mesh.material.dispose()}
});


test('the optical studio keeps light motion active while visible and retains an opaque rendered backdrop throughout reading',async()=>{
 const s=mount({animated:true});s.intersection.set(true);await flush();assert.equal(s.draws.at(-1)[5],0);assert.equal(s.frames.size,1);
 s.step();s.step();const time=s.draws.at(-1)[5];assert.ok(time>0);assert.equal(s.frames.size,1,'visible strip-light reflections have a continuing clock');
 s.host.top=-2700;s.window.dispatchEvent(new Event('scroll'));s.step();assert.equal(s.canvas.style.opacity,'1','reading sections retain the optical scene');assert.equal(s.draws.at(-1)[3],3);
 for(const [pause,resume] of[
  [()=>{s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));},()=>{s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));}],
  [()=>s.intersection.set(false),()=>s.intersection.set(true)],
  [()=>s.window.dispatchEvent(new Event('beforeprint')),()=>s.window.dispatchEvent(new Event('afterprint'))]
 ]){const before=s.draws.at(-1)[5];pause();assert.equal(s.frames.size,0);s.step(60000);resume();assert.equal(s.draws.at(-1)[5],before,'inactive time is not replayed');s.step();assert.ok(s.draws.at(-1)[5]-before<=.05);}
 s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));assert.equal(s.frames.size,0);const frozen=s.draws.at(-1)[5];s.step(10000);s.theme.fn();s.resize.fn();assert.equal(s.draws.at(-1)[5],frozen);s.cleanup();assert.equal(s.releases,1);
});
