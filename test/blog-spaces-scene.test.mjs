import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

test('the native Blender page is a small upright beveled volume with exported physical transmission',async()=>{
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-blog-panel.glb',import.meta.url));assert.ok(bytes.length<32*1024);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const meshes=[];
 gltf.scene.traverse(node=>{if(node.isMesh)meshes.push(node);});assert.equal(meshes.length,1);
 const size=new three.Box3().setFromObject(gltf.scene).getSize(new three.Vector3());assert.ok(Math.abs(size.x-4.8)<.001&&Math.abs(size.y-3.15)<.001&&Math.abs(size.z-.24)<.001,'the original GLB is an upright closed page, not a texture or flat plane');
 assert.ok(meshes[0].material instanceof three.MeshPhysicalMaterial);assert.equal(meshes[0].material.transmission,1);assert.ok(meshes[0].material.roughness<.02);
 assert.ok(meshes[0].geometry.index.count/3<1600,'each authored page has a bounded geometry cost');meshes[0].geometry.dispose();meshes[0].material.dispose();
});

test('readable previews sit on the front face while the inset perimeter keeps native physical glass',async()=>{
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-blog-panel.glb',import.meta.url));let scene,camera;
 class Renderer{capabilities={getMaxAnisotropy:()=>4};setPixelRatio(){}setSize(){}dispose(){}render(s,c){scene=s;camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld();}}
 class PMREM{fromScene(){return{texture:new three.Texture(),dispose(){}};}dispose(){}}
 const context={clearRect(){},createLinearGradient:()=>({addColorStop(){}}),beginPath(){},roundRect(){},fill(){},moveTo(){},lineTo(){},stroke(){},arc(){},fillText(){},measureText:value=>({width:value.length*30})};
 const output=ts.transpileModule(fs.readFileSync(new URL('../src/lib/blog-spaces-scene.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
 vm.runInNewContext(output,{exports,Math,DOMException,document:{createElement:()=>({getContext:()=>context})},fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}),require:name=>{
  if(name==='three')return{...three,WebGLRenderer:Renderer,PMREMGenerator:PMREM};if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};throw Error('Unexpected '+name);
 }});
 const adapter=await exports.createBlogSpacesScene({dataset:{}},[{handle:'test',name:'真实空间',intro:'可读的介绍',avatarId:'',coverId:'',href:'/blog/test'}],new AbortController().signal,()=>{});
 try{
  adapter.resize(1440,828,2);adapter.render(.26,0,0,false);
  const page=scene.children.find(node=>node.isGroup),content=page.children.find(node=>node.isMesh&&node.material.map?.isCanvasTexture),native=page.children.find(node=>node!==content);
  assert.ok(content,'the actual scene supplies a painted preview');
  const bounds=new three.Box3().setFromObject(native.clone()),preview=new three.Box3().setFromObject(content.clone());
  assert.ok(preview.min.z>bounds.max.z,'semantic content bypasses the lower-resolution volume transmission pass');
  assert.ok(preview.min.x>bounds.min.x&&preview.max.x<bounds.max.x&&preview.min.y>bounds.min.y&&preview.max.y<bounds.max.y,'an exposed native glass rim surrounds the readable preview');
  assert.ok(content.material.isMeshBasicMaterial&&content.material.opacity===1&&!content.material.transparent&&content.material.depthWrite&&content.material.depthTest,'opaque preview depth prevents glass from resampling its text');
  const glass=[];native.traverse(node=>{if(node.isMesh)glass.push(node);});assert.ok(glass.length&&bounds.getSize(new three.Vector3()).z>.2);
  for(const {material} of glass)assert.ok(material instanceof three.MeshPhysicalMaterial&&material.transmission===1&&material.thickness>.2&&material.ior>=1.5&&material.dispersion>=1&&material.envMapIntensity>0,'the authored rim retains real volume, refraction, spectral dispersion and reflections');
  for(const [width,height] of[[1440,828],[390,780]]){
   adapter.resize(width,height,2);adapter.render(.26,0,0,false);
   const point=content.getWorldPosition(new three.Vector3()).project(camera),ray=new three.Raycaster();ray.setFromCamera(new three.Vector2(point.x,point.y),camera);
   assert.equal(ray.intersectObject(page,true)[0]?.object,content,'the readable surface is the first hit in desktop and phone reading shots');
   assert.equal(adapter.pick(point.x,point.y),'/blog/test','the front preview still opens its native space');
  }
 }finally{adapter.dispose();}
});

test('the scroll camera passes every real panel in order and reduced motion never enters the fly-through',()=>{
 const output=ts.transpileModule(fs.readFileSync(new URL('../src/lib/blog-spaces-scene.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={};
 vm.runInNewContext(output,{exports,Math,require:name=>{if(name==='three')return three;if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};throw Error('Unexpected '+name);}});
 const camera=exports.blogJourneyCameraZ;
 for(const count of[1,2,8]){let previous=camera(0,count);assert.equal(previous,9);for(let i=1;i<=100;i++){const next=camera(i/100,count);assert.ok(Number.isFinite(next)&&next<=previous);previous=next;}assert.ok(camera(1,count)<-(count-1)*6.6-4,'the camera has passed the final actual page before the directory');assert.equal(camera(-1,count),9);assert.equal(camera(2,count),camera(1,count));for(const progress of[0,.5,1])assert.equal(camera(progress,count,true),9);}
 assert.equal(camera(1,0),9,'an empty directory never invents a flight');
 for(const [progress,index,aspect,mobile] of[[.48,1,1440/828,false],[.35,0,390/780,true]]){
  const z=camera(progress,2),pose=exports.blogJourneyPanelPose(z,index,aspect,mobile),view=new three.PerspectiveCamera(42,aspect,.1,180);view.position.z=z;view.updateMatrixWorld();
  const projected=new three.Vector3(pose.x,pose.y,pose.z).project(view),width=4.8*pose.scale/(2*Math.tan(three.MathUtils.degToRad(21))*(z-pose.z)*aspect);
  assert.ok(pose.visible&&Math.abs(projected.x)<.2&&Math.abs(projected.y)<.2,'the arriving real page is centred and recognisable during its reading shot');
  assert.ok(width>.55&&width<.94,'the projected page fills a useful bounded width instead of living outside the screen');
 }
 const reading=exports.blogJourneyPanelPose(6,0,1.7,false),passing=exports.blogJourneyPanelPose(1.8,0,1.7,false);assert.ok(Math.abs(passing.x)>Math.abs(reading.x)+2,'only the close pass peels the page sideways');
});
