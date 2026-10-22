# Community cleanup and account separation · 2026-10-22

This pass removes the retired preview login, seeding commands and manufactured avatar assets. Automated tests continue to create disposable records in isolated temporary directories; they never seed the running site.

## Publishing paths

- **Manual posts:** original text can omit external links and a summary. The server generates the summary and supplies explicit original-author defaults. Ordinary text can pass automatic screening; flagged text, external links, images and manual-review mode remain private pending review. HTML code fences are displayed as text, while executable markup is rejected.
- **Catalog shares:** documents, Skills and other resources each own one linked community post. Publishing, revisions and review happen atomically. Retrying or republishing updates the same share. Drafts, rejected changes and withdrawn revisions cannot replace an approved public version. Takedown and complaint restrictions apply to both views.
- **Social interactions:** ownership and account qualification govern public posts, comments, covers and member counts. An unavailable member can still be unfollowed. Comments refresh detail-page counts after creation, editing and withdrawal. Catalog-linked submissions return to their source editor.

## Accounts and existing blogs

One application can run a platform origin and an admin origin over shared storage, with separate session realms and server-side role checks. Platform login accepts ordinary members; an administrator signs in through the admin entry point. Passwords and live account records are never repository configuration.

The default `/blogs` page, its canonical metadata and the homepage blog preview use the same public selection. An operator can store `{"handle":"public-handle"}` under the private `config.featuredBlog` key. Without a selection, the existing owner blog remains the default. A selected blog must satisfy the normal publication, account, complaint and request-origin checks; an unavailable selection does not silently fall back to another person's blog or a private draft.

Existing owner data must not be converted into a privileged member space. Copy the current authoritative profile into a normal `legacy=0` member space, retain the original, and assign only the files referenced by that profile. Independent media copies allow the member to edit without changing the original files. Publication still requires an explicit approved snapshot.

## Conservative cleanup

`scripts/remove-demo-data.mjs` requires an explicit private data directory and the original synthetic-data provenance manifest. It defaults to a read-only plan:

```sh
node scripts/remove-demo-data.mjs --data-dir /private/site-data
node scripts/remove-demo-data.mjs --data-dir /private/site-data --apply --backup-dir /private/new-backup
```

Stop application writers before applying. The script creates a database/media backup, checks known synthetic account identities, preserves unknown accounts and owner data, protects retained file references, rolls back failed changes, and writes a completion marker. It does not broadly delete orphan files, which may include real résumé or certificate originals. Backups, manifests and cleanup results stay outside public source control.

## Verification

- `npm test`: 178 tests, including cleanup rollback/preservation, both publishing paths, stale moderation, authentication isolation and default-blog selection.
- `npm run typecheck` and `npm run build`.
- Community, catalog, registration and split-login HTTP regressions against the built server; homepage HTTP checks cover selected-blog rendering and canonical metadata.
- Browser verification of authenticated original-post draft saving, the cleaned live feed and the retained complete owner résumé/blog.

These checks describe the covered behavior, not a guarantee against undiscovered defects. Public registration, member authentication, publishing and tool access retain their existing local-operation gates. Removing preview data does not remove those deployment boundaries or constitute a public launch.

## 中文说明

本轮移除了演示登录和模拟数据播种入口，修复手动原创发文、三类目录自动同步社区、修订审核隔离、下架冻结、互动数量与编辑入口。清理采用备份和事务，保留真实博客及文件；自动测试只使用独立临时数据。

后台与用户账号共享后端，但入口、会话和权限分离。默认博客可指向已审核的普通成员主页，正文、搜索元数据和首页预览保持一致；复制旧资料时保留原件，成员空间不继承站长权限。公网运营限制仍保留，本次收尾不等于已正式部署。
