import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-space.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleWith=(dependencies,globals={})=>{const exports={};vm.runInNewContext(source,{exports,...globals,require:name=>{if(name==='three')return dependencies.three??three;if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader:dependencies.loader??GLTFLoader};throw Error('Unexpected renderer dependency '+name);}});return exports;};
const {sampleSpaceMotion}=moduleWith({});

async function renderer(){
 const texture=new three.DataTexture(new Uint8Array([128,128,128,255]),1,1),material=()=>new three.MeshStandardMaterial({map:texture,normalMap:texture});
 const moon=new three.Group();moon.add(new three.Mesh(new three.SphereGeometry(1,8,8),material()));
 const rocks=new three.Group(),rockMaterial=material();for(let i=0;i<3;i++)rocks.add(new three.Mesh(new three.IcosahedronGeometry(1,1),rockMaterial));
 const bytes=fs.readFileSync(new URL('../public/models/spaceyew-galaxy.glb',import.meta.url));
 const native=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');native.scene.updateMatrixWorld(true);
 let scene,camera;
 class Renderer{setClearColor(){}setPixelRatio(){}setSize(){}dispose(){}render(nextScene,nextCamera){scene=nextScene;camera=nextCamera;scene.updateMatrixWorld(true);camera.updateMatrixWorld();}}
 class Loader{async parseAsync(buffer){return{scene:[moon,rocks,native.scene][new Uint8Array(buffer)[0]]};}}
 const exports=moduleWith({three:{...three,WebGLRenderer:Renderer},loader:Loader},{AbortController,DOMException,fetch:async url=>({ok:true,arrayBuffer:async()=>new Uint8Array([url.includes('moon')?0:url.includes('asteroids')?1:2]).buffer})});
 const canvas={dataset:{}},adapter=await exports.createHomeSpace(canvas,new AbortController().signal);adapter.resize(1440,900,1);adapter.render(0,0,false,0,false,0);
 return{adapter,canvas,native:native.scene,get scene(){return scene;},get camera(){return camera;}};
}
const firstPoint=points=>new three.Vector3().fromBufferAttribute(points.geometry.getAttribute('position'),points.geometry.index.getX(0)).applyMatrix4(points.matrixWorld);
const firstInstance=mesh=>{const matrix=new three.Matrix4(),position=new three.Vector3(),rotation=new three.Quaternion(),scale=new three.Vector3();mesh.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);rotation.normalize();return{position,rotation,scale};};

test('active motion has a visible deterministic rate and reduced or invalid time always gives the still pose',()=>{
 const start=sampleSpaceMotion(2),end=sampleSpaceMotion(7),again=sampleSpaceMotion(7);
 assert.equal(end.time,again.time);assert.equal(end.galaxyAngle,again.galaxyAngle);assert.equal(end.rockAngle,again.rockAngle);
 const galaxyRate=(end.galaxyAngle-start.galaxyAngle)/5,rockRate=three.MathUtils.radToDeg((end.rockAngle-start.rockAngle)/5);
 assert.ok(galaxyRate>=.02&&galaxyRate<=.03,'the galaxy visibly rotates while the visitor stays still');assert.ok(rockRate>=3&&rockRate<=5,'rock tumble is visible at a human observation timescale');
 for(const value of[-2,NaN,Infinity,-Infinity]){const motion=sampleSpaceMotion(value);assert.equal(motion.time,0);assert.equal(motion.galaxyAngle,0);assert.equal(motion.rockAngle,0);}
 for(const value of[0,5,300]){const motion=sampleSpaceMotion(value,true);assert.equal(motion.time,0);assert.equal(motion.galaxyAngle,0);assert.equal(motion.rockAngle,0);}
});

