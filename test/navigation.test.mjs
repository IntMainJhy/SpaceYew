import test from 'node:test';
import assert from 'node:assert/strict';
import {internalDestination,caseTargetIds} from '../src/lib/navigation.mjs';

test('login destinations preserve page, query and comment anchor while rejecting browser-normalized external URLs',()=>{
 for(const value of ['/workspace/submissions/abc','/community?feed=following&q=CSS','/community/abc#comment-123','/projects?q=%E4%BD%9C%E5%93%81'])assert.equal(internalDestination(value),value);
 for(const value of [undefined,null,123,'https://other.example','//other.example','/\\other.example','/\n/other.example','/\t/other.example','javascript:alert(1)',' /admin'])assert.equal(internalDestination(value,'/admin'),'/admin');
 assert.equal(internalDestination('/community/../workspace?tab=all#posts'),'/workspace?tab=all#posts');
});
test('case IDs follow the current visible local target and drop previous post/comment targets',()=>{
 const origin='https://site.example',post='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',comment='33333333-3333-4333-8333-333333333333';
 assert.deepEqual(caseTargetIds('/community/'+post+'#comment-'+comment,origin),{post,comment});
 assert.deepEqual(caseTargetIds('/community/'+other,origin),{post:other});
 assert.deepEqual(caseTargetIds(origin+'/community/'+post,origin),{post});
 for(const target of ['账号问题','/u/member','https://outside.example/community/'+post,'//outside.example/community/'+post,'javascript:alert(1)'])assert.deepEqual(caseTargetIds(target,origin),{});
});

test('platform sign-in cannot return to admin or authentication routes',async()=>{
 const {platformDestination}=await import('../src/lib/navigation.mjs');
 for(const value of ['/admin','/admin/settings','/community/../admin?x=1','/login?next=/admin','/join'])assert.equal(platformDestination(value,'/workspace','platform'),'/workspace');
 assert.equal(platformDestination('/workspace/files','/workspace','platform'),'/workspace/files');
 assert.equal(platformDestination('/admin','/workspace','combined'),'/admin');
});
