import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeWindGallery.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const bytes=fs.readFileSync(new URL('../public/models/spaceyew-home-wind.glb',import.meta.url));
async function runtime(hz){
 class Target extends EventTarget{
  dataset={};style={};listeners=new Map();
  addEventListener(type,fn,options){super.addEventListener(type,fn,options);if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn,options){super.removeEventListener(type,fn,options);this.listeners.get(type)?.delete(fn);}
  getBoundingClientRect(){return{left:0,top:0,width:1400,height:600};}
  removeAttribute(name){delete this.dataset[name.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];}
  get listenerCount(){return[...this.listeners.values()].reduce((sum,set)=>sum+set.size,0);}
 }
 const host=new Target(),canvas=new Target(),document=Object.assign(new Target(),{hidden:false,fonts:{ready:Promise.resolve()}}),preference=Object.assign(new Target(),{matches:false}),window=Object.assign(new Target(),{devicePixelRatio:2,matchMedia:()=>preference});
 const context=new Proxy({measureText:text=>({width:text.length*40})},{get:(target,key)=>target[key]||(()=>{})});document.createElement=()=>({width:0,height:0,getContext:()=>context});
 const links=Array.from({length:4},()=>({style:{}})),control={current:()=>{}},paused={current:false},refs=[{current:host},{current:canvas},{current:links},control,paused],frames=new Map(),observers=[],resize=[];let next=1,effect,cleanup,draws=0,releases=0,scene,model,refIndex=0;
 class Renderer{capabilities={getMaxAnisotropy:()=>4};setPixelRatio(){}setClearColor(){}setSize(){}dispose(){releases++;}render(s,c){scene=s;draws++;s.updateMatrixWorld(true);c.updateMatrixWorld();}}
 class Loader{async loadAsync(){const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');model=gltf.scene;return gltf;}}
 class Intersection{constructor(fn,options){this.fn=fn;this.options=options;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 class Resize{constructor(fn){this.fn=fn;resize.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 const exports={};vm.runInNewContext(source,{exports,window,document,ResizeObserver:Resize,IntersectionObserver:Intersection,setTimeout,clearTimeout,requestAnimationFrame:fn=>{const id=next++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),require:name=>{
  if(name==='react')return{useEffect:fn=>{effect=fn;},useId:()=> 'wind',useRef:()=>refs[refIndex++],useState:initial=>[initial,()=>{}]};
  if(name==='react/jsx-runtime')return{jsx:()=>({}),jsxs:()=>({})};
  if(name==='three')return{...three,WebGLRenderer:Renderer};
  if(name==='three/examples/jsm/loaders/GLTFLoader.js')return{GLTFLoader:Loader};
  if(name==='./LocaleProvider')return{useLocale:()=>({locale:'zh'})};return{};
 }});
 exports.HomeWindGallery({items:Array.from({length:4},(_,index)=>({title:'Panel '+index,category:'Blog',description:'Native semantic panel',href:'/blog/'+index})),heading:'Wind',hint:'Move'});cleanup=effect();
 const prepare=observers.find(observer=>observer.options?.rootMargin),visible=observers.find(observer=>!observer.options?.rootMargin);prepare.fn([{isIntersecting:true}]);
 for(let turn=0;turn<20&&host.dataset.wind!=='ready';turn++)await new Promise(resolve=>setImmediate(resolve));assert.equal(host.dataset.wind,'ready');
 let now=0;const step=()=>{now+=1000/hz;const queued=[...frames.values()];frames.clear();for(const fn of queued)fn(now);};
 return{host,canvas,document,window,preference,frames,observers,resize,links,cleanup,step,get model(){return model;},get scene(){return scene;},get draws(){return draws;},get releases(){return releases;},visible(value){visible.fn([{isIntersecting:value}]);},pause(value){paused.current=value;control.current();}};
}

test('wind follows 120/144Hz while GPU deformation keeps native vertex buffers unchanged',async()=>{
 for(const hz of[120,144]){
  const s=await runtime(hz);assert.equal(s.frames.size,0,'prewarming alone does not animate an offscreen gallery');const attributes=[];s.model.traverse(node=>{if(node.isMesh)for(const attribute of Object.values(node.geometry.attributes))attributes.push([attribute,attribute.version]);});
  s.visible(true);const start=s.draws;for(let index=0;index<hz;index++)s.step();assert.equal(s.draws-start,hz,'every visible display callback renders at '+hz+'Hz');
  for(const [attribute,version] of attributes)assert.equal(attribute.version,version,'CPU frames never rewrite positions, normals or UVs');
  const shaders=[];s.scene.traverse(node=>{if(node.isMesh&&node.material.customProgramCacheKey()==='spaceyew-analytic-silk-r187'){const shader={uniforms:{},vertexShader:three.ShaderLib.physical.vertexShader};node.material.onBeforeCompile(shader,{});shaders.push(shader);}});assert.equal(shaders.length,8,'four fabrics and sewn hems share the native GPU motion');assert.ok(shaders.every(shader=>shader.uniforms.uWindTime.value>.95&&shader.uniforms.uWindReduced.value===0));
  s.pause(true);s.step();assert.equal(s.frames.size,0,'pause settles without a continuous render loop');s.pause(false);s.step();assert.equal(s.frames.size,1);
  s.visible(false);assert.equal(s.frames.size,0);s.visible(true);s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,0);s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));s.step();assert.equal(s.frames.size,1);
  s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));s.step();assert.equal(s.frames.size,0);assert.ok(shaders.every(shader=>shader.uniforms.uWindReduced.value===1),'reduced motion restores the native flat geometry');
  s.cleanup();assert.equal(s.frames.size,0);assert.equal(s.releases,1);assert.ok(s.observers.every(observer=>observer.disconnected)&&s.resize.every(observer=>observer.disconnected));for(const target of[s.host,s.canvas,s.document,s.window,s.preference])assert.equal(target.listenerCount,0);
 }
});

test('wind context loss remains a static semantic fallback and cannot restart the GPU',async()=>{
 const s=await runtime(144);s.visible(true);s.step();const event=new Event('webglcontextlost',{cancelable:true});s.canvas.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(s.host.dataset.wind,'fallback');const before=s.draws;s.pause(false);s.visible(true);s.step();assert.equal(s.draws,before);assert.equal(s.frames.size,0);assert.equal(s.links.length,4,'semantic links remain outside the failed canvas');s.cleanup();assert.equal(s.releases,1);
});
