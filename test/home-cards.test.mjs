import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as three from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const bytes=fs.readFileSync(new URL('../public/models/spaceyew-home-cards.glb',import.meta.url));
const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeCardGallery.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const parse=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');

test('the Blender asset has four compact, solid beveled cards with shared native geometry',async()=>{
 assert.ok(bytes.length<40_000,'the deferred model stays compact');
 const {scene}=await parse(),cards=[];scene.traverse(node=>{if(node.isMesh)cards.push(node);});assert.equal(cards.length,4);
 const geometry=cards[0].geometry;assert.ok(cards.every(card=>card.geometry===geometry),'one model geometry is shared by all four cards');
 assert.ok(geometry.getAttribute('position').count>=200&&geometry.getAttribute('position').count<1000,'six-segment bevels stay economical');
 for(let index=0;index<4;index++){
  const card=scene.getObjectByName('OpticalCard_'+index);assert.ok(card,'each runtime lookup is authored in Blender');assert.equal(card.userData.edge_segments,6);assert.match(card.userData.authorship,/Original SpaceYew/);
  const size=new three.Box3().setFromObject(card,true).getSize(new three.Vector3());assert.ok(size.x>2.3&&size.y>2.9&&size.z>.19&&size.z<.22,'the card is an upright solid with measurable depth');
 }
 assert.ok(!scene.getObjectByName('WindCable'),'the old cable is absent');
});

