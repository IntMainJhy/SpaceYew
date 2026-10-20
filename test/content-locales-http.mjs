import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startServer,stopServer,loginServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'site-content-languages-')),dataDir=path.join(directory,'data');let server;
try{
 server=await startServer(dataDir,3122);const {base}=server,cookie=await loginServer(base);
 const call=async(url,data,method='POST')=>{const response=await fetch(base+url,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body;};
 const page=async(url,locale='en',theme='x-social')=>{const response=await fetch(base+url,{headers:{Cookie:`site-locale=${locale}; site-ui=${theme}`}});assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes(`lang="${locale==='zh'?'zh-CN':locale}"`));assert.ok(html.includes(`data-ui="${theme}"`));return html;};
 const before=(await call('/api/admin/bootstrap',undefined,'GET')).profile;
 const experienceId='study';
 const profile=await call('/api/admin/config',{key:'profile',value:{...before,name:'余江昊',intro:'记录开发，分享有用的作品与资源。',skills:['前端开发','设计系统'],experiences:[{id:experienceId,title:'个人网站与社区',type:'开发实践',start:'2026-01',end:'',description:'持续完善内容管理和社区体验。',visible:true,order:0}],translations:{en:{name:'Jianghao Yu',intro:'I build thoughtful products and share what I learn.',skills:['Frontend development','Design systems'],experiences:{[experienceId]:{title:'Personal website and community',type:'Independent project',description:'Improving publishing workflows and community experiences.'}}},zh:{intro:'记录开发，分享有用的作品与资源。'},ja:{name:'余江昊',intro:'開発の記録と、役立つ作品やリソースを共有しています。',skills:['フロントエンド開発','デザインシステム'],experiences:{[experienceId]:{title:'個人サイトとコミュニティ',type:'個人開発',description:'コンテンツ管理とコミュニティ体験を改善しています。'}}}}}});
 const buffer=await readFile('public/images/organic/quiet-studio.webp'),sha=b=>createHash('sha256').update(b).digest('hex');
 const task=await call('/api/admin/uploads',{name:'studio.webp',size:buffer.length,fingerprint:sha(buffer)});
 for(let index=0;index<Math.ceil(buffer.length/task.chunk_size);index++){const chunk=buffer.subarray(index*task.chunk_size,(index+1)*task.chunk_size),response=await fetch(base+'/api/admin/uploads/'+task.id+'?index='+index,{method:'PUT',headers:{Origin:base,Cookie:cookie,'X-Chunk-Sha256':sha(chunk)},body:chunk});assert.equal(response.status,200);}
 const image=(await call('/api/admin/uploads/'+task.id+'/complete',{})).file;
 const titles={projects:{original:'留白 · 个人内容工作台',en:'Whitespace · A personal publishing space',zh:'留白 · 个人内容工作台',ja:'余白 · 自分のためのコンテンツ管理'},articles:{original:'让内容管理更轻松',en:'Making publishing feel effortless',zh:'让内容管理更轻松',ja:'コンテンツ管理をもっと快適に'},resources:{original:'我的开发资料索引',en:'My development reading list',zh:'我的开发资料索引',ja:'開発資料のブックマーク'}};
 const records={};
 for(const type of ['projects','articles','resources']){
  const translations={en:{title:titles[type].en,summary:'A small collection of ideas, experiments, and practical tools.',bodyHtml:'<h2>Room for ideas</h2><p>A publishing workflow that keeps the focus on useful content.</p><img src="/media/'+image.id+'" alt="A quiet desk">',role:'Product design and development',contribution:'Designed the publishing workflow and built the editor.',outcome:'A simpler way to share work.'},zh:{title:titles[type].zh,summary:'整理想法、实践经验，以及日常使用的工具。',bodyHtml:'<h2>给想法留一点空间</h2><p>用顺手的发布流程，把时间留给内容本身。</p>'},ja:{title:titles[type].ja,summary:'アイデア、実践の記録、便利なツールをまとめています。',bodyHtml:'<h2>アイデアのための余白</h2><p>役立つコンテンツに集中できる、シンプルな公開フローです。</p>'}};
  let record=await call('/api/admin/content',{type,slug:'language-'+type,action:'publish',data:{title:titles[type].original,summary:'原文摘要',bodyHtml:'<h2>原文内容</h2><p>原文说明，缺少翻译时使用。</p>',role:'产品设计与开发',contribution:'原文贡献说明',outcome:'原文成果',tags:['工具'],category:'开发资源',kind:'website',url:'https://developer.mozilla.org/',featured:true,career:true,coverId:image.id,translations}});
  for(const locale of ['en','zh','ja']){
   const html=await page('/'+type+'/'+record.slug,locale);assert.ok(html.includes('<h1>'+titles[type][locale]+'</h1>'));assert.ok(html.includes('<title>'+titles[type][locale]+' · '));assert.ok(html.includes(base+'/'+type+'/'+record.slug));assert.ok((await page('/'+type,locale)).includes(titles[type][locale]));
  }
  record=await call('/api/admin/content',{id:record.id,revision:record.revision,action:'save',data:{...record.published,translations:{...record.published.translations,en:{...record.published.translations.en,title:'Private translation not released'}}}});
  assert.ok(!(await page('/'+type+'/'+record.slug)).includes('Private translation not released'));
  record=await call('/api/admin/content',{id:record.id,revision:record.revision,action:'publish'});assert.ok((await page('/'+type+'/'+record.slug)).includes('<h1>Private translation not released</h1>'));
  record=await call('/api/admin/content',{id:record.id,revision:record.revision,action:'publish',data:{...record.published,translations}});records[type]=record;
 }
 const fallback=await call('/api/admin/content',{type:'articles',slug:'original-fallback',action:'publish',data:{title:'未经翻译的阅读笔记',summary:'没有对应翻译时，继续显示这段原文。',bodyHtml:'<p>这是完整保留的原文。</p>',translations:{en:{title:'Reading notes',summary:'',bodyHtml:'<p><br></p>'}}}});
 for(const locale of ['en','zh','ja']){const html=await page('/articles/'+fallback.slug,locale);assert.ok(html.includes(locale==='en'?'<h1>Reading notes</h1>':'<h1>未经翻译的阅读笔记</h1>'));assert.ok(html.includes('没有对应翻译时，继续显示这段原文。'));assert.ok(html.includes('<p>这是完整保留的原文。</p>'));}
 assert.ok((await page('/articles?q=effortless')).includes(titles.articles.en));assert.ok((await page('/resources?q=ブックマーク','ja')).includes(titles.resources.ja));
 for(const locale of ['en','zh','ja'])for(const theme of ['natural-organic','monochrome','editorial','x-social']){
  const translated=profile.translations[locale];for(const route of ['/','/about','/career'])assert.ok((await page(route,locale,theme)).includes(translated.intro));
 }
 for(const type of Object.keys(records)){const response=await fetch(base+'/admin/'+type+'/edit/'+records[type].id,{headers:{Cookie:cookie+'; site-locale=en'}}),html=await response.text();assert.equal(response.status,200);for(const label of ['Content language','Original','English','中文','日本語'])assert.ok(html.includes(label));}
 assert.equal((await fetch(base+'/media/'+image.id)).status,200);
 assert.equal((await fetch(base+'/api/admin/content/'+records.projects.id)).status,401);
 console.log('PASS: three content types, profile/home/about/career, translated metadata/search, partial and full original fallback, authenticated admin editor, isolated draft/publish and shared image access across all four themes.');
 if(process.env.KEEP_CONTENT_LOCALE_FIXTURE){await mkdir('.impeccable/review/content-localization',{recursive:true});await writeFile('.impeccable/review/content-localization/fixture.json',JSON.stringify({dataDir,base,records:Object.fromEntries(Object.entries(records).map(([type,row])=>[type,{id:row.id,slug:row.slug}]))},null,2));}
}finally{if(server)await stopServer(server);if(!process.env.KEEP_CONTENT_LOCALE_FIXTURE)await rm(directory,{recursive:true,force:true});}
