'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
import {useResource} from './PageResources';
import {post} from '@/lib/client';
import {SpaceData} from './SpaceBoard';
export function SpaceConnect(){const {t,locale}=useLocale(),auth=useResource('/api/auth/me'),r=useResource(auth.data?.user?.experience?null:'/api/spaces/keys'),[name,setName]=useState(''),[current,setCurrent]=useState(''),[scopes,setScopes]=useState(['library','community']),[days,setDays]=useState(30),[secret,setSecret]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);useEffect(()=>{const clear=()=>{setSecret('');setCurrent('');setCopied(false)};window.addEventListener('session-expired',clear);return()=>window.removeEventListener('session-expired',clear)},[]);if(auth.data?.user?.experience)return <section className="space-panel space-connect"><header className="space-panel-heading"><div><h1>{t('工具接入')}</h1><p>{t('体验模式暂不支持工具授权。')}</p></div><Link className="space-link" href="/docs">{t('接入文档')}</Link></header></section>;return <section className="space-panel space-connect"><header className="space-panel-heading"><div><h1>{t('工具接入')}</h1><p>{t('仅授权所选内容，不开放后台权限。')}</p></div><Link className="space-link" href="/docs">{t('接入文档')}</Link></header>{error&&<p className="space-error" role="alert">{t(error)}</p>}{secret&&<div className="space-secret"><h2>{t('凭据只显示一次')}</h2><p>{t('请保存到客户端的私密环境配置中，不要贴进帖子、截图或公共仓库。')}</p><code>{secret}</code><div className="space-actions"><button className="space-btn" onClick={async()=>{try{await navigator.clipboard.writeText(secret);setCopied(true)}catch{setError('复制失败，请手动复制凭据')}}}>{copied?t('已复制'):t('复制凭据')}</button><button className="space-btn" onClick={()=>setSecret('')}>{t('我已保存')}</button></div></div>}<form className="space-key-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const value=await post('/api/spaces/keys',{action:'create',name,current,scopes,days});setSecret(value.token);setCurrent('');setName('');setCopied(false);r.refresh()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}><div className="space-form-grid"><label>{t('用途名称')}<input required value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label><label>{t('有效天数')}<input type="number" min={1} max={90} value={days} onChange={e=>setDays(Number(e.target.value))}/></label></div><fieldset><legend>{t('权限范围')}</legend>{[['library','读取和编辑自己的内容库'],['community','读取和编辑自己的社区投稿'],['submit','允许明确确认后的提交审核']].map(([key,label])=><label className="space-check" key={key}><input type="checkbox" checked={scopes.includes(key)} onChange={e=>setScopes(e.target.checked?[...scopes,key]:scopes.filter(x=>x!==key))}/>{t(label)}</label>)}</fieldset><label>{t('当前密码')}<input type="password" autoComplete="current-password" required value={current} maxLength={256} onChange={e=>setCurrent(e.target.value)}/></label><button className="space-btn primary" disabled={busy}>{t('创建独立凭据')}</button></form><h2>{t('已授权的工具')}</h2>{r.error?<div><p role="alert">{t(r.error)}</p><button type="button" className="space-btn" onClick={r.refresh}>{t('重试')}</button></div>:!r.data?<p>{t('加载中…')}</p>:r.data.items.length?r.data.items.map((x:SpaceData)=><article className="space-key-row" key={x.id}><div><h3>{x.name}</h3><p>{x.scopes.join(' · ')} · {t('到期时间')} {new Date(x.expires).toLocaleDateString(locale==='zh'?'zh-CN':locale==='ja'?'ja-JP':'en-US')}</p><small>{x.revoked?t('已撤销'):x.expires<Date.now()?t('已过期'):t('有效')}</small></div>{!x.revoked&&x.expires>Date.now()&&<button className="space-btn" disabled={busy} onClick={async()=>{setBusy(true);try{await post('/api/spaces/keys',{action:'revoke',id:x.id});r.refresh()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>{t('撤销授权')}</button>}</article>):<p className="space-muted">{t('还没有授权任何工具。')}</p>}</section>}
export function ConnectDocs(){const {t}=useLocale();return <article className="space-panel space-connect-docs"><h1>SpaceYew Connect</h1><Link className="space-btn primary" href="/workspace/connect">{t('管理工具授权')}</Link><h2>{t('1. 保存草稿')}</h2><p>{t('在客户端私密环境中设置SPACEYEW_URL和SPACEYEW_TOKEN，再调用同一套投稿API。')}</p><pre>{`POST /api/connect
Authorization: Bearer <SPACEYEW_TOKEN>
Content-Type: application/json

{
  "operation": "library.save",
  "requestId": "unique-operation-key",
  "input": {
    "type": "projects",
    "data": {"title": "My project", "career": true}
  }
}`}</pre><h2>{t('2. 投稿Skill')}</h2><p>{t('项目附带spaceyew-post Skill，包含字段说明、幂等重试和先存草稿再送审的步骤。')}</p><code>site-v1/integrations/spaceyew-post/SKILL.md</code><h2>{t('3. 本地MCP桥接')}</h2><p>{t('将桥接程序作为stdio进程启动。支持MCP 2025-11-25，凭据从客户端环境传入，不提供公网HTTP MCP端点。')}</p><pre>{`{
  "mcpServers": {
    "spaceyew": {
      "command": "node",
      "args": ["/absolute/path/site-v1/integrations/spaceyew-mcp.mjs"],
      "env": {
        "SPACEYEW_URL": "http://localhost:3010",
        "SPACEYEW_TOKEN": "<private scoped credential>"
      }
    }
  }
}`}</pre><p>{t('工具默认只保存草稿。提交还需要独立权限、用户明确确认，并进入正常审核。')}</p><div className="space-operation-list">{['me','policy','library.list','library.get','library.save','library.submit','community.list','community.get','community.save','community.submit'].map(x=><code key={x}>{x}</code>)}</div><p className="space-muted">{t('凭据最长90天，可随时撤销。写入请求需稳定的幂等标识；相同凭据和标识在24小时内返回同一结果。')}</p></article>}
