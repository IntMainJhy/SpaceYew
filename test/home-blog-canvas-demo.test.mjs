import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {moveDesignNode} from '../src/lib/blog-design.mjs';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeBlogCanvasDemo.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({locale='zh',width=588,height=408}={}){
 const hooks=[],observers=[],exports={},host={clientWidth:width,clientHeight:height};
 let cursor=0,dirty=true,pending=[],tree;
 const React={
  useId:()=>{const index=cursor++;return(hooks[index]||={kind:'id',value:'demo-id'}).value;},
  useRef:initial=>{const index=cursor++;return(hooks[index]||={kind:'ref',value:{current:initial}}).value;},
  useState:initial=>{const index=cursor++,state=hooks[index]||={kind:'state',value:typeof initial==='function'?initial():initial};return[state.value,next=>{const value=typeof next==='function'?next(state.value):next;if(!Object.is(value,state.value)){state.value=value;dirty=true;}}];},
  useEffect:(callback,deps)=>{const index=cursor++,effect=hooks[index]||={kind:'effect'};if(!effect.deps||deps.some((value,index)=>!Object.is(value,effect.deps[index])))pending.push(()=>{effect.cleanup?.();effect.deps=deps;effect.cleanup=callback();});}
 };
 class ResizeObserver{
  constructor(callback){this.callback=callback;observers.push(this);}
  observe(element){this.element=element;}
  disconnect(){this.disconnected=true;}
 }
 class HTMLInputElement{}class HTMLTextAreaElement{}
 vm.runInNewContext(source,{exports,ResizeObserver,HTMLInputElement,HTMLTextAreaElement,require:name=>{
  if(name==='react')return React;
  if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:Symbol.for('fragment')};
  if(name==='@/lib/blog-design.mjs')return{moveDesignNode};
  if(name==='./Icons')return{Icon:()=>null};
  if(name==='@/app/home-blog-canvas-demo.css')return{};
  throw Error('Unexpected dependency '+name);
 }});
 const nodes=(type,root=tree)=>!root||typeof root!=='object'?[]:[...(root.type===type?[root]:[]),...([root.props?.children].flat(Infinity).flatMap(child=>child?nodes(type,child):[]))];
 const text=root=>root===null||root===undefined||typeof root==='boolean'?'':typeof root==='string'||typeof root==='number'?String(root):Array.isArray(root)?root.map(text).join(''):text(root.props?.children);
 function flush(){for(let count=0;dirty&&count<12;count++){dirty=false;cursor=0;pending=[];tree=exports.HomeBlogCanvasDemo({locale});for(const node of nodes('div'))if(node.props.ref)node.props.ref.current=host;for(const effect of pending)effect();}assert.equal(dirty,false,'state and effects settle');}
 const node=id=>nodes('div').find(item=>item.props['data-node-id']===id);
 const button=label=>{const buttons=nodes('button'),match=buttons.find(item=>item.props.className==='hbd-add'&&text(item)===label)||buttons.find(item=>item.props['aria-label']===label)||buttons.find(item=>text(item)===label);assert.ok(match,'button exists: '+label);return match;};
 const invoke=(element,event,...args)=>{assert.equal(typeof element?.props[event],'function',event+' exists');element.props[event](...args);flush();};
 const target={focus(){this.focused=true;},setPointerCapture(id){this.pointer=id;},hasPointerCapture(id){return this.pointer===id;},releasePointerCapture(id){assert.equal(this.pointer,id);this.pointer=null;}};
 const pointer=(x,y,extra={})=>({pointerId:4,clientX:x,clientY:y,button:0,currentTarget:target,preventDefault(){this.prevented=true;},...extra});
 flush();
 return{nodes,node,button,text,observers,host,target,invoke,pointer,HTMLInputElement,HTMLTextAreaElement,get tree(){return tree;},
  click:label=>invoke(button(label),'onClick'),
  select:id=>invoke(node(id),'onFocus'),
  edit:value=>{const input=nodes('input')[0];invoke(input,'onFocus');invoke(nodes('input')[0],'onChange',{target:{value}});invoke(nodes('input')[0],'onBlur');},
  resize:(width,height)=>{host.clientWidth=width;host.clientHeight=height;for(const observer of observers)observer.callback();flush();},
  unmount:()=>{for(const hook of hooks)if(hook.kind==='effect')hook.cleanup?.();}
 };
}

