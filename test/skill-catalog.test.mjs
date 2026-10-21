import test from 'node:test';
import assert from 'node:assert/strict';
import {curatedSkills,skillCategories,skillFilters,filterSkills,skillFilterHref} from '../src/lib/skill-catalog.mjs';
import {translate} from '../src/lib/i18n.mjs';

test('catalog keeps distinct, categorized upstream sources and per-skill license terms',()=>{
 assert.equal(new Set(curatedSkills.map(item=>item.id)).size,curatedSkills.length);
 for(const skill of curatedSkills){
  assert.ok(skillCategories.some(type=>type.id===skill.category));
  for(const field of ['sourceUrl','installUrl','licenseUrl']){
   const url=new URL(skill[field]);assert.equal(url.protocol,'https:');assert.equal(url.hostname,'github.com');assert.ok(url.pathname==='/'+skill.repo||url.pathname.startsWith('/'+skill.repo+'/'));
  }
  assert.ok(skill.sourceUrl.endsWith('/SKILL.md'));
  assert.ok(skill.summary&&skill.tags.length);
  for(const locale of ['en','ja'])assert.notEqual(translate(locale,skill.summary),skill.summary);
 }
 assert.deepEqual(curatedSkills.filter(item=>item.license==='专有条款').map(item=>item.id).sort(),['docx','pdf','pptx','xlsx']);
 assert.ok(skillCategories.every(type=>curatedSkills.some(item=>item.category===type.id)));
});

test('search combines category and multilingual names, purposes, formats and upstream authors',()=>{
 const en=text=>translate('en',text),ja=text=>translate('ja',text);
 assert.deepEqual(filterSkills({category:'engineering',q:'react next.js'},en).map(item=>item.id),['react-best-practices']);
 assert.deepEqual(filterSkills({category:'documents',q:'Vercel'},en),[]);
 assert.deepEqual(filterSkills({q:'Ｏｂｓｉｄｉａｎ'}).map(item=>item.id),['obsidian-markdown','json-canvas']);
 assert.ok(filterSkills({q:'typography'},en).some(item=>item.id==='frontend-design'));
 assert.ok(filterSkills({q:'双向链接'}).some(item=>item.id==='obsidian-markdown'));
 assert.ok(filterSkills({q:'数式'},ja).some(item=>item.id==='xlsx'));
 assert.equal(filterSkills({q:'nonexistent-skill-3792'},en).length,0);
});

test('filters normalize untrusted URL parameters and preserve searches when changing categories',()=>{
 assert.deepEqual(skillFilters({type:['design'],q:['bad']}),{category:'all',q:''});
 assert.deepEqual(skillFilters({type:'unknown',q:'  PDF  '}),{category:'all',q:'PDF'});
 assert.equal(skillFilters({q:'x'.repeat(130)}).q.length,120);
 const href=skillFilterHref('design','UI & <design>');
 const params=new URL(href,'https://example.test').searchParams;
 assert.equal(params.get('type'),'design');assert.equal(params.get('q'),'UI & <design>');
 assert.equal(skillFilterHref('all',''),'/skills');
});
