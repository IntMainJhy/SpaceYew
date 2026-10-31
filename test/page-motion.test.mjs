import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({reduced=false}={}){
 const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/PageMotion.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const effects=[],layouts=[],calls=[],contexts=[],observers=[],media=[],events=new Map(),changes=new Set(),menus=[{open:true}],exports={};
 class Element{constructor(rect={left:100,top:100,width:160,height:44}){this.rect=rect;this.dataset={};this.scrollTop=0;this.nodes={};}getBoundingClientRect(){return this.rect;}querySelector(selector){return this.nodes[selector]||null;}querySelectorAll(){return this.links||[];}closest(){return this;}contains(){return true;}focus(){this.focused=true;}hasAttribute(){return false;}}
 let root=new Element(),path='/community',query='',refs=[],refIndex=0;
 const preference={matches:reduced,addEventListener:(_,fn)=>changes.add(fn),removeEventListener:(_,fn)=>changes.delete(fn)};
 const document={querySelectorAll:()=>menus,addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:(key)=>events.delete(key)};
 const window={matchMedia:q=>q.includes('reduced-motion')?preference:{matches:true},addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key)};
 const gsap={fromTo:(node,from,to)=>calls.push({node,from,to}),set:(node,to)=>calls.push({node,to}),killTweensOf:node=>calls.push({node,kill:true}),context:fn=>{const cleanup=fn();const ctx={reverted:false,add:callback=>callback(),revert(){this.reverted=true;cleanup?.();}};contexts.push(ctx);return ctx;},matchMedia:()=>{const m={reverted:false,add:(_,fn)=>{if(!preference.matches)fn();},revert(){this.reverted=true;}};media.push(m);return m;}};
 class ResizeObserver{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 vm.runInNewContext(source,{exports,document,window,ResizeObserver,location:new URL('http://localhost:3010/community'),URL,Element,require:name=>{
  if(name==='react')return{useEffect:fn=>effects.push(fn),useLayoutEffect:fn=>layouts.push(fn),useRef:initial=>{const i=refIndex++;if(i===0)return refs[0]={current:root};return refs[i]||=( {current:initial});}};
  if(name==='gsap')return{gsap};
  if(name==='next/navigation')return{usePathname:()=>path,useSearchParams:()=>new URLSearchParams(query)};
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props})};
  if(name.endsWith('.css'))return{};
  throw new Error('Unexpected dependency '+name);
 }});
 function page(to,left=100,key='feed',{publicPage=false,remount=false}={}){
  const url=new URL(to,'http://localhost:3010');path=url.pathname;query=url.search.slice(1);root=new Element();root.dataset.motionRoute=to;refIndex=0;if(remount)refs=[];
  const nav=new Element({left,top:100,width:160,height:476}),active=new Element({left,top:key==='feed'?248:296,width:120,height:44}),indicator=new Element(active.rect),content=new Element({left:left+192,top:100,width:768,height:700});
  active.dataset.navKey=key;nav.nodes['[data-nav-key][aria-current="page"]']=active;nav.nodes['.feed-active-indicator']=indicator;
  root.nodes=publicPage?{'.resource-hub > [data-glass-reveal],.catalog-page,.skills-page,.product-download-page,.document-reader,.shared-reading-layout,.community-auth-form,.community-report,.community-policy-document,.community-receipt':content}:{'.community-navigation-shell':new Element(),'.feed-nav-links':nav,'.community-route-content,.space-workspace-main':content};root.links=[active];
  const children={title:'Visible server content'},output=exports.PageMotion({children});
  assert.equal(output.props.children,children);assert.equal(output.props.style,undefined);
  const close=effects.at(-2)();assert.equal(close,undefined);assert.ok(menus.every(menu=>!menu.open));
  const eventsCleanup=effects.at(-1)(),motionCleanup=layouts.at(-1)();
  return{root,nav,content,active,indicator,cleanup:()=>{eventsCleanup?.();motionCleanup?.();}};
 }
 function click(to,key='members',keyboard=false,overrides={}){const link=new Element();link.href=new URL(to,'http://localhost:3010').href;link.target='';link.dataset.navKey=key;const target=new Element();target.closest=()=>link;const event={target,button:0,detail:keyboard?0:1,...overrides};events.get('click')(event);return event;}
 return{page,click,calls,contexts,observers,events,preference,changes,media};
}

