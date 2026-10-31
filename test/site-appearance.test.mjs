import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {appearanceInitScript} from '../src/lib/site-appearance.mjs';

test('platform glass appearance ignores retired stored and system dark preferences',()=>{
 const dataset={colorPreference:'dark',colorMode:'dark'};
 vm.runInNewContext(appearanceInitScript,{document:{documentElement:{dataset}},localStorage:{getItem(){throw Error('retired preference must not be read')}},window:{matchMedia(){throw Error('system mode must not be watched')}}});
 assert.deepEqual(dataset,{colorPreference:'light',colorMode:'light'});
});
