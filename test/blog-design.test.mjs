import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultBlogDesign,arrangeBlogDesign,designOrder,designHeight,publicBlogDesign,resolveDesignFrame,moveDesignNode,removeDesignNode,visibleDesignNodes,resizeDesignPage,canvasDraftSignature,withBlogDecorations,designContentBottom} from '../src/lib/blog-design.mjs';
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
 const stacked=arrangeBlogDesign(d);assert.equal(stacked.autoLayout,true);assert.deepEqual(stacked.nodes.map(n=>n.frame.y),[0,200,350]);assert.deepEqual(stacked.nodes.map(n=>n.id),[d.nodes[2].id,d.nodes[1].id,d.nodes[0].id]);assert.ok(stacked.nodes.every(n=>n.frame.x===0&&n.frame.w===940));assert.equal(d.nodes[0].frame.y,500);
});

test('custom block translations survive validation and selected-language preview is private and immutable',async()=>{
 const {previewCanvasLayout}=await import('../src/lib/blog-canvas.mjs');
 const design={...defaultBlogDesign(p),nodes:[{id:'custom-copy',kind:'text',text:'原文',translations:{en:{text:'English copy',label:'English layer'}},frame:{x:0,y:0,w:400,h:100},style:{color:'#204060',background:'#ffffff'}}]};
 const layout={...defaultLayout(),blog:settings(design)},snapshot=structuredClone(layout),preview=previewCanvasLayout(layout,'en');
 assert.equal(preview.blog.design.nodes[0].text,'English copy');assert.equal(preview.blog.design.nodes[0].label,'English layer');assert.deepEqual(preview.blog.design.nodes[0].translations,{});assert.deepEqual(layout,snapshot);assert.equal(previewCanvasLayout(layout,'ja').blog.design.nodes[0].text,'原文');
});


test('contact note is a single authored layer, follows its section and stays removed after deletion',()=>{
 const d=defaultBlogDesign(p),note=d.nodes.find(n=>n.id==='contact-note'),contact=d.nodes.find(n=>n.id===note.anchor);assert.equal(note.sticker,'note');assert.equal(note.translations.en.text,'Keep in touch');assert.deepEqual(withBlogDecorations(d),d);
 const placed=resolveDesignFrame(d,note);assert.equal(placed.x,contact.frame.x-130);assert.equal(placed.y,contact.frame.y-12);
 const moved=moveDesignNode(d,contact.id,{x:40,y:1200});assert.equal(resolveDesignFrame(moved,note).y,1188);
 const hidden={...d,nodes:d.nodes.map(n=>n.id===contact.id?{...n,hidden:true}:n)};assert.ok(!visibleDesignNodes(hidden.nodes).some(n=>n.id===note.id));
 const deleted=removeDesignNode(d,note.id);assert.ok(!withBlogDecorations(deleted).nodes.some(n=>n.id===note.id));assert.ok(!removeDesignNode(d,contact.id).nodes.some(n=>n.id===note.id));
});
test('stickers retain bounded offsets, rotation, emoji and lock state through the schema',()=>{
 const d=defaultBlogDesign(p);d.nodes.push({id:'emoji-wave',kind:'sticker',sticker:'emoji',text:'👋',frame:{x:120,y:60,w:120,h:100},style:{rotation:60,fontSize:60},locked:true});const clean=settings(d).design,note=clean.nodes.find(n=>n.id==='contact-note'),emoji=clean.nodes.at(-1);assert.equal(note.frame.x,-130);assert.equal(emoji.style.rotation,30);assert.equal(emoji.text,'👋');assert.equal(emoji.locked,true);assert.equal(moveDesignNode(clean,emoji.id,{x:500,y:500}),clean);
 assert.throws(()=>settings({...d,nodes:[{...d.nodes.at(-1),anchor:'missing'}]}),/贴纸/);assert.throws(()=>settings({...d,nodes:[{...d.nodes.at(-1),sticker:'html'}]}),/贴纸/);
});
test('measuring is not an unsaved edit, while authored geometry, text, locks and sticker offsets are',()=>{
 const d=defaultBlogDesign(p),layout={blog:{design:d}},baseline=canvasDraftSignature(p,layout,true),measured={...d,nodes:d.nodes.map(n=>({...n,frame:{...n.frame,h:n.frame.h+120,...(n.kind!=='sticker'?{y:n.frame.y+40}:{})}}))};assert.equal(canvasDraftSignature(p,{blog:{design:measured}},true),baseline);
 const moved=moveDesignNode(d,d.nodes[0].id,{x:100,y:200});assert.notEqual(canvasDraftSignature(p,{blog:{design:moved}},true),baseline);
 const note=d.nodes.find(n=>n.kind==='sticker'),shifted=moveDesignNode(d,note.id,{x:20,y:400});assert.notEqual(canvasDraftSignature(p,{blog:{design:shifted}},true),baseline);assert.notEqual(canvasDraftSignature({...p,name:'Edited'},layout,true),baseline);
});
test('resizing a free page preserves relative columns instead of silently stacking them',()=>{
 const d={...defaultBlogDesign(p),autoLayout:false};d.nodes[0].frame={x:100,y:25,w:400,h:200};const resized=resizeDesignPage(d,1120);assert.equal(resized.autoLayout,false);assert.equal(resized.nodes[0].frame.y,25);assert.equal(resized.nodes[0].frame.x,119);assert.equal(resized.nodes[0].frame.w,477);assert.equal(resized.nodes.find(n=>n.kind==='sticker').frame.x,-130);
});


