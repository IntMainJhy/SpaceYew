// Isolated unified-owner flow; no live account, password or data is read.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {startServer,stopServer} from './server.mjs';
const directory=await mkdtemp(path.join(tmpdir(),'spaceyew-owner-http-')),base='http://127.0.0.1:3198',password='owner-http-fixture-password';
Object.assign(process.env,{APP_DATA_DIR:directory,PUBLIC_URL:base,APP_SURFACE:'combined',INITIAL_ADMIN_PASSWORD:'legacy-http-fixture-password'});
const D=await import('../src/lib/db.mjs');const d=D.db(),official=randomUUID();
for(const [id,name,role] of [[official,'official','member'],[randomUUID(),'member','member'],[randomUUID(),'reviewer','reviewer'],[randomUUID(),'other-owner','owner']])d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated,email,email_verified_at) VALUES(?,?,?,?,?,'active','local_test',?,?,?,?)").run(id,name,D.passwordHash(password),name,role,D.now(),D.now(),name+'@example.com',D.now());
d.prepare("UPDATE community_users SET role='owner' WHERE id=?").run(official);
d.prepare("INSERT INTO config VALUES('ownerAccount',?)").run(JSON.stringify({id:official,email:'official@example.com'}));
d.prepare("INSERT INTO config VALUES('siteOwnerAccount',?)").run(JSON.stringify({id:official}));
d.close();delete globalThis.__personalSiteDb;let server;
try{
 server=await startServer(directory,3198,1048576,{APP_SURFACE:'combined'});
 const login=async(email,pwd=password)=>{const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email,password:pwd})});return{response,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};};
 const read=(route,cookie='',redirect='manual')=>fetch(base+route,{redirect,headers:{Cookie:(cookie?cookie+'; ':'')+'site-locale=zh'}});
 const anonymous=await read('/admin');assert.equal(anonymous.status,307);const destination=new URL(anonymous.headers.get('location'),base);assert.equal(destination.pathname,'/login');assert.equal(destination.searchParams.get('next'),'/admin');
 assert.equal((await login('admin',process.env.INITIAL_ADMIN_PASSWORD)).response.status,401,'legacy administrator credentials cannot bypass the configured account');
 for(const email of ['member@example.com','reviewer@example.com','other-owner@example.com']){
  const member=await login(email);assert.equal(member.response.status,200);const denied=await read('/admin',member.cookie);assert.equal(denied.status,307);assert.equal(new URL(denied.headers.get('location'),base).pathname,'/workspace/account');
  for(const route of ['/api/admin/bootstrap','/api/admin/community/overview','/api/admin/catalog','/api/admin/spaces/reviews'])assert.ok([401,403].includes((await read(route,member.cookie)).status),email+route);
  const html=await(await read('/workspace/account',member.cookie)).text();assert.doesNotMatch(html,/<a[^>]+href="\/admin"/,'non-owner account navigation has no administration link');
 }
 const owner=await login('official@example.com');assert.equal(owner.response.status,200);
 const me=await(await read('/api/auth/me',owner.cookie)).json();assert.equal(me.user.id,official);assert.equal(me.user.role,'owner');assert.equal(me.user.ownerAccount,true);
 const account=await read('/workspace/account',owner.cookie);assert.equal(account.status,200);const accountHtml=await account.text();assert.ok(accountHtml.includes('账号与安全'));assert.match(accountHtml,/<a[^>]+href="\/admin"/);assert.ok(accountHtml.includes('site-account-menu'));
 for(const route of ['/admin','/admin/community','/admin/blog','/workspace/blog'])assert.equal((await read(route,owner.cookie)).status,200,'same login reaches '+route);
 const mine=await(await read('/api/admin/blog/mine',owner.cookie)).json();assert.equal(mine.owner,official);assert.equal(mine.legacy,false);assert.equal(mine.canManage,true);
 const saved=await fetch(base+'/api/admin/blog/save',{method:'POST',headers:{Origin:base,Cookie:owner.cookie,'Content-Type':'application/json'},body:JSON.stringify({...mine,publish:true,profile:{...mine.profile,name:'Unified owner HTTP blog'}})});assert.equal(saved.status,200);const value=await saved.json();assert.equal(value.owner,official);assert.equal(value.visibility,'public');
 const published=await read('/blog/'+mine.handle);assert.equal(published.status,200);assert.ok((await published.text()).includes('Unified owner HTTP blog'));
 const home=await(await read('/',owner.cookie)).text();assert.ok(home.includes('site-account-menu'));assert.match(home,/<a[^>]+href="\/workspace\/account"/);assert.match(home,/<a[^>]+href="\/admin"/);
 console.log('PASS: one verified account signs into account, admin and own blog with one session; legacy admin, members and reviewers cannot access management; personal publication and account navigation remain unified.');
}finally{if(server)await stopServer(server);await rm(directory,{recursive:true,force:true});}
