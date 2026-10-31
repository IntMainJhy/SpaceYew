import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-glass.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function studio(){
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-glass.glb',import.meta.url));let scene,camera,environment,releases=0,dpr,transmissionSize;
 class Renderer{setPixelRatio(value){dpr=value;}setSize(){}dispose(){releases++;}render(s,c){scene=s;camera=c;scene.updateMatrixWorld(true);camera.updateMatrixWorld();}set transmissionResolutionScale(value){transmissionSize=value;}}
 class PMREM{fromScene(value){environment=value;return{texture:new three.Texture(),dispose(){}};}dispose(){}}
 const exports={};vm.runInNewContext(source,{exports,AbortController,DOMException,Math,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}),require:name=>{
  if(name==='three')return{...three,WebGLRenderer:Renderer,PMREMGenerator:PMREM};if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};throw Error('Unexpected dependency '+name);
 }});
 const controller=new AbortController(),canvas={dataset:{}},adapter=await exports.createHomeGlass(canvas,controller.signal);adapter.resize(1440,900,2);adapter.render(0,0,false,0,false,0);
 const mark=scene.children.find(node=>node.isGroup),wall=scene.children.find(node=>node.isMesh),folds=[];mark.traverse(node=>{if(node.isMesh)folds.push(node);});
 return{adapter,controller,canvas,mark,wall,folds,get scene(){return scene;},get camera(){return camera;},get environment(){return environment;},get releases(){return releases;},get dpr(){return dpr;},get transmissionSize(){return transmissionSize;}};
}

test('native glass retains real geometry, volume and spectral refraction while the studio supplies high-contrast reflections',async()=>{
 const s=await studio();assert.equal(s.folds.length,2);assert.equal(s.adapter.animated,true);assert.ok(s.folds.every(fold=>fold.geometry.attributes.position.count===640),'the authored native mesh remains intact');
 for(const fold of s.folds){const material=fold.material;assert.ok(material instanceof three.MeshPhysicalMaterial);assert.equal(material.transmission,1);assert.equal(material.opacity,1);assert.ok(material.ior>=1.45&&material.ior<=1.55);assert.ok(material.thickness>.4);assert.ok(material.dispersion>.5);assert.ok(material.roughness<.05);}
 const powers=s.environment.children.map(panel=>Math.max(panel.material.color.r,panel.material.color.g,panel.material.color.b));assert.ok(Math.max(...powers)>5,'reflections receive actual HDR studio emitters');assert.ok(Math.min(...powers)<.01,'dark flags give the glass legible volume');
 const guides=s.scene.getObjectByName('spaceyew-transmission-guides');assert.equal(guides.children.length,2);for(const guide of guides.children){assert.ok(guide.geometry.isBufferGeometry&&guide.geometry.type==='TubeGeometry');assert.ok(guide.material.isMeshBasicMaterial&&!guide.material.transparent,'opaque fixture geometry is sampled by the real transmission pass');assert.ok(Math.max(guide.material.color.r,guide.material.color.g,guide.material.color.b)<.8,'source colors keep headroom instead of clipping into white paint');const attribute=guide.geometry.attributes.position;for(let i=0;i<attribute.count;i++)assert.ok(new three.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(guide.matrixWorld).z<-.6,'light structure is behind the native glass volume');for(const t of[0,1]){const point=guide.geometry.parameters.path.getPoint(t).applyMatrix4(guide.matrixWorld).project(s.camera);assert.ok(Math.abs(point.x)>1.1||Math.abs(point.y)>1.1,'fixture ends leave the viewport rather than dangling in the content corridor');}}
 assert.ok(s.wall.material.isShaderMaterial);assert.equal(s.wall.material.toneMapped,false);assert.ok(s.wall.position.z<0,'the rendered receiver lies behind the glass in the transmission view');assert.equal(s.dpr,1.5);assert.equal(s.transmissionSize,.6);s.adapter.dispose();
});

test('scrolling preserves a blue optical world and keeps the two folds around the centered opening',async()=>{
 const s=await studio();const opening=s.folds.map(fold=>new three.Box3().setFromObject(fold,true).getCenter(new three.Vector3()).project(s.camera).x);
 assert.ok(opening[0]<-.45&&opening[1]>.45,'glass framing leaves a central content corridor');
 const fixture=s.scene.getObjectByName('spaceyew-transmission-guides'),fixedFixture=fixture.matrixWorld.clone();
 const palette=['uBlueTop','uBlueMiddle','uBlueBottom'].map(key=>s.wall.material.uniforms[key].value.clone());
 for(const progress of[0,.5,1.2,3,6]){s.adapter.render(0,0,false,progress,false,0);for(let i=0;i<palette.length;i++){const color=s.wall.material.uniforms[['uBlueTop','uBlueMiddle','uBlueBottom'][i]].value;assert.ok(color.equals(palette[i]),'reading sections retain the same blue receiver palette');assert.ok(color.b>color.r*4&&color.b>color.g*2,'the receiver remains blue rather than becoming paper');}}
 assert.ok(fixture.matrixWorld.equals(fixedFixture),'scroll poses do not attach the background fixtures to the folded glass');
 s.adapter.resize(390,844,2);s.adapter.render(0,0,false,0,false,0);assert.equal(s.dpr,1.25);assert.equal(s.transmissionSize,.42);assert.ok(s.mark.position.y<0,'phone glass lives below the opening copy');const upper=Math.max(...s.folds.map(fold=>{const point=new three.Box3().setFromObject(fold,true).max;return point.project(s.camera).y;}));const shoulder=(1-upper)*.5*844;assert.ok(shoulder>290&&shoulder<360,'phone glass begins shortly below the actions instead of leaving a large empty interval');s.adapter.dispose();
});

test('active time moves lighting and native poses, while reduced motion is still and disposal is idempotent',async()=>{
 const s=await studio(),startRotation=s.mark.quaternion.clone(),startLight=s.scene.environmentRotation.y,positions=s.folds.map(fold=>fold.geometry.attributes.position.version);
 s.adapter.render(0,0,false,0,false,4);assert.ok(startRotation.angleTo(s.mark.quaternion)>.01);assert.ok(Math.abs(startLight-s.scene.environmentRotation.y)>.1);assert.equal(s.canvas.dataset.glassTime,'4.0');
 s.adapter.render(0,0,false,0,true,40);const quietPose=s.mark.quaternion.clone(),quietLight=s.scene.environmentRotation.y,quietCamera=s.camera.position.clone(),quietFold=s.folds[0].position.clone();s.adapter.render(1,1,false,5,true,80);assert.ok(quietPose.angleTo(s.mark.quaternion)<1e-8);assert.equal(s.scene.environmentRotation.y,quietLight);assert.ok(quietCamera.distanceTo(s.camera.position)<1e-10,'reduced motion does not push the camera while scrolling');assert.ok(quietFold.distanceTo(s.folds[0].position)<1e-10,'reduced motion keeps the folded frame spatially still');assert.equal(s.canvas.dataset.glassTime,'0.0');assert.deepEqual(s.folds.map(fold=>fold.geometry.attributes.position.version),positions,'animation does not regenerate or replace native geometry');
 s.controller.abort();assert.equal(s.releases,1);s.adapter.dispose();assert.equal(s.releases,1);s.adapter.render(0,0,false,0,false,5);assert.equal(s.releases,1);
});
