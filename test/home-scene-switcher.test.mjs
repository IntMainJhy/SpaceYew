import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeSceneSwitcher.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;

test('scene controls preserve the URL and Next history state, synchronize events, and follow back/forward with a safe fallback',()=>{
 const window=new EventTarget(),effects=[],exports={},historyState={__NA:true,tree:['homepage']};
 let selected,location='https://spaceyew.com/?lang=zh&from=preview#skills',locale='zh',cleanup;
 window.location={get href(){return location}};
 window.history={state:historyState,replaceState(state,title,url){assert.equal(state,historyState);assert.equal(title,'');location=new URL(url,location).href;}};
 class CustomEvent extends Event{constructor(name,{detail}){super(name);this.detail=detail;}}
 const announce=detail=>window.dispatchEvent(new CustomEvent('spaceyew-home-scene',{detail}));
 const events=[];window.addEventListener('spaceyew-home-scene',event=>events.push(event.detail));
 vm.runInNewContext(source,{exports,window,URL,CustomEvent,require:name=>{
  if(name==='react')return{useEffect(fn){effects.push(fn)},useState(initial){selected??=initial;return[selected,next=>{selected=next}]}};
  if(name==='./LocaleProvider')return{useLocale:()=>({locale})};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};
  throw Error('Unexpected dependency '+name);
 }});
 const render=()=>exports.HomeSceneSwitcher({initialScene:'moon'});
 let group=render();cleanup=effects[0]();
 assert.equal(group.props.role,'group');assert.equal(group.props['aria-label'],'首页背景');
 const buttons=group.props.children;assert.deepEqual(Array.from(buttons,button=>button.props.children),['月球','玻璃']);
 assert.equal(buttons[0].props['aria-pressed'],true);assert.equal(buttons[1].props['aria-pressed'],false);
 buttons[1].props.onClick();assert.equal(selected,'glass');assert.equal(events.at(-1),'glass');
 assert.equal(location,'https://spaceyew.com/?lang=zh&from=preview&scene=glass#skills');assert.equal(window.history.state,historyState);
 group=render();assert.equal(group.props.children[1].props['aria-pressed'],true);
 announce('moon');assert.equal(selected,'moon');announce('invalid');assert.equal(selected,'moon');
 location='https://spaceyew.com/?scene=glass&lang=en#notes';window.dispatchEvent(new Event('popstate'));assert.equal(selected,'glass');assert.equal(events.at(-1),'glass');
 location='https://spaceyew.com/?scene=invalid#notes';window.dispatchEvent(new Event('popstate'));assert.equal(selected,'moon');assert.equal(events.at(-1),'moon');
 location='https://spaceyew.com/';window.dispatchEvent(new Event('popstate'));assert.equal(selected,'moon');
 locale='en';group=render();assert.equal(group.props.children[0].props.children,'Moon');assert.equal(group.props.children[1].props.children,'Glass');
 cleanup();announce('glass');assert.equal(selected,'moon','unmounted controls stop observing scene events');
 const count=events.length;window.dispatchEvent(new Event('popstate'));assert.equal(events.length,count,'back/forward listener is removed');
});
