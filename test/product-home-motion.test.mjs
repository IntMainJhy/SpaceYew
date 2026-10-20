import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/ProductHomeMotion.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
}).outputText;

function mount(reduced=false){
  class TrackedTarget extends EventTarget{
    listeners=new Set();
    addEventListener(type,listener){super.addEventListener(type,listener);this.listeners.add(listener);}
    removeEventListener(type,listener){super.removeEventListener(type,listener);this.listeners.delete(listener);}
  }
  const animations=[],observers=[];
  const element=(name,children={})=>({
    classList:{contains:value=>name===value},
    getBoundingClientRect:()=>({top:100,bottom:200}),
    querySelector:selector=>children[selector]??null,
    querySelectorAll:selector=>children[selector]??[],
    animate(){
      let reject;
      const animation={name,cancelled:false,finished:new Promise((_,fail)=>{reject=fail;}),cancel(){this.cancelled=true;reject(new Error('cancelled'));}};
      animations.push(animation);return animation;
    }
  });
  const community=element('pfp-community',{'.pfp-post-cover,.pfp-document>img':[element('cover')]});
  const showcase=element('pfp-showcase',{'.pfp-showcase-profile':element('profile'),'.pfp-post-cover,.pfp-document>img':[element('work-image')]});
  const resume=element('pfp-resume',{'.pfp-resume-paper':element('paper')});
  const root=element('root',{
    h1:element('title',{span:[element('title-line-1'),element('title-line-2')]}),
    '.product-hero-copy>p':element('intro'),'.product-hero .space-actions':element('actions'),
    '.pfp-community,.pfp-showcase':[community,showcase]
  });
  const document=Object.assign(new TrackedTarget(),{hidden:false});
  const preference=Object.assign(new TrackedTarget(),{matches:reduced});
  class Observer{
    targets=new Set();unobserved=[];disconnected=false;
    constructor(callback){this.callback=callback;observers.push(this);}
    observe(target){this.targets.add(target);}
    unobserve(target){this.targets.delete(target);this.unobserved.push(target);}
    disconnect(){this.disconnected=true;this.targets.clear();}
    intersect(target){if(this.targets.has(target))this.callback([{target,isIntersecting:true}]);}
  }
  let effect;
  const exports={};
  vm.runInNewContext(source,{
    exports,document,window:{matchMedia:()=>preference},innerHeight:800,IntersectionObserver:Observer,
    require:name=>{
      if(name==='react')return{useRef:()=>({current:root}),useEffect:callback=>{effect=callback;}};
      if(name==='react/jsx-runtime')return{jsx:()=>null};
      throw new Error('Unexpected import: '+name);
    }
  });
  exports.ProductHomeMotion({children:null});
  const unmount=effect();
  return{animations,observers,document,preference,community,showcase,unmount};
}

test('reduced motion starts no animation, observer or listener',()=>{
  const state=mount(true);
  assert.equal(state.animations.length,0);
  assert.equal(state.observers.length,0);
  assert.equal(state.document.listeners.size+state.preference.listeners.size,0);
});

test('already visible homepage copy stays stable while feature entry plays once',()=>{
  const state=mount(),observer=state.observers[0],initial=state.animations.length;
  assert.equal(initial,0,'mounting the homepage must not fade or blur visible hero copy');
  assert.equal(observer.targets.size,2);
  observer.intersect(state.community);
  const entered=state.animations.length;
  assert.ok(entered>initial);
  assert.ok(observer.unobserved.includes(state.community));
  observer.intersect(state.community);
  assert.equal(state.animations.length,entered);
  state.document.hidden=true;
  state.document.dispatchEvent(new Event('visibilitychange'));
  assert.ok(state.animations.every(animation=>animation.cancelled));
  observer.intersect(state.showcase);
  assert.equal(state.animations.length,entered);
  state.unmount();
});

test('scroll entries animate only images, never showcase or resume text',()=>{
  const state=mount(),observer=state.observers[0];
  observer.intersect(state.community);observer.intersect(state.showcase);
  assert.deepEqual(state.animations.map(animation=>animation.name),['cover','work-image']);
  state.unmount();
});

test('enabling reduced motion disconnects observation and cancels active animations',()=>{
  const state=mount(),observer=state.observers[0];
  observer.intersect(state.community);
  const initial=state.animations.length;
  assert.ok(initial>0);
  state.preference.matches=true;
  state.preference.dispatchEvent(new Event('change'));
  assert.ok(observer.disconnected);
  assert.equal(observer.targets.size,0);
  assert.ok(state.animations.every(animation=>animation.cancelled));
  observer.intersect(state.community);
  assert.equal(state.animations.length,initial);
  state.unmount();
});

test('unmount removes listeners, disconnects observation and cancels animation',()=>{
  const state=mount();
  state.observers[0].intersect(state.community);
  assert.ok(state.animations.length>0);
  assert.equal(state.document.listeners.size,1);
  assert.equal(state.preference.listeners.size,1);
  state.unmount();
  assert.ok(state.observers[0].disconnected);
  assert.ok(state.animations.every(animation=>animation.cancelled));
  assert.equal(state.document.listeners.size+state.preference.listeners.size,0);
});
