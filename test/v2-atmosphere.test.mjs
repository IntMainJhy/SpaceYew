import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/V2Atmosphere.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function mount({reduced=false,available=true,linked=true,width=1400,height=900}={}){
 class Target extends EventTarget{
  listeners=new Set();dataset={};style={};
  addEventListener(name,fn,options){super.addEventListener(name,fn,options);this.listeners.add(name)}
  removeEventListener(name,fn){super.removeEventListener(name,fn);this.listeners.delete(name)}
  getBoundingClientRect(){return{left:0,top:0,width,height}}
 }
 const preference=Object.assign(new Target(),{matches:reduced}),root=new Target(),host=new Target(),document=Object.assign(new Target(),{hidden:false,documentElement:root}),window=Object.assign(new Target(),{devicePixelRatio:3,matchMedia:()=>preference});
 const deleted={shaders:0,programs:0,buffers:0},uniforms=new Map();let draws=0;
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,TRIANGLES:8,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,deleteShader(){deleted.shaders++},
  createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>linked,deleteProgram(){deleted.programs++},
  createBuffer:()=>({}),useProgram(){},bindBuffer(){},bufferData(){},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},deleteBuffer(){deleted.buffers++},
  getUniformLocation:(_,name)=>name,uniform2f:(name,...values)=>uniforms.set(name,values),uniform1f:(name,value)=>uniforms.set(name,value),viewport(){},drawArrays(){draws++}
 };
 const canvas=Object.assign(new Target(),{parentElement:host,getContext:()=>available?gl:null});
 let resize,intersection,theme,now=0,id=0;const frames=new Map();
 class Resize{constructor(fn){this.fn=fn;resize=this}observe(target){assert.equal(target,host)}disconnect(){this.disconnected=true}}
 class Intersection{constructor(fn){this.fn=fn;intersection=this}observe(target){assert.equal(target,canvas)}disconnect(){this.disconnected=true}set(value){this.fn([{isIntersecting:value}])}}
 class Mutation{constructor(fn){this.fn=fn;theme=this}observe(target){assert.equal(target,root)}disconnect(){this.disconnected=true}}
 const exports={};
 vm.runInNewContext(source,{exports,window,document,ResizeObserver:Resize,IntersectionObserver:Intersection,MutationObserver:Mutation,requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:key=>frames.delete(key),require:name=>{
  if(name==='react')return{useEffect(){},useRef(){}};
  if(name==='react/jsx-runtime')return{jsx(){}};
  throw Error('Unexpected dependency '+name);
 }});
 const cleanup=exports.mountV2Atmosphere(canvas),step=(ms=35)=>{now+=ms;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now))};
 return{canvas,host,window,document,root,preference,resize,intersection,theme,frames,uniforms,deleted,cleanup,step,get draws(){return draws}};
}

test('atmosphere draws an immediate frame, caps GPU resolution, and pauses while offscreen, hidden, reduced or printing',()=>{
 const s=mount();assert.equal(s.draws,1);assert.equal(s.canvas.width,2100);assert.equal(s.canvas.height,1350);assert.equal(s.frames.size,0);
 s.intersection.set(true);assert.equal(s.frames.size,1);s.step(16);const first=s.draws;s.step(16);assert.equal(s.draws,first,'GPU draws are capped near 30 fps');s.step();assert.ok(s.uniforms.get('time')>0);
 for(const[field,target,event]of[['hidden',s.document,'visibilitychange'],['matches',s.preference,'change']]){
  target[field]=true;target.dispatchEvent(new Event(event));assert.equal(s.frames.size,0);
  target[field]=false;target.dispatchEvent(new Event(event));assert.equal(s.frames.size,1);
 }
 s.window.dispatchEvent(new Event('beforeprint'));assert.equal(s.frames.size,0);
 s.window.dispatchEvent(new Event('afterprint'));assert.equal(s.frames.size,1);
 s.intersection.set(false);assert.equal(s.frames.size,0);
 s.root.dataset.colorMode='dark';s.theme.fn();assert.equal(s.uniforms.get('dark'),1);
 s.cleanup();assert.deepEqual(s.deleted,{shaders:2,programs:1,buffers:1});assert.equal(s.frames.size,0);
 assert.ok(s.resize.disconnected&&s.intersection.disconnected&&s.theme.disconnected);
 assert.equal(s.host.listeners.size+s.canvas.listeners.size+s.document.listeners.size+s.window.listeners.size+s.preference.listeners.size,0);
 const mobile=mount({reduced:true,width:390,height:844});assert.equal(mobile.canvas.width,488);assert.equal(mobile.draws,1);mobile.intersection.set(true);assert.equal(mobile.frames.size,0);mobile.cleanup();
});

test('unavailable or lost WebGL keeps the parent fallback and releases partially created resources',()=>{
 const missing=mount({available:false});assert.equal(missing.frames.size,0);assert.equal(missing.host.listeners.size,0);missing.cleanup();
 const failed=mount({linked:false});assert.equal(failed.canvas.dataset.atmosphere,'fallback');assert.deepEqual(failed.deleted,{shaders:2,programs:1,buffers:0});assert.equal(failed.host.listeners.size,0);failed.cleanup();
 const lost=mount();lost.intersection.set(true);lost.canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
 assert.equal(lost.frames.size,0);assert.equal(lost.canvas.style.opacity,'0');assert.equal(lost.canvas.dataset.atmosphere,'fallback');lost.cleanup();assert.deepEqual(lost.deleted,{shaders:2,programs:1,buffers:1});
});