test('deleting a flow section closes the gap, while arrange respects a locked section',()=>{
 const d=arrangeBlogDesign(defaultBlogDesign(p)),target=d.nodes.find(n=>n.part==='about'),remaining=removeDesignNode(d,target.id),next=remaining.nodes.filter(n=>n.kind!=='sticker');for(let i=1;i<next.length;i++)assert.equal(next[i].frame.y,next[i-1].frame.y+next[i-1].frame.h);
 const locked={...d,nodes:d.nodes.map(n=>n.id===target.id?{...n,locked:true,frame:{...n.frame,x:30,y:1600,w:500}}:n)},packed=arrangeBlogDesign(locked);assert.deepEqual(packed.nodes.find(n=>n.id===target.id).frame,locked.nodes.find(n=>n.id===target.id).frame);assert.equal(packed.autoLayout,false);
});


test('auto measurement and arrangement do not inject transient fields or make an untouched draft dirty',()=>{
 const d=defaultBlogDesign(p),profile={...p},before=canvasDraftSignature(profile,{blog:{design:d}},true),packed=arrangeBlogDesign(d);assert.equal(canvasDraftSignature(profile,{blog:{design:packed}},true),before);assert.ok(packed.nodes.every(n=>!Object.hasOwn(n,'order')));
});

test('an empty or decoration-only page inserts its first content at the top',()=>{assert.equal(designContentBottom({nodes:[]}),0);assert.equal(designContentBottom({nodes:[{id:'note',kind:'sticker',frame:{x:0,y:900,w:100,h:100}}]}),0);assert.equal(designContentBottom({nodes:[{id:'content',kind:'text',frame:{x:0,y:100,w:200,h:80}}]}),180);});


test('anchored stickers track transient section movement without changing saved offsets',()=>{
 const d=defaultBlogDesign(p),note=d.nodes.find(n=>n.id==='contact-note'),contact=d.nodes.find(n=>n.id===note.anchor),before=structuredClone(d);
 assert.equal(resolveDesignFrame(d,note,{[contact.id]:{x:50,y:700}}).x,-80);assert.equal(resolveDesignFrame(d,note,{[contact.id]:{x:50,y:700}}).y,688);
 assert.equal(resolveDesignFrame(d,note,{[note.id]:{x:17,y:42},[contact.id]:{x:50,y:700}}).y,42);assert.deepEqual(d,before);
});

test('every curated sticker family survives schema and translated preview',async()=>{
 const {stickerPresets,stickerGroups}=await import('../src/lib/blog-stickers.mjs');assert.equal(stickerPresets.length,42);assert.equal(new Set(stickerPresets.map(n=>n.id)).size,stickerPresets.length);assert.equal(stickerGroups.length,6);
 const design={...defaultBlogDesign(p),nodes:stickerPresets.map(n=>({id:'sticker-'+n.id,kind:'sticker',sticker:n.id,text:n.text,translations:{en:{text:n.english}},frame:{x:10,y:10,w:n.w,h:100},style:{fontSize:n.fontSize,rotation:5,...n.style}}))};
 const clean=settings(design).design;assert.deepEqual(clean.nodes.map(n=>n.sticker),stickerPresets.map(n=>n.id));assert.equal(clean.nodes.find(n=>n.sticker==='heart').frame.w,96);assert.equal(clean.nodes.find(n=>n.sticker==='label-solid').style.background,'#202124');assert.equal(clean.nodes.find(n=>n.sticker==='label-solid').style.color,'#ffffff');
 const {previewCanvasLayout}=await import('../src/lib/blog-canvas.mjs');assert.equal(previewCanvasLayout({blog:{design:clean}},'en').blog.design.nodes.find(n=>n.sticker==='note').text,'Keep in touch');
});
