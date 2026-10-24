# Edit your blog homepage

[简体中文](blog-editor.zh-CN.md)

`/blogs` opens the configured public homepage, normally the site owner’s. **Create / edit my blog** opens `/workspace/blog` for the signed-in member’s own content. New members start with their nickname and empty content; existing profiles, certificates, images, PDFs and translations are preserved.

The editor is a page designer built on MIT-licensed React Flow. The existing Anx homepage is the default template: edit text directly on the page, drag section labels, resize block widths, and add text, images or links. The left panel contains layers and insert tools; the right panel edits position, colours, spacing and typography. Start from the default template or a blank design. Undo/redo covers content and layout changes. Designs are stored with the draft and rendered by the same component in preview and the reviewed public page. Desktop visitors see the saved layout; narrow screens stack blocks in visual reading order.

Edit your name, biography, skills, metrics, résumé sections, entries and public contact links in place. Upload or replace portraits, banners, entry images, certificates and gallery photos through the media panel; choose a separate redacted PDF for public download. Import a résumé into a reviewable draft and check the facts and private information before applying it. The original résumé stays private. **Content language** selects original, English or Chinese text; images, positions and section order are shared, and missing translations fall back to the original.

**Save draft** saves private changes, including page geometry. Blog drafts require this explicit save. **Submit for publication** fixes a version for review, with the required publication consent; later edits leave the approved public version unchanged. Concurrent edits return a conflict. Share the stable `/blog/<handle>` URL after approval. The publication panel also contains the handle, discovery setting, review feedback, withdrawal and takedown actions. Taking a blog offline removes public access to its space-owned files.

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


Use **Preview** for desktop/mobile draft views. The dot grid belongs only to the editing workspace and can be switched off. **Stack sections** arranges layers at full page width using measured content heights. Saving does not publish a member draft; the existing review and media-access rules still apply.

Template changes use an inline confirmation and keep profile data. Undo/redo remains available when returning from Preview. Custom blocks use the same typography and colour rules in editing and publication.

The canvas toolbar provides explicit Select (V), Pan (H), zoom percentages and Fit width (F). Cmd/Ctrl Z and Shift Cmd/Ctrl Z undo and redo outside text fields; typing retains the browser’s text undo. Layer icons distinguish profile, contact, image and text content.
