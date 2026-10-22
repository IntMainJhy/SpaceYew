# Edit your blog homepage

[简体中文](blog-editor.zh-CN.md)

`/blogs` always shows the site owner’s public homepage. Choose **Create / edit my blog** to open `/workspace/blog` and sign in with your own website account. New members start with their own nickname and empty content, never a copy of the owner’s private files or résumé.

The current editor uses the Anx Portfolio layout. Its four sections are:

- **Profile:** public name, introduction, biography, portrait, optional banner, skills, email, GitHub and additional contact links. Optional page title and subtitle override the name and short introduction.
- **Story & work:** import a résumé into a reviewable draft; add, edit, reorder and remove highlights, sections and entries. Each entry supports dates, descriptions, links, images and captions.
- **Images & certificates:** replace certificates and community photos, arrange their order and select a separate redacted PDF for public download. Certificate thumbnails use a compact three-column desktop / two-column mobile grid. Click to enlarge; Escape closes the dialog.
- **Share & publish:** choose a handle before first publication, opt in/out of discovery, inspect review feedback, withdraw a pending submission or take a published page offline. Share the stable `/blog/<handle>` URL after approval.

Use **Content language** to edit original, English or Chinese text. Images and ordering are shared across languages; missing translations fall back to the original. Import does not translate or verify claims. Review extracted facts and remove private information yourself. Imported originals are not automatically downloadable.

**Save draft** updates only your private draft. **Preview draft** displays that draft locally. **Submit for publication** fixes a version for review; later edits leave the public version unchanged. Changes made in another tab produce a conflict instead of silently overwriting content. File references are checked against your account and stay private until the corresponding version is approved. Taking the page offline also removes public access to its space-owned images.

For the site owner, **Administration → Blog homes** (`/admin/blog`) edits the default profile using the administration session. Its explicit **Save & publish homepage** action updates the public owner profile immediately and records an audit event. Member accounts cannot use that endpoint.

Only real password-authenticated accounts can access private blog workspaces or upload résumés; demo and experience sign-in have been removed. This repository still limits member publication to qualified local test accounts; it does not activate public registration or production hosting. Existing static-site APIs and approved hosted sites remain compatible.

Personal images and populated profiles live in private application storage and backups; this repository contains the reusable editor and tests.

## Default public blog

The `/blogs` entry, its canonical metadata and homepage preview share one public selection. An operator may configure the private `featuredBlog` record as `{"handle":"public-handle"}`; unset retains the owner default. The selection never grants editing rights or bypasses publication/takedown checks. See [the community completion review](community-finish-2026-10-22.md).

The public “Site owner” verification badge is assigned separately through the private `siteOwnerAccount` configuration (`{"id":"member-id"}`). It identifies the author across blogs and community surfaces, cannot be set by editing a profile, and grants no administrative permission. Editing always opens the signed-in member’s own space.
