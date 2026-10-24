# Edit your blog homepage

[简体中文](blog-editor.zh-CN.md)

`/blogs` opens the configured public homepage, normally the site owner’s. **Create / edit my blog** opens `/workspace/blog` for the signed-in member’s own content. New members start with their nickname and empty content; existing profiles, certificates, images, PDFs and translations are preserved.

The editor uses MIT-licensed React Flow for a free canvas. Drag each card by its heading; cards contain editable text and images. Pan, zoom or fit the viewport. In hand mode, drag even inside a card to pan; text and card controls are temporarily inactive. Switch back to **Edit text** to use the same inline plain-text control. Select a section in the outline to navigate, and use outline dragging or **Move up / Move down** to change public reading order. Card coordinates are saved with the draft independently of that order. **Preview draft** shows the orderly, responsive Anx Portfolio that visitors will read; public pages do not reproduce the editing coordinates.

Edit your name, biography, skills, metrics, résumé sections, entries and public contact links in place. Upload or replace portraits, banners, entry images, certificates and gallery photos through the media panel; choose a separate redacted PDF for public download. Import a résumé into a reviewable draft and check the facts and private information before applying it. The original résumé stays private. **Content language** selects original, English or Chinese text; images, positions and section order are shared, and missing translations fall back to the original.

**Save draft** saves private changes, including card positions. Blog drafts require this explicit save. **Submit for publication** fixes a version for review, with the required publication consent; later edits leave the approved public version unchanged. Concurrent edits return a conflict. Share the stable `/blog/<handle>` URL after approval. The publication panel also contains the handle, discovery setting, review feedback, withdrawal and takedown actions. Taking a blog offline removes public access to its space-owned files.

Private workspaces and résumé uploads require real password authentication. Files and references remain account-scoped, and publication requires separately verified identity and eligibility plus server-side review. Production accounts and community access depend on the operator’s explicit HTTPS deployment configuration; this editor change does not establish a deployment. Existing static-site APIs and approved hosted sites remain supported; the editor has no static HTML/ZIP upload interface or theme selector.

For the owner, **Administration → Blog homes** (`/admin/blog`) uses the administration session. Its explicit **Save & publish homepage** action immediately updates the default public profile and records an audit event; members cannot use that endpoint.

## Community and catalog publishing

An original community post needs only its body. Title and summary are derived when omitted; optional metadata is under **More options**. Third-party sources still require their attribution and permission information. Skills and Other resources start with a name and HTTPS URL, with an optional description; category, cover, attribution and Skill usage information live under **More options**.

Documents start with a title and body. Use `/` for headings, lists, code, quotes, tables or dividers, or use the toolbar. Text, Markdown and HTML imports remain available. Eligible members can insert uploaded inline images; image references retain ownership and review checks. The reader uses a library, document and heading outline; the writer also has a heading outline. On narrow screens these rails collapse or hide around the reading area.

Only document drafts autosave after 1,600 ms of inactivity once a title is present and the draft is editable. Autosave keeps typing enabled, preserves newer edits and updates a new draft’s URL through the History API without remounting the editor. Saving never submits or accepts publication terms. Community, Skill, resource and blog drafts use explicit saving. Submission still requires explicit consent and the same authentication, eligibility, moderation and media checks. Approved catalog entries create one linked community share; revisions reuse it and takedowns stop its public visibility.

The curated GSAP entry groups eight modules; legacy module URLs redirect to that entry. These editors do not provide live collaboration.

## Default public blog

`/blogs`, canonical metadata and the homepage preview share the same public selection. An operator may set the private `featuredBlog` record to `{"handle":"public-handle"}`; unset retains the owner default. This does not grant editing rights or bypass publication/takedown checks. The separate private `siteOwnerAccount` record (`{"id":"member-id"}`) assigns the public owner badge without granting administration rights. Editing always opens the signed-in member’s own space. See the [community completion review](community-finish-2026-10-22.md).

Personal images and populated profiles remain in private application storage and backups; this repository contains the reusable website and tests.

Use **Preview** to inspect the current draft, including unsaved edits, in desktop or mobile view. The preview is rendered in a local browser frame so template media queries use the actual preview width; no draft is published. The dotted workspace keeps manual card positions. **Arrange cards** lays out measured cards in aligned rows and marks the layout as an unsaved change.
