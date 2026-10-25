import test from 'node:test';
import assert from 'node:assert/strict';
import {blogTemplates,resumePresentations} from '../src/lib/blog-templates.mjs';
import {defaultBlogDesign,applyBlogTemplate,arrangeBlogDesign,canvasDraftSignature,mobileBlogDesign,positionedBlogDesign} from '../src/lib/blog-design.mjs';
import {duplicateCanvasSection} from '../src/lib/blog-canvas.mjs';
import {blogSettings} from '../src/lib/spaces-model.mjs';
const asset='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const profile={name:'Synthetic author',resume:{sections:[{id:'work',title:'Experience',translations:{en:{title:'Work'}},items:[{title:'Example project',description:'Synthetic fixture',coverId:asset,translations:{en:{description:'English fixture'}}}]}],metrics:[{label:'Projects',value:'3'}]}};
const clean=design=>blogSettings({mode:'theme',theme:'anx',design}).design;

test('all six page templates preserve content layers and survive a save/reopen',()=>{
 const design=defaultBlogDesign(profile),before=structuredClone(design);
 design.nodes.push({id:'custom-image',kind:'image',assetId:asset,text:'Image caption',frame:{x:20,y:6000,w:300,h:200},style:{}});
 for(const template of blogTemplates){
  const applied=applyBlogTemplate(design,template.id),saved=clean(applied);
  assert.equal(saved.template,template.id);
  assert.deepEqual(new Set(saved.nodes.map(n=>n.id)),new Set(design.nodes.map(n=>n.id)));
  assert.equal(saved.nodes.find(n=>n.id==='custom-image').assetId,asset);
  assert.equal(saved.nodes.find(n=>n.part==='section:work').presentation,template.section);
  assert.ok(saved.nodes.some(n=>n.part==='credit'));
 }
 assert.equal(blogTemplates.length,6);assert.equal(resumePresentations.length,6);
 assert.deepEqual(design.nodes.slice(0,-1),before.nodes);assert.equal(profile.resume.sections[0].items[0].coverId,asset);
 assert.equal(applyBlogTemplate(design,'unrecognized'),design);
});

test('section styles survive validation and unknown template/style input is rejected',()=>{
 const design=defaultBlogDesign(profile),node=design.nodes.find(n=>n.part==='section:work');
 for(const item of resumePresentations)assert.equal(clean({...design,nodes:[{...node,presentation:item.id}]}).nodes[0].presentation,item.id);
 assert.throws(()=>clean({...design,template:'../../private'}),/模板/);
 assert.throws(()=>clean({...design,nodes:[{...node,presentation:'html'}]}),/样式/);
 assert.throws(()=>clean({...design,nodes:[{...node,kind:'text',presentation:'cards'}]}),/样式/);
});

test('two columns reflow from measured heights without dirtying an untouched draft',()=>{
 const design=applyBlogTemplate(defaultBlogDesign(profile),'columns');
 const side=design.nodes.find(n=>n.part==='about'),main=design.nodes.find(n=>n.part==='section:work');
 assert.ok(main.frame.x>side.frame.x+side.frame.w);
 assert.equal(main.frame.y,side.frame.y);
 assert.ok(positionedBlogDesign(design));
 const signature=canvasDraftSignature(profile,{blog:{design}},true);
 const measured=arrangeBlogDesign({...design,nodes:design.nodes.map(n=>({...n,frame:{...n.frame,h:n.frame.h+120}}))});
 assert.equal(canvasDraftSignature(profile,{blog:{design:measured}},true),signature);
 const footer=measured.nodes.find(n=>n.part==='credit');
 for(const node of measured.nodes.filter(n=>n.kind!=='sticker'&&n.part!=='credit'))assert.ok(node.frame.y+node.frame.h<=footer.frame.y);
 const locked={...design,nodes:design.nodes.map(n=>n.id===main.id?{...n,locked:true}:n)};
 assert.deepEqual(applyBlogTemplate(locked,'resume').nodes.find(n=>n.id===main.id),locked.nodes.find(n=>n.id===main.id));
});

