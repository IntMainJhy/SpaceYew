import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({reduced=false,storageFails=false,keyboard=false}={}) {
  const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/PromotionBar.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={},states=[],refs=[],effects=[],layouts=[],contexts=[],timelines=[],sets=[],storage=new Map();
  let stateIndex=0,refIndex=0,path='/community';
  class Element {getBoundingClientRect(){return{height:48};}querySelector(selector){return{selector};}matches(){return keyboard;}}
  const brand={focus:options=>{brand.options=options;}};
  const gsap={set:(node,props)=>sets.push({node,props}),context:callback=>{callback();const ctx={revert(){this.reverted=true;}};contexts.push(ctx);return ctx;},timeline:options=>{const timeline={options,steps:[],to(node,props,at){this.steps.push({node,props,at});return this;}};timelines.push(timeline);return timeline;}};
  const Link=()=>null;
  vm.runInNewContext(source,{exports,HTMLElement:Element,document:{activeElement:new Element(),querySelector:()=>brand},window:{matchMedia:()=>({matches:reduced})},sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>{if(storageFails)throw Error('unavailable');storage.set(key,value);}},require:name=>{
    if(name==='react')return{useState:initial=>{const index=stateIndex++;if(!(index in states))states[index]=initial;return[states[index],value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},useRef:initial=>{const index=refIndex++;return refs[index]??=( {current:initial} );},useEffect:fn=>effects.push(fn),useLayoutEffect:fn=>layouts.push(fn)};
    if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(name==='next/link')return{default:Link};
    if(name==='next/navigation')return{usePathname:()=>path};
    if(name==='./LocaleProvider')return{useLocale:()=>({t:value=>value})};
    if(name==='./Icons')return{Icon:()=>null};
    if(name==='gsap')return{gsap};
    throw Error('Unexpected dependency '+name);
  }});
  const config={enabled:true,items:[{title:'社区',url:'/community',kind:'recommendation'},{title:'广告',url:'https://example.com',kind:'ad'}]};
  function render(){stateIndex=0;refIndex=0;effects.length=layouts.length=0;return exports.PromotionBar({config});}
  function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];}
  function button(tree){return nodes(tree).find(node=>node.type==='button');}
  function mount(){const tree=render();tree.props.ref.current=new Element();return tree;}
  return{mount,render,button,nodes,storage,timelines,sets,contexts,effects,layouts,brand,Link,site:to=>{path=to;return exports.SitePromotion({config});}};
}

test('close collapses once, remembers immediately, and restores keyboard focus after completing',()=>{
  const f=fixture({keyboard:true}),tree=f.mount();f.button(tree).props.onClick();
  assert.equal(f.storage.values().next().value,'closed');
  const closing=f.render();assert.equal(closing.props['data-closing'],true);assert.equal(f.button(closing).props.disabled,true);
  f.button(tree).props.onClick();assert.equal(f.timelines.length,1);
  assert.equal(f.sets[0].props.height,48);assert.equal(f.timelines[0].steps.at(-1).props.height,0);
  assert.equal(f.brand.options,undefined);
  f.timelines[0].options.onComplete();assert.equal(f.render(),null);
  f.layouts[1]();assert.ok(f.contexts[0].reverted);assert.equal(f.brand.options.preventScroll,true);
});
test('reduced motion closes immediately even when session storage is unavailable',()=>{
  const f=fixture({reduced:true,storageFails:true}),tree=f.mount();f.button(tree).props.onClick();assert.equal(f.render(),null);assert.equal(f.timelines.length,0);
});
test('unmount reverts an unfinished close and internal links retain client navigation',()=>{
  const f=fixture(),tree=f.mount(),cleanup=f.effects[0]();
  const links=f.nodes(tree).filter(node=>node.type===f.Link);assert.equal(links.length,2);assert.ok(links.every(node=>node.props.prefetch===false));assert.equal(links[1].props.tabIndex,-1);
  assert.ok(f.nodes(tree).some(node=>node.type==='a'&&node.props.rel==='sponsored noopener noreferrer'));
  f.button(tree).props.onClick();cleanup();assert.ok(f.contexts[0].reverted);
  assert.ok(f.site('/community'));assert.equal(f.site('/admin'),null);assert.equal(f.site('/admin/settings'),null);
});
