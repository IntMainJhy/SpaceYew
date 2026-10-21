# Blog homepages and static hosting

Each member has a blog at `/blog/<handle>`. A member can use a built-in theme or upload a self-contained static website. Both modes share the same stable address, account isolation, review history, reporting and takedown controls.

## Built-in themes

The theme picker includes **Anx Portfolio**, **Pixel journal**, **Scenic journal**, **Editorial journal**, **Minimal profile** and **Developer**. Profile, skills, experience, projects, writing and links use the member's own data. Empty optional sections are hidden. Covers and avatars must be files owned by that member. Saving changes only changes the draft; approval publishes a fixed snapshot.

Pixel journal uses an original geometric monogram and a fine-rule profile layout inspired by [Anx's portfolio](https://github.com/AnxForever/anx-portfolio). Scenic journal uses a wide banner, profile column and dark reading cards inspired by [Fuwari](https://github.com/saicaca/fuwari). Both reference repositories use MIT licenses. These two SpaceYew themes (Pixel journal and Scenic journal) were implemented independently: no upstream code, branding, avatars or illustrations were copied. The default landscape is an existing original, AI-generated SpaceYew demo asset, labelled as such; members may replace it with their own cover. No GitHub activity or personal facts are invented.

## Use Anx Portfolio

The built-in Anx Portfolio template adapts actual [anx-portfolio source](https://github.com/AnxForever/anx-portfolio/tree/a7434847797658402d50fba29827eef246102bb7): the layered pixel signature, profile-header grid, ruled panels and work layout. The original branding, portraits and personal facts are replaced by each member's profile. No verification badge, contribution graph, statistics or endorsements are fabricated.

1. Choose **Blog homes → Use Anx Portfolio**, or open `/workspace/blog?template=anx`. Sign in if needed; your choice survives sign-in and only changes the draft.
2. Fill in your profile, avatar, introduction, public contacts and experience. Manage optional projects, articles and resources in your blog's content area. Empty sections are hidden.
3. Preview, save the draft, confirm publication rights and submit for review.
4. Once approved, share `/blog/<handle>` using a copied link, system sharing or a QR code. Updates keep the same address; the approved version remains visible while a revision awaits review. Taking it offline removes public access.

Every member can use this template independently, without installing dependencies, connecting GitHub or running a build. Existing account isolation, upload ownership and review snapshots apply. The adaptation covers the profile, skills, experience and optional content; it does not include upstream GitHub APIs, search, advertising, sponsorship or site administration services.

The original repository is a Next.js server application. Its source ZIP is **not** a deployable static archive. Use the built-in adaptation, or complete your own compatible static export before following the upload instructions below. SpaceYew does not install or execute arbitrary user repositories or server programs.

The adapted code retains its [MIT notice](licenses/anx-portfolio-MIT.txt) and [brand policy](licenses/anx-portfolio-BRAND.md). SpaceYew's restrictive license does not override these third-party rights.

## Upload an existing site

1. Build the site on your own computer. For a framework such as Astro or Vite, use that project's documented build command. Upload the **static output**, not source code, dependencies or environment files.
2. A standalone page can be uploaded as `.html` or `.htm` (up to 5 MiB). A multi-file site should be a ZIP (up to 25 MiB compressed / 50 MiB expanded) containing `index.html` or `index.htm`, CSS, JavaScript, images and fonts. A ZIP with one enclosing build directory is supported.
3. Use relative asset and page paths. Put external scripts and fonts into the bundle if their license permits it. Check every page in the isolated preview before requesting publication.
4. Save, confirm publication rights and submit for review. The current public revision remains unchanged until the new revision is approved. Share the stable blog link or its QR code after approval.

Two standalone HTML starters are available in the editor, in English and Chinese. Download, edit the text and colors, open the file locally, then upload it. They use no external scripts, fonts, images or APIs.

This host deliberately does not execute builds or backend code. Server rendering, API calls, third-party scripts, embedded frames, forms, service workers and cookies/shared-origin storage are unavailable in hosted pages. An arbitrary exported Astro/Fuwari/Next/Vite site is **not guaranteed to work unchanged**: absolute paths, runtime integrations and search services may require adaptation. The preview is the compatibility check.

## Isolation and production

Uploaded sites run in a sandboxed iframe without same-origin privileges. Their CSP blocks network connections, forms, workers and nested frames; scripts are limited to the site bundle and inline scripts. Direct public HTML navigation returns to the SpaceYew wrapper. External links clicked inside a site appear in the trusted wrapper, where visitors can explicitly open the destination; the uploaded site itself never receives popup or top-navigation privileges. Private preview links are short-lived and bound to an active account session. Site imports reject traversal, symlinks, executable server files and excessive archives.

Accounts have a 1 GB storage quota and up to 20 imported site versions. Source archives and expanded files both count toward storage. Uploading a site does not bypass review, the account gate or complaints. The current repository remains a local testing implementation, not a claim that public multi-tenant hosting is ready for regulatory launch. Before production, use a dedicated content origin and object storage/CDN, complete identity and moderation operations, establish backups and abuse response, and review CSP and browser isolation with the actual deployment.

See [中文说明](blog-hosting.zh-CN.md).
