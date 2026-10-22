# SpaceYew administration

**English** | [简体中文](管理中心说明.md)

Updated: 2026-10-22. The administration area at `/admin` shares the website's code, backend and database, with separate admin and platform entry points, cookies and server-side permissions. For deployment, run the two surfaces on separate subdomains using the [deployment guide](../deploy/README-split.en.md). This is a development version; see the [website README](../README.md) for deployment status and license scope.

## Access and accounts

| Role | Entry point and scope |
| --- | --- |
| Owner | `/admin`: site content, profile, settings, taxonomy, files, statistics, members and governance |
| Reviewer | `/admin/community`: permitted submission, comment and board reviews and ordinary reports; no owner overview or original site-content management |
| Member | Platform login and their own `/workspace/*`; no access to administration pages or APIs |

Use `/admin/login` on the administration surface with the existing owner or authorized reviewer account. The platform surface redirects admin pages to its configured admin origin and refuses administrator login. There is no universal production password. On first initialization, credentials are stored in `initial-admin.txt` inside the actual `APP_DATA_DIR`; changing the password deletes that file. Never include real credentials in documentation or screenshots.

Demo accounts and automatic or arbitrary-account experience sign-in are no longer part of the runtime. Existing members must verify their real password again when an old experience session is rejected. Registration creates a member account, never an administrator.

## Available pages

The overview shows actual content, members, boards, file storage, review queues, recent edits and service status. Pending items link to submission, comment, board or report queues; recent edits open the current record. Other areas include the owner's projects, notes and resources, plus profile, settings, taxonomy, files, trash, statistics and owner-only logs.

Website settings cover branding, description, sharing image, an attached résumé PDF, up to five top promotional items, and HTTPS installer URLs and versions for each operating system. The files page shows upload tasks, references, downloads and deletion of unreferenced files. Items restored from trash become drafts. Statistics use actual data for the selected dates.

Community governance retains fixed snapshots, versions/revisions, assigned reviewers, self-review restrictions, eligibility and freeze checks, and explicit review reasons. Rights notices, appeals and complete private evidence are restricted to the responsible owner. Closing a case does not automatically lift restrictions or restore publication. Original content-management access or knowledge of an admin URL does not change these permissions.

Reports on public details of owner projects, articles and resources automatically link to a fixed public snapshot. For legacy reports, the owner searches for an existing public version and supplies a basis before linking it. Details show the current content state and revision alongside the reported snapshot. Resource downloads, type, version, target, source URL and historical license (if any) come from that fixed snapshot. Suspension/takedown, lifting a case-specific restriction and explicit review for restoration are separate actions. Stale revisions, other active freezes, trash status or snapshot mismatches block restoration; private drafts cannot be published through this process.

The unified `/admin/logs` view uses `community_audit`, filtering by site/workspace/community, actor, action, target and date, with 50 records per page. Only the owner can read it; knowing the URL grants no reviewer or member access. Content, configuration and taxonomy logs record changed field names and necessary metadata only. Critical changes and audit records share a transaction. Logs exclude passwords, credentials, login email addresses and complete content or settings values. Members manage their own files at `/workspace/files`, including usage, references, downloads, deletion and unfinished uploads. Referenced files cannot be deleted; the server returns HTTP 409.

## Service status and delivery scope

Labels such as local-only/paused/closed community, capture/SMTP/unconfigured email and configured download URLs describe application configuration only. Capture mode does not send email externally. Complete SMTP settings do not prove delivery; configured download URLs do not prove that binaries install or that production is ready.

macOS and Windows client source code and installers are not published in this website repository. The website stores external download URL configuration only; its license grants no client distribution or usage rights.

Real SMTP delivery, production deployment, scheduled backups and alerts, and complete public workflows require independent validation in the target environment.
