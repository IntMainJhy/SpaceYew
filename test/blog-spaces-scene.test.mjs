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
 const geometry=meshes[0].geometry,position=geometry.getAttribute('position'),a=new three.Vector3(),b=new three.Vector3(),c=new three.Vector3();
 assert.ok(geometry.index.count/3<1600,'each authored page has a bounded geometry cost');
 for(let i=0;i<geometry.index.count;i+=3){
  a.fromBufferAttribute(position,geometry.index.getX(i));b.fromBufferAttribute(position,geometry.index.getX(i+1));c.fromBufferAttribute(position,geometry.index.getX(i+2));
  const area=b.sub(a).cross(c.sub(a)).length()/2;assert.ok(Number.isFinite(area)&&area>1e-7,'native bevel triangles have real area instead of a collapsed front/back seam');
 }
 geometry.dispose();meshes[0].material.dispose();
});

test('readable previews sit on the front face while the inset perimeter keeps native physical glass',async()=>{
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-blog-panel.glb',import.meta.url));let scene,camera;
 class Renderer{capabilities={getMaxAnisotropy:()=>4};setPixelRatio(){}setSize(){}dispose(){}render(s,c){scene=s;camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld();}}
 class PMREM{fromScene(){return{texture:new three.Texture(),dispose(){}};}dispose(){}}
 const fills=[],context={clearRect(){},fillRect(...rect){fills.push(rect);},createLinearGradient:()=>({addColorStop(){}}),beginPath(){},roundRect(){},fill(){},moveTo(){},lineTo(){},stroke(){},arc(){},fillText(){},measureText:value=>({width:value.length*30})};
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
  assert.equal(content.material.alphaTest,0,'rounded corners use multisampled geometry coverage instead of a flickering texture discard');
  assert.ok(fills.some(rect=>rect.length===4&&rect[0]===0&&rect[1]===0&&rect[2]===1600&&rect[3]===1040),'the entire preview texture has an opaque painted background');
  assert.ok(content.geometry instanceof three.ShapeGeometry,'the readable surface has real rounded geometry');
  const position=content.geometry.getAttribute('position'),uv=content.geometry.getAttribute('uv'),normal=content.geometry.getAttribute('normal'),halfWidth=2.24,halfHeight=1.425,radius=.15,top=[],side=[];
  assert.equal(position.count,uv.count);assert.equal(position.count,normal.count);
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),y=position.getY(i),u=uv.getX(i),v=uv.getY(i);
   assert.ok([x,y,position.getZ(i),u,v,normal.getX(i),normal.getY(i),normal.getZ(i)].every(Number.isFinite),'rounded positions, UVs and normals remain finite');
   assert.ok(u>=-1e-6&&u<=1+1e-6&&v>=-1e-6&&v<=1+1e-6&&Math.abs(u-(x/(halfWidth*2)+.5))<1e-6&&Math.abs(v-(y/(halfHeight*2)+.5))<1e-6,'the rounded surface preserves normalized preview texture coordinates');
   assert.ok(Math.abs(normal.getX(i))<1e-6&&Math.abs(normal.getY(i))<1e-6&&Math.abs(normal.getZ(i)-1)<1e-6,'the readable face has forward unit normals');
   if(Math.abs(y-halfHeight)<1e-6)top.push(Math.abs(x));if(Math.abs(x-halfWidth)<1e-6)side.push(Math.abs(y));
  }
  assert.ok(top.length&&side.length&&Math.abs(Math.max(...top)-(halfWidth-radius))<1e-5&&Math.abs(Math.max(...side)-(halfHeight-radius))<1e-5,'the .15 corner radius leaves straight tangent edges without rectangular corner pixels');
  const index=content.geometry.index,a=new three.Vector3(),b=new three.Vector3(),c=new three.Vector3();assert.ok(index&&index.count>6);
  for(let i=0;i<index.count;i+=3){
   a.fromBufferAttribute(position,index.getX(i));b.fromBufferAttribute(position,index.getX(i+1));c.fromBufferAttribute(position,index.getX(i+2));const cross=b.sub(a).cross(c.sub(a));
   assert.ok(Number.isFinite(cross.z)&&cross.z>1e-7&&Math.abs(cross.x)<1e-7&&Math.abs(cross.y)<1e-7,'rounded preview triangles retain valid forward winding');
  }
  const glass=[];native.traverse(node=>{if(node.isMesh)glass.push(node);});assert.ok(glass.length&&bounds.getSize(new three.Vector3()).z>.2);
  for(const {material} of glass){
   assert.ok(material instanceof three.MeshPhysicalMaterial&&material.transmission===1&&material.thickness>.2&&material.ior>=1.5&&material.dispersion>=1&&material.envMapIntensity>0,'the authored rim retains real volume, refraction, spectral dispersion and reflections');
   assert.equal(material.side,three.FrontSide,'closed glass avoids the duplicate backface transmission pass');
  }
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
