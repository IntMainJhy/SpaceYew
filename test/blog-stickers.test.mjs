import test from 'node:test';
import assert from 'node:assert/strict';
import {stickerGroups,stickerPresets,stickerStyles} from '../src/lib/blog-stickers.mjs';

test('sticker families have bilingual names and each contains a usable selection',()=>{
 assert.deepEqual(stickerGroups.map(g=>g.id),['annotation','drawing','paper','pop','pixel','labels']);
 for(const group of stickerGroups){assert.ok(group.zh&&group.en);assert.ok(stickerPresets.filter(p=>p.group===group.id).length>=5)}
 assert.deepEqual(stickerStyles,stickerPresets.map(p=>p.id));
 for(const preset of stickerPresets){assert.ok(stickerGroups.some(g=>g.id===preset.group));assert.match(preset.id,/^[a-z][a-z0-9-]+$/);assert.ok(preset.zh&&preset.en);assert.ok(preset.w>=80&&preset.w<=400);assert.ok(preset.fontSize>=12&&preset.fontSize<=96);assert.equal(typeof preset.text,'string');assert.equal(typeof preset.english,'string')}
});

test('expanding the collection preserves saved sticker IDs and original copy',()=>{
 for(const id of ['note','arrow','loop','underline','circle','check','smile','heart','flower','sun','star','sparkle','burst','tape','stamp','emoji'])assert.ok(stickerStyles.includes(id));
 const note=stickerPresets.find(p=>p.id==='note');assert.equal(note.text,'保持联系');assert.equal(note.english,'Keep in touch');assert.equal(stickerPresets.find(p=>p.id==='emoji').text,'👋');
});

test('sticker search combines visible family selection with bilingual text search',async()=>{
 const {filterStickerPresets}=await import('../src/lib/blog-stickers.mjs');
 assert.equal(filterStickerPresets('   ').length,stickerPresets.length);assert.deepEqual(filterStickerPresets('RAINBOW').map(p=>p.id),['pop-rainbow']);
 assert.deepEqual(filterStickerPresets('爱心','pixel').map(p=>p.id),['pixel-heart']);assert.deepEqual(filterStickerPresets('Keep in touch','annotation').map(p=>p.id),['note']);
 assert.equal(filterStickerPresets('缤纷剪贴').length,7);assert.equal(filterStickerPresets('Type labels').length,7);assert.equal(filterStickerPresets('Color cutouts','paper').length,0);assert.equal(filterStickerPresets('rainbow','paper').length,0);assert.equal(filterStickerPresets('no-matching-sticker-here').length,0);assert.ok(filterStickerPresets('','labels').every(p=>p.group==='labels'));
});
