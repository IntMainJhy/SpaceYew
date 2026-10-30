import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {appearancePreference,resolvedAppearance,appearanceInitScript,appearanceStorageKey} from '../src/lib/site-appearance.mjs';

test('appearance choice follows the device only in system mode',()=>{
 assert.equal(appearancePreference('unexpected'),'system');
 assert.equal(appearancePreference(null),'system');
 assert.equal(resolvedAppearance('system',true),'dark');
 assert.equal(resolvedAppearance('system',false),'light');
 assert.equal(resolvedAppearance('light',true),'light');
 assert.equal(resolvedAppearance('dark',false),'dark');
});

test('pre-paint script resolves stored preference and survives blocked storage',()=>{
 function initialize(value,systemDark,blocked=false){
  const dataset={};
  vm.runInNewContext(appearanceInitScript,{
   localStorage:{getItem(key){assert.equal(key,appearanceStorageKey);if(blocked)throw new Error('Storage blocked');return value}},
   window:{matchMedia(query){assert.equal(query,'(prefers-color-scheme: dark)');return{matches:systemDark}}},
   document:{documentElement:{dataset}},
  });
  return dataset;
 }
 assert.deepEqual(initialize('dark',false),{colorPreference:'dark',colorMode:'dark'});
 assert.deepEqual(initialize('light',true),{colorPreference:'light',colorMode:'light'});
 assert.deepEqual(initialize(null,true),{colorPreference:'system',colorMode:'dark'});
 assert.deepEqual(initialize('invalid',false),{colorPreference:'system',colorMode:'light'});
 assert.deepEqual(initialize(null,true,true),{colorPreference:'system',colorMode:'dark'});
});
