import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
test('brand URL follows canonical SVG content and raster/ICO exports stay consistent',async()=>{
 const svg=await readFile('src/app/icon.svg'),version=createHash('sha256').update(svg).digest('hex').slice(0,12),module=await readFile('src/lib/brand-icon.ts','utf8');assert.ok(module.includes('/brand/spaceyew-symbol.svg?v='+version),'The rendered navigation symbol must invalidate immutable browser caches');
 for(const [file,size]of [['public/brand/spaceyew-icon.png',512],['src/app/apple-icon.png',180]]){const data=await readFile(file),meta=await sharp(data).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size);assert.ok(data.includes(Buffer.from('impeccable:prompt')))}
 assert.deepEqual(await sharp('public/brand/spaceyew-icon.png').ensureAlpha().raw().toBuffer(),await sharp(svg).resize(512,512).ensureAlpha().raw().toBuffer());
 const ico=await readFile('src/app/favicon.ico');assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);
 for(const [i,size]of [16,32,48].entries()){const entry=6+i*16,length=ico.readUInt32LE(entry+8),offset=ico.readUInt32LE(entry+12),meta=await sharp(ico.subarray(offset,offset+length)).metadata();assert.equal(meta.width,size);assert.equal(meta.height,size)}
});
