import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {Box3,Mesh,MeshPhysicalMaterial,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {interiorModels,interiorSceneForPath} from '../src/lib/interior-scene.mjs';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/interior-glass.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function studio(kind='community',overrides={}){
 const bytes=await readFile(new URL('../public'+interiorModels[kind],import.meta.url));let scene,releases=0,environmentReleases=0,width=1,height=1,ratio=1;const sizes=[],ratios=[];
 class Renderer{setPixelRatio(value){ratio=value;ratios.push(value);}setSize(w,h){width=w;height=h;sizes.push([w,h]);}getDrawingBufferSize(target){return target.set(width*ratio,height*ratio);}getRenderTarget(){return null;}render(value){scene=value;}dispose(){releases++;}}
 class PMREM{fromScene(){return{texture:new three.Texture(),dispose(){environmentReleases++;}};}dispose(){}}
 class Room extends three.Scene{dispose(){}}
 const exports={};
 vm.runInNewContext(source,{exports,Math,DOMException,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}),require:name=>{
  if(name==='three')return{...three,...overrides,WebGLRenderer:Renderer,PMREMGenerator:PMREM};
  if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};
  if(name==='three/addons/environments/RoomEnvironment.js')return{RoomEnvironment:Room};
  if(name==='./interior-scene.mjs')return{interiorModels};
  throw Error('Unexpected '+name);
 }});
 const controller=new AbortController(),adapter=await exports.createInteriorGlass({},controller.signal,kind);adapter.resize(1440,900,2);adapter.render(0,0,false,1.05,false);
 const glass=[];scene.traverse(node=>{if(node.isMesh&&node.material instanceof three.MeshPhysicalMaterial)glass.push(node);});
 const wall=scene.children.find(node=>node.isMesh&&node.material instanceof three.ShaderMaterial);
 return{adapter,controller,glass,wall,sizes,ratios,get releases(){return releases;},get environmentReleases(){return environmentReleases;}};
}

test('interior routes select three native sculptures independently of the homepage mark',()=>{
 for(const path of ['/community','/community/members/member','/community/search?q=glass'])assert.equal(interiorSceneForPath(path),'community');
 for(const path of ['/resources','/resources?type=skills','/skills/design','/docs/getting-started'])assert.equal(interiorSceneForPath(path),'resources');
 for(const path of ['/login','/join','/reset-password'])assert.equal(interiorSceneForPath(path),'login');
 assert.equal(new Set(Object.values(interiorModels)).size,3);
 assert.ok(!Object.values(interiorModels).includes('/models/spaceyew-glass.glb'));
});

test('all original Blender exports are bounded real glass volumes and stay under 110KB',async()=>{
 const signatures=[];
 for(const [kind,url]of Object.entries(interiorModels)){
  const bytes=await readFile(new URL('../public'+url,import.meta.url));
  assert.ok(bytes.length<110000,kind+' remains a small deferred asset');
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const meshes=[];scene.traverse(node=>{if(node instanceof Mesh)meshes.push(node)});
  assert.equal(meshes.length,kind==='community'?2:3);
  assert.ok(new Box3().setFromObject(scene,true).getSize(new Vector3()).y>2.8,'Blender Z-up becomes upright glTF Y-up rather than a flat horizontal slab');
  for(const mesh of meshes){
   const bounds=new Box3().setFromObject(mesh,true).getSize(new Vector3());assert.ok(bounds.x>0&&bounds.y>0&&bounds.z>.1,'closed, non-flat glass geometry');
   assert.match(mesh.userData.authorship,/Original SpaceYew interior/);
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   for(const material of materials){assert.ok(material instanceof MeshPhysicalMaterial);assert.equal(material.transmission,1);assert.ok(Math.abs(material.ior-1.46)<1e-6);assert.ok(material.roughness<.1);material.dispose()}
   mesh.geometry.dispose();
  }
  signatures.push(meshes.map(mesh=>mesh.geometry.attributes.position.count).join(','));
 }
 assert.equal(new Set(signatures).size,3,'the three pages contain genuinely different meshes');
});

test('interior glass keeps native RGB volume rays with bounded hardware filtering and safe shader fallback',async()=>{
 const original=three.ShaderChunk.transmission_pars_fragment,standard=three.ShaderLib.physical.fragmentShader;
 for(const kind of Object.keys(interiorModels)){
  const s=await studio(kind),shader={fragmentShader:standard};s.glass[0].material.onBeforeCompile(shader,{});
  assert.ok(shader.fragmentShader.includes('return textureLod( transmissionSamplerMap, fragCoord.xy, lod );'),'hardware sampling retains the native roughness mip instead of forcing a sharper surface');
  assert.ok(!shader.fragmentShader.includes('return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );'));
  assert.ok(shader.fragmentShader.includes('for ( int i = 0; i < 3; i ++ )')&&shader.fragmentShader.includes('getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix )'),'all spectral volume channels keep their physical ray direction');
  assert.equal(three.ShaderChunk.transmission_pars_fragment,original,'other Three materials never receive a global shader mutation');
  assert.ok(1440*900*s.ratios.at(-1)**2<=2400001);const calls=s.sizes.length;s.adapter.resize(1440,900,2);assert.equal(s.sizes.length,calls,'unchanged observers do not reallocate render targets');s.adapter.resize(390,844,2);assert.ok(390*844*s.ratios.at(-1)**2<=850001);
  s.controller.abort();s.adapter.dispose();assert.equal(s.releases,1);assert.equal(s.environmentReleases,1);s.adapter.render(1,1,false,2,false);s.adapter.resize(1440,900,2);assert.equal(s.sizes.length,calls+1,'disposed scenes ignore future work');
 }
 for(const overrides of[{REVISION:'188'},{ShaderChunk:{...three.ShaderChunk,transmission_pars_fragment:'unrecognized shader'}}]){
  const s=await studio('community',overrides),shader={fragmentShader:standard};s.glass[0].material.onBeforeCompile(shader,{});assert.equal(shader.fragmentShader,standard,'unrecognized Three versions/templates keep the standard shader');s.adapter.dispose();
 }
});

// The interior lifecycle offsets progress to avoid home folding; color starts at
// document zero even in reduced motion and still follows native page scrolling.
test('interior studio normalizes lifecycle progress while keeping the same four blue stops',async()=>{
 for(const kind of Object.keys(interiorModels)){
  const s=await studio(kind),uniforms=s.wall.material.uniforms;
  assert.equal(uniforms.uProgress.value,0);
  assert.deepEqual(['uTop','uBlue','uBottom','uIce'].map(key=>uniforms[key].value.getHexString()),['070f29','1858c9','c4dff4','eef4fa']);
  s.adapter.render(0,0,false,2.55,false);assert.ok(Math.abs(uniforms.uProgress.value-1.5)<1e-9);
  s.adapter.render(0,0,false,3.45,true);assert.ok(Math.abs(uniforms.uProgress.value-2.4)<1e-9,'reduced motion retains the document background without moving the sculpture');
  s.adapter.render(0,0,false,.5,false);assert.equal(uniforms.uProgress.value,0);
  s.adapter.dispose();
 }
});
