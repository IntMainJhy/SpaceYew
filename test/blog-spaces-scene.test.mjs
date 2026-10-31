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
