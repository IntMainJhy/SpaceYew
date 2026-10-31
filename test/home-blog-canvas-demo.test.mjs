import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {moveDesignNode} from '../src/lib/blog-design.mjs';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/HomeBlogCanvasDemo.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({locale='zh',width=588,height=408,creator}={}){
 const hooks=[],observers=[],exports={},scrolls=[],host={clientWidth:width,clientHeight:height,scrollTop:0,scrollTo(options){this.scrollTop=options.top;scrolls.push(options.top);}};
 const FeedAvatar=()=>null;
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
  if(name==='./FeedAvatar')return{FeedAvatar};
  if(name==='@/app/home-blog-canvas-demo.css')return{};
  throw Error('Unexpected dependency '+name);
 }});
 const nodes=(type,root=tree)=>!root||typeof root!=='object'?[]:[...(root.type===type?[root]:[]),...([root.props?.children].flat(Infinity).flatMap(child=>child?nodes(type,child):[]))];
 const text=root=>root===null||root===undefined||typeof root==='boolean'?'':typeof root==='string'||typeof root==='number'?String(root):Array.isArray(root)?root.map(text).join(''):text(root.props?.children);
 function flush(){for(let count=0;dirty&&count<12;count++){dirty=false;cursor=0;pending=[];tree=exports.HomeBlogCanvasDemo({locale,creator});for(const node of nodes('div'))if(node.props.ref)node.props.ref.current=host;for(const effect of pending)effect();}assert.equal(dirty,false,'state and effects settle');}
 const node=id=>nodes('div').find(item=>item.props['data-node-id']===id);
 const button=label=>{const buttons=nodes('button'),match=buttons.find(item=>item.props.className==='hbd-add'&&text(item)===label)||buttons.find(item=>item.props['aria-label']===label)||buttons.find(item=>text(item)===label);assert.ok(match,'button exists: '+label);return match;};
 const invoke=(element,event,...args)=>{assert.equal(typeof element?.props[event],'function',event+' exists');element.props[event](...args);flush();};
 const target={focus(){this.focused=true;},setPointerCapture(id){this.pointer=id;},hasPointerCapture(id){return this.pointer===id;},releasePointerCapture(id){assert.equal(this.pointer,id);this.pointer=null;}};
 const pointer=(x,y,extra={})=>({pointerId:4,clientX:x,clientY:y,button:0,currentTarget:target,preventDefault(){this.prevented=true;},...extra});
 flush();
 const field=()=>[...nodes('input'),...nodes('textarea')].find(item=>item.props['aria-label']==='文字内容'||item.props['aria-label']==='Text content');
 return{nodes,node,button,text,observers,host,target,invoke,pointer,field,scrolls,avatar:()=>nodes(FeedAvatar)[0],HTMLInputElement,HTMLTextAreaElement,get tree(){return tree;},
  click:label=>invoke(button(label),'onClick'),
  select:id=>invoke(node(id),'onFocus'),
  edit:value=>{invoke(field(),'onFocus');invoke(field(),'onChange',{target:{value}});invoke(field(),'onBlur');},
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


const publishedCreator={name:'余江昊',handle:'jianghaoyu2006',description:'创造、记录与分享',intro:'来自公开博客的真实简介。\n专注应用开发与开源实践。',avatarId:'public-avatar',skills:['HarmonyOS','ArkTS','React'],url:'/blog/jianghaoyu2006',projects:[{title:'CheckMe',description:'来自公开主页的作品介绍',imageId:'public-cover',href:'/blog/jianghaoyu2006#anx-projects'},{title:'开源实践',description:'第二件公开作品',href:'/blog/jianghaoyu2006#anx-projects'}]};
test('the macOS demo renders a real public creator snapshot with avatar, skills and project imagery',()=>{
 const s=fixture({creator:publishedCreator});assert.equal(s.tree.props['data-example'],true);
 const address=s.nodes('a').find(n=>n.props.className==='hbd-address');assert.equal(address.props.href,publishedCreator.url);assert.equal(s.text(address),'/blog/jianghaoyu2006');assert.match(address.props['aria-label'],/余江昊/);
 const dots=s.nodes('span').find(n=>n.props.className==='hbd-window-dots');assert.equal(dots.props['aria-hidden'],'true');assert.equal(s.nodes('i',dots).length,3);
 assert.equal(s.node('title').props.children[0],publishedCreator.name);assert.equal(s.node('tagline').props.children[0],publishedCreator.description);assert.equal(s.node('intro').props.children[0],publishedCreator.intro);assert.equal(s.node('skills').props.children[0],publishedCreator.skills.join(' · '));
 assert.equal(s.avatar().props.name,publishedCreator.name);assert.equal(s.avatar().props.avatarId,publishedCreator.avatarId);
 const image=s.nodes('img',s.node('project-0'))[0];assert.equal(image.props.src,'/media/public-cover');assert.equal(image.props.draggable,false);assert.equal(image.props.loading,'lazy');assert.match(s.text(s.node('project-0')),/CheckMe/);assert.match(s.text(s.node('project-0')),/来自公开主页的作品介绍/);assert.equal(s.nodes('img',s.node('project-1')).length,0);assert.equal(s.nodes('div').filter(n=>n.props['data-node-id']).length,6);s.unmount();
});

test('real introduction and project text can be edited locally, previewed and reset to the public snapshot',()=>{
 const before=structuredClone(publishedCreator),s=fixture({creator:publishedCreator});s.click('关于我');assert.equal(s.field().type,'textarea');assert.equal(s.field().props.value,publishedCreator.intro);s.edit('这是当前浏览器中的临时改动');
 s.click('CheckMe');assert.equal(s.field().type,'textarea');s.edit('本地作品标题\n本地作品简介');s.click('预览');assert.equal(s.nodes('textarea').length,0);assert.match(s.text(s.node('project-0')),/本地作品标题/);assert.equal(s.node('intro').props.children[0],'这是当前浏览器中的临时改动');assert.equal(s.nodes('img',s.node('project-0'))[0].props.src,'/media/public-cover');assert.deepEqual(publishedCreator,before,'editing does not mutate the server-provided snapshot');
 s.click('恢复初始画布');assert.equal(s.tree.props['data-preview'],false);assert.equal(s.node('title').props.children[0],before.name);assert.equal(s.node('intro').props.children[0],before.intro);assert.match(s.text(s.node('project-0')),/CheckMe/);assert.equal(s.node('title').props['data-selected'],true);assert.equal(s.host.scrollTop,0);assert.equal(s.button('撤销').props.disabled,true);s.unmount();
});

test('selecting a layer scrolls the long public page and new text is limited to three additional layers',()=>{
 const s=fixture({creator:publishedCreator,width:308,height:218}),paper=s.nodes('div').find(n=>n.props.className==='hbd-paper');assert.ok(paper.props.style.height>760,'public content uses a vertically scrollable page');assert.equal(paper.props.style.transform,'scale(0.5)','long pages fit width rather than shrinking to fit height');
 s.click('CheckMe');const projectY=Number(s.node('project-0').props.style.transform.match(/,(\d+)px/)[1]);assert.equal(s.host.scrollTop,Math.max(0,projectY*.5-65));assert.equal(s.node('project-0').props['data-selected'],true);assert.equal(s.field().props.value,'CheckMe\n'+publishedCreator.projects[0].description);
 const count=()=>s.nodes('div').filter(n=>n.props['data-node-id']).length,initial=count();assert.equal(initial,6);for(let i=0;i<3;i++)s.click('添加文字');assert.equal(count(),initial+3);assert.equal(s.button('添加文字').props.disabled,true);s.invoke(s.button('添加文字'),'onClick');assert.equal(count(),initial+3);
 s.click('撤销');assert.equal(count(),initial+2);s.click('恢复初始画布');assert.equal(count(),initial);assert.equal(s.host.scrollTop,0);assert.equal(s.button('添加文字').props.disabled,false);s.unmount();
});

test('real public project layers still use scaled drag coordinates and stay within their full page bounds',()=>{
 const s=fixture({creator:publishedCreator,width:308,height:218}),height=s.nodes('div').find(n=>n.props.className==='hbd-paper').props.style.height,projectHeight=s.node('project-0').props.style.height;
 s.invoke(s.node('project-0'),'onPointerDown',s.pointer(100,100));s.invoke(s.node('project-0'),'onPointerMove',s.pointer(100000,100000));assert.equal(s.node('project-0').props.style.transform,`translate(84px,${height-projectHeight}px)`);s.invoke(s.node('project-0'),'onPointerCancel',s.pointer(100000,100000));assert.equal(s.button('撤销').props.disabled,true);s.unmount();
});