test('the sample opens in each supported language with local editable content and accessible canvas tabs',()=>{
 for(const [locale,title,canvas] of [['zh','把想法，写成自己的页面。','可编辑的博客示例画布'],['en','Make a page\nthat feels like you.','Editable example blog canvas'],['ja','アイデアを、\n自分らしいページに。','編集できるブログのサンプル']]){
  const s=fixture({locale});assert.equal(s.nodes('div').filter(n=>n.props['data-node-id']).length,3);assert.equal(s.node('title').props.children[0],title);
  const panel=s.nodes('div').find(n=>n.props.role==='tabpanel'),tabs=s.nodes('button').filter(n=>n.props.role==='tab');assert.equal(panel.props['aria-label'],canvas);assert.equal(tabs[0].props['aria-selected'],true);assert.equal(tabs[0].props['aria-controls'],panel.props.id);assert.equal(panel.props['aria-labelledby'],tabs[0].props.id);assert.equal(s.button(locale==='zh'?'撤销':locale==='en'?'Undo':'元に戻す').props.disabled,true);s.unmount();
 }
 const fallback=fixture({locale:'unknown'});assert.match(fallback.text(fallback.tree),/Interactive demo/);fallback.unmount();
});

test('text edits and color choices survive preview and can be undone as complete operations',()=>{
 const s=fixture();s.edit('这是我的新主页');s.click('紫色');assert.equal(s.node('title').props.style.color,'#754b72');
 s.click('预览');assert.equal(s.tree.props['data-preview'],true);assert.equal(s.node('title').props.children[0],'这是我的新主页');assert.equal(s.node('title').props.role,undefined);assert.equal(s.nodes('input').length,0);assert.match(s.text(s.tree),/演示改动仅在此处生效/);
 s.click('编辑');assert.equal(s.nodes('input')[0].props.value,'这是我的新主页');s.click('撤销');assert.equal(s.node('title').props.style.color,'#244c8e');assert.equal(s.nodes('input')[0].props.value,'这是我的新主页');s.click('撤销');assert.equal(s.node('title').props.children[0],'把想法，写成自己的页面。');assert.equal(s.button('撤销').props.disabled,true);s.unmount();
});

test('adding text is bounded and undo or reset restores a usable selection and initial history',()=>{
 const s=fixture();for(let index=0;index<3;index++)s.click('添加文字');assert.equal(s.nodes('div').filter(n=>n.props['data-node-id']).length,6);assert.equal(s.button('添加文字').props.disabled,true);
 // Even a stale event cannot bypass the local sample limit.
 s.invoke(s.button('添加文字'),'onClick');assert.equal(s.nodes('div').filter(n=>n.props['data-node-id']).length,6);
 s.click('撤销');assert.equal(s.nodes('div').filter(n=>n.props['data-node-id']).length,5);assert.ok(s.nodes('div').some(n=>n.props['data-selected']===true));assert.equal(s.button('添加文字').props.disabled,false);
 s.click('恢复初始画布');assert.equal(s.nodes('div').filter(n=>n.props['data-node-id']).length,3);assert.equal(s.node('title').props['data-selected'],true);assert.equal(s.nodes('input')[0].props.value,'把想法，写成自己的页面。');assert.equal(s.button('撤销').props.disabled,true);assert.match(s.text(s.tree),/已恢复初始画布/);s.unmount();
});