async function runtime(hz){
 class Target extends EventTarget{
  dataset={};style={};listeners=new Map();capture=-1;
  addEventListener(type,fn,options){super.addEventListener(type,fn,options);if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
  removeEventListener(type,fn,options){super.removeEventListener(type,fn,options);this.listeners.get(type)?.delete(fn);}
  getBoundingClientRect(){return{left:0,top:0,width:1300,height:460};}
  setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=-1;}
  get listenerCount(){return[...this.listeners.values()].reduce((sum,set)=>sum+set.size,0);}
  fire(type,event){for(const fn of this.listeners.get(type)||[])fn(event);}
 }
 const host=new Target(),canvas=new Target(),document=Object.assign(new Target(),{hidden:false,fonts:{ready:Promise.resolve()}}),preference=Object.assign(new Target(),{matches:false}),window=Object.assign(new Target(),{devicePixelRatio:2,matchMedia:()=>preference});
 const buttons=Array.from({length:4},(_,index)=>({dataset:{cardIndex:String(index)},closest(){return this;},getBoundingClientRect:()=>({left:index*325+12,top:12,width:297,height:380})}));host.querySelectorAll=()=>buttons;
 const gradient={addColorStop(){}};const context=new Proxy({measureText:text=>({width:text.length*30}),createLinearGradient:()=>gradient},{get:(target,key)=>target[key]||(()=>{})});document.createElement=()=>({width:0,height:0,getContext:()=>context});
 const control={current:()=>{}},paused={current:false},refs=[{current:host},{current:canvas},control,paused],frames=new Map(),observers=[],resize=[];let next=1,effect,draws=0,releases=0,scene,refIndex=0,abortSignal;
 class Renderer{capabilities={getMaxAnisotropy:()=>4};setPixelRatio(){}setClearColor(){}setSize(){}dispose(){releases++;}getRenderTarget(){return null;}compileAsync(){return Promise.resolve();}render(s,c){scene=s;draws++;s.updateMatrixWorld(true);c.updateMatrixWorld();}}
 class Loader{parseAsync(){return parse();}}
 class PMREM{fromScene(){return{texture:new three.Texture(),dispose(){}};}dispose(){}}
 class Room{dispose(){}}
 class Intersection{constructor(fn,options){this.fn=fn;this.options=options;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 class Resize{constructor(fn){this.fn=fn;resize.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 const exports={};vm.runInNewContext(source,{exports,window,document,AbortController,getComputedStyle:()=>({fontFamily:'Inter, sans-serif'}),fetch:async(_url,{signal})=>{abortSignal=signal;return{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};},ResizeObserver:Resize,IntersectionObserver:Intersection,requestAnimationFrame:fn=>{const id=next++;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),require:name=>{
  if(name==='react')return{useEffect:fn=>{effect=fn;},useId:()=> 'cards',useRef:()=>refs[refIndex++],useState:initial=>[initial,()=>{}]};
  if(name==='react/jsx-runtime')return{jsx:()=>({}),jsxs:()=>({})};
  if(name==='three')return{...three,WebGLRenderer:Renderer,PMREMGenerator:PMREM};
  if(name==='three/addons/loaders/GLTFLoader.js')return{GLTFLoader:Loader};
  if(name==='three/addons/environments/RoomEnvironment.js')return{RoomEnvironment:Room};
  if(name==='./LocaleProvider')return{useLocale:()=>({locale:'zh'})};return{};
 }});
 exports.HomeCardGallery({items:Array.from({length:4},(_,index)=>({title:'Card '+index,category:'Blog',description:'Real semantic destination',href:'/blog/'+index})),heading:'New angle',hint:'Rotate'});const cleanup=effect();
 const prepare=observers.find(observer=>observer.options?.rootMargin),visible=observers.find(observer=>!observer.options?.rootMargin);prepare.fn([{isIntersecting:true}]);
 for(let turn=0;turn<30&&host.dataset.cards!=='ready';turn++)await new Promise(resolve=>setImmediate(resolve));assert.equal(host.dataset.cards,'ready');
 let now=0;const step=()=>{now+=1000/hz;const queued=[...frames.values()];frames.clear();for(const fn of queued)fn(now);};
 return{host,canvas,document,window,preference,frames,observers,resize,buttons,cleanup,step,get scene(){return scene;},get draws(){return draws;},get releases(){return releases;},get signal(){return abortSignal;},visible(value){visible.fn([{isIntersecting:value}]);},pause(value){paused.current=value;control.current();}};
}

test('cards follow 120/144Hz with unchanged vertex and texture buffers, repeat entrances, and stop when inactive',async()=>{
 for(const hz of[120,144]){
  const s=await runtime(hz);assert.equal(s.frames.size,0,'nearby prewarming never runs an offscreen ticker');
  const buffers=[],textures=[];s.scene.traverse(node=>{if(node.isMesh){for(const attribute of Object.values(node.geometry.attributes))buffers.push([attribute,attribute.version]);if(node.material.map)textures.push([node.material.map,node.material.map.version]);}});
  s.visible(true);const start=s.draws;for(let index=0;index<hz*2;index++)s.step();assert.equal(s.draws-start,hz*2,'every native visible callback draws');
  for(const [buffer,version]of [...buffers,...textures])assert.equal(buffer.version,version,'animation changes rigid poses without CPU buffer or texture uploads');
  const card=s.scene.getObjectByName('OpticalCard_0').parent,settledY=card.rotation.y;
  s.visible(false);assert.equal(s.frames.size,0);s.visible(true);s.step();assert.ok(card.rotation.y<settledY-.2,'re-entering the viewport repeats the authored arrival pose');
  for(let index=0;index<hz*2;index++)s.step();s.pause(true);s.step();assert.equal(s.frames.size,0,'pause stops the ticker after settling');s.pause(false);s.step();assert.equal(s.frames.size,1);
  s.document.hidden=true;s.document.dispatchEvent(new Event('visibilitychange'));assert.equal(s.frames.size,0);s.document.hidden=false;s.document.dispatchEvent(new Event('visibilitychange'));s.step();assert.equal(s.frames.size,1);
  s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));s.step();assert.equal(s.frames.size,0,'reduced motion renders on demand');
  s.cleanup();assert.equal(s.signal.aborted,true);assert.equal(s.frames.size,0);assert.equal(s.releases,1);assert.ok(s.observers.every(observer=>observer.disconnected)&&s.resize.every(observer=>observer.disconnected));for(const target of[s.host,s.canvas,s.document,s.window,s.preference])assert.equal(target.listenerCount,0);
 }
});

test('pointer and keyboard rotate actual card solids; context loss leaves semantic links as the fallback',async()=>{
 const s=await runtime(144);s.visible(true);for(let index=0;index<180;index++)s.step();s.pause(true);s.step();
 const card=s.scene.getObjectByName('OpticalCard_0').parent,initial=card.rotation.y;
 s.host.fire('pointerdown',{target:s.buttons[0],button:0,pointerId:4,clientX:100,clientY:100});s.host.fire('pointermove',{pointerId:4,clientX:220,clientY:130});s.host.fire('pointerup',{});for(let index=0;index<150;index++)s.step();assert.ok(card.rotation.y>initial+1.4,'a real rigid solid rotates after dragging');assert.ok(card.rotation.x>.2);
 let prevented=false;s.host.fire('keydown',{target:s.buttons[0],key:'Home',preventDefault(){prevented=true;}});for(let index=0;index<150;index++)s.step();assert.equal(prevented,true);assert.ok(Math.abs(card.rotation.y-initial)<.001,'Home resets the actual model pose');
 s.preference.matches=true;s.preference.dispatchEvent(new Event('change'));s.step();s.host.fire('keydown',{target:s.buttons[0],key:'ArrowRight',preventDefault(){}});s.step();assert.ok(card.rotation.y>initial+.29,'reduced motion keeps explicit keyboard rotation available without an automatic animation');assert.equal(s.frames.size,0);
 const event=new Event('webglcontextlost',{cancelable:true});s.canvas.dispatchEvent(event);assert.equal(event.defaultPrevented,true);assert.equal(s.host.dataset.cards,'fallback');const before=s.draws;s.pause(false);s.visible(true);s.step();assert.equal(s.draws,before);assert.equal(s.frames.size,0);s.cleanup();assert.equal(s.releases,1);
});
