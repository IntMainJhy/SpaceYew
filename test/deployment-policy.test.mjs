import test from 'node:test';
import assert from 'node:assert/strict';
import {localRequest,serviceRequest,publishingQualified} from '../src/lib/deployment-policy.mjs';

const keys=['PUBLIC_URL','PUBLIC_FEATURES_ENABLED','TRUST_PROXY'],before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
const request=(url='https://space.example.com/api/community/posts',headers={})=>new Request(url,{headers:{host:new URL(url).host,...headers}});
const member=verification=>({role:'member',status:'active',verification});
test.after(()=>{for(const key of keys)if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key]});

test('production access is opt-in and does not redefine loopback requests',()=>{
 Object.assign(process.env,{PUBLIC_URL:'http://localhost:3010',PUBLIC_FEATURES_ENABLED:'false',TRUST_PROXY:'false'});
 const local=request('http://localhost:3010/api/community/posts');
 assert.equal(localRequest(local),true);assert.equal(serviceRequest(local),true);assert.equal(publishingQualified(member('local_test'),local),true);
 process.env.PUBLIC_URL='https://space.example.com';
 assert.equal(localRequest(local),false);assert.equal(serviceRequest(local),false);assert.equal(serviceRequest(request()),false);
 process.env.PUBLIC_FEATURES_ENABLED='true';
 assert.equal(serviceRequest(request()),true);assert.equal(localRequest(request()),false);
 assert.equal(publishingQualified(member('local_test'),request()),false);assert.equal(publishingQualified(member('pending'),request()),false);
 assert.equal(publishingQualified(member('verified'),request()),true);assert.equal(publishingQualified({...member('verified'),status:'banned'},request()),false);
 assert.equal(publishingQualified({role:'owner',status:'active'},request()),true);assert.equal(publishingQualified(member('verified')),false);
});

test('public origins reject invalid deployment URLs, host spoofing and cross-origin requests',()=>{
 Object.assign(process.env,{PUBLIC_URL:'https://space.example.com',PUBLIC_FEATURES_ENABLED:'true',TRUST_PROXY:'false'});
 for(const req of [request(undefined,{host:'attacker.example'}),request('https://attacker.example/api/community/posts',{host:'space.example.com'}),request(undefined,{origin:'https://attacker.example'}),request(undefined,{origin:'null'}),new Request('https://space.example.com/api/community/posts')])assert.equal(serviceRequest(req),false);
 assert.equal(serviceRequest(request(undefined,{origin:'https://space.example.com'})),true);
 for(const value of ['http://space.example.com','https://localhost','https://name:secret@space.example.com','https://space.example.com/path','https://space.example.com/?x=1','https://space.example.com/#fragment','not a URL']){process.env.PUBLIC_URL=value;assert.equal(serviceRequest(request()),false,value)}
});

test('proxy normalization requires explicit trust and Nginx HTTPS metadata; forwarding alone never enables access',()=>{
 Object.assign(process.env,{PUBLIC_URL:'https://space.example.com',PUBLIC_FEATURES_ENABLED:'true',TRUST_PROXY:'false'});
 const proxy=request('http://127.0.0.1:3008/api/community/posts',{host:'space.example.com','x-forwarded-proto':'https'});
 assert.equal(serviceRequest(proxy),false);process.env.TRUST_PROXY='true';assert.equal(serviceRequest(proxy),true);
 assert.equal(serviceRequest(request('http://space.example.com/api/community/posts',{'x-forwarded-proto':'https'})),true);
 for(const headers of [{host:'space.example.com'},{host:'space.example.com','x-forwarded-proto':'http'},{host:'attacker.example','x-forwarded-host':'space.example.com','x-forwarded-proto':'https'},{host:'space.example.com','x-forwarded-proto':'https',origin:'https://attacker.example'}])assert.equal(serviceRequest(request('http://127.0.0.1:3008/api/community/posts',headers)),false);
 assert.equal(serviceRequest(request('http://attacker.example/api/community/posts',{host:'space.example.com','x-forwarded-proto':'https'})),false);
 process.env.PUBLIC_FEATURES_ENABLED='false';assert.equal(serviceRequest(proxy),false);
});
