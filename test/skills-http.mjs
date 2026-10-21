import assert from 'node:assert/strict';
import {curatedSkills,skillAiTools,filterSkills} from '../src/lib/skill-catalog.mjs';
import {getSkillDetail} from '../src/lib/skill-details.mjs';
import {translate} from '../src/lib/i18n.mjs';

const base=(process.env.TEST_PUBLIC_URL||'http://localhost:3008').replace(/\/$/,'');
let pages=0;
for(const locale of ['zh','en','ja'])for(const skill of curatedSkills){
 const response=await fetch(base+'/skills/'+skill.id,{headers:{cookie:'site-locale='+locale}}),html=await response.text();
 assert.equal(response.status,200,skill.id);
 assert.ok(html.includes('<title>'+skill.name+' · Skill · SpaceYew</title>'));
 for(const id of ['features','scenarios','examples','prompts','tools','installation'])assert.ok(html.includes('id="'+id+'"'),skill.id+': '+id);
 assert.ok(html.includes(translate(locale,getSkillDetail(skill.id).features[0])),skill.id+': '+locale);
 assert.ok(html.includes('/skills/'+skill.id+'"'),skill.id+': canonical');
 assert.ok(html.includes('skill-command-toolbar'),skill.id+': copy controls');
 assert.equal((html.match(/class="skill-command skill-prompt"/g)||[]).length,2,skill.id+': prompt copy controls');
 const usage=getSkillDetail(skill.id);
 assert.ok(html.includes(translate(locale,usage.example.title)),skill.id+': localized example');
 for(const prompt of usage.prompts)assert.ok(html.includes(translate(locale,prompt.text)),skill.id+': localized prompt');
 pages++;
}
const filtered=await(await fetch(base+'/skills?type=design&q=UI&tool=codex',{headers:{cookie:'site-locale=en'}})).text();
assert.ok(filtered.includes('/skills/ui-ux-pro-max?type=design&amp;q=UI&amp;tool=codex'));
const detail=await(await fetch(base+'/skills/ui-ux-pro-max?type=design&q=UI&tool=codex',{headers:{cookie:'site-locale=en'}})).text();
assert.ok(detail.includes('href="/skills?type=design&amp;q=UI&amp;tool=codex"'));
let toolLists=0;
for(const locale of ['zh','en','ja'])for(const tool of skillAiTools){
 const response=await fetch(base+'/skills?tool='+tool.id,{headers:{cookie:'site-locale='+locale}}),html=await response.text();
 assert.equal(response.status,200);
 const entries=[...html.matchAll(/<li class="skill-entry">([\s\S]*?)<div class="skill-entry-links">/g)];
 assert.equal(entries.length,filterSkills({tool:tool.id}).length,locale+': '+tool.id);
 for(const [,entry] of entries)assert.ok(entry.includes('class="skill-entry-cover"')&&entry.includes('/api/covers?'), 'designed cover');
 for(const [,entry] of entries)assert.ok(entry.includes('data-selected="true">'+tool.label+'</li>'),tool.id+': selected badge');
 assert.ok(html.includes(translate(locale,'按 AI 工具筛选')));
 assert.ok(html.includes('name="tool"'));
 assert.ok(html.includes('/skills?type=design&amp;tool='+tool.id),tool.id+': category link');
 toolLists++;
}
const empty=await(await fetch(base+'/skills?type=knowledge&tool=cursor',{headers:{cookie:'site-locale=en'}})).text();
assert.ok(empty.includes(translate('en','精选目录中没有匹配的 Skill')));
assert.ok(empty.includes('href="/skills"'));
const sitemap=await(await fetch(base+'/sitemap.xml')).text();
for(const skill of curatedSkills)assert.ok(sitemap.includes('/skills/'+skill.id+'</loc>'));
const missing=await fetch(base+'/skills/no-such-skill');assert.equal(missing.status,404);
console.log(JSON.stringify({detailPages:pages,toolLists,locales:3,filtersPreserved:true,sitemap:true,notFound:true}));
