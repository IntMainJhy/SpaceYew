import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import {skillInstallCommand} from '../src/lib/skill-install.mjs';

test('install URL follows the configured site without including credentials, paths or query strings',()=>{
 const command=skillInstallCommand('https://user:secret@example.com/docs?token=private');
 assert.equal(command,"mkdir -p ~/.agents/skills\ncurl -fsSL 'https://example.com/skills/spaceyew-post.tar.gz' | tar -xz -C ~/.agents/skills");
 assert.ok(skillInstallCommand('http://localhost:3010/').includes('http://localhost:3010/skills/'));
 execFileSync('sh',['-n'],{input:command});
});

test('packaged Skill contains every reference and fallback script with original content',()=>{
 execFileSync(process.execPath,['scripts/package-skill.mjs']);
 const files=['SKILL.md','references/api.md','scripts/client.mjs','scripts/request.mjs'];
 const archive='public/skills/spaceyew-post.tar.gz',target=mkdtempSync(join(tmpdir(),'spaceyew-skill-'));
 try{
  const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');
  assert.deepEqual(entries,files.map(file=>'spaceyew-post/'+file));
  assert.deepEqual(readFileSync('public/skills/ergathia-post.tar.gz'),readFileSync(archive),'previous install URLs must deliver the renamed Skill');
  execFileSync('tar',['-xzf',archive,'-C',target]);
  for(const file of files)assert.deepEqual(readFileSync(join(target,'spaceyew-post',file)),readFileSync(join('integrations/spaceyew-post',file)));
 }finally{rmSync(target,{recursive:true,force:true});}
});

test('SpaceYew client accepts both current and previous private environment configuration',async()=>{
 const {call}=await import('../integrations/spaceyew-post/scripts/client.mjs');
 const keys=['SPACEYEW_URL','SPACEYEW_TOKEN','ERGATHIA_URL','ERGATHIA_TOKEN'];
 const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]])),originalFetch=globalThis.fetch;
 const token='erg_'+'A'.repeat(43);let requested;
 try{
  globalThis.fetch=async(url,options)=>{requested={url:String(url),authorization:options.headers.Authorization};return Response.json({id:'current-member'});};
  for(const prefix of ['SPACEYEW','ERGATHIA']){
   for(const key of keys)delete process.env[key];
   process.env[prefix+'_URL']='https://example.com';process.env[prefix+'_TOKEN']=token;
   assert.equal((await call('me')).id,'current-member');
   assert.equal(requested.url,'https://example.com/api/connect');
   assert.equal(requested.authorization,'Bearer '+token);
  }
 }finally{globalThis.fetch=originalFetch;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});

test('copy button copies the complete command and exposes success or a manual-copy error',async()=>{
 const source=ts.transpileModule(readFileSync(new URL('../src/components/SkillInstall.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
 }).outputText;
 for(const fail of[false,true]){
  const state=['idle',false];let cursor=0,copied='';const exports={};
  vm.runInNewContext(source,{exports,navigator:{clipboard:{writeText:async value=>{if(fail)throw new Error('clipboard unavailable');copied=value;}}},require:name=>{
   if(name==='react')return{useState:()=>{const index=cursor++;return[state[index],value=>{state[index]=value;}]},useRef:()=>({current:null}),useEffect:()=>{}};
   if(name==='./LocaleProvider')return{useLocale:()=>({t:value=>value})};
   if(name==='@/lib/skill-install.mjs')return{skillInstallCommand};
   if(name==='react/jsx-runtime')return{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
   throw new Error(name);
  }});
  const render=()=>{cursor=0;return exports.SkillInstall({baseUrl:'http://localhost:3010'});};
  await render().props.children[1].props.onClick();
  const output=render();
  assert.equal(state[0],fail?'error':'copied');
  assert.equal(output.props.children[2].props.children,fail?'复制失败，请手动选择代码。':'已复制');
  assert.equal(output.props.children[1].type,'button');
  const code=output.props.children[0];
  code.props.onFocus();assert.equal(state[1],true,'focusing the code holds the complete command for reading');
  code.props.onBlur();assert.equal(state[1],false,'leaving the code allows automatic playback to resume');
  if(!fail)assert.equal(copied,skillInstallCommand('http://localhost:3010'));
 }
});

test('typing deletes and retypes the full command, suspends when hidden/offscreen/reduced and cleans up timers',()=>{
 const source=readFileSync(new URL('../src/lib/skill-install.mjs',import.meta.url),'utf8').replaceAll('export function','function')+'\nexports.mountSkillTypewriter=mountSkillTypewriter;';
 class Target extends EventTarget{
  listeners=new Set();
  addEventListener(type,listener){super.addEventListener(type,listener);this.listeners.add(type);}
  removeEventListener(type,listener){super.removeEventListener(type,listener);this.listeners.delete(type);}
 }
 const timers=new Map(),document=Object.assign(new Target(),{hidden:false}),preference=Object.assign(new Target(),{matches:false});
 let nextId=0,observer;
 const window=Object.assign(new Target(),{matchMedia:()=>preference,setTimeout:fn=>{timers.set(++nextId,fn);return nextId},clearTimeout:id=>timers.delete(id)});
 const exports={},root={dataset:{}},text={textContent:''},command='mkdir -p ~/.agents/skills\ncurl -fsSL https://example.com/skill.tar.gz | tar -xz';
 class Observer{constructor(callback){this.callback=callback;observer=this;}observe(){}disconnect(){this.disconnected=true;}intersect(visible){this.callback([{isIntersecting:visible}]);}}
 vm.runInNewContext(source,{exports,window,document,IntersectionObserver:Observer,URL});
 const cleanup=exports.mountSkillTypewriter(root,text,command);
 const next=()=>{const[id,fn]=timers.entries().next().value;timers.delete(id);fn();};
 assert.equal(text.textContent,command);assert.equal(timers.size,0);
 observer.intersect(true);assert.equal(timers.size,1);
 next();assert.equal(text.textContent,command.slice(0,-2));
 for(let i=0;i<command.length&&text.textContent;i++)next();
 assert.equal(text.textContent,'');
 for(let i=0;i<command.length;i++)next();
 assert.equal(text.textContent,command);next();assert.equal(text.textContent,command.slice(0,-2),'a completed command must repeat the cycle');
 document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(timers.size,0);assert.equal(text.textContent,command);
 observer.intersect(false);document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(timers.size,0);
 observer.intersect(true);assert.equal(timers.size,1);
 preference.matches=true;preference.dispatchEvent(new Event('change'));assert.equal(timers.size,0);assert.equal(root.dataset.typing,'false');
 preference.matches=false;preference.dispatchEvent(new Event('change'));assert.equal(timers.size,1);
 window.dispatchEvent(new Event('beforeprint'));assert.equal(timers.size,0);
 window.dispatchEvent(new Event('afterprint'));assert.equal(timers.size,1);
 cleanup();assert.equal(timers.size,0);assert.ok(observer.disconnected);
 assert.equal(window.listeners.size+document.listeners.size+preference.listeners.size,0);
});
