import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-glass.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;

async function studio(overrides={}){
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-page.glb',import.meta.url));
 let scene,camera,environment,releases=0,dpr,transmissionSize,environmentBlur;
 class Renderer{
  setPixelRatio(value){dpr=value;}setSize(){}dispose(){releases++;}
  render(value,view){scene=value;camera=view;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
  set transmissionResolutionScale(value){transmissionSize=value;}
 }
 class PMREM{fromScene(value,blur){environment=value;environmentBlur=blur;return{texture:new three.Texture(),dispose(){}};}dispose(){}}
 const exports={};
 vm.runInNewContext(source,{exports,AbortController,DOMException,Math,fetch:async()=>({ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}),require:name=>{
  if(name==='three')return{...three,...overrides,WebGLRenderer:Renderer,PMREMGenerator:PMREM};
  if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};
  throw Error('Unexpected dependency '+name);
 }});
 const controller=new AbortController(),canvas={dataset:{}},adapter=await exports.createHomeGlass(canvas,controller.signal);
 adapter.resize(1440,900,2);adapter.render(0,0,false,0,false,0);
 const group=scene.children.find(node=>node.isGroup),wall=scene.children.find(node=>node.isMesh&&node.material.isShaderMaterial),meshes=[];
 group.traverse(node=>{if(node.isMesh)meshes.push(node)});
 return{adapter,controller,canvas,group,wall,meshes,get scene(){return scene;},get camera(){return camera;},get environment(){return environment;},get environmentBlur(){return environmentBlur;},get releases(){return releases;},get dpr(){return dpr;},get transmissionSize(){return transmissionSize;}};
}

test('the home glass is one authored curved page with restrained spectral volume',async()=>{
 const s=await studio();
 assert.equal(s.meshes.length,1,'the new home scene uses a single authored page');
 const material=s.meshes[0].material;
 assert.ok(material instanceof three.MeshPhysicalMaterial);
 assert.equal(material.transmission,1);
 assert.equal(material.opacity,1);
 assert.equal(material.color.getHexString(),'ffffff','the clear surface does not multiply a second tint onto volume transmission');
 assert.equal(material.toneMapped,false,'glass shares the receiver display mapping');
 assert.ok(material.ior>=1.4&&material.ior<=1.6);
 assert.ok(material.thickness>.3&&material.thickness<.6);
 assert.ok(material.roughness<=.04,'polished faces retain sharp transmission');
 assert.ok(material.dispersion>=2,'native RGB dispersion remains visible');
 assert.equal(material.envMap,null,'glass inherits the scene environment');
 assert.equal(s.adapter.animated,true);
 assert.equal(s.canvas.dataset.glassFilter,'physical-page');
 const powers=s.environment.children.map(panel=>Math.max(panel.material.color.r,panel.material.color.g,panel.material.color.b));
 assert.ok(Math.max(...powers)>5,'reflections receive actual HDR studio cards');
 assert.ok(Math.min(...powers)<.03,'negative fill gives glass real reflection contrast');
 assert.ok(s.environmentBlur>0&&s.environmentBlur<=.03,'a bounded angular diffusion keeps softboxes readable');
 s.adapter.dispose();
});

test('scroll recedes and fades the page while the receiver advances with the document',async()=>{
 const s=await studio();
 const opening={y:s.group.position.y,rotation:s.group.rotation.y,scroll:s.wall.material.uniforms.uScroll.value};
 s.adapter.render(0,0,false,.8,false,2);
 assert.ok(s.group.position.y>opening.y,'the page rises as the reader leaves the opening');
 assert.ok(s.group.rotation.y>opening.rotation,'the page turns during the exit');
 assert.ok(s.group.visible);
 assert.equal(s.wall.material.uniforms.uScroll.value,.8,'the receiver follows the same scroll progress');
 assert.equal(s.canvas.dataset.glassHeroVisible,'true');
 s.adapter.render(0,0,false,1.3,false,2);
 assert.equal(s.group.visible,false,'no folded mark remains after the hero');
 assert.equal(s.adapter.animated,false);
 assert.equal(s.adapter.interactive,false);
 assert.equal(s.canvas.dataset.glassHeroVisible,'false');
 s.adapter.render(0,0,false,0,false,2);
 assert.equal(s.group.visible,true,'returning to the top restores the opening');
 assert.ok(Math.abs(s.group.position.y-opening.y)<1e-6,'scroll reversal restores the pose without drift');
 s.adapter.dispose();
});

test('reduced motion keeps the page still while the light field still follows the document',async()=>{
 const s=await studio();
 s.adapter.render(0,0,false,0,true,0);
 const pose={position:s.group.position.clone(),rotation:s.group.quaternion.clone(),light:s.scene.environmentRotation.y};
 s.adapter.render(1,-1,false,.8,true,20);
 assert.ok(s.group.position.distanceTo(pose.position)<1e-10,'pointer and scroll do not push the page');
 assert.ok(s.group.quaternion.angleTo(pose.rotation)<1e-6,'reduced motion keeps the page orientation');
 assert.equal(s.scene.environmentRotation.y,pose.light,'ambient light stops with reduced motion');
 assert.equal(s.wall.material.uniforms.uScroll.value,.8,'the reading surface still advances');
 assert.equal(s.canvas.dataset.glassTime,'0.0');
 s.adapter.render(0,0,false,0,false,4);
 assert.ok(s.scene.environmentRotation.y!==pose.light,'active time still moves the studio when motion is allowed');
 s.adapter.dispose();
});

test('the receiver paints the studio light field without visible light fixtures',async()=>{
 const s=await studio();
 const material=s.wall.material;
 assert.ok(material.isShaderMaterial);
 assert.equal(material.toneMapped,false);
 assert.ok(s.wall.position.z<0,'the receiver lies behind the glass in the transmission view');
 for(const key of['uInk','uNavy','uDeep','uSky','uBand','uGlow','uFloor','uPaper'])assert.ok(material.uniforms[key],key+' remains a shared palette stop');
 assert.ok(!material.fragmentShader.includes('caustic'),'the receiver does not pretend to simulate caustics');
 assert.ok(!material.fragmentShader.includes('stripe('),'no painted line lights enter the receiver');
 const fixtures=[];s.scene.traverse(node=>{if(node.isMesh&&node.geometry.type==='TubeGeometry')fixtures.push(node)});
 assert.equal(fixtures.length,0,'light sources never become visible tubes');
 assert.equal(material.transparent,false,'the light field stays opaque');
 s.adapter.dispose();
});

test('viewport budgets and disposal are bounded',async()=>{
 const s=await studio();
 s.adapter.resize(1440,900,3);
 assert.equal(s.dpr,2,'desktop DPR is capped at two');
 assert.equal(s.transmissionSize,.62);
 s.adapter.resize(390,844,3);
 assert.equal(s.transmissionSize,.5,'phones use a smaller transmission target');
 s.adapter.dispose();
 s.adapter.dispose();
 assert.equal(s.releases,1,'disposal is idempotent');
});
