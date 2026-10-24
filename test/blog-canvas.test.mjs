import test from 'node:test';
import assert from 'node:assert/strict';
import {moveCanvasSection,canvasResume,canvasText,editCanvasText,previewCanvasProfile,arrangeCanvasCards,recordCanvasMeasurements} from '../src/lib/blog-canvas.mjs';
test('reordering a section preserves its nested content, images and translations',()=>{
 const items=[{id:'education',items:[{title:'First',coverId:'asset'}],translations:{en:{title:'Education'}}},{id:'work'},{id:'writing'}];
 const moved=moveCanvasSection(items,0,2);
 assert.deepEqual(moved.map(x=>x.id),['work','writing','education']);
 assert.equal(moved[2],items[0]);assert.equal(items[0].id,'education');
 assert.equal(moveCanvasSection(items,-1,1),items);assert.equal(moveCanvasSection(items,0,20),items);
});
test('all text edits use the same plain data operation and keep other languages intact',()=>{
 const original={title:'原文',description:'正文',translations:{en:{title:'Original'},ja:{title:'元の文'}}};
 const edited=editCanvasText(original,'description','A revised description','en');
 assert.equal(canvasText(edited,'description','en'),'A revised description');assert.equal(canvasText(edited,'title','en'),'Original');
 assert.equal(canvasText(edited,'description'),'正文');assert.equal(edited.translations.ja.title,'元の文');assert.equal(original.translations.en.description,undefined);
 const skills=editCanvasText({skills:['ArkTS']},'skills',['TypeScript'],'en');assert.deepEqual(skills.skills,['ArkTS']);assert.deepEqual(skills.translations.en.skills,['TypeScript']);
});
test('opening the canvas preserves résumé data and does not migrate or truncate legacy experiences',()=>{
 const resume={sections:[{id:'work',items:[{title:'Work'}]}],certificates:[{imageId:'asset'}]};assert.equal(canvasResume({resume}),resume);
 const legacy={experiences:Array.from({length:100},(_,i)=>({id:String(i),description:'a'.repeat(5000)}))};
 const result=canvasResume(legacy);assert.deepEqual(result.sections,[]);assert.equal(legacy.experiences.length,100);assert.equal(legacy.experiences[0].description.length,5000);assert.equal(legacy.resume,undefined);
});

test('preview follows the selected editing language without changing the source profile',()=>{
 const profile={name:'原文',translations:{en:{name:'Original'}},resume:{metrics:[],sections:[{id:'work',title:'经历',translations:{en:{title:'Work'}},items:[{title:'项目',translations:{en:{title:'Project'}}}]}],certificates:[],gallery:[]}};
 const preview=previewCanvasProfile(profile,'en');assert.equal(preview.name,'Original');assert.equal(preview.resume.sections[0].title,'Work');assert.equal(preview.resume.sections[0].items[0].title,'Project');assert.equal(profile.name,'原文');assert.deepEqual(preview.translations,{});
});

import {blogSettings} from '../src/lib/spaces-model.mjs';
import {documentOutline} from '../src/lib/document-outline.mjs';
test('canvas positions accept finite coordinates only and ignore unrelated payload fields',()=>{
 const base={mode:'theme',theme:'anx'};assert.deepEqual(blogSettings({...base,canvasPositions:{'s-work':{x:-400,y:500,secret:'removed'}}}).canvasPositions,{'s-work':{x:-400,y:500}});
 for(const canvasPositions of [[],{'bad key':{x:0,y:0}},{profile:{x:NaN,y:0}},{profile:{x:0,y:Infinity}},{profile:{x:100001,y:0}}])assert.throws(()=>blogSettings({...base,canvasPositions}));
});
test('document outline uses stable unique anchors even with duplicate headings',()=>{
 const parsed=documentOutline('<h2>Intro &amp; setup</h2><p>Body</p><h3>Intro &amp; setup</h3>');assert.deepEqual(parsed.headings,[{id:'doc-section-0',text:'Intro & setup',level:2},{id:'doc-section-1',text:'Intro & setup',level:3}]);assert.match(parsed.body,/id="doc-section-1"/);
});

test('arranging cards aligns each row and uses measured height to avoid collisions',()=>{
 const nodes=[{id:'profile',measured:{height:220}},{id:'about',measured:{height:340}},{id:'work',measured:{height:920}},{id:'images',measured:{height:200}},{id:'contact',measured:{height:130}}];const result=arrangeCanvasCards(nodes);
 assert.deepEqual(result.map(n=>n.position),[{x:0,y:0},{x:648,y:0},{x:0,y:380},{x:648,y:380},{x:0,y:1340}]);assert.equal(nodes[0].position,undefined);
 const custom=arrangeCanvasCards(nodes,{work:{x:-200,y:1500}});assert.deepEqual(custom[2].position,{x:-200,y:1500});assert.ok(custom[4].position.y>=2460);
});

test('skill editing keeps spaces while a multiword skill is being typed',async()=>{const {canvasSkills}=await import('../src/lib/blog-canvas.mjs');assert.deepEqual(canvasSkills('HarmonyOS · React '),['HarmonyOS','React ']);assert.deepEqual(canvasSkills('HarmonyOS · React Native'),['HarmonyOS','React Native']);assert.deepEqual(canvasSkills('React Native, User research'),['React Native','User research']);});


test('controlled pointer updates retain measured sizes without redundant render cycles',()=>{
 const initial={};const first=recordCanvasMeasurements(initial,[{id:'paper',type:'dimensions',dimensions:{width:188,height:86}}]);assert.notEqual(first,initial);assert.deepEqual(initial,{});
 const repeated=recordCanvasMeasurements(first,[{id:'paper',type:'position',position:{x:300,y:200}},{id:'paper',type:'dimensions',dimensions:{width:188,height:86}}]);assert.equal(repeated,first);
 const resized=recordCanvasMeasurements(first,[{id:'paper',type:'dimensions',dimensions:{width:200,height:90}},{id:'header',type:'dimensions',dimensions:{width:940,height:440}}]);assert.deepEqual(resized.paper,{width:200,height:90});assert.equal(first.paper.width,188);assert.deepEqual(resized.header,{width:940,height:440});
 assert.equal(recordCanvasMeasurements(first,[{id:'paper',type:'dimensions',dimensions:{width:0,height:0}},{id:'paper',type:'dimensions',dimensions:{width:Infinity,height:90}}]),first);
});

test('React Flow stays initialized through repeated controlled drag positions',async()=>{
 const {adoptUserNodes}=await import('@xyflow/system'),measurements=recordCanvasMeasurements({},[{id:'paper',type:'dimensions',dimensions:{width:188,height:86}}]);
 const run=keepMeasurements=>{const lookup=new Map(),parents=new Map();let hidden=0;for(let step=0;step<30;step++){const state=adoptUserNodes([{id:'paper',position:{x:100+step,y:200},data:{},style:{width:188},...(keepMeasurements?{measured:measurements.paper}:{})}],lookup,parents);if(!state.nodesInitialized)hidden++}return hidden};
 assert.equal(run(false),30,'Dropping measured dimensions reproduces the old hide/re-measure cycle');assert.equal(run(true),0,'Retained dimensions keep the dragged layer initialized');
});