test('the real renderer moves native galaxy points and rock orientation at fixed scroll while preserving the sky, Moon and physical positions',async()=>{
 const r=await renderer(),galaxy=r.scene.getObjectByName('space-galaxy'),sky=r.scene.getObjectByName('space-distant-stars'),mesh=r.scene.children.find(node=>node.isInstancedMesh),moon=r.scene.children.find(node=>node.position.equals(new three.Vector3(8,-1,-22)));
 assert.ok(galaxy&&sky&&moon);const start=firstPoint(galaxy),fixedSky=firstPoint(sky),rock=firstInstance(mesh),moonMatrix=moon.matrixWorld.clone(),cameraPosition=r.camera.position.clone(),positionVersion=galaxy.geometry.getAttribute('position').version;
 let nativePoints;r.native.traverse(node=>{if(node.isPoints)nativePoints=node;});
 const index=galaxy.geometry.index.getX(0),nativePoint=new three.Vector3().fromBufferAttribute(nativePoints.geometry.getAttribute('position'),index).applyMatrix4(nativePoints.matrixWorld);
 assert.ok(start.distanceTo(nativePoint)<.0001,'the moving scene begins at the actual Blender-authored location');
 r.adapter.render(0,0,false,0,false,5);const moved=firstPoint(galaxy),tumbled=firstInstance(mesh);
 assert.ok(start.distanceTo(moved)>1,'a native galaxy point physically moves at constant scroll');assert.ok(fixedSky.distanceTo(firstPoint(sky))<1e-10,'the outer starfield provides a stable depth reference');assert.equal(galaxy.geometry.getAttribute('position').version,positionVersion,'motion transforms the native body rather than regenerating vertices');
 assert.ok(rock.rotation.angleTo(tumbled.rotation)>.05,'the foreground rock visibly tumbles');assert.ok(rock.position.distanceTo(tumbled.position)<1e-10,'tumbling preserves the safety corridor and raycast focus position');assert.ok(rock.scale.distanceTo(tumbled.scale)<1e-6,'Float32 instance transforms preserve physical scale');assert.ok(moon.matrixWorld.equals(moonMatrix),'the approved Moon stays fixed');assert.ok(r.camera.position.distanceTo(cameraPosition)<1e-10,'ambient motion does not masquerade as scroll travel');
 assert.equal(r.canvas.dataset.spaceTime,'5.0');assert.ok(Number(r.canvas.dataset.spaceGalaxyAngle)>.1);assert.ok(Number(r.canvas.dataset.spaceRockAngle)>.3);
 r.adapter.render(0,0,false,0,false,5);assert.ok(moved.distanceTo(firstPoint(galaxy))<1e-10,'redraws with unchanged active time do not move the scene');
 r.adapter.render(0,0,false,0,true,90);assert.ok(start.distanceTo(firstPoint(galaxy))<1e-10);assert.ok(rock.rotation.angleTo(firstInstance(mesh).rotation)<1e-7);assert.equal(r.canvas.dataset.spaceComets,'0');assert.equal(r.canvas.dataset.spaceTime,'0.0');r.adapter.dispose();
});

test('a first-screen comet appears without scrolling, repeats on active time and pauses during observation',async()=>{
 const r=await renderer();let time=0;const advance=target=>{while(time+1/30<target+1e-8){time+=1/30;r.adapter.render(0,0,false,0,false,time);}};
 advance(3.9);assert.equal(r.canvas.dataset.spaceComets,'0');advance(4.2);assert.equal(r.canvas.dataset.spaceComets,'1','the opening scene has a visible comet after about four active seconds');advance(5.4);assert.equal(r.canvas.dataset.spaceComets,'0');advance(22.2);assert.equal(r.canvas.dataset.spaceComets,'1','a later first-screen comet uses the shared cooldown');r.adapter.dispose();
 const observing=await renderer();observing.adapter.render(0,0,false,.4,false,.05);assert.equal(observing.canvas.dataset.spaceComets,'1','fast scrolling still triggers the first scripted pass');assert.equal(observing.adapter.focusNearest(),true);observing.adapter.render(0,0,false,.4,false,.1);const paused=observing.canvas.dataset.spaceCometClock;
 for(let i=4;i<90;i++)observing.adapter.render(0,0,false,.4,false,i/30);assert.equal(observing.canvas.dataset.spaceCometClock,paused);assert.equal(observing.canvas.dataset.spaceComets,'0');observing.adapter.dispose();
});
