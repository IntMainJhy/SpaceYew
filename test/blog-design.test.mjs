import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBlogDesign,arrangeBlogDesign,designOrder,designHeight,publicBlogDesign} from '../src/lib/blog-design.mjs';
import {blogSettings,spaceUrl,layoutAssetIds,defaultLayout} from '../src/lib/spaces-model.mjs';
const p={name:'Reader',resume:{metrics:[{value:'12'}],sections:[{id:'work',title:'Work'}],certificates:[{imageId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}]}};
const settings=design=>blogSettings({mode:'theme',theme:'anx',design});
test('default template reuses member data without copying owner identity or assets',()=>{
 const design=defaultBlogDesign(p);assert.ok(design.nodes.some(n=>n.part==='section:work'));assert.ok(design.nodes.some(n=>n.part==='certificates'));assert.ok(design.nodes.some(n=>n.part==='credit'));assert.doesNotMatch(JSON.stringify(design),/aaaaaaaa|Reader|siteOwner|email/);assert.deepEqual(settings(design).design.nodes.map(n=>n.part),design.nodes.map(n=>n.part));
});
test('page design saves geometry, typography and hidden state while bounding unsafe input',()=>{
 const d=defaultBlogDesign(p);d.autoLayout=false;d.nodes[0].frame={x:250,y:1250,w:540,h:600};d.nodes[0].style={fontSize:32,padding:20,radius:12,background:'#ffffff',color:'#202124'};d.nodes[0].hidden=true;
 const clean=settings(d).design;assert.deepEqual(clean.nodes[0].frame,d.nodes[0].frame);assert.equal(clean.nodes[0].style.padding,20);assert.equal(publicBlogDesign(clean).nodes.some(n=>n.hidden),false);assert.equal(designHeight({...clean,nodes:[clean.nodes[0]]}),524);
 assert.throws(()=>settings({...d,nodes:[d.nodes[0],d.nodes[0]]}),/重复/);assert.throws(()=>settings({...d,nodes:[{...d.nodes[0],kind:'html'}]}),/格式/);assert.throws(()=>settings({...d,nodes:[{...d.nodes[0],part:'section:../../private'}]}),/无效/);assert.throws(()=>settings({...d,nodes:[{...d.nodes[0],style:{background:'#ffffff',color:'#eeeeee'}}]}),/对比度/);
 const bounded=settings({...d,nodes:[{...d.nodes[0],frame:{x:-99,y:Infinity,w:99999,h:99999}}]}).design.nodes[0].frame;assert.deepEqual(bounded,{x:0,y:0,w:940,h:20000});
});
test('new blocks have safe URLs and asset references included in the publication lifecycle',()=>{
 const d=defaultBlogDesign(p),image={id:'node-image',kind:'image',assetId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',frame:{x:10,y:20,w:200,h:240}};d.nodes.push(image);
 assert.ok(layoutAssetIds({...defaultLayout(),blog:settings(d)}).includes(image.assetId));assert.throws(()=>settings({...d,nodes:[{...image,kind:'button',url:'javascript:alert(1)'}]}),/链接|网址/);assert.equal(spaceUrl('/docs'),'/docs');
});
test('stacking uses real block heights and mobile reading order follows visual placement',()=>{
 const d=defaultBlogDesign(p);d.nodes=d.nodes.slice(0,3).map((n,i)=>({...n,frame:{x:i*10,y:500-i*100,w:200,h:100+i*50}}));assert.deepEqual(designOrder(d.nodes).map(n=>n.id),[d.nodes[2].id,d.nodes[1].id,d.nodes[0].id]);
 const stacked=arrangeBlogDesign(d);assert.equal(stacked.autoLayout,true);assert.deepEqual(stacked.nodes.map(n=>n.frame.y),[0,100,250]);assert.ok(stacked.nodes.every(n=>n.frame.x===0&&n.frame.w===940));assert.equal(d.nodes[0].frame.y,500);
});

test('custom block translations survive validation and selected-language preview is private and immutable',async()=>{
 const {previewCanvasLayout}=await import('../src/lib/blog-canvas.mjs');
 const design={...defaultBlogDesign(p),nodes:[{id:'custom-copy',kind:'text',text:'原文',translations:{en:{text:'English copy',label:'English layer'}},frame:{x:0,y:0,w:400,h:100},style:{color:'#204060',background:'#ffffff'}}]};
 const layout={...defaultLayout(),blog:settings(design)},snapshot=structuredClone(layout),preview=previewCanvasLayout(layout,'en');
 assert.equal(preview.blog.design.nodes[0].text,'English copy');assert.equal(preview.blog.design.nodes[0].label,'English layer');assert.deepEqual(preview.blog.design.nodes[0].translations,{});assert.deepEqual(layout,snapshot);assert.equal(previewCanvasLayout(layout,'ja').blog.design.nodes[0].text,'原文');
});
