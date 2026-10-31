import test from 'node:test';
import assert from 'node:assert/strict';
import {validContentDraft} from '../src/lib/content-draft.mjs';

test('malformed browser recovery copies never enter either content editor',()=>{
 const data={title:'Local',summary:'',bodyHtml:'',tags:[],translations:{en:{title:'English'}}};
 assert.equal(validContentDraft(data),true);
 for(const value of [null,[],{...data,tags:{}},{...data,translations:{en:null}},{...data,translations:{en:[]}},{...data,translations:{en:{title:{nested:true}}}}])assert.equal(validContentDraft(value),false);
});
