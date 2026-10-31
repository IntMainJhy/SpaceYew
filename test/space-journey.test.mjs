import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Exercise the renderer's real path sampler without starting WebGL or fetching assets.
const source=ts.transpileModule(fs.readFileSync(new URL('../src/lib/home-space.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
vm.runInNewContext(source,{exports,require:name=>{
 if(name==='three')return three;
 if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader};
 throw Error('Unexpected space renderer dependency '+name);
}});
const {sampleSpaceFlight,SPACE_FLIGHT_STOPS}=exports;
const moon=new three.Vector3(8,-1,-22),moonRadius=5.6;
const vector=value=>new three.Vector3().fromArray(value);
const projectedMoon=(flight,aspect)=>{
 const camera=new three.PerspectiveCamera(flight.fov,aspect,.1,1600);
 camera.position.fromArray(flight.position);camera.lookAt(vector(flight.target));camera.updateMatrixWorld();
 const projected=moon.clone().project(camera);
 return{x:(projected.x+1)/2,y:(1-projected.y)/2,z:projected.z};
};
const verticalDiameter=flight=>{
 const distance=vector(flight.position).distanceTo(moon);
 return moonRadius/Math.sqrt(distance*distance-moonRadius*moonRadius)/Math.tan(three.MathUtils.degToRad(flight.fov/2));
};

test('the actual flight advances toward the fixed lunar surface without crossing it or reversing',()=>{
 let previousDistance=Infinity,previousZ=Infinity;
 for(let i=0;i<=1000;i++){
  const flight=sampleSpaceFlight(i/1000,16/9),position=vector(flight.position),distance=position.distanceTo(moon);
  assert.ok([...flight.position,...flight.target,flight.fov,flight.progress].every(Number.isFinite));
  assert.ok(distance<previousDistance,`lunar distance must decrease at progress ${flight.progress}`);
  assert.ok(position.z<previousZ,`camera must advance along -Z at progress ${flight.progress}`);
  assert.ok(distance-moonRadius>2.5,'the camera stays outside the lunar surface and its safety margin');
  previousDistance=distance;previousZ=position.z;
 }
 const start=sampleSpaceFlight(0),end=sampleSpaceFlight(1);
 assert.ok(vector(start.position).distanceTo(vector(end.position))>95,'the journey is substantial world-space translation');
 assert.ok(verticalDiameter(start)>.10&&verticalDiameter(start)<.18,'the Moon begins as a distant landmark');
 assert.ok(verticalDiameter(end)>.75&&verticalDiameter(end)<.90,'the Moon ends as a large close view');
 assert.ok(verticalDiameter(end)/verticalDiameter(start)>5,'distance creates a clear change of scale');
});

test('camera beats join continuously without stopping at intermediate control points',()=>{
 const epsilon=1e-5;
 for(const stop of SPACE_FLIGHT_STOPS.slice(1,-1)){
  const before=sampleSpaceFlight(stop.progress-epsilon),at=sampleSpaceFlight(stop.progress),after=sampleSpaceFlight(stop.progress+epsilon);
  const incoming=vector(at.position).sub(vector(before.position)).divideScalar(epsilon),outgoing=vector(after.position).sub(vector(at.position)).divideScalar(epsilon);
  assert.ok(vector(before.position).distanceTo(vector(after.position))<.02,'no position discontinuity');
  assert.ok(vector(before.target).distanceTo(vector(after.target))<.02,'no viewing-direction discontinuity');
  assert.ok(Math.abs(before.fov-after.fov)<.01,'no FOV jump');
  assert.ok(incoming.length()>20&&outgoing.length()>20,'the camera keeps moving through each beat');
  assert.ok(incoming.distanceTo(outgoing)<.2,'velocity remains continuous across each camera beat');
 }
});

test('portrait composition keeps the lunar landmark visible while sharing the same world-space route',()=>{
 const portrait=390/844;
 for(let i=0;i<=100;i++){
  const progress=i/100,desktop=sampleSpaceFlight(progress,16/9),mobile=sampleSpaceFlight(progress,portrait);
  assert.ok(vector(desktop.position).distanceTo(vector(mobile.position))<1e-10,'responsive composition does not replace forward travel');
  for(const [flight,aspect] of [[desktop,16/9],[mobile,portrait]]){
   const projected=projectedMoon(flight,aspect);
   assert.ok(projected.x>0&&projected.x<1,`Moon center stays horizontally visible at ${progress}, aspect ${aspect}`);
   assert.ok(projected.y>0&&projected.y<1,'Moon center stays vertically visible');
   assert.ok(projected.z>-1&&projected.z<1,'Moon remains in front of the camera and within its clipping range');
  }
 }
 const final=sampleSpaceFlight(1,portrait),center=projectedMoon(final,portrait);
 assert.ok(center.x>.52&&center.x<.64,'portrait arrival centers the Moon slightly to the right');
 assert.ok(center.y>.42&&center.y<.58,'portrait arrival keeps the Moon near the vertical center');
 assert.ok(verticalDiameter(final)>.68&&verticalDiameter(final)<.80,'portrait arrival retains the approved large lunar view');
});

test('the path safely clamps overscroll and non-finite progress',()=>{
 for(const [input,endpoint] of [[-2,0],[2,1]]){
  const actual=sampleSpaceFlight(input),expected=sampleSpaceFlight(endpoint);
  assert.equal(actual.progress,endpoint);
  assert.ok(vector(actual.position).distanceTo(vector(expected.position))<1e-10);
 }
 for(const input of [NaN,Infinity,-Infinity]){
  const flight=sampleSpaceFlight(input);
  assert.ok([...flight.position,...flight.target,flight.fov,flight.progress].every(Number.isFinite));
  assert.ok(flight.progress>=0&&flight.progress<=1);
 }
});
