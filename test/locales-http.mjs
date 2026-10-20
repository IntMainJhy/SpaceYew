// Read-only regression for server-rendered language labels and original form values.
import assert from 'node:assert/strict';
import messages from '../src/lib/locales/messages.json' with {type:'json'};
const base=process.env.LOCALE_TEST_URL||'http://localhost:3010';
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
for(const [locale,lang,index]of [['en','en',0],['zh','zh-CN',null],['ja','ja',1]]){
 for(const[route,source]of [['/projects','把想法落在实处。'],['/articles','让思考慢慢扎根。'],['/resources','也想分享给你。']]){
  const response=await fetch(base+route,{headers:{Cookie:`site-locale=${locale}; site-ui=x-social`}});assert.equal(response.status,200);
  const html=await response.text(),expected=index===null?source:messages[source][index];
  assert.ok(html.includes(`lang="${lang}"`),route+' initial language');
  assert.match(html,new RegExp('<em>'+escape(expected)+'</em>'),route+' must translate its whole heading');
  if(route!=='/projects')assert.match(html,/value="技术笔记"/,route+' must retain raw category values');
 }
 const admin=await(await fetch(base+'/admin',{headers:{Cookie:`site-locale=${locale}`}})).text();
 assert.ok(admin.includes(index===null?'登录管理后台':messages['登录管理后台'][index]),'admin sign-in language');
}
console.log('PASS: three languages across public collection headings and admin sign-in, server html.lang and original category values.');
