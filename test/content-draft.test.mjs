import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreContentDraft,validContentDraft} from '../src/lib/content-draft.mjs';

test('local draft recovery preserves current record identity/revision and rejects corrupt or unrelated copies',()=>{
 const server={id:'mine',revision:8,type:'articles',slug:'current-address',title:'Current server title',summary:'',bodyHtml:'<p>Current</p>',tags:[],published:true,visibility:'public',pending:''};
 const draft={...server,revision:2,slug:'old-address',title:'Unsaved local title',published:false,visibility:'private',pending:'old-review',translations:{en:{title:'Local translation'}}};
 const recovered=restoreContentDraft(JSON.stringify(draft),server);
 assert.equal(recovered.title,'Unsaved local title');assert.equal(recovered.translations.en.title,'Local translation');
 assert.equal(recovered.revision,8);assert.equal(recovered.slug,'current-address');assert.equal(recovered.published,true);assert.equal(recovered.visibility,'public');assert.equal(recovered.pending,'');assert.equal(server.title,'Current server title');
 for(const raw of ['null','[]','{',JSON.stringify({...draft,id:'someone-else'}),JSON.stringify({...draft,tags:null}),JSON.stringify({...draft,bodyHtml:42}),JSON.stringify({...draft,translations:[]})])assert.equal(restoreContentDraft(raw,server),null);
 const fresh={type:'projects',title:'',summary:'',bodyHtml:'',tags:[]};
 assert.equal(restoreContentDraft(JSON.stringify(draft),fresh),null);
 assert.equal(restoreContentDraft(JSON.stringify({...fresh,type:'resources',title:'Local resource'}),fresh).type,'resources');
});

test('malformed browser recovery copies never enter either content editor',()=>{
 const data={title:'Local',summary:'',bodyHtml:'',tags:[],translations:{en:{title:'English'}}};
 assert.equal(validContentDraft(data),true);
 for(const value of [null,[],{...data,tags:{}},{...data,translations:{en:null}},{...data,translations:{en:[]}},{...data,translations:{en:{title:{nested:true}}}}])assert.equal(validContentDraft(value),false);
});
