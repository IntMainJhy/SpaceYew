import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,Mesh,MeshPhysicalMaterial,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {interiorModels,interiorSceneForPath} from '../src/lib/interior-scene.mjs';

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
