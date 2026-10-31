import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const runtime={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/HomeWindGallery.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports:runtime,require:()=>({})});

test('the shipped wind model provides four upright, UV-mapped cloth grids with a pinned top and a winding cable',()=>{
 const bytes=readFileSync(new URL('../public/models/spaceyew-home-wind.glb',import.meta.url));
 assert.ok(bytes.length<500_000,'the deferred homepage model stays below 500KB');
 assert.equal(bytes.readUInt32LE(0),0x46546c67,'glTF binary signature');
 assert.equal(bytes.readUInt32LE(4),2,'glTF binary version');
 assert.equal(bytes.readUInt32LE(8),bytes.length,'complete binary asset');
 const chunks=new Map();
 for(let offset=12;offset<bytes.length;){
  const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);
  assert.ok(offset+8+length<=bytes.length,'chunk lies within the asset');
  chunks.set(type,bytes.subarray(offset+8,offset+8+length));offset+=8+length;
 }
 const gltf=JSON.parse(chunks.get(0x4e4f534a).toString('utf8')),binary=chunks.get(0x004e4942);
 assert.equal(gltf.asset.version,'2.0');assert.ok(binary,'embedded geometry is present');
 assert.ok([...(gltf.buffers||[]),...(gltf.images||[])].every(item=>!item.uri),'the GLB has no external or remote asset dependencies');
 assert.equal(gltf.buffers.length,1);assert.ok(binary.length>=gltf.buffers[0].byteLength);
 const attribute=(primitive,name)=>{
  const accessor=gltf.accessors[primitive.attributes[name]],view=gltf.bufferViews[accessor.bufferView];
  assert.equal(accessor.componentType,5126,name+' uses editable float components');
  assert.equal(view.buffer,0);
  const size=name==='POSITION'?3:2,stride=view.byteStride||size*4,start=(view.byteOffset||0)+(accessor.byteOffset||0);
  assert.equal(accessor.type,size===3?'VEC3':'VEC2');
  assert.ok(start+(accessor.count-1)*stride+size*4<=binary.length,'attribute stays within its embedded buffer');
  return Array.from({length:accessor.count},(_,index)=>Array.from({length:size},(_,component)=>binary.readFloatLE(start+index*stride+component*4)));
 };
 const cloths=gltf.nodes.filter(node=>/^WindFabric_\d+$/.test(node.name));
 assert.equal(cloths.length,4);
 for(let index=0;index<4;index++){
  const node=cloths.find(item=>item.name==='WindFabric_'+index);assert.ok(node,'each runtime lookup has a matching fabric');
  assert.equal(node.extras.pinned_edge,'top');
  assert.ok(node.extras.weave_columns>=24&&node.extras.weave_rows>=32,'wind has a sufficiently subdivided grid');
  const mesh=gltf.meshes[node.mesh];assert.equal(mesh.primitives.length,1);
  const primitive=mesh.primitives[0],positions=attribute(primitive,'POSITION'),uv=attribute(primitive,'TEXCOORD_0');
  assert.ok(positions.length>=1000);assert.equal(uv.length,positions.length);
  assert.equal(positions.length,(node.extras.weave_columns+1)*(node.extras.weave_rows+1));
  assert.equal(gltf.accessors[primitive.indices].count,node.extras.weave_columns*node.extras.weave_rows*6,'the grid is triangulated for local wind deformation');
  for(const [vertex,position]of positions.entries()){
   assert.ok(position.every(Number.isFinite)&&Math.abs(position[0])<1.1&&Math.abs(position[1])<1.4&&Math.abs(position[2])<.2,'finite bounded upright fabric coordinates');
   assert.ok(uv[vertex].every(value=>Number.isFinite(value)&&value>=0&&value<=1),'print coordinates remain inside the fabric');
  }
  const top=positions.map((position,vertex)=>({position,uv:uv[vertex]})).filter(({uv})=>uv[1]<1e-6);
  assert.equal(top.length,node.extras.weave_columns+1);
  assert.ok(top.every(({position})=>Math.abs(position[1]-1.28)<1e-5&&Math.abs(position[2])<1e-6),'the renderer’s y=1.28 wind anchor is the flat top edge');
  assert.ok(positions.some((position,vertex)=>uv[vertex][1]>.99&&position[1]<-1.2),'the UV print extends down the free hanging edge');
  const hem=gltf.nodes.find(item=>item.name==='WindHem_'+index);assert.ok(hem&&node.children.includes(gltf.nodes.indexOf(hem)),'the sewn hem follows its cloth parent');
  assert.ok(attribute(gltf.meshes[hem.mesh].primitives[0],'POSITION').length>=250,'the raised hem is actual deformable geometry');
 }
 const cable=gltf.nodes.find(node=>node.name==='WindCable');assert.ok(cable,'the desktop cable ships with the Blender model');
 const positions=attribute(gltf.meshes[cable.mesh].primitives[0],'POSITION'),range=axis=>Math.max(...positions.map(point=>point[axis]))-Math.min(...positions.map(point=>point[axis]));
 assert.ok(positions.every(position=>position.every(Number.isFinite)&&position.every(value=>Math.abs(value)<12)),'cable coordinates are finite and bounded');
 assert.ok(positions.length>=3000&&range(0)>20&&range(1)>.5&&range(2)>.005,'the fine cable spans past both wrap edges with a smooth detailed contour');
 assert.ok(positions.every(([x,y])=>Math.abs(y-runtime.windCableY(x))<.012),'moving fabric pins follow the same curve as the authored Blender cable');
});

test('desktop and mobile wind tracks loop outside the visible panel bounds without changing content order',()=>{
 for(const[spacing,span]of[[3.8,12.6],[2.8,5.4]]){
  const length=spacing*4;
  assert.ok(length/2>span/2+1.06,'the wrap point is beyond the camera plus half a fabric');
  for(const offset of[0,.25,3.8,20,1000,-2]){
   const xs=Array.from({length:4},(_,index)=>runtime.windTrackX(index,offset,spacing));
   assert.equal(new Set(xs.map(value=>value.toFixed(5))).size,4,'four semantic content panels remain distinct');
   for(let index=0;index<4;index++){
    assert.ok(Math.abs(xs[index]-runtime.windTrackX(index,offset+length,spacing))<1e-10,'one complete cycle is seamless');
    const next=xs[(index+1)%4],distance=((next-xs[index])%length+length)%length;
    assert.ok(Math.abs(distance-spacing)<1e-10,'adjacent content keeps the same spacing around the loop');
   }
  }
 }
});
