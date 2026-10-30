import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('the accepted Moon ships real bounded relief and self-contained 4K color/2K normal textures',()=>{
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-moon.glb',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 assert.ok(bytes.length<4*1024*1024,'bounded lunar download');
 const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString());
 assert.equal(doc.meshes.length,1);assert.ok(!doc.cameras?.length&&!doc.animations?.length,'only approved Moon geometry');
 const primitive=doc.meshes[0].primitives[0],position=doc.accessors[primitive.attributes.POSITION],normal=doc.accessors[primitive.attributes.NORMAL];
 assert.ok(position.count>30000);assert.equal(position.count,normal.count);assert.ok(primitive.attributes.TEXCOORD_0!==undefined);
 assert.ok(doc.materials[0].normalTexture,'crater detail has a baked normal map');
 const pbr=doc.materials[0].pbrMetallicRoughness;assert.equal(pbr.metallicFactor,0);assert.ok(pbr.roughnessFactor>.8);
 assert.ok(doc.images.every(img=>Number.isInteger(img.bufferView)&&!img.uri),'no remote texture dependencies');
 assert.ok(doc.buffers.every(buffer=>!buffer.uri));
 const binOffset=20+length+8,view=doc.bufferViews[position.bufferView],stride=view.byteStride||12;
 let min=Infinity,max=0;
 for(let i=0;i<position.count;i++){
  const offset=binOffset+(view.byteOffset||0)+(position.byteOffset||0)+i*stride;
  const xyz=[0,4,8].map(delta=>bytes.readFloatLE(offset+delta));assert.ok(xyz.every(Number.isFinite));
  const radius=Math.hypot(...xyz);min=Math.min(min,radius);max=Math.max(max,radius);
 }
 assert.ok(min>12&&max<13);assert.ok(max-min>.08,'measured terrain is geometry, not only a flat color sphere');
});
