import test from 'node:test';
import assert from 'node:assert/strict';
import {curatedSkills,skillAiTools,skillCategories,skillFilters,filterSkills,skillFilterHref} from '../src/lib/skill-catalog.mjs';
import {translate} from '../src/lib/i18n.mjs';
import {getSkillDetail,skillDetailContent} from '../src/lib/skill-details.mjs';
import {skillUsage} from '../src/lib/skill-usage.mjs';

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
 assert.equal(curatedSkills.length,17);
 assert.ok(curatedSkills.every(item=>!['anthropics/skills','openai/skills'].includes(item.repo)));
 assert.equal(curatedSkills.filter(item=>item.repo==='greensock/gsap-skills').length,8);
 assert.ok(curatedSkills.some(item=>item.id==='vibehub'));
 assert.ok(curatedSkills.some(item=>item.id==='ui-ux-pro-max'));
 for(const id of ['docx','pdf','pptx','xlsx','frontend-design','webapp-testing','mcp-builder','skill-creator'])assert.equal(getSkillDetail(id),null);
 assert.ok(skillCategories.every(type=>curatedSkills.some(item=>item.category===type.id)));
});

test('search combines category and multilingual names, purposes, formats and upstream authors',()=>{
 const en=text=>translate('en',text),ja=text=>translate('ja',text);
 assert.deepEqual(filterSkills({category:'engineering',q:'react next.js'},en).map(item=>item.id),['react-best-practices']);
 assert.deepEqual(filterSkills({category:'motion',q:'Vercel'},en),[]);
 assert.deepEqual(filterSkills({q:'Ｏｂｓｉｄｉａｎ'}).map(item=>item.id),['obsidian-markdown','json-canvas']);
 assert.ok(filterSkills({category:'motion',q:'scroll'},en).some(item=>item.id==='gsap-scrolltrigger'));
 assert.ok(filterSkills({q:'双向链接'}).some(item=>item.id==='obsidian-markdown'));
 assert.ok(filterSkills({q:'スクロール'},ja).some(item=>item.id==='gsap-scrolltrigger'));
 assert.equal(filterSkills({q:'nonexistent-skill-3792'},en).length,0);
});

test('filters normalize untrusted URL parameters and preserve searches when changing categories',()=>{
 assert.deepEqual(skillFilters({type:['design'],q:['bad']}),{category:'all',q:'',tool:'all'});
 assert.deepEqual(skillFilters({type:'unknown',q:'  PDF  '}),{category:'all',q:'PDF',tool:'all'});
 assert.equal(skillFilters({q:'x'.repeat(130)}).q.length,120);
 assert.deepEqual(skillFilters({tool:['codex']}),{category:'all',q:'',tool:'all'});
 assert.equal(skillFilters({tool:'unlisted-tool'}).tool,'all');
 const href=skillFilterHref('design','UI & <design>','codex');
 const params=new URL(href,'https://example.test').searchParams;
 assert.equal(params.get('type'),'design');assert.equal(params.get('q'),'UI & <design>');assert.equal(params.get('tool'),'codex');
 assert.deepEqual(skillFilters(Object.fromEntries(params)),{category:'design',q:'UI & <design>',tool:'codex'});
 assert.equal(skillFilterHref('all',''),'/skills');
});

test('each catalog entry has a complete, translated detail page and tool-specific setup instructions',()=>{
 assert.deepEqual(Object.keys(skillDetailContent).sort(),curatedSkills.map(item=>item.id).sort());
 for(const item of curatedSkills){
  const detail=getSkillDetail(item.id);
  assert.ok(detail.features.length>=2&&detail.scenarios&&detail.requirements);
  assert.ok(detail.installation.methods.length>=3);
  assert.equal(new Set(detail.installation.methods.map(method=>method.id)).size,detail.installation.methods.length);
  assert.ok(detail.installation.methods.some(method=>method.commands.length>0));
  function translated(value){
   if(typeof value==='string'&&/\p{Script=Han}/u.test(value))for(const locale of ['en','ja'])assert.notEqual(translate(locale,value),value,item.id+': '+value);
   else if(Array.isArray(value))value.forEach(translated);
   else if(value&&typeof value==='object')Object.values(value).forEach(translated);
  }
  translated({features:detail.features,scenarios:detail.scenarios,requirements:detail.requirements,installation:detail.installation});
  for(const method of detail.installation.methods){assert.equal(new URL(method.sourceUrl).protocol,'https:');for(const command of method.commands)assert.ok(command.trim()&&!command.includes('undefined'))}
 }
 assert.equal(getSkillDetail('not-a-skill'),null);assert.equal(getSkillDetail('../../etc/passwd'),null);
});

