import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const bytes=fs.readFileSync(new URL('../public/models/spaceyew-home-kinetic.glb',import.meta.url));
const buffer=()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-kinetic.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

class TrackedTarget extends EventTarget{
 listeners=new Map();dataset={};hidden=false;
 addEventListener(name,handler,options){super.addEventListener(name,handler,options);if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(handler);}
 removeEventListener(name,handler,options){super.removeEventListener(name,handler,options);this.listeners.get(name)?.delete(handler);}
 get listenerCount(){return [...this.listeners.values()].reduce((sum,entries)=>sum+entries.size,0);}
 getBoundingClientRect(){return{left:0,top:100,width:700,height:520};}
 setPointerCapture(){this.captures=(this.captures||0)+1;}
 closest(){return this.interactive?this:null;}
}
async function runtime({reduced=false,failRender=false,abortAfterParse=false}={}){
 const host=new TrackedTarget(),canvas=new TrackedTarget(),window=new TrackedTarget(),document=new TrackedTarget(),preference=new TrackedTarget(),signal=new TrackedTarget();signal.aborted=false;preference.matches=reduced;
 const abort=()=>{signal.aborted=true;signal.dispatchEvent(new Event('abort'));};
 const frames=new Map(),resize=[],intersection=[],resourceCounts=new Map(),studioResourceCounts=new Map();let nextFrame=1,scene,camera,model,studio,environmentTexture,environmentBuilds=0,draws=0,releases=0,environmentReleases=0,dpr=0;const studioFields=[];
 const track=object=>{if(!object||resourceCounts.has(object))return;resourceCounts.set(object,0);object.addEventListener('dispose',()=>resourceCounts.set(object,resourceCounts.get(object)+1));};
 const trackStudio=object=>{if(studioResourceCounts.has(object))return;studioResourceCounts.set(object,0);object.addEventListener('dispose',()=>studioResourceCounts.set(object,studioResourceCounts.get(object)+1));};
 const trackModel=object=>object.traverse(node=>{if(node.isMesh){track(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])track(material);}});
 class Loader extends GLTFLoader{async parseAsync(...args){const gltf=await super.parseAsync(...args);model=gltf.scene;trackModel(model);if(abortAfterParse)abort();return gltf;}}
 class Renderer{setPixelRatio(value){dpr=value;}setSize(){}dispose(){releases++;}render(s,c){scene=s;camera=c;trackModel(scene);draws++;if(failRender)throw Error('GPU render unavailable');scene.updateMatrixWorld(true);camera.updateMatrixWorld();}}
 class PMREM{fromScene(value){studio=value;environmentBuilds++;value.updateMatrixWorld(true);value.traverse(node=>{if(!node.isMesh)return;const material=Array.isArray(node.material)?node.material[0]:node.material;trackStudio(node.geometry);for(const item of Array.isArray(node.material)?node.material:[node.material])trackStudio(item);node.geometry.computeBoundingBox();studioFields.push({object:node,size:node.geometry.boundingBox.getSize(new three.Vector3()).multiply(node.scale).toArray().map(Math.abs),color:material.color?.clone(),material});});environmentTexture=new three.Texture();return{texture:environmentTexture,dispose(){environmentReleases++;}};}dispose(){}}
 class Resize{constructor(callback){this.callback=callback;this.disconnects=0;resize.push(this);}observe(){}disconnect(){this.disconnects++;}}
 class Intersection{constructor(callback){this.callback=callback;this.disconnects=0;intersection.push(this);}observe(){}disconnect(){this.disconnects++;}}
 const exports={};vm.runInNewContext(source,{exports,DOMException,Math,Number,fetch:async()=>({ok:true,arrayBuffer:async()=>buffer()}),requestAnimationFrame:callback=>{const id=nextFrame++;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:Resize,IntersectionObserver:Intersection,matchMedia:()=>preference,devicePixelRatio:3,innerHeight:900,document,window,require:name=>{if(name==='three')return{...three,WebGLRenderer:Renderer,PMREMGenerator:PMREM};if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader:Loader};throw Error('Unexpected dependency '+name);}});
 let adapter,error;try{adapter=await exports.mountHomeKinetic(canvas,host,signal);}catch(caught){error=caught;}
 return{adapter,error,host,canvas,window,document,preference,resize,intersection,frames,resourceCounts,studioResourceCounts,abort,get model(){return model;},get studio(){return studio;},studioFields,get environmentTexture(){return environmentTexture;},get environmentBuilds(){return environmentBuilds;},get scene(){return scene;},get camera(){return camera;},get draws(){return draws;},get releases(){return releases;},get environmentReleases(){return environmentReleases;},get dpr(){return dpr;},visible(value){intersection[0].callback([{isIntersecting:value}]);},step(now){const queued=[...frames.values()];frames.clear();for(const callback of queued)callback(now);}};
}

