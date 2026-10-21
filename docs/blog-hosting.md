# Blog homepages and static hosting

Each member has a blog at `/blog/<handle>`. A member can use a built-in theme or upload a self-contained static website. Both modes share the same stable address, account isolation, review history, reporting and takedown controls.

## Built-in themes

The theme picker includes **Pixel journal**, **Scenic journal**, **Editorial journal**, **Minimal profile** and **Developer**. Profile, skills, experience, projects, writing and links use the member's own data. Empty optional sections are hidden. Covers and avatars must be files owned by that member. Saving changes only changes the draft; approval publishes a fixed snapshot.

Pixel journal uses an original geometric monogram and a fine-rule profile layout inspired by [Anx's portfolio](https://github.com/AnxForever/anx-portfolio). Scenic journal uses a wide banner, profile column and dark reading cards inspired by [Fuwari](https://github.com/saicaca/fuwari). Both reference repositories use MIT licenses. These SpaceYew themes were implemented independently: no upstream code, branding, avatars or illustrations were copied. The default landscape is an existing original, AI-generated SpaceYew demo asset, labelled as such; members may replace it with their own cover. No GitHub activity or personal facts are invented.

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
