import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({scene='home',path='/',width=1440,height=900,scrollY=0,journeyState='loading',journeyHeight=900,missingShell=false}={}){
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/PlatformGlass.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const effects=[],observers=[],listeners=new Map(),attributes=new Set(),changes=[],exports={};let boundsReads=0;
 const journey={dataset:{journey:journeyState},height:journeyHeight,get offsetHeight(){boundsReads++;return this.height;}};
 const shell={querySelector:selector=>selector==='.blog-spaces-opening'?journey:null,toggleAttribute(name,force){changes.push({name,force});if(force)attributes.add(name);else attributes.delete(name);},removeAttribute:name=>attributes.delete(name)};
 const window={innerWidth:width,innerHeight:height,scrollY,addEventListener:(name,fn,options)=>listeners.set(name,{fn,options}),removeEventListener:(name,fn)=>{if(listeners.get(name)?.fn===fn)listeners.delete(name);}};
 class ResizeObserver{constructor(callback){this.callback=callback;this.targets=new Set();observers.push(this);}observe(target){this.targets.add(target);}disconnect(){this.disconnected=true;this.targets.clear();}}
 const InteriorAtmosphere=()=>{};
 vm.runInNewContext(source,{exports,window,ResizeObserver,require:name=>{
  if(name==='react')return{useEffect:fn=>effects.push(fn),useRef:()=>({current:{closest:()=>missingShell?null:shell}})};
  if(name==='next/navigation')return{usePathname:()=>path};
  if(name==='./InteriorAtmosphere')return{InteriorAtmosphere};
  if(name==='@/lib/interior-scene.mjs')return{interiorSceneForPath:value=>value==='/login'?'login':'community'};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'};
  throw new Error('Unexpected dependency '+name);
 }});
 const output=exports.PlatformGlass({scene}),cleanup=effects[0]();
 const scroll=value=>{window.scrollY=value;listeners.get('scroll')?.fn();};
 const resize=(nextHeight,nextWidth=window.innerWidth)=>{window.innerHeight=nextHeight;window.innerWidth=nextWidth;listeners.get('resize')?.fn();};
 const journeyResize=(state,nextHeight)=>{journey.dataset.journey=state;journey.height=nextHeight;observers[0]?.callback();};
 return{output,cleanup,scroll,resize,journeyResize,journey,attributes,changes,listeners,observers,window,InteriorAtmosphere,get boundsReads(){return boundsReads;}};
}

test('transparent home chrome begins with light ink and switches only after reaching daylight',()=>{
 const f=fixture();assert.equal(f.attributes.size,0);assert.equal(f.observers.length,0);
 assert.equal(f.listeners.get('scroll').options.passive,true);
 f.scroll(49);assert.ok(f.attributes.has('data-glass-scrolled'));assert.ok(!f.attributes.has('data-glass-bright'));
 f.scroll(918);assert.ok(!f.attributes.has('data-glass-bright'),'the blue side of the boundary keeps light ink');
 f.scroll(920);assert.ok(f.attributes.has('data-glass-bright'),'the daylight side uses dark ink');
 f.scroll(0);assert.equal(f.attributes.size,0,'scrolling back restores the initial ink');
 assert.equal(f.boundsReads,0,'ordinary scrolling never reads scene geometry');f.cleanup();
});

test('viewport resize corrects the ink state without requiring another scroll event',()=>{
 const f=fixture({height:800,scrollY:900});assert.ok(f.attributes.has('data-glass-bright'));
 f.resize(1100);assert.ok(!f.attributes.has('data-glass-bright'));
 f.resize(700,622);assert.ok(f.attributes.has('data-glass-bright'));
 assert.equal(f.boundsReads,0);f.cleanup();
});

test('late blog-flight loading and later height changes refresh cached scene bounds',()=>{
 const f=fixture({scene:'blogs',path:'/blogs',scrollY:1000});assert.equal(f.observers.length,1);assert.ok(f.observers[0].targets.has(f.journey));
 assert.ok(f.attributes.has('data-glass-bright'),'the static/loading fallback follows the normal daylight boundary');assert.equal(f.boundsReads,0);
 f.journeyResize('ready',2115);assert.ok(!f.attributes.has('data-glass-bright'),'the longer loaded flight moves daylight farther down');assert.equal(f.boundsReads,1);
 f.scroll(1150);assert.ok(f.attributes.has('data-glass-bright'));f.scroll(900);assert.ok(!f.attributes.has('data-glass-bright'));assert.equal(f.boundsReads,1,'scroll consumes cached height');
 f.scroll(1250);f.journeyResize('ready',2700);assert.ok(!f.attributes.has('data-glass-bright'),'responsive or content resizing updates the boundary');assert.equal(f.boundsReads,2);
 f.journeyResize('static',810);assert.ok(f.attributes.has('data-glass-bright'),'reduced-motion/fallback geometry returns to the normal page boundary');assert.equal(f.boundsReads,2);f.cleanup();
});

test('interior routes retain their distinct sculpture and already-scrolled state on mount',()=>{
 const f=fixture({scene:'interior',path:'/login',scrollY:1500});
 const interior=f.output.props.children[1];assert.equal(interior.type,f.InteriorAtmosphere);assert.equal(interior.props.scene,'login');
 assert.ok(f.attributes.has('data-glass-scrolled'));assert.ok(f.attributes.has('data-glass-bright'));assert.equal(f.observers.length,0);f.cleanup();
 const missing=fixture({missingShell:true});assert.equal(missing.listeners.size,0);assert.equal(missing.observers.length,0);assert.equal(missing.cleanup,undefined);
});

test('unmount disconnects bounds, removes scroll/resize listeners and clears shell markers',()=>{
 const f=fixture({scene:'blogs',path:'/blogs',journeyState:'ready',journeyHeight:2115,scrollY:1600});
 assert.equal(f.attributes.size,2);const late=f.observers[0].callback;f.cleanup();
 assert.equal(f.listeners.size,0);assert.equal(f.observers[0].disconnected,true);assert.equal(f.attributes.size,0);
 const reads=f.boundsReads,changes=f.changes.length;late();
 assert.equal(f.attributes.size,0,'a queued bounds callback cannot revive unmounted shell markers');
 assert.equal(f.boundsReads,reads,'a detached scene is no longer measured');assert.equal(f.changes.length,changes);
});
