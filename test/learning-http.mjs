import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {startServer,stopServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-learning-'));
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:'http://127.0.0.1:3196',INITIAL_ADMIN_PASSWORD:'isolated-learning-password-2026'});
const D=await import('../src/lib/db.mjs'),W=await import('../src/lib/content.mjs');
const doc={title:'Published tutorial fixture',summary:'A published tutorial from the existing article library.',bodyHtml:'<p>Published tutorial body.</p>',tags:[]};
W.writeContent({type:'articles',slug:'published-guide',action:'publish',data:doc});
W.writeContent({type:'articles',slug:'private-guide',action:'save',data:{...doc,title:'PRIVATE_TUTORIAL_DRAFT'}});
let server;
try{
 server=await startServer(directory,3196,1048576,{APP_SURFACE:'platform',PLATFORM_LOGIN_MODE:'experience',REGISTRATION_ENABLED:'false'});
 const read=async(route,locale='zh')=>{const r=await fetch(server.base+route,{headers:{Cookie:'site-locale='+locale}});return{status:r.status,html:await r.text()}};
 for(const [locale,label] of [['zh','文档'],['en','Docs'],['ja','ドキュメント']]){
  const docs=await read('/docs',locale);assert.equal(docs.status,200);assert.ok(docs.html.includes('>'+label+'</h1>'));
  const nav=docs.html.match(/<nav[^>]+aria-label="(?:主导航|Main navigation|メインナビゲーション)"[^>]*>([\s\S]*?)<\/nav>/)?.[1];assert.ok(nav);
  const links=[...nav.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);assert.deepEqual(links.slice(0,5),['/','/community','/docs','/skills','/resources']);assert.ok(!links.includes('/downloads')&&!links.includes('/my-space')&&!links.includes('/showcases'));
  assert.ok(docs.html.includes('Published tutorial fixture'));assert.ok(!docs.html.includes('PRIVATE_TUTORIAL_DRAFT'));assert.ok(docs.html.includes('/articles/published-guide'));
  for(const route of ['/docs/getting-started','/docs/showcase','/docs/community','/docs/desktop','/docs/connect','/skills','/resources','/downloads','/showcases'])assert.equal((await read(route,locale)).status,200,locale+route);
 }
 const integration=await read('/docs/connect','en');assert.ok(integration.html.includes('POST /api/connect'));
 const skill=await read('/skills','en');assert.ok(skill.html.includes(server.base+'/skills/spaceyew-post.tar.gz'));assert.ok(skill.html.includes('/workspace/connect'));
 assert.equal((await fetch(server.base+'/skills/spaceyew-post.tar.gz')).status,200);
 for(const route of ['/docs/not-a-guide','/docs/showcase/extra','/skills/not-a-skill','/articles/private-guide'])assert.equal((await read(route)).status,404,route);
 const article=await read('/articles/published-guide');assert.equal(article.status,200);assert.ok([...article.html.matchAll(/<a[^>]+>/g)].some(([tag])=>tag.includes('href="/docs"')&&tag.includes('aria-current="location"')));
 const sitemap=await read('/sitemap.xml');for(const route of ['/docs/getting-started','/docs/connect','/skills'])assert.ok(sitemap.html.includes(server.base+route));
 console.log('PASS: three-language primary navigation, guides, published tutorials, private-draft isolation, Skill install/download, preserved secondary routes, unknown-route 404 and sitemap.');
}finally{if(server)await stopServer(server);D.db().close();delete globalThis.__personalSiteDb;await rm(directory,{recursive:true,force:true});}
