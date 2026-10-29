import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(readFileSync(new URL('../src/components/CharacterCompanion.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
}).outputText;

function mount({paused=false,reduced=false,visible=true,inView=true}={}){
  const effects=[],cleanups=[],refs=[],animations=[],timers=new Map(),frames=new Map(),values=new Map();
  let timerId=0,refIndex=0,stateIndex=0;
  const state=[true,false,paused,reduced,visible,inView,false,0];
  class Target extends EventTarget {
    listeners=new Set();
    addEventListener(type,listener){super.addEventListener(type,listener);this.listeners.add(listener);}
    removeEventListener(type,listener){super.removeEventListener(type,listener);this.listeners.delete(listener);}
  }
  const root=Object.assign(new Target(),{
    style:{setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)},
    getBoundingClientRect:()=>({left:0,top:0,width:400,height:500}),
  });
  const animated=()=>({animate(keyframes,options){
    const animation={keyframes,options,cancelled:false,finished:new Promise(()=>{}),cancel(){this.cancelled=true;}};
    animations.push(animation);return animation;
  }});
  const document=Object.assign(new Target(),{hidden:!visible}),window=new Target();
  const preference=Object.assign(new Target(),{matches:reduced});
  let observer;
  const exports={};
  vm.runInNewContext(source,{
    exports,document,window,Image:class{decode(){return Promise.resolve();}},matchMedia:()=>preference,
    IntersectionObserver:class{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}},
    setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>{const id=++timerId;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    require:name=>{
      if(name==='react')return{
        useId:()=>':test:',useState:()=>[state[stateIndex++],()=>{}],
        useEffect:effect=>effects.push(effect),
        useRef:value=>{const i=refIndex++,ref={current:i===0?root:i<5?animated():value};refs.push(ref);return ref;},
      };
      if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
      if(name==='./LocaleProvider')return{useLocale:()=>({locale:'zh'})};
      if(name.endsWith('.css'))return{default:{}};
      throw new Error('Unexpected import '+name);
    },
  });
  exports.CharacterCompanion();
  effects.forEach(effect=>{const cleanup=effect();if(cleanup)cleanups.push(cleanup);});
  return{root,window,document,preference,animations,timers,frames,values,refs,observer,
    unmount:()=>cleanups.reverse().forEach(fn=>fn()),blink:hello=>refs[5].current(hello)};
}

test('independent eye blinks repeat, manual greeting interrupts, and all resources clean up',()=>{
  const state=mount();
  assert.equal(state.timers.size,1);
  assert.ok([...state.timers.values()][0].delay>=3200);
  state.blink();
  assert.equal(state.animations.length,3,'two eyes and eyelids animate independently');
  assert.equal(state.animations[0].options.duration,210);
  state.blink(true);
  assert.ok(state.animations.slice(0,3).every(a=>a.cancelled));
  assert.equal(state.animations.length,7,'greeting adds a body response');
  assert.equal(state.timers.size,1,'repeated input never stacks blink timers');
  const pointer=Object.assign(new Event('pointermove'),{pointerType:'mouse',clientX:10000,clientY:-10000});
  state.window.dispatchEvent(pointer);
  state.frames.forEach(fn=>fn());
  assert.equal(state.values.get('--look-x'),'7px');
  assert.equal(state.values.get('--look-y'),'-5px');
  state.unmount();
  assert.equal(state.timers.size+state.frames.size,0);
  assert.ok(state.animations.every(a=>a.cancelled));
  assert.ok(state.observer.disconnected);
  assert.equal(state.document.listeners.size+state.window.listeners.size+state.preference.listeners.size,0);
});

test('pause, reduced motion, hidden tabs and offscreen characters start no animation or tracking',()=>{
  for(const settings of [{paused:true},{reduced:true},{visible:false},{inView:false}]){
    const state=mount(settings);state.blink(true);
    assert.equal(state.animations.length,0,JSON.stringify(settings));
    assert.equal(state.timers.size,0);
    assert.equal(state.window.listeners.size,0);
    state.unmount();
  }
});
