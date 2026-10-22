# Blog homepage and existing static hosting

## Current blog entry

`/blogs` directly displays the site owner's public profile, experience, skills and work in the Anx Portfolio layout. Main navigation, language selection and the site footer remain. The page has no workspace navigation, export, draft preview, theme picker, upload settings or publishing panel.

Legacy `/workspace/blog` (including `?template=anx`), `/workspace/studio`, `/workspace/preview`, `/workspace/profile`, `/workspace/library`, `/workspace/files`, `/workspace/insights`, `/workspace/connect` and `/my-space` redirect to `/blogs`. Signed-in visitors see the owner's public profile rather than their private draft.

The owner's existing `/blog/<handle>` sharing URL remains valid and uses the same Anx Portfolio style. Attribution remains on the page and in the [third-party notices](../THIRD_PARTY_NOTICES.md).

## Data and permissions

Content still comes from existing public profile data and reviewed documents. This changes routing and the owner's presentation; it does not overwrite accounts, content, review snapshots, uploaded files or stored theme settings. Takedown, complaint freezes and account restrictions still prevent public access. Work links open their public details. A structured résumé, when present, replaces the legacy project list on the owner’s Anx page; see [résumé import](resume-import.md).

Existing member `/blog/<handle>` URLs, static bundles, account isolation, moderation and APIs remain compatible. The main blog entry no longer provides a member site editor. Authorized administration or tool APIs can manage existing data.

## Existing static sites

Existing sites still run in sandboxed iframes without same-origin permissions. Supported inputs are HTML or ZIP static build output, with a root index.html and relative assets. Limits remain 5 MiB per standalone page, 25 MiB per ZIP and 50 MiB expanded. User repository builds and Next.js server programs are not executed. Preview tokens remain session-bound; only approved snapshots become public, and reports/takedowns still apply.

Original upload archives are not publicly downloadable. Existing limits of 1 GB per account and 20 imported site versions remain.

## Source and license

The Anx adaptation is based on [anx-portfolio](https://github.com/AnxForever/anx-portfolio/tree/a7434847797658402d50fba29827eef246102bb7), retaining the profile-header grid, ruled panels and layered pixel-signature structure. The identity and signature use site-owned content, without the original author's portrait, personal facts or fabricated contributions. The full [MIT notice](licenses/anx-portfolio-MIT.txt) and [brand policy](licenses/anx-portfolio-BRAND.md) are retained; SpaceYew's restrictive license does not override those third-party rights.

[简体中文](blog-hosting.zh-CN.md)
