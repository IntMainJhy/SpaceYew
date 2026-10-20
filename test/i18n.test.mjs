import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import messages from '../src/lib/locales/messages.json' with {type:'json'};
import {normalizeLocale,htmlLocale,translate,localeDate} from '../src/lib/i18n.mjs';

test('language defaults, catalog completeness and interpolation preserve original content',()=>{
 assert.equal(normalizeLocale(undefined),'en');assert.equal(normalizeLocale('fr'),'en');assert.equal(htmlLocale('zh'),'zh-CN');assert.equal(htmlLocale('ja'),'ja');
 for(const[source,variants]of Object.entries(messages)){assert.equal(variants.length,2,source);for(const value of variants){assert.ok(value?.trim(),source);assert.deepEqual([...value.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),[...source.matchAll(/\{\d+\}/g)].map(m=>m[0]).sort(),source)}}
 assert.equal(translate('en','我的投稿'),'My posts');assert.equal(translate('ja','自然有机'),'ナチュラル');assert.equal(translate('zh','  原创内容\n\n保留换行  '),'  原创内容\n\n保留换行  ');
 assert.equal(translate('en','  A custom post\n\n我的作品  '),'  A custom post\n\n我的作品  ');
 assert.equal(translate('en','查看{0}的个人资料',['<Mika>']),'View <Mika>’s profile');
 assert.equal(translate('en','小林赞了你的分享。'),'小林 liked your post.');assert.equal(translate('ja','小林关注了你。'),'小林があなたをフォローしました。');
 assert.equal(translate('en','\n 我的投稿 '),'\n My posts ');assert.equal(translate('en',23),23);
 assert.equal(translate('en','单文件不能超过 20.0 MB'),'A file must be no larger than 20.0 MB');assert.equal(translate('ja','单文件不能超过 20.0 MB'),'ファイルは 20.0 MB 以下にしてください');
});
test('date formatting follows the selected language and the site timezone',()=>{const value='2026-10-17T23:00:00Z';assert.match(localeDate(value,'en'),/Oct 18, 2026/);assert.match(localeDate(value,'zh'),/2026年10月18日/);assert.match(localeDate(value,'ja'),/2026年10月18日/);assert.equal(localeDate('invalid','en'),'invalid');assert.equal(localeDate(null),'—')});
test('translated native option labels retain explicit raw values and form payloads stay untranslated',()=>{
 for(const f of fs.readdirSync(new URL('../src/components/',import.meta.url)).filter(f=>f.endsWith('.tsx'))){const tree=ts.createSourceFile(f,fs.readFileSync(new URL('../src/components/'+f,import.meta.url),'utf8'),99,true,4);
 function visit(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(tree)==='option'&&n.children.some(c=>c.getText(tree).includes('tr(')))assert.ok(n.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(tree)==='value'),f+' option must have a raw value');
 if(ts.isJsxAttribute(n)&&['value','defaultValue','key'].includes(n.name.getText(tree)))assert.ok(!n.initializer?.getText(tree).includes('tr('),f+' must preserve '+n.name.getText(tree));ts.forEachChild(n,visit)}visit(tree)}
});
