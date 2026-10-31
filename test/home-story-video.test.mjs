import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeStoryVideo.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({reduced=false}={}){
 const hooks=[],observers=[],calls=[],exports={},host={},listeners=new Set(),changes=new Set();
 const preference={matches:reduced,addEventListener:(type,fn)=>{assert.equal(type,'change');changes.add(fn);},removeEventListener:(type,fn)=>{assert.equal(type,'change');changes.delete(fn);}};
 const document={hidden:false,addEventListener:(type,fn)=>{assert.equal(type,'visibilitychange');listeners.add(fn);},removeEventListener:(type,fn)=>{assert.equal(type,'visibilitychange');listeners.delete(fn);}};
 const media={paused:true,play(){calls.push('play');this.paused=false;return Promise.resolve();},pause(){calls.push('pause');this.paused=true;}};
 let cursor=0,dirty=true,pending=[],tree;
 const React={
  useRef:initial=>{const index=cursor++;return(hooks[index]||={kind:'ref',value:{current:initial}}).value;},
  useState:initial=>{const index=cursor++,state=hooks[index]||=( {kind:'state',value:initial});return[state.value,next=>{const value=typeof next==='function'?next(state.value):next;if(!Object.is(value,state.value)){state.value=value;dirty=true;}}];},
  useEffect:(callback,deps)=>{const index=cursor++,effect=hooks[index]||=( {kind:'effect'});if(!effect.deps||deps.some((value,index)=>!Object.is(value,effect.deps[index])))pending.push(()=>{effect.cleanup?.();effect.deps=deps;effect.cleanup=callback();});}
 };
 class IntersectionObserver{
  constructor(callback,options){this.callback=callback;this.options=options;observers.push(this);}
  observe(element){this.element=element;}
  disconnect(){this.disconnected=true;}
 }
 vm.runInNewContext(source,{exports,document,matchMedia:()=>preference,IntersectionObserver,require:name=>{
  if(name==='react')return React;
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(name==='./Icons')return{Icon:()=>null};
  throw Error('Unexpected dependency '+name);
 }});
 const nodes=(type,root=tree)=>!root||typeof root!=='object'?[]:[...(root.type===type?[root]:[]),...([root.props?.children].flat(Infinity).flatMap(child=>child?nodes(type,child):[]))];
 function flush(){
  for(let count=0;dirty&&count<12;count++){
   dirty=false;cursor=0;pending=[];
   tree=exports.HomeStoryVideo({src:'/clip.mp4',poster:'/poster.webp',label:'Actual Skill directory',pauseLabel:'Pause demo',playLabel:'Resume demo'});
   for(const hook of hooks)if(hook.kind==='ref')hook.value.current=null;
   for(const node of nodes('div'))if(node.props.ref)node.props.ref.current=host;
   for(const node of nodes('video'))node.props.ref.current=media;
   for(const effect of pending)effect();
  }
  assert.equal(dirty,false,'state and effect updates settle');
 }
 const intersect=(observer,visible)=>{observer.callback([{isIntersecting:visible}]);flush();};
 flush();
 return{nodes,calls,media,observers,listeners,changes,get tree(){return tree;},
  nearby:()=>intersect(observers[0],true),visible:value=>intersect(observers[1],value),
  motion:value=>{preference.matches=value;for(const change of changes)change();flush();},
  hidden:value=>{document.hidden=value;for(const listener of listeners)listener();flush();},
  loaded:()=>{nodes('video')[0].props.onLoadedData();flush();},
  toggle:()=>{nodes('button')[0].props.onClick();flush();},
  fail:()=>{nodes('video')[0].props.onError();flush();},
  unmount:()=>{for(const hook of hooks)if(hook.kind==='effect')hook.cleanup?.();for(const hook of hooks)if(hook.kind==='ref')hook.value.current=null;}
 };
}

test('the real recording remains a static poster until nearby and only plays while in the viewport',()=>{
 const s=fixture();
 assert.equal(s.nodes('img')[0].props.src,'/poster.webp');assert.equal(s.nodes('video').length,0);assert.equal(s.calls.length,0);
 assert.ok(parseInt(s.observers[0].options.rootMargin)>0,'a nearby element can prepare media before entering view');s.nearby();
 assert.equal(s.observers[0].disconnected,true);assert.equal(s.nodes('video').length,1);assert.equal(s.media.paused,true);
 const video=s.nodes('video')[0].props;assert.equal(video.src,'/clip.mp4');assert.equal(video.muted,true);assert.equal(video.loop,true);assert.equal(video.playsInline,true);assert.equal(video.preload,'metadata');
 s.visible(true);assert.equal(s.media.paused,false);assert.ok(s.calls.includes('play'));
 s.visible(false);assert.equal(s.media.paused,true);s.visible(true);assert.equal(s.media.paused,false);
 s.unmount();
});

test('reduced motion, hidden documents and the user pause control each prevent autoplay',()=>{
 const s=fixture({reduced:true});s.nearby();s.visible(true);s.loaded();
 assert.equal(s.media.paused,true);assert.equal(s.tree.props['data-ready'],'false');assert.equal(s.nodes('button').length,0);
 s.motion(false);assert.equal(s.media.paused,false);assert.equal(s.tree.props['data-ready'],'true');
 s.hidden(true);assert.equal(s.media.paused,true);s.hidden(false);assert.equal(s.media.paused,false);
 s.toggle();assert.equal(s.media.paused,true);assert.equal(s.nodes('button')[0].props['aria-label'],'Resume demo');assert.equal(s.nodes('button')[0].props['aria-pressed'],true);
 const plays=s.calls.filter(call=>call==='play').length;
 s.hidden(true);s.hidden(false);s.visible(false);s.visible(true);s.motion(true);s.motion(false);
 assert.equal(s.calls.filter(call=>call==='play').length,plays,'visibility changes do not cancel the user’s pause');
 s.toggle();assert.equal(s.media.paused,false);assert.equal(s.nodes('button')[0].props['aria-label'],'Pause demo');
 s.motion(true);assert.equal(s.media.paused,true);s.unmount();
});

test('loading errors retain the readable poster and unmount disconnects observers, listeners and playback',()=>{
 const failed=fixture();failed.nearby();failed.visible(true);failed.loaded();failed.fail();
 assert.equal(failed.nodes('video').length,0);assert.equal(failed.nodes('button').length,0);assert.equal(failed.nodes('img')[0].props.alt,'Actual Skill directory');assert.equal(failed.tree.props['data-ready'],'false');assert.equal(failed.media.paused,true,'a failed recording stops before its element is removed');failed.unmount();
 const active=fixture();active.nearby();active.visible(true);assert.equal(active.media.paused,false);active.unmount();
 assert.ok(active.observers.every(observer=>observer.disconnected));assert.equal(active.listeners.size,0);assert.equal(active.changes.size,0);
 assert.equal(active.media.paused,true,'cleanup explicitly stops the media element captured by its playback effect');
});