test('only a phone-sized viewport stacks an authored desktop layout',()=>{
 assert.equal(mobileBlogDesign(390),true);assert.equal(mobileBlogDesign(600),true);
 assert.equal(mobileBlogDesign(601),false);assert.equal(mobileBlogDesign(768),false);assert.equal(mobileBlogDesign(0),false);
});

test('duplicating a résumé section creates independent content and keeps translations and owned images',()=>{
 const design=defaultBlogDesign(profile),node=design.nodes.find(n=>n.part==='section:work');
 const next=duplicateCanvasSection(profile,design,node.id,'copied-section','second-work');
 assert.equal(next.profile.resume.sections.length,2);
 assert.equal(next.profile.resume.sections[1].items[0].coverId,asset);
 assert.equal(next.profile.resume.sections[1].items[0].translations.en.description,'English fixture');
 next.profile.resume.sections[1].items[0].title='Changed copy';assert.equal(profile.resume.sections[0].items[0].title,'Example project');
 assert.ok(clean(next.design).nodes.some(n=>n.part==='section:second-work'));
 assert.equal(duplicateCanvasSection(profile,design,node.id,node.id,'third-work'),null);
 assert.equal(duplicateCanvasSection(profile,{...design,nodes:design.nodes.map(n=>({...n,locked:true}))},node.id,'copied-section','third-work'),null);
 assert.equal(profile.resume.sections.length,1);
});


test('visual themes compose with every layout and preserve geometry, content and custom colors',async()=>{
 const {blogAppearances,applyBlogAppearance,blogNodeColors,colorContrast}=await import('../src/lib/blog-appearances.mjs');
 const design=defaultBlogDesign(profile);
 for(const theme of blogAppearances)for(const template of blogTemplates){
  const base=applyBlogTemplate(design,template.id),themed=applyBlogAppearance(base,theme.id),saved=clean(themed);
  assert.equal(saved.appearance,theme.id);assert.equal(saved.template,template.id);
  assert.deepEqual(themed.nodes,base.nodes);
  for(const style of [{},{background:'#ffffff'},{color:'#202124'},{background:'#121212'}]){
   const colors=blogNodeColors(style,theme.id);assert.ok(colorContrast(colors.background,colors.color)>=4.5);
   assert.doesNotThrow(()=>clean({...themed,nodes:[{...themed.nodes[0],style}]}));
  }
 }
 assert.throws(()=>clean({...design,appearance:'unknown'}),/主题/);
 assert.throws(()=>clean({...design,nodes:[{...design.nodes[0],style:{background:'#ffffff',color:'#ffffff'}}]}),/对比度/);
 assert.deepEqual(applyBlogAppearance(applyBlogAppearance(design,'night-player'),'original').nodes,design.nodes);
 assert.equal(applyBlogAppearance(design,'unknown'),design);
});

test('themes omit only the untouched built-in note without deleting author decorations',async()=>{
 const {themedDesignNodes,designBounds}=await import('../src/lib/blog-design.mjs');
 const original=defaultBlogDesign(profile),design={...original,appearance:'volt-terminal'};
 assert.ok(themedDesignNodes(original).some(n=>n.id==='contact-note'));
 assert.ok(!themedDesignNodes(design).some(n=>n.id==='contact-note'));
 assert.equal(designBounds(design).left,0);
 assert.ok(!themedDesignNodes(clean(design)).some(n=>n.id==='contact-note'));
 assert.ok(!themedDesignNodes({...design,nodes:design.nodes.map(n=>n.id==='contact-note'?{...n,frame:{...n.frame,h:87}}:n)}).some(n=>n.id==='contact-note'));
 assert.ok(design.nodes.some(n=>n.id==='contact-note'));
 for(const change of [{text:'Write to me'},{frame:{x:-140,y:-12,w:120,h:94}},{style:{fontSize:18,rotation:-5,padding:4}},{translations:{en:{text:'My note'}}}]){
  const edited={...design,nodes:design.nodes.map(n=>n.id==='contact-note'?{...n,...change}:n)};
  assert.ok(themedDesignNodes(edited).some(n=>n.id==='contact-note'));
 }
});
