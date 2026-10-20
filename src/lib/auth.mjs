import {appSurface,experienceLogin} from './app-access.mjs';
import {randomBytes,randomUUID} from 'node:crypto';
import {db,hash,limited,passwordMatches,passwordHash,DATA,getConfig,transaction} from './db.mjs';
import {HttpError,requireValue} from './content.mjs';
import {unlinkSync,existsSync} from 'node:fs';
import path from 'node:path';
import {clientIp} from './request-security.mjs';
export {clientIp} from './request-security.mjs';
export const COOKIE=appSurface()==='platform'?'site_platform':'site_admin';
export function localRequest(req){try{const local=h=>['127.0.0.1','localhost','[::1]'].includes(h);return local(new URL(req.url).hostname)&&local(new URL('http://'+(req.headers.get('host')||new URL(req.url).host)).hostname)&&(!process.env.PUBLIC_URL||local(new URL(process.env.PUBLIC_URL).hostname))}catch{return false}}
export function cookie(req,key){const part=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='));try{return part?decodeURIComponent(part.slice(key.length+1)):''}catch{return ''}}
const delegatedUsers=new WeakMap();
// Only verified server adapters can attach a principal; HTTP headers cannot set this map.
export function delegatedRequest(req,user){const clone=new Request(req.url,{method:req.method,headers:req.headers});delegatedUsers.set(clone,user);return clone}
export function demoUser(req){
 if(appSurface()!=='combined'||process.env.SITE_DEMO!=='true'||process.env.DEMO_SKIP_LOGIN!=='true'||!localRequest(req))return null;
 return db().prepare("SELECT id,username,nickname,role,status,verification,avatar_id AS avatarId,email,email_verified_at AS emailVerifiedAt FROM community_users WHERE username='demo_member' AND role='member' AND status='active' AND verification='local_test'").get()||null;
}
export function currentUser(req){
 if(delegatedUsers.has(req))return delegatedUsers.get(req);
 const token=cookie(req,COOKIE);if(!token)return demoUser(req);
 const row=db().prepare("SELECT s.user_id,COALESCE(r.realm,'combined') realm FROM sessions s LEFT JOIN session_realms r ON r.token=s.token WHERE s.token=? AND s.expires>?").get(hash(token),Date.now());
 if(!row||row.realm!==appSurface())return demoUser(req);
 if(!row.user_id){
  if(appSurface()==='platform')return null;
  const profile=getConfig('profile');
  return{id:'owner',...db().prepare('SELECT username,email,email_verified_at AS emailVerifiedAt FROM admins WHERE id=1').get(),nickname:'站长',displayName:profile.name,handle:profile.alias,avatarId:profile.avatarId,role:'owner',status:'active',verification:'owner'};
 }
 if(!localRequest(req)&&!experienceLogin())return null;
 const user=db().prepare("SELECT id,username,nickname,role,status,verification,avatar_id AS avatarId,email,email_verified_at AS emailVerifiedAt FROM community_users WHERE id=? AND status<>'closed'").get(row.user_id)||null;
 if(appSurface()==='admin'&&!['owner','reviewer'].includes(user?.role))return null;
 if(appSurface()==='platform'&&user?.role!=='member')return null;
 return user&&experienceLogin()?{...user,experience:true}:user;
}
export function session(req){return currentUser(req)?.role==='owner'}
export function admin(req){requireValue(session(req),'请先登录管理后台',401)}
export function origin(req){const allowed=new URL(process.env.PUBLIC_URL||req.url).origin;requireValue(req.headers.get('origin')===allowed,'请求来源无效',403)}
const dummyPassword=passwordHash(randomBytes(32).toString('hex'));
export function login(req,{username,email,password}){
 const raw=email||username;
 requireValue(typeof raw==='string'&&typeof password==='string'&&password.length<=256,'账号或密码错误',401);
 const identifier=raw.trim().toLowerCase();requireValue(identifier.length>0&&identifier.length<=254,'账号或密码错误',401);
 if(experienceLogin()){
  requireValue(password.length>0,'请填写账号和密码',400);
  requireValue(!limited('experience-login:'+hash(clientIp(req)),50,900000),'尝试次数过多，请稍后重试',429);
  // The input is not an identity or a password to persist: all visitors use the ordinary preview space.
  return transaction(d=>{
   let user=d.prepare("SELECT id FROM community_users WHERE username='demo_member' AND role='member' AND status='active' AND verification='local_test'").get();
   if(!user){
    requireValue(!d.prepare("SELECT 1 FROM community_users WHERE username='demo_member'").get(),'体验账号暂不可用，请联系管理员',503);
    const id=randomUUID(),time=new Date().toISOString();
    d.prepare("INSERT INTO community_users(id,username,password,nickname,role,status,verification,created,updated) VALUES(?,'demo_member',?,'体验访客','member','active','local_test',?,?)").run(id,passwordHash(randomBytes(32).toString('hex')),time,time);user={id};
   }
   return createSession(user.id);
  });
 }
 const d=db(),owner=d.prepare('SELECT * FROM admins WHERE id=1').get();
 const row=owner.username.toLowerCase()===identifier||(owner.email_verified_at&&owner.email===identifier)?owner:d.prepare("SELECT * FROM community_users WHERE (username=? COLLATE NOCASE OR (email=? AND email_verified_at IS NOT NULL)) AND status<>'closed'").get(identifier,identifier);
 const key=hash(row?(row===owner?'owner':row.id):identifier),ip=hash(clientIp(req));
 const accountBlocked=limited('login-account:'+key,10,900000),ipBlocked=limited('login-ip:'+ip,50,900000);
 requireValue(!accountBlocked&&!ipBlocked,'尝试次数过多，请15分钟后重试',429);
 const valid=passwordMatches(password,row?.password||dummyPassword);requireValue(row&&valid,'账号或密码错误',401);
 requireValue(appSurface()!=='admin'||row===owner||row.role==='reviewer'&&row.status==='active','此账号没有管理权限',403);
 requireValue(appSurface()!=='platform'||row!==owner&&row.role==='member','请使用独立管理网站登录',403);
 requireValue(row===owner||localRequest(req),'社区账号当前仅供本机联调',503);
 return createSession(row===owner?null:row.id);
}
function createSession(userId){
 const token=randomBytes(32).toString('base64url');
 transaction(d=>{
  d.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
  d.prepare('DELETE FROM sessions WHERE user_id IS ? AND token NOT IN (SELECT token FROM sessions WHERE user_id IS ? ORDER BY expires DESC LIMIT '+(experienceLogin()?49:9)+')').run(userId,userId);
  d.prepare('INSERT INTO sessions(token,expires,user_id) VALUES(?,?,?)').run(hash(token),Date.now()+7*86400000,userId);
  d.prepare('INSERT INTO session_realms(token,realm) VALUES(?,?)').run(hash(token),appSurface());
 });return token;
}
export function sessionCookie(token,expires=false){const secure=process.env.PUBLIC_URL?.startsWith('https://')||process.env.COOKIE_SECURE==='true'||(process.env.COOKIE_SECURE!=='false'&&process.env.NODE_ENV==='production');return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expires?0:604800}${secure?'; Secure':''}`}
export function changePassword(input){requireValue(typeof input.password==='string'&&input.password.length>=12&&input.password.length<=256,'新密码需要12–256位');requireValue(typeof input.current==='string'&&input.current.length<=256,'当前密码错误',400);requireValue(!limited('password-change:owner',10,900000),'尝试次数过多，请15分钟后重试',429);const row=db().prepare('SELECT * FROM admins WHERE id=1').get();requireValue(passwordMatches(input.current,row.password),'当前密码错误',400);const stored=passwordHash(input.password);transaction(d=>{d.prepare('UPDATE admins SET password=? WHERE id=1').run(stored);d.exec('DELETE FROM sessions WHERE user_id IS NULL');d.prepare('UPDATE connect_keys SET revoked=1 WHERE actor=?').run('owner');d.prepare('UPDATE email_challenges SET consumed=1 WHERE actor=?').run('owner')});const initial=path.join(DATA,'initial-admin.txt');if(existsSync(initial))unlinkSync(initial)}