test('first render keeps server content visible and only positions the active indicator',()=>{
 const f=fixture(),p=f.page('/community');assert.ok(!f.calls.some(call=>call.node===p.content));assert.equal(p.nav.dataset.motionReady,'true');p.cleanup();assert.equal(p.nav.dataset.motionReady,undefined);assert.ok(f.contexts.every(ctx=>ctx.reverted));assert.equal(f.events.size,0);
});
test('equal-width routes move the active indicator without moving either rail or hiding text',()=>{
 const f=fixture(),a=f.page('/community');f.click('/community/members','members',true);a.cleanup();const start=f.calls.length,b=f.page('/community/members',100,'members'),calls=f.calls.slice(start);
 assert.ok(!calls.some(call=>call.node===b.nav));assert.ok(calls.some(call=>call.node===b.content&&call.from.opacity===.9&&call.to.opacity===1));assert.ok(calls.some(call=>call.node===b.indicator&&call.from&&call.from.y!==call.to.y));assert.equal(b.active.focused,true);b.cleanup();
});
test('switching into the wider workspace bridges the rail positions and cleans up when interrupted',()=>{
 const f=fixture(),a=f.page('/community');f.click('/workspace/library','library');a.cleanup();const start=f.calls.length,b=f.page('/workspace/library',20,'library');assert.ok(f.calls.slice(start).some(call=>call.node===b.nav&&call.from.x===80&&call.to.x===0));assert.ok(f.calls.slice(start).some(call=>call.node===b.content&&call.from.x===80&&call.to.x===0));f.preference.matches=true;for(const change of f.changes)change();assert.ok(f.contexts.at(-1).reverted);assert.equal(b.nav.dataset.motionReady,undefined);b.cleanup();
});
test('reduced motion preserves navigation and content without creating any GSAP tweens',()=>{
 const f=fixture({reduced:true}),a=f.page('/community');f.click('/workspace/notifications','notifications');a.cleanup();const b=f.page('/workspace/notifications',100,'notifications');assert.equal(f.calls.length,0);assert.equal(b.nav.dataset.motionReady,undefined);b.cleanup();
});

test('resizing or translating a navigation label remeasures the indicator and disconnects on cleanup',()=>{
 const f=fixture(),p=f.page('/community'),observer=f.observers[0];p.active.rect={...p.active.rect,width:148};observer.callback();assert.ok(f.calls.some(call=>call.node===p.indicator&&call.to?.width===148));p.cleanup();assert.equal(observer.disconnected,true);const count=f.calls.length;observer.callback();assert.equal(f.calls.length,count);
});

test('public header links bridge remounted frames without delaying or cancelling native navigation',()=>{
 const f=fixture(),a=f.page('/resources',100,'feed',{publicPage:true});assert.equal(f.calls.length,0);
 const event=f.click('/downloads');assert.equal(event.defaultPrevented,undefined);assert.equal(event.preventDefault,undefined);a.cleanup();
 const b=f.page('/downloads',100,'feed',{publicPage:true,remount:true});
 assert.ok(f.calls.some(call=>call.node===b.content&&call.from.y===10&&call.to.opacity===1&&call.to.clearProps==='transform,opacity'));
 b.cleanup();assert.ok(f.media.every(media=>media.reverted));
});

test('query routes keep public content in place and modified or external clicks cannot create a handoff',()=>{
 const f=fixture(),a=f.page('/resources',100,'feed',{publicPage:true});f.click('/resources?type=skills');a.cleanup();
 const b=f.page('/resources?type=skills',100,'feed',{publicPage:true,remount:true});assert.ok(f.calls.some(call=>call.node===b.content&&call.from.y===0&&call.to.duration===.24));b.cleanup();
 for(const [to,overrides] of [['/downloads',{ctrlKey:true}],['https://example.com/downloads',{}],['/downloads',{defaultPrevented:true}],['/downloads',{button:1}]]){
  const p=f.page('/resources',100,'feed',{publicPage:true,remount:true});f.click(to,'members',false,overrides);p.cleanup();const start=f.calls.length,q=f.page('/downloads',100,'feed',{publicPage:true,remount:true});assert.equal(f.calls.length,start);q.cleanup();
 }
});

test('reduced motion public transitions retain the native content and query navigation',()=>{
 const f=fixture({reduced:true}),a=f.page('/resources',100,'feed',{publicPage:true});f.click('/resources?type=skills');a.cleanup();const b=f.page('/resources?type=skills',100,'feed',{publicPage:true,remount:true});assert.equal(f.calls.length,0);b.cleanup();
});
