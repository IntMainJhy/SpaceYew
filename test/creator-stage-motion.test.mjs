import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({reduced=false}={}){
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/CreatorStage.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={},refs=[],calls=[],observers=[],media=[];let state='work',refIndex=0,effect,cleanup;
 const buttons={work:{offsetLeft:0,offsetWidth:48,focus(){this.focused=true;}},about:{offsetLeft:72,offsetWidth:64,focus(){this.focused=true;}}},indicator={},panel={};
 const list={dataset:{},querySelector:selector=>selector==='.v2-stage-indicator'?indicator:selector==='[aria-selected=true]'?buttons[state]:buttons[selector.match(/data-tab="([^"]+)"/)?.[1]]};
 const gsap={set:(node,to)=>calls.push({node,to}),fromTo:(node,from,to)=>calls.push({node,from,to}),killTweensOf:node=>calls.push({node,kill:true}),matchMedia:()=>{const m={reverted:false,add(_,fn,scope){this.scope=scope;if(!reduced)this.cleanup=fn({add:fn=>fn()});},revert(){this.reverted=true;this.cleanup?.();}};media.push(m);return m;}};
 class ResizeObserver{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 const jsx=(type,props)=>({type,props}),t=text=>text;
 vm.runInNewContext(source,{exports,ResizeObserver,require:name=>{
  if(name==='react')return{useId:()=>'stage',useState:()=>[state,next=>{state=next;}],useLayoutEffect:fn=>{effect=fn;},useRef:initial=>{const i=refIndex++;return refs[i]||=( {current:i===0?list:i===1?panel:initial});}};
  if(name==='gsap')return{gsap};
  if(name==='./LocaleProvider')return{useLocale:()=>({t})};
  if(name==='react/jsx-runtime')return{jsx,jsxs:jsx};
  if(name==='next/link')return{default:'a'};
  if(name==='./FeedAvatar')return{FeedAvatar:'avatar'};
  if(name==='./Icons')return{Icon:'icon'};
  throw new Error('Unexpected dependency '+name);
 }});
 const creator={name:'Creator',handle:'creator',intro:'A working preview',skills:['React'],url:'/blog/creator',projects:[{title:'Project',description:'Description',href:'/projects/project'}]};
 function render(){cleanup?.();refIndex=0;const tree=exports.CreatorStage({creator});cleanup=effect();return tree;}
 function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of [tree.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}return null;}
 return{render,find,buttons,list,panel,indicator,calls,observers,media,cleanup:()=>cleanup?.()};
}

test('creator tabs move the shared underline and animate only user-selected panels',()=>{
 const f=fixture(),initial=f.render();assert.equal(f.list.dataset.tabMotion,'active');assert.ok(!f.calls.some(call=>call.node===f.panel));
 const about=f.find(initial,node=>node.props?.['data-tab']==='about');about.props.onClick();const changed=f.render();
 assert.equal(f.find(changed,node=>node.props?.['data-tab']==='about').props['aria-selected'],true);
 assert.ok(f.calls.some(call=>call.node===f.indicator&&call.from?.x===0&&call.to.x===72&&call.to.duration===.3));
 assert.ok(f.calls.some(call=>call.node===f.panel&&call.from.x===8&&call.from.opacity>0&&call.to.clearProps==='transform,opacity'));f.cleanup();
});

test('keyboard tab changes preserve roving focus and the panel relationship without motion preference',()=>{
 const f=fixture({reduced:true}),tree=f.render(),tablist=f.find(tree,node=>node.props?.role==='tablist');let prevented=false;
 tablist.props.onKeyDown({key:'End',preventDefault:()=>{prevented=true;},currentTarget:f.list});const next=f.render();
 const selected=f.find(next,node=>node.props?.['data-tab']==='about'),panel=f.find(next,node=>node.props?.role==='tabpanel');
 assert.ok(prevented&&f.buttons.about.focused);assert.equal(selected.props.tabIndex,0);assert.equal(selected.props['aria-controls'],panel.props.id);assert.equal(panel.props['aria-labelledby'],selected.props.id);
 assert.equal(f.calls.length,0);assert.equal(f.list.dataset.tabMotion,undefined);f.cleanup();
});

test('resized labels remeasure in local coordinates and observers stop after interruption',()=>{
 const f=fixture();f.render();const observer=f.observers.at(-1),initial=f.calls.length;observer.callback();assert.equal(f.calls.length,initial);f.buttons.work.offsetWidth=62;observer.callback();
 assert.ok(f.calls.some(call=>call.node===f.indicator&&call.to?.width===62));f.cleanup();const count=f.calls.length;observer.callback();
 assert.equal(f.calls.length,count);assert.ok(observer.disconnected);assert.equal(f.list.dataset.tabMotion,undefined);assert.ok(f.media.every(media=>media.reverted));
});
