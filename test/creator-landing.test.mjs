import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as runtime from 'react/jsx-runtime';
import * as locales from '../src/lib/content-locales.mjs';

const source=ts.transpileModule(fs.readFileSync(new URL('../src/components/PlatformHome.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
async function render(space,locale='zh'){
 const exports={};
 const Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
 const modules={
  'react/jsx-runtime':runtime,'next/link':{default:Link},
  '@/lib/server-i18n':{serverI18n:async()=>({t:value=>value,locale})},
  '@/lib/spaces.mjs':{defaultBlogSpace:()=>space,publicSpaces:()=>[]},
  '@/lib/content-locales.mjs':locales,'@/lib/db.mjs':{getConfig:()=>({desktopDownloads:{}})},
  '@/lib/home-download.mjs':{homeDownload:()=>({href:'/downloads'})},
  './FeedAvatar':{FeedAvatar:()=>null},'./Icons':{Icon:()=>null},'./V2Atmosphere':{V2Atmosphere:()=>null},
  './HomeMotion':{HomeMotion:()=>null},
  './HomeWindGallery':{HomeWindGallery:({items,heading})=>React.createElement('section',{'data-wind-gallery':true},React.createElement('h2',null,heading),items.map(item=>React.createElement('a',{key:item.href,href:item.href},item.title)))},
  '@/app/home-showcase.css':{},
  './CreatorStage':{CreatorStage:({creator})=>React.createElement('pre',{'data-stage':true},JSON.stringify(creator))}
 };
 vm.runInNewContext(source,{exports,Set,encodeURIComponent,require:name=>{if(!Object.hasOwn(modules,name))throw new Error(name);return modules[name]}});
 return renderToStaticMarkup(await exports.PlatformHome({req:new Request('http://site.example/')}));
}
const space={handle:'published-author',profile:{name:'Published author',intro:'Public introduction',email:'private-marker',skills:['ArkTS'],resume:{sections:[{id:'projects',title:'代表项目',items:[{title:'Real work',description:'A published project',coverId:'published-cover',translations:{en:{title:'Translated work'}}}]}]}},layout:{blog:{design:{nodes:[{part:'section:projects'}]}}},content:[]};
test('creator landing projects use the reviewed résumé cover and localized public presentation',async()=>{
 const html=await render(space,'en');
 assert.ok(html.includes('/media/published-cover'));
 assert.ok(html.includes('Translated work'));
 assert.ok(html.includes('/blog/published-author#anx-projects'));
 assert.ok(!html.includes('private-marker'));
 assert.ok(html.includes('data-glass-reveal="stage"'));
 assert.ok(html.includes('data-stage="true"'));
});
test('hidden résumé projects stay out of the landing and published documents provide the fallback',async()=>{
 const hidden={...space,layout:{blog:{design:{nodes:[{part:'section:projects',hidden:true}]}}},content:[{type:'projects',slug:'public-project',title:'Published document',summary:'Public summary',coverId:'document-cover'},{type:'articles',slug:'article',title:'Not a portfolio project',summary:'Article'}]};
 const html=await render(hidden);
 assert.ok(!html.includes('Real work'));
 assert.ok(!html.includes('/media/published-cover'));
 assert.ok(html.includes('Published document'));
 assert.ok(html.includes('/media/document-cover'));
 assert.ok(!html.includes('Not a portfolio project'));
});
test('wind discoveries link to the public creator and reachable skill and resource destinations',async()=>{
 const html=await render(space),gallery=html.match(/<section data-wind-gallery="true">([\s\S]*?)<\/section>/)?.[1];
 assert.ok(gallery,'wind discoveries are rendered after the homepage content');
 const links=Array.from(gallery.matchAll(/<a href="([^"]+)"/g),match=>match[1]);
 assert.deepEqual(links,['/blog/published-author','/skills/gsap','/resources?type=docs','/resources?type=resources']);
 assert.ok(!gallery.includes('private-marker'));
});
test('homepage and wind discoveries remain usable before any public creator is available',async()=>{
 const html=await render(null,'en'),gallery=html.match(/<section data-wind-gallery="true">([\s\S]*?)<\/section>/)?.[1];
 assert.ok(html.includes('href="/workspace/blog"'));
 assert.ok(!html.includes('data-stage="true"'));
 assert.ok(gallery?.includes('href="/blogs"'));
 assert.ok(!html.includes('undefined'));
});