test('setup uses actual upstream skill names and preserves independent host selection',()=>{
 const react=getSkillDetail('react-best-practices').installation.methods;
 assert.ok(react.find(item=>item.id==='codex').commands[0].endsWith('--skill vercel-react-best-practices -a codex'));
 const canvas=getSkillDetail('json-canvas').installation.methods;
 assert.ok(canvas.find(item=>item.id==='opencode').commands[0].includes('kepano/obsidian-skills --skill json-canvas -a opencode'));
 for(const id of ['gsap-core','gsap-timeline','gsap-scrolltrigger','gsap-plugins','gsap-utils','gsap-react','gsap-performance','gsap-frameworks','vibehub']){
  const detail=getSkillDetail(id);
  for(const tool of ['codex','claude-code','cursor'])assert.ok(detail.installation.methods.find(item=>item.id===tool).commands[0].endsWith('--skill '+id+' -a '+tool));
 }
 assert.ok(getSkillDetail('systematic-debugging').installation.methods.find(item=>item.id==='codex-app').commands.length===0);
});

test('all skills have distinct practical examples and complete localized prompts with intact line breaks',()=>{
 assert.deepEqual(Object.keys(skillUsage).sort(),curatedSkills.map(item=>item.id).sort());
 const allPrompts=[];
 for(const skill of curatedSkills){
  const detail=getSkillDetail(skill.id);
  assert.deepEqual(Object.keys(detail.example).sort(),['action','input','output','title']);
  assert.equal(detail.prompts.length,2);
  for(const locale of ['zh','en','ja']){
   for(const value of Object.values(detail.example))assert.ok(translate(locale,value).trim());
   for(const [index,prompt] of detail.prompts.entries()){
    const text=translate(locale,prompt.text);assert.ok(text.length>50);
    if(locale!=='zh')assert.notEqual(text,prompt.text,skill.id+': '+locale);
    if(locale==='en')assert.ok(!/\p{Script=Han}/u.test(text),skill.id+': untranslated prompt');
    if(index===0){assert.ok(text.includes('\n'));assert.ok(/\[[^\]]+\]/.test(text),skill.id+': editable placeholders')}
   }
  }
  for(const value of Object.values(detail.example))for(const locale of ['en','ja'])assert.notEqual(translate(locale,value),value);
  allPrompts.push(...detail.prompts.map(prompt=>prompt.text));
 }
 assert.equal(new Set(allPrompts).size,allPrompts.length);
});


test('tool filters combine with tasks and search, and reflect documented setup paths without duplicate Codex variants',()=>{
 assert.equal(skillAiTools.length,5);
 assert.deepEqual(Object.fromEntries(skillAiTools.map(tool=>[tool.id,filterSkills({tool:tool.id}).length])),{codex:17,'claude-code':17,cursor:15,'gemini-cli':13,opencode:13});
 assert.deepEqual(filterSkills({tool:'codex',category:'design',q:'UI'}).map(skill=>skill.id),['impeccable','ui-ux-pro-max']);
 assert.deepEqual(filterSkills({tool:'cursor',category:'knowledge'}),[]);
 assert.deepEqual(filterSkills({q:'Cursor'}).map(skill=>skill.id),filterSkills({tool:'cursor'}).map(skill=>skill.id));
 assert.deepEqual(filterSkills({q:'Claude.ai'}),[]);
 assert.equal(filterSkills({tool:'codex',category:'motion'}).length,8);
 for(const skill of curatedSkills){
  const labels=getSkillDetail(skill.id).installation.methods.map(method=>method.label.replace(/^Codex(?: App| CLI)?$/,'Codex'));
  assert.deepEqual(new Set(skill.tools.map(tool=>tool.label)),new Set(labels),skill.id);
  assert.equal(skill.tools.length,new Set(skill.tools.map(tool=>tool.id)).size,skill.id+': distinct tools');
 }
 for(const locale of ['en','ja'])for(const label of ['按 AI 工具筛选','全部 AI 工具','支持工具','工具标签对应本站已整理的安装方式；更多兼容性请查看详情或原项目。'])assert.notEqual(translate(locale,label),label);
});