test('the deferred Blender mobile contains three genuinely volumetric ribbons and three independent discovery nodes',async()=>{
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.ok(bytes.length<350_000,'the native sculpture stays a small deferred asset');
 const {scene}=await new GLTFLoader().parseAsync(buffer(),'');const meshes=[];scene.traverse(node=>{if(node.isMesh)meshes.push(node);});
 assert.equal(meshes.length,6);
 for(let index=0;index<3;index++){
  const ribbon=scene.getObjectByName('PrismArc_'+index),node=scene.getObjectByName('DiscoveryNode_'+index);assert.ok(ribbon&&node,'runtime selections resolve actual meshes');assert.equal(ribbon.userData.role,'closed_refractive_ribbon');
  const size=new three.Box3().setFromObject(ribbon,true).getSize(new three.Vector3());assert.ok(size.x>3&&size.y>2&&size.z>.8,'ribbons have an upright sculpted silhouette and real depth');
  const edges=new Map(),positions=ribbon.geometry.attributes.position,indices=ribbon.geometry.index,key=index=>[positions.getX(index),positions.getY(index),positions.getZ(index)].map(value=>Math.round(value*1e5)).join(',');
  for(let triangle=0;triangle<indices.count;triangle+=3){const vertices=[indices.getX(triangle),indices.getX(triangle+1),indices.getX(triangle+2)].map(key);for(let edge=0;edge<3;edge++){const ends=[vertices[edge],vertices[(edge+1)%3]];if(ends[0]===ends[1])continue;const id=ends.sort().join('|');edges.set(id,(edges.get(id)||0)+1);}}
  assert.ok([...edges.values()].every(count=>count===2),'each welded edge has two faces: the twisted optical ribbon is watertight');
  for(const mesh of[ribbon,node]){assert.ok(mesh.material instanceof three.MeshPhysicalMaterial&&mesh.material.transmission===1);const positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;assert.equal(positions.count,normals.count);for(let vertex=0;vertex<positions.count;vertex++){const point=new three.Vector3().fromBufferAttribute(positions,vertex),normal=new three.Vector3().fromBufferAttribute(normals,vertex);assert.ok(point.toArray().every(Number.isFinite)&&point.length()<4);assert.ok(normal.toArray().every(Number.isFinite)&&Math.abs(normal.length()-1)<1e-4);}}
 }
 const materials=new Set();for(const mesh of meshes){mesh.geometry.dispose();materials.add(mesh.material);}materials.forEach(material=>material.dispose());
});

