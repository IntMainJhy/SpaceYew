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
  const fixedMath=Object.create(Math);fixedMath.random=()=>.1;
  let observer;
  const exports={};
  vm.runInNewContext(source,{
    exports,document,window,Math:fixedMath,Image:class{decode(){return Promise.resolve();}},matchMedia:()=>preference,
    IntersectionObserver:class{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}},
    setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>{const id=++timerId;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
    require:name=>{
      if(name==='react')return{
        useId:()=>':test:',useState:()=>[state[stateIndex++],()=>{}],
        useEffect:effect=>effects.push(effect),
        useRef:value=>{const i=refIndex++,ref={current:i===0?root:i<5||i===6?animated():value};refs.push(ref);return ref;},
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
    unmount:()=>cleanups.reverse().forEach(fn=>fn()),act:kind=>refs[5].current(kind),
    tick:()=>{const [id,{fn}]=timers.entries().next().value;timers.delete(id);fn();}};
}

test('independent eye blinks repeat, manual greeting interrupts, and all resources clean up',()=>{
  const state=mount();
  assert.equal(state.timers.size,1);
  assert.ok([...state.timers.values()][0].delay>=1600&&[...state.timers.values()][0].delay<=3800);
  state.act('blink');
  assert.equal(state.animations.length,3,'two eyes and eyelids animate independently');
  assert.equal(state.animations[0].options.duration,210);
  state.act('greet');
  assert.ok(state.animations.slice(0,3).every(a=>a.cancelled));
  assert.equal(state.animations.length,7,'greeting adds a body response');
  assert.equal(state.timers.size,1,'repeated input never stacks blink timers');
  const pointer=Object.assign(new Event('pointermove'),{pointerType:'mouse',clientX:10000,clientY:-10000});
  state.window.dispatchEvent(pointer);
  state.frames.forEach(fn=>fn());
  assert.equal(state.values.get('--look-x'),'7px');
  assert.equal(state.values.get('--look-y'),'-5px');
  assert.equal(state.values.get('--head-yaw'),'10deg');
  assert.equal(state.values.get('--head-pitch'),'6deg');
  assert.equal(state.values.get('--head-roll'),'3deg');
  state.window.dispatchEvent(new Event('blur'));
  assert.equal(state.values.get('--head-yaw'),'0deg');
  state.unmount();
  assert.equal(state.timers.size+state.frames.size,0);
  assert.ok(state.animations.every(a=>a.cancelled));
  assert.ok(state.observer.disconnected);
  assert.equal(state.document.listeners.size+state.window.listeners.size+state.preference.listeners.size,0);
});

test('pause, reduced motion, hidden tabs and offscreen characters start no animation or tracking',()=>{
  for(const settings of [{paused:true},{reduced:true},{visible:false},{inView:false}]){
    const state=mount(settings);state.act('greet');state.act('turn');
    assert.equal(state.animations.length,0,JSON.stringify(settings));
    assert.equal(state.timers.size,0);
    assert.equal(state.window.listeners.size,0);
    state.unmount();
  }
});

test('automatic blinking may double once and then returns to the natural interval',()=>{
  const state=mount();
  state.tick();
  assert.equal(state.animations.length,3);
  assert.equal([...state.timers.values()][0].delay,320);
  state.tick();
  assert.equal(state.animations.length,6);
  assert.ok([...state.timers.values()][0].delay>=1600);
  assert.equal(state.timers.size,1);
  state.unmount();
});

test('manual head turning targets the head independently and supports interruption',()=>{
  const state=mount();
  state.act('turn');
  assert.equal(state.animations.length,4,'eyes and head respond without animating the body');
  const turn=state.animations[3];
  assert.equal(turn.options.duration,1250);
  assert.match(turn.keyframes[1].transform,/rotateY\(-12deg\)/);
  assert.match(turn.keyframes[2].transform,/rotateY\(12deg\)/);
  state.act('turn');
  assert.ok(state.animations.slice(0,4).every(a=>a.cancelled));
  assert.equal(state.timers.size,1);
  state.unmount();
});
