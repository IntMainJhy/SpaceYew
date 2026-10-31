'use client';
import Link from 'next/link';
import {useLocale} from './LocaleProvider';
export function ConnectDocs(){const {t}=useLocale();return <article className="space-panel space-connect-docs"><Link className="space-btn primary" href="/workspace/connect">{t('管理工具授权')}</Link><h2 id="connect-publish">{t('1. 保存草稿')}</h2><p>{t('在客户端私密环境中设置SPACEYEW_URL和SPACEYEW_TOKEN，再调用同一套投稿API。')}</p><pre>{`POST /api/connect
Authorization: Bearer <SPACEYEW_TOKEN>
Content-Type: application/json

{
  "operation": "catalog.save",
  "requestId": "unique-operation-key",
  "input": {
    "kind": "docs",
    "title": "My first guide",
    "summary": "A practical guide for the community.",
    "bodyHtml": "<h2>Getting started</h2><p>Explain each step of your workflow here.</p>",
    "category": "Development",
    "license": "Original work; shared with attribution."
  }
}`}</pre><h2>{t('2. 投稿Skill')}</h2><p>{t('项目附带spaceyew-post Skill，包含字段说明、幂等重试和先存草稿再送审的步骤。')}</p><code>site-v1/integrations/spaceyew-post/SKILL.md</code><h2 id="connect-mcp">{t('3. 本地MCP桥接')}</h2><p>{t('将桥接程序作为stdio进程启动。支持MCP 2025-11-25，凭据从客户端环境传入，不提供公网HTTP MCP端点。')}</p><pre>{`{
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
}`}</pre><p>{t('默认保存草稿。你明确要求发布并授权后，AI 可直接调用 catalog.submit；低风险内容通过后，自动同步到栏目和社区，风险内容等待复核。')}</p><div className="space-operation-list">{['me','policy','catalog.list','catalog.get','catalog.save','catalog.submit','library.list','library.get','library.save','library.submit','community.list','community.get','community.save','community.submit'].map(x=><code key={x}>{x}</code>)}</div><p className="space-muted">{t('凭据最长90天，可随时撤销。写入请求需稳定的幂等标识；相同凭据和标识在24小时内返回同一结果。')}</p></article>}
