import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogCoverUrl} from '../src/lib/catalog-presentation.mjs';
import {catalogCover} from '../src/lib/catalog-cover.mjs';

test('generated cover links preserve multilingual labels without changing query fields or SVG markup',()=>{
 const title='C++ & 中文 <script>alert(1)</script>',category='设计 &kind=resources';
 const url=new URL(catalogCoverUrl('skills',title,category),'https://example.invalid');
 assert.equal(url.pathname,'/api/covers');
 assert.deepEqual(url.searchParams.getAll('kind'),['skills']);
 assert.equal(url.searchParams.get('title'),title);
 assert.equal(url.searchParams.get('category'),category);
 const svg=catalogCover(Object.fromEntries(url.searchParams));
 assert.ok(!svg.includes('<script>'));
 assert.ok(svg.includes('&lt;script&gt;'));
 assert.ok(svg.includes('设计 &amp;kind=resources'));
});
