import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {startServer,stopServer} from './server.mjs';
import {LEGAL_CONSULTATION_PATH,legalConsultation,legalConsultationResource} from '../src/lib/legal-consultation.mjs';
import {translate} from '../src/lib/i18n.mjs';

const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-legal-'));
let server;
try{
 server=await startServer(directory,3197,1048576,{APP_SURFACE:'platform',PLATFORM_LOGIN_MODE:'password',REGISTRATION_ENABLED:'false'});
 const read=async(route,locale='zh')=>{const response=await fetch(server.base+route,{headers:{Cookie:'site-locale='+locale}});return{status:response.status,html:await response.text()}};
 for(const locale of ['zh','en','ja']){
  const page=await read(LEGAL_CONSULTATION_PATH,locale),resource=legalConsultationResource(locale);
  assert.equal(page.status,200);
  assert.ok(page.html.includes('<title>'+resource.title+' · SpaceYew</title>'));
  assert.ok(page.html.includes('href="'+server.base+LEGAL_CONSULTATION_PATH+'"'),'canonical URL');
  assert.ok(page.html.includes('id="consultation-contact"'));
  assert.ok(page.html.includes(legalConsultation.license)&&page.html.includes(legalConsultation.wechat));
  assert.ok(page.html.includes(legalConsultation.portrait));
  const appLink=page.html.match(/<a\b[^>]*href="(https:\/\/appgallery\.huawei\.com\/app\/detail[^\"]*)"[^>]*>/)?.[0];
  assert.ok(appLink,'Huawei AppGallery link');
  assert.equal(appLink.match(/href="([^\"]+)"/)[1].replaceAll('&amp;','&'),'https://appgallery.huawei.com/app/detail?id=zy.zhenlvfalvzixun.law&channelId=SHARE&source=appshare','exact user-supplied app link');
  assert.ok(appLink.includes('target="_blank"')&&appLink.includes('rel="noopener noreferrer"'),'safe external navigation');
  assert.ok(page.html.includes(translate(locale,'前往华为应用市场')));
  assert.ok(!page.html.includes('47.116.201.205')&&!page.html.includes('渠道码'),'retired platform entry is absent');
  assert.ok(page.html.includes(translate(locale,'复制律师微信号')));
  for(const area of legalConsultation.areas)assert.ok(page.html.includes(translate(locale,area)),locale+': '+area);
  assert.ok(!page.html.includes('成功代理数百起')&&!page.html.includes('劳动仲裁'),'unsupported examples are not published as claims');
  for(const route of ['/resources','/resources?type=resources','/resources?q='+encodeURIComponent(resource.title),'/resources?type=resources&category='+encodeURIComponent('法律咨询')]){
   const listing=await read(route,locale);
   assert.equal(listing.status,200);
   assert.ok(listing.html.includes('<h3>'+resource.title+'</h3>'),locale+route+': legal card remains discoverable');
  }
 }
 const portrait=await fetch(server.base+legalConsultation.portrait);
 assert.equal(portrait.status,200);assert.match(portrait.headers.get('content-type'),/image\/webp/);
 assert.ok((await read('/sitemap.xml')).html.includes(server.base+LEGAL_CONSULTATION_PATH));
 assert.equal((await read(LEGAL_CONSULTATION_PATH+'/extra')).status,404);
 assert.equal((await read('/resources/no-such-legal-service')).status,404);
 console.log('PASS: legal consultation page in three languages, resource discovery/search/category, exact routing, portrait, AppGallery destination and sitemap.');
}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true});}
