// Read-only regression for server-rendered language labels and original form values.
import assert from 'node:assert/strict';
import {translate,htmlLocale} from '../src/lib/i18n.mjs';
const base=process.env.LOCALE_TEST_URL||'http://localhost:3010';
const htmlText=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const locale of ['en','zh','ja']){
 for(const[route,source]of [['/projects','把想法落在实处。'],['/articles','让思考慢慢扎根。']]){
  const response=await fetch(base+route,{headers:{Cookie:`site-locale=${locale}; site-ui=x-social`}});assert.equal(response.status,200);
  const html=await response.text(),expected=translate(locale,source);
  assert.ok(html.includes(`lang="${htmlLocale(locale)}"`),route+' initial language');
  assert.match(html,new RegExp('<em>'+escape(expected)+'</em>'),route+' must translate its whole heading');
  if(route==='/articles')assert.match(html,/value="技术笔记"/,route+' must retain raw category values');
 }
 const resource=await fetch(base+'/resources',{headers:{Cookie:`site-locale=${locale}`}});assert.equal(resource.status,200);
 const hub=await resource.text();assert.ok(hub.includes(`lang="${htmlLocale(locale)}"`));assert.ok(hub.includes('<h1>'+translate(locale,'资源')+'</h1>'));
 for(const label of ['全部','文档','网站与工具','搜索全部资源'])assert.ok(hub.includes(htmlText(translate(locale,label))),`resource hub ${locale}: ${label}`);
 const filtered=await(await fetch(base+'/resources?type=resources&category='+encodeURIComponent('技术笔记'),{headers:{Cookie:`site-locale=${locale}`}})).text();assert.match(filtered,/name="category" value="技术笔记"/,'resource filter retains the raw category value');
 const adminResponse=await fetch(base+'/admin',{headers:{Cookie:`site-locale=${locale}`}});assert.equal(adminResponse.status,200);
 const admin=await adminResponse.text(),destination=new URL(adminResponse.url),unified=destination.pathname==='/login';
 if(unified)assert.equal(destination.searchParams.get('next'),'/admin','unified sign-in retains the requested management destination');
 assert.ok(admin.includes(translate(locale,unified?'登录 SpaceYew':'登录管理后台')),'admin sign-in language');
}
console.log('PASS: three languages across public collection headings, resource hub labels/filters and admin sign-in, server html.lang and original category values.');