test('kinetic activity pauses offscreen and hidden, selection stays finite, and reduced motion preserves usable controls',async()=>{
 const s=await runtime();assert.ifError(s.error);const quietEnvironment=s.scene.environmentRotation.toArray(),nativeAttributes=[];s.model.traverse(node=>{if(node.isMesh)for(const attribute of Object.values(node.geometry.attributes))nativeAttributes.push([attribute,attribute.version]);});assert.equal(s.host.dataset.kinetic,'ready');assert.equal(s.frames.size,0,'initial preparation does not schedule an offscreen loop');assert.ok(s.dpr<=1.6);
 s.visible(true);s.step(0);s.step(40);const reflectionPose=s.scene.environmentRotation.toArray();assert.notDeepEqual(reflectionPose,quietEnvironment,'ambient movement changes only the reflection environment and native sculpture');assert.ok(s.frames.size>0);
 s.adapter.pause(true);s.step(80);assert.deepEqual(s.scene.environmentRotation.toArray(),reflectionPose,'pause freezes ambient reflection movement');assert.equal(s.frames.size,0);
 s.adapter.pause(false);s.step(120);assert.notDeepEqual(s.scene.environmentRotation.toArray(),reflectionPose);
 s.visible(false);assert.equal(s.frames.size,0,'leaving the viewport cancels the next frame');s.visible(true);s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,0);s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));
 s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));s.step(160);assert.deepEqual(s.scene.environmentRotation.toArray(),quietEnvironment);assert.equal(s.frames.size,0,'reduced motion leaves no ambient render loop');
 const sculpture=s.scene.children.find(node=>node.isGroup),initialPose=sculpture.quaternion.clone();s.adapter.select(1.6);assert.notDeepEqual(sculpture.quaternion.toArray(),initialPose.toArray(),'selection changes the native sculpture pose');const pose=sculpture.quaternion.clone();s.adapter.select(NaN);s.adapter.select(Infinity);assert.deepEqual(sculpture.quaternion.toArray(),pose.toArray(),'invalid control values never corrupt the camera or model');
 assert.equal(s.model.getObjectByName('DiscoveryNode_2').scale.x,1.3);s.adapter.select(-9);assert.equal(s.model.getObjectByName('DiscoveryNode_0').scale.x,1.3);for(const [attribute,version]of nativeAttributes)assert.equal(attribute.version,version,'controls update transforms without regenerating native positions, normals or UVs');s.adapter.dispose();
});

test('kinetic renders every 60/120/144Hz callback with refresh-independent motion and damping',async()=>{
 const rotations=[];
 for(const hz of[60,120,144]){
  const s=await runtime();assert.ifError(s.error);s.visible(true);s.adapter.select(1);
  s.host.dispatchEvent(Object.assign(new Event('pointermove'),{pointerType:'mouse',clientX:600,clientY:300}));
  const before=s.draws;for(let index=0;index<=hz;index++)s.step(index*1000/hz);
  assert.equal(s.draws-before,hz+1,'a high-refresh callback is not discarded at '+hz+'Hz');
  rotations.push(s.scene.children.find(node=>node.isGroup).quaternion.clone());
  s.adapter.pause(true);for(let index=0;index<hz*2;index++)s.step(1100+index*1000/hz);assert.equal(s.frames.size,0,'paused damping settles instead of retaining a busy loop');s.adapter.dispose();
 }
 for(const rotation of rotations.slice(1))assert.ok(rotation.angleTo(rotations[0])<1e-7,'wall-clock motion and exponential damping agree across display refresh rates');
});

test('abort releases shared materials, observers and listeners exactly once; stale controls never draw again',async()=>{
 const s=await runtime({reduced:true});s.visible(true);s.step(0);s.abort();assert.equal(s.releases,1);assert.equal(s.environmentReleases,1);assert.equal(s.frames.size,0);
 for(const target of[s.host,s.canvas,s.window,s.document,s.preference])assert.equal(target.listenerCount,0,'every mounted listener is removed');for(const observer of[...s.resize,...s.intersection])assert.equal(observer.disconnects,1);
 assert.ok(s.resourceCounts.size>10);for(const count of s.resourceCounts.values())assert.equal(count,1,'shared mesh resources release once');const draws=s.draws;s.adapter.select(1);s.adapter.pause(false);s.resize[0].callback();s.adapter.dispose();s.abort();assert.equal(s.draws,draws);assert.equal(s.releases,1);
});

test('failed startup and an abort during parsing dispose without leaving an observer or render loop',async()=>{
 const failed=await runtime({failRender:true});assert.match(failed.error.message,/GPU render unavailable/);assert.equal(failed.releases,1);assert.equal(failed.environmentReleases,1);for(const target of[failed.host,failed.canvas,failed.window,failed.document,failed.preference])assert.equal(target.listenerCount,0);for(const observer of[...failed.resize,...failed.intersection])assert.equal(observer.disconnects,1);assert.equal(failed.frames.size,0);for(const count of failed.resourceCounts.values())assert.equal(count,1);
 const aborted=await runtime({abortAfterParse:true});assert.equal(aborted.error.name,'AbortError');assert.equal(aborted.releases,0,'an aborted asset never constructs a GPU renderer');assert.equal(aborted.resize.length,0);assert.equal(aborted.intersection.length,0);for(const count of aborted.resourceCounts.values())assert.equal(count,1);
});


