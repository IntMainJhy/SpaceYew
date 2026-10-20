// Dedicated disposable browser acceptance environment; never points at the owner's data directory.
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=await mkdtemp(path.join(tmpdir(),'personal-site-browser-'));
process.env.APP_DATA_DIR=path.join(root,'data');process.env.INITIAL_ADMIN_PASSWORD='ui-test-only-password-2026';
const{db,getConfig}=await import('../src/lib/db.mjs'),{writeContent,saveConfiguration}=await import('../src/lib/content.mjs');
db();saveConfiguration('site',{...getConfig('site'),name:'开发验收环境',description:'功能验证数据，不代表真实个人履历。'});
saveConfiguration('profile',{...getConfig('profile'),intro:'这是独立的功能验收环境。这里的项目、文章和资源仅用于验证前后台操作。',experiences:[{id:'ui-exp',title:'网站开发验收',type:'测试数据',start:'2026-10',end:'2026-10',description:'验证编辑发布、资源获取与后台管理流程，不代表真实履历。',visible:true,order:0}]});
writeContent({type:'projects',slug:'acceptance-project',action:'publish',data:{title:'前后台功能验收项目',summary:'检查个人介绍、项目内容和求职展示之间的数据复用。',bodyHtml:'<h2>测试说明</h2><p>此条目仅用于本地功能验收，不代表真实项目经历。</p>',category:'开发资源',tags:['前端','工具'],featured:true,career:true,order:0,role:'功能验证',contribution:'验证后台修改后前台同步更新。',outcome:'验收数据，正式站点不包含此内容。'}});
writeContent({type:'articles',slug:'acceptance-article',action:'publish',data:{title:'后台内容发布与维护流程',summary:'一篇用于验证富文本、预览、草稿和发布的测试文章。',bodyHtml:'<h2>真实保存</h2><p>后台的文字保存到服务器数据库中。</p><pre><code>const content = "persisted";</code></pre>',category:'技术笔记',tags:['学习']}});
writeContent({type:'resources',slug:'acceptance-link',action:'publish',data:{title:'外部资源链接验收',summary:'用于测试资源检索和外部链接。',bodyHtml:'<p>此链接为标准示例网址，仅验证跳转流程。</p>',category:'实用网站',tags:['工具'],kind:'website',url:'https://example.com',featured:true}});
await writeFile(path.join(root,'upload-fixture.txt'),'个人网站功能验收资源。\n'.repeat(60000));
db().close();console.log(JSON.stringify({root,data:path.join(root,'data'),fixture:path.join(root,'upload-fixture.txt')}));