test('pointer movement accounts for the displayed scale, clamps to the artboard and records a single undo',()=>{
 const s=fixture({width:308,height:218});assert.match(s.nodes('div').find(n=>n.props.className==='hbd-paper').props.style.transform,/scale\(0.5\)/);
 s.invoke(s.node('note'),'onPointerDown',s.pointer(100,100));assert.equal(s.target.focused,true);assert.equal(s.target.pointer,4);
 s.invoke(s.node('note'),'onPointerMove',s.pointer(110,105));assert.equal(s.node('note').props.style.transform,'translate(366px,316px)');
 s.invoke(s.node('note'),'onPointerMove',s.pointer(1000,1000));assert.equal(s.node('note').props.style.transform,'translate(390px,340px)');
 s.invoke(s.node('note'),'onPointerUp',s.pointer(1000,1000));assert.equal(s.target.pointer,null);assert.equal(s.button('撤销').props.disabled,false);s.click('撤销');assert.equal(s.node('note').props.style.transform,'translate(346px,306px)');assert.equal(s.button('撤销').props.disabled,true);s.unmount();
});

test('cancelled, unrelated and secondary pointer events preserve the prior design',()=>{
 const s=fixture();s.invoke(s.node('title'),'onPointerDown',s.pointer(100,100,{button:2}));s.invoke(s.node('title'),'onPointerMove',s.pointer(0,0));assert.equal(s.node('title').props.style.transform,'translate(40px,72px)');
 s.invoke(s.node('title'),'onPointerDown',s.pointer(100,100));s.invoke(s.node('title'),'onPointerMove',s.pointer(0,0,{pointerId:8}));assert.equal(s.node('title').props.style.transform,'translate(40px,72px)');
 s.invoke(s.node('title'),'onPointerMove',s.pointer(-1000,-1000));assert.equal(s.node('title').props.style.transform,'translate(0px,0px)');s.invoke(s.node('title'),'onPointerCancel',s.pointer(-1000,-1000));assert.equal(s.node('title').props.style.transform,'translate(40px,72px)');assert.equal(s.button('撤销').props.disabled,true);assert.equal(s.target.pointer,null);s.unmount();
});

test('arrow keys move only focused canvas nodes, remain bounded, and stop in preview',()=>{
 const s=fixture();let prevented=0;const key=(key,extra={})=>({key,shiftKey:false,preventDefault(){prevented++;},...extra});
 s.invoke(s.tree,'onKeyDown',key('ArrowDown'));assert.equal(prevented,0);assert.equal(s.node('title').props.style.transform,'translate(40px,72px)');
 s.invoke(s.node('title'),'onKeyDown',key('ArrowRight'));assert.equal(s.node('title').props.style.transform,'translate(41px,72px)');s.invoke(s.node('title'),'onKeyDown',key('ArrowDown',{shiftKey:true}));assert.equal(s.node('title').props.style.transform,'translate(41px,82px)');
 s.select('note');for(let index=0;index<5;index++)s.invoke(s.node('note'),'onKeyDown',key('ArrowDown',{shiftKey:true}));assert.equal(s.node('note').props.style.transform,'translate(346px,340px)');
 const before=prevented;s.click('预览');s.invoke(s.node('title'),'onKeyDown',key('ArrowLeft'));assert.equal(prevented,before);assert.equal(s.node('title').props.style.transform,'translate(41px,82px)');s.unmount();
});

test('the scoped undo shortcut does not intercept text fields and the resize observer disconnects on unmount',()=>{
 const s=fixture();s.click('紫色');let prevented=0;const shortcut=target=>({key:'z',ctrlKey:true,target,preventDefault(){prevented++;}});
 s.invoke(s.tree,'onKeyDown',shortcut(new s.HTMLInputElement()));s.invoke(s.tree,'onKeyDown',shortcut(new s.HTMLTextAreaElement()));assert.equal(prevented,0);assert.equal(s.node('title').props.style.color,'#754b72');
 s.invoke(s.tree,'onKeyDown',shortcut({}));assert.equal(prevented,1);assert.equal(s.node('title').props.style.color,'#244c8e');
 assert.equal(s.observers.length,1);assert.equal(s.observers[0].element,s.host);s.resize(308,218);assert.match(s.nodes('div').find(n=>n.props.className==='hbd-paper').props.style.transform,/scale\(0.5\)/);s.resize(2000,2000);assert.match(s.nodes('div').find(n=>n.props.className==='hbd-paper').props.style.transform,/scale\(1\)/);s.unmount();assert.equal(s.observers[0].disconnected,true);
});
