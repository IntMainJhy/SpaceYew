import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {localizeContent,localizeProfile} from '../src/lib/content-locales.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'site-content-locales-'));
process.env.APP_DATA_DIR=path.join(directory,'data');process.env.INITIAL_ADMIN_PASSWORD='content-locales-test-2026';
const D=await import('../src/lib/db.mjs'),C=await import('../src/lib/content.mjs');
const original={title:'原文标题',summary:'原文摘要',bodyHtml:'<p>原文正文</p>',tags:['工具'],category:'开发资源',kind:'website',url:'https://example.com',role:'原文角色',contribution:'原文贡献',outcome:'原文成果'};
test('legacy and partial translations fall back per field without mutating originals or shared data',()=>{
 assert.deepEqual(localizeContent(original,'en'),original);
 const document={...original,translations:{en:{title:'English title',summary:' ',bodyHtml:'<p><br></p>',role:'Developer',coverId:'forged',tags:['forged'],url:'https://bad.example',slug:'changed'},ja:{bodyHtml:'<p>日本語の本文</p>'}}};
 const en=localizeContent(document,'en');assert.equal(en.title,'English title');assert.equal(en.summary,original.summary);assert.equal(en.bodyHtml,original.bodyHtml);assert.equal(en.role,'Developer');assert.equal(en.url,original.url);assert.equal(en.coverId,undefined);assert.deepEqual(en.tags,original.tags);
 assert.equal(localizeContent(document,'ja').title,original.title);assert.equal(localizeContent(document,'ja').bodyHtml,'<p>日本語の本文</p>');assert.equal(document.title,original.title);
 assert.equal(localizeContent({...document,translations:{en:{bodyHtml:'<p>&nbsp;&#160;&#xA0;</p>'}}},'en').bodyHtml,original.bodyHtml);
 assert.equal(localizeContent(document,'fr').title,original.title);assert.equal(localizeContent(null,'en'),null);
});
test('all content types sanitize translations, retain publication isolation and original slugs, and support translated title search',()=>{
 for(const type of ['projects','articles','resources']){
  let row=C.writeContent({type,slug:'localized-'+type,action:'publish',data:{...original,translations:{en:{title:'English '+type,bodyHtml:'<p>Hello<script>evil()</script><a href="javascript:evil()">Link</a><img src="https://evil.example/a"></p>'},zh:{title:'中文 '+type},ja:{title:'日本語 '+type}}}});
  assert.doesNotMatch(row.published.translations.en.bodyHtml,/evil|<script|javascript/);
  assert.equal(C.listContent({type,q:'English '+type}).total,1);
  const publishedAt=D.publicContent(type)[0].updated;
  row=C.writeContent({id:row.id,revision:row.revision,action:'save',data:{...row.published,translations:{...row.published.translations,en:{title:'Private '+type}}}});
  assert.equal(localizeContent(D.publicBySlug(type,row.slug),'en').title,'English '+type);assert.equal(D.publicBySlug(type,row.slug).updated,publishedAt);
  assert.throws(()=>C.writeContent({id:row.id,revision:row.revision-1,action:'publish'}),e=>e.status===409);
  row=C.writeContent({id:row.id,revision:row.revision,action:'publish'});
  assert.equal(localizeContent(D.publicBySlug(type,row.slug),'en').title,'Private '+type);assert.equal(row.slug,'localized-'+type);
  const {translations,...legacy}=row.published;
  row=C.writeContent({id:row.id,revision:row.revision,action:'save',data:{...legacy,summary:'旧客户端更新'}});assert.deepEqual(row.draft.translations,translations);
  row=C.writeContent({id:row.id,revision:row.revision,action:'save',data:{...legacy,translations:{}}});assert.deepEqual(row.draft.translations,{});
 }
});
test('translation validation rejects unsupported locales, malformed data, and oversized text; translated payload cannot override files or flags',()=>{
 for(const translations of [null,[],{fr:{}},{en:[]},{en:null},{ja:{title:'a'.repeat(121)}},{zh:{bodyHtml:5}}])assert.throws(()=>C.contentData({...original,translations},'projects'),e=>e.status===400);
 const data=C.contentData({...original,translations:{en:{title:'Valid',coverId:randomUUID(),attachmentId:randomUUID(),featured:true,url:'javascript:bad()'}}},'projects');assert.deepEqual(Object.keys(data.translations.en).sort(),['bodyHtml','contribution','outcome','role','summary','title']);
});
test('translated inline image refs stay private until publish and are removed on offline, including rollback of invalid references',()=>{
 const image=randomUUID();D.db().prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(image,'translated.jpg',5,'image/jpeg','x',D.now());
 const data={...original,translations:{ja:{bodyHtml:'<p>画像</p><img src="/media/'+image+'">'}}};
 let row=C.writeContent({type:'articles',data,action:'save'});assert.ok(D.fileRefs(row.draft).includes(image));assert.equal(D.isFilePublic(image),false);
 row=C.writeContent({id:row.id,revision:row.revision,action:'publish'});assert.equal(D.isFilePublic(image),true);
 assert.throws(()=>C.writeContent({id:row.id,revision:row.revision,action:'publish',data:{...original,translations:{en:{bodyHtml:'<img src="/media/'+randomUUID()+'">'}}}}));
 assert.equal(D.isFilePublic(image),true);assert.equal(D.adminRow(D.db().prepare('SELECT * FROM content WHERE id=?').get(row.id)).revision,row.revision);
 row=C.writeContent({id:row.id,revision:row.revision,action:'offline'});assert.equal(D.isFilePublic(image),false);
});
test('profile translations persist, match experiences by ID, and retain original contact details and experience dates',()=>{
 const before=D.getConfig('profile'),id=randomUUID(),profile={...before,name:'原文姓名',intro:'原文介绍',skills:['前端'],experiences:[{id,title:'原文经历',type:'实习',start:'2026-01',end:'',description:'原文说明',visible:true,order:1}],translations:{en:{name:'Jianghao',intro:'I build useful things.',skills:['Frontend'],experiences:{[id]:{title:'Internship',description:'Built a tool.'},deleted:{title:'Discard'}}},ja:{intro:'ものづくりが好きです。'}}};
 let saved=C.saveConfiguration('profile',profile),en=localizeProfile(saved,'en');assert.equal(en.intro,profile.translations.en.intro);assert.equal(en.experiences[0].title,'Internship');assert.equal(en.experiences[0].type,'实习');assert.equal(en.experiences[0].start,'2026-01');assert.deepEqual(en.skills,['Frontend']);assert.equal(saved.translations.en.experiences.deleted,undefined);assert.equal(localizeProfile(saved,'ja').name,profile.name);assert.equal(localizeProfile(saved,'zh').intro,profile.intro);
 const {translations,...legacy}=saved;saved=C.saveConfiguration('profile',legacy);assert.deepEqual(saved.translations,translations);
 D.db().close();delete globalThis.__personalSiteDb;assert.equal(localizeProfile(D.getConfig('profile'),'en').intro,profile.translations.en.intro);
 for(const value of [{...profile,translations:{en:{skills:'wrong'}}},{...profile,translations:{ja:{experiences:[]}}}])assert.throws(()=>C.saveConfiguration('profile',value),e=>e.status===400);
 saved=C.saveConfiguration('profile',{...profile,experiences:[]});assert.deepEqual(saved.translations.en.experiences,{});
});
test.after(async()=>{D.db().close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true})});
