import test from 'node:test';
import assert from 'node:assert/strict';
import {followsSiteAppearance} from '../src/lib/blog-reading.mjs';

test('default paper can follow the reader appearance without changing saved content',()=>{
 const design={background:'#ffffff',nodes:[{style:{background:'',color:''},richText:{}}]};
 const original=structuredClone(design);
 assert.equal(followsSiteAppearance(),true);
 assert.equal(followsSiteAppearance(design),true);
 assert.deepEqual(design,original);
 assert.equal(followsSiteAppearance({...design,typography:{chinese:'xiaowei'}}),true);
});

test('theme, paper, node, page and selection colors keep their authored surface',()=>{
 for(const design of [
  {appearance:'night-player'},
  {background:'#f5f0e8'},
  {typography:{textColor:'#202124'}},
  {typography:{headingColor:'#202124'}},
  {typography:{linkColor:'#202124'}},
  {nodes:[{style:{color:'#202124'}}]},
  {nodes:[{style:{background:'#ffffff'}}]},
  {nodes:[{richText:{'["zh","intro"]':[{text:'Author text',color:'#202124'}]}}]}
 ])assert.equal(followsSiteAppearance(design),false);
});
