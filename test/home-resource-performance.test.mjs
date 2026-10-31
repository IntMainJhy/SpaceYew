import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeResourceSculpture.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
async function sculpture({revision=three.REVISION,running=true,interactive=true,reduced=false}={}){
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-resources.glb',import.meta.url)),effects=[],frames=[],events=new Map(),scene=new three.Scene();
 let factory,world,environmentDisposals=0,invalidations=0,ready=0,errors=0,resolveWorld;
 const phases=[],loaded=new Promise(resolve=>resolveWorld=resolve),gl={domElement:{addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)},getPixelRatio:()=>1.5,capabilities:{getMaxAnisotropy:()=>4},async compileAsync(root,camera,target){assert.ok(root.isGroup&&camera.isCamera);assert.equal(target,scene);phases.push('compile');}};
 class PMREM{fromScene(){return{texture:new three.Texture(),dispose(){environmentDisposals++;}};}dispose(){}}
 class RoomEnvironment extends three.Scene{dispose(){}}
 class TextureLoader{async loadAsync(){const texture=new three.Texture();texture.image={width:1200,height:900};return texture;}}
 const React={Component:class{},Suspense:()=>null,lazy:fn=>{factory=fn;return()=>null;},useRef:initial=>({current:initial}),useState:initial=>[initial,value=>{phases.push('mount');world=value;resolveWorld();}],useEffect:fn=>effects.push(fn)};
 const exports={};
 vm.runInNewContext(source,{exports,AbortController,queueMicrotask,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}),require:name=>{
  if(name==='react')return React;
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(name==='@react-three/fiber')return{Canvas:()=>null,useFrame:fn=>frames.push(fn),useThree:()=>({gl,scene,camera:new three.PerspectiveCamera(),invalidate:()=>invalidations++})};
  if(name==='three')return{...three,REVISION:revision,PMREMGenerator:PMREM,TextureLoader};
  if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};
  if(name==='three/addons/environments/RoomEnvironment.js')return{RoomEnvironment};
  if(name.endsWith('.css'))return{};
  throw Error('Unexpected dependency '+name);
 }});
 const {default:ResourceScene}=await factory(),interaction={current:{x:.6,y:-.4,drag:.2,pressed:false,lastX:0,invalidate(){}}};
 const canvas=ResourceScene({running,interactive,reduced,posterSrc:'/poster.webp',interaction,onReady:()=>ready++,onError:()=>errors++}),body=canvas.props.children;
 body.type(body.props);const cleanup=effects[0]();await loaded;
 const glass=[],geometries=new Set(),materials=new Set();let wall,particles;
 world.traverse(node=>{if(node.isPoints)particles=node;if(node.isMesh){if(node.material.isShaderMaterial)wall=node;for(const material of Array.isArray(node.material)?node.material:[node.material])if(material.transmission===1)glass.push(material);}if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(material);});
 return{canvas,world,scene,glass,wall,particles,interaction,events,cleanup,geometries,materials,phases,tick:delta=>frames[0]({},delta),get environmentDisposals(){return environmentDisposals;},get invalidations(){return invalidations;},get ready(){return ready;},get errors(){return errors;}};
}

test('resource glass reduces transmission fetches without replacing RGB volume rays or shared Three shaders',async()=>{
 const original=three.ShaderChunk.transmission_pars_fragment,s=await sculpture();assert.equal(s.glass.length,3);assert.deepEqual(s.phases,['compile','mount'],'programs are prepared before the card enters its animated render loop');
 for(const material of s.glass){const shader={fragmentShader:three.ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader,{});assert.ok(shader.fragmentShader.includes('return textureLod( transmissionSamplerMap, fragCoord.xy, lod );'));assert.ok(shader.fragmentShader.includes('getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix )'));assert.equal(material.transmission,1);assert.ok(material.dispersion>0);const unknown={fragmentShader:'unknown template'};material.onBeforeCompile(unknown,{});assert.equal(unknown.fragmentShader,'unknown template');}
 assert.equal(three.ShaderChunk.transmission_pars_fragment,original);s.cleanup();
 const fallback=await sculpture({revision:'188'}),shader={fragmentShader:three.ShaderLib.physical.fragmentShader};fallback.glass[0].onBeforeCompile(shader,{});assert.equal(shader.fragmentShader,three.ShaderLib.physical.fragmentShader);fallback.cleanup();
});

test('resource motion follows elapsed seconds at 60, 120 and 144 Hz while particles remain on the GPU',async()=>{
 const rotations=[];
 for(const hz of [60,120,144]){
  const s=await sculpture(),positions=s.particles.geometry.getAttribute('position'),phase=s.particles.geometry.getAttribute('aPhase'),version=positions.version,values=positions.array.slice();
  assert.equal(phase.count,positions.count);assert.equal(s.particles.material.uniforms.uTime,s.wall.material.uniforms.uTime,'one clock drives particles and receiver');assert.ok(s.particles.material.vertexShader.includes('position+drift'));
  for(let frame=0;frame<hz;frame++)s.tick(1/hz);
  assert.ok(Math.abs(s.wall.material.uniforms.uTime.value-1)<1e-10);assert.equal(positions.version,version,'high-refresh animation does not upload the particle buffer');assert.deepEqual(positions.array,values);
  rotations.push(s.world.children[0].rotation.clone());assert.equal(s.canvas.props.frameloop,'always');s.cleanup();
 }
 for(const rotation of rotations.slice(1)){assert.ok(Math.abs(rotation.x-rotations[0].x)<1e-10);assert.ok(Math.abs(rotation.y-rotations[0].y)<1e-10);}
});

test('paused and reduced resource scenes are demand-rendered and cleanup releases each owned resource once',async()=>{
 for(const options of [{running:false,interactive:false},{running:false,interactive:false,reduced:true}]){
  const s=await sculpture(options);assert.equal(s.canvas.props.frameloop,'demand');const invalidations=s.invalidations;
  for(let frame=0;frame<144;frame++)s.tick(1/144);
  assert.equal(s.wall.material.uniforms.uTime.value,0);assert.equal(s.invalidations,invalidations,'a static scene does not ask Fiber to keep ticking');
  let disposed=0;const resources=[...s.geometries,...s.materials];for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  const event={preventDefault(){this.prevented=true;}};s.events.get('webglcontextlost')(event);assert.equal(event.prevented,true);assert.equal(s.errors,1);
  s.cleanup();s.cleanup();assert.equal(disposed,resources.length);assert.equal(s.environmentDisposals,1);assert.equal(s.events.size,0);assert.equal(s.scene.environment,null);
 }
});