test('a lost GPU context exposes the static fallback and cannot be restarted by controls or visibility',async()=>{
 const s=await runtime();s.visible(true);s.step(0);const event=new Event('webglcontextlost',{cancelable:true});s.canvas.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(s.host.dataset.kinetic,'fallback');assert.equal(s.frames.size,0);const draws=s.draws;s.adapter.select(2);s.adapter.pause(false);s.window.dispatchEvent(new Event('afterprint'));s.document.dispatchEvent(new Event('visibilitychange'));s.resize[0].callback();assert.equal(s.frames.size,0);assert.equal(s.draws,draws);s.adapter.dispose();assert.equal(s.releases,1);
});


test('the pause button keeps its native click while dragging captures only the sculpture surface',async()=>{
 const s=await runtime();const down=()=>{const event=new Event('pointerdown');Object.assign(event,{pointerType:'mouse',pointerId:1,clientX:100});s.host.dispatchEvent(event);};s.host.interactive=true;down();assert.equal(s.host.captures,undefined,'an interactive descendant must retain its native pointer sequence');assert.equal(s.host.dataset.dragging,undefined);s.host.interactive=false;down();assert.equal(s.host.captures,1);assert.equal(s.host.dataset.dragging,'true');s.host.dispatchEvent(new Event('pointerup'));assert.equal(s.host.dataset.dragging,undefined);s.adapter.dispose();
});


test('illumination fixtures stay in the detached reflection studio and the visible scene contains only glass with a plain receiver',async()=>{
 const s=await runtime();assert.ifError(s.error);assert.equal(s.environmentBuilds,1,'the reflection field is prepared once, independently of animation');assert.ok(s.studio?.isScene&&s.studio!==s.scene);assert.equal(s.studio.parent,null);assert.equal(s.scene.environment,s.environmentTexture);
 for(const count of s.studioResourceCounts.values())assert.equal(count,1,'temporary studio geometry and materials release immediately after the PMREM bake');
 assert.ok(s.studioFields.length>=3,'broad softboxes and flags give the glass directional reflected contrast');
 for(const field of s.studioFields){const dimensions=field.size.toSorted((a,b)=>b-a);assert.ok(dimensions[1]>=1.5,'a reflection fixture has two broad dimensions rather than a narrow luminous shaft');assert.ok(field.material.isMeshBasicMaterial);assert.equal(field.material.side,three.BackSide);}
 assert.ok(s.studioFields.some(field=>field.color&&Math.max(field.color.r,field.color.g,field.color.b)>1),'HDR energy exists in the reflection field without displaying a source');
 const native=new Set(),rendered=[];s.model.traverse(node=>{if(node.isMesh)native.add(node);});s.scene.traverse(node=>{if(node.isMesh)rendered.push(node);});assert.equal(native.size,6);assert.equal(rendered.length,native.size+1,'no visible light shafts, halos, caustic hoops or extra luminous geometry is rendered');
 const [receiver]=rendered.filter(mesh=>!native.has(mesh));assert.ok(receiver?.geometry.type==='PlaneGeometry'&&receiver.material.isShaderMaterial);assert.equal(receiver.material.transparent,false);assert.equal(receiver.material.blending,three.NormalBlending);assert.equal(receiver.material.depthWrite,true);assert.ok(receiver.position.z<0);assert.ok(receiver.geometry.parameters.width>=10&&receiver.geometry.parameters.height>=10,'the only non-model mesh is a broad backdrop');
 for(const field of s.studioFields)assert.ok(!rendered.includes(field.object),'environment fixture geometry never enters the visible or transmission scene');
 for(const mesh of rendered){assert.notEqual(mesh.material.blending,three.AdditiveBlending);if(mesh.material.isMeshPhysicalMaterial)assert.equal(mesh.material.transmission,1,'the real glass material remains transmissive');}
 s.visible(true);s.step(0);s.step(1000);s.adapter.select(2);assert.equal(s.environmentBuilds,1,'control and time changes rotate the cached field without rebuilding or exposing fixtures');s.adapter.dispose();
});
