# Edit your blog homepage

[简体中文](blog-editor.zh-CN.md)

`/blogs` opens the configured public homepage, normally the site owner’s. **Create / edit my blog** opens `/workspace/blog` for the signed-in member’s own content. New members start with their nickname and empty content; existing profiles, certificates, images, PDFs and translations are preserved.

The editor is a page designer built on MIT-licensed React Flow. The existing Anx homepage is the default template: edit text directly on the page, drag section labels, resize block widths from either side, and add text, images, links or stickers. The left panel contains layers, insert tools and a sticker library; the right panel edits position, colours, spacing and typography. Start from the default template or a blank design. Undo/redo covers content and layout changes. Designs are stored with the draft and rendered by the same component in preview and the reviewed public page. Desktop visitors see the saved layout; narrow screens stack blocks in visual reading order.

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


The default **Keep in touch** arrow is an editable sticker attached to Contact links. Moving, hiding or deleting that section also moves, hides or removes its sticker; Undo restores both. The 42-piece library has six visible style groups: annotations, pen drawings, paper journal, color cutouts, pixel art and type labels. Search matches names and default text in English or Chinese; style selection and search combine. Existing sticker IDs and saved designs remain supported. Stickers support text translations, rotation, duplication, stacking order and either free placement or attachment to a template section. Removing the default arrow is remembered.

Position and size fields commit on Enter or blur; Escape cancels the pending input. Lock a layer to protect its content and position. Arrow keys nudge an unlocked selected layer by 1 px, or 10 px with Shift; Delete removes it, and holding Space temporarily pans. Cmd/Ctrl S saves a changed draft. These canvas shortcuts leave text-field editing alone.

Opening properties or returning from Preview preserves the canvas camera. New custom blocks appear in the current view. Stack sections follows the current visual order, keeps attached stickers, and respects locked sections. Free-layout page resizing preserves relative columns. Desktop preview scales the whole design, including outside annotations; phone preview uses a readable stacked layout. Automatic height measurement does not count as an unsaved author edit.


Drag a sticker by its body or label; double-click its text to edit in place, or use the inspector. Dragging keeps measured layer sizes and stable content, so layers do not hide and re-measure on every move. Attached stickers follow the section during the drag as well as after release. The workspace dot grid maintains a readable screen spacing while zooming; it stays out of the public page. The editor uses the shared SY website mark and a pinned inspector heading.


The wider sticker rail keeps search and style controls visible while results scroll. On phones, the library opens as a closable sheet with real thumbnails; adding a sticker returns to the canvas. The inspector places editable content before geometry, and intermediate screens use a dismissible inspector overlay. Canvas controls occupy a reserved bottom band instead of covering page content.


Selected layers have quick Duplicate, Hide, Lock and Delete actions above the canvas; layer rows also expose visibility and locking. Cmd/Ctrl D duplicates an unlocked custom layer. Duplicates stay within page bounds without changing their saved width; Undo/Redo restores the selection as well as content. Pan mode and saving prevent node dragging.

Preview supports desktop, tablet and phone widths, reports the actual frame width and keeps reading progress when switching sizes. Back to top returns to the beginning, and the chosen device remains selected when returning to edit. Valid custom link buttons open a separate tab in preview and public pages. Rotated ornaments outside the top or sides reserve matching display space.

Public Anx pages link to every available, visible section, including skills and image collections. The compact title area retains the signature, while certificate and photo grids use small consistent thumbnails with readable captions. Certificates keep the whole image visible; gallery and résumé images open a native image viewer with close, loading/error feedback and keyboard focus return. Empty captions do not reserve blank rows.

Editor modes, publication settings and preview device changes use brief, interruptible transitions. Library and inspector arrivals, layer navigation and zoom provide continuity without animating draggable node transforms. Native image dialogs and public section anchors also transition smoothly; reduced-motion preferences remove spatial effects. Undo, delete and duplication close stale image-upload controls.

## Page templates and résumé section styles

The Page style button above the canvas and the Styles sidebar tab offer Original Anx, Clean résumé, Career timeline, Two-column résumé, Project gallery and Editorial story. Applying a template rearranges the page and assigns a section style while preserving text, images, links, translations and custom layers. The change is undoable and must be saved as a private draft before the existing review process can update the public version.

Insert résumé sections as Classic, Timeline, Project cards, Compact list, Side heading or Showcase. Select an existing section to change its style in Properties. Entries support text, images, URLs, duplication and reordering. Duplicated sections contain independent copies; deleted section layers can be restored from Insert → Your existing content. Desktop and tablet previews retain the authored layout; containers at 600px or below stack content in reading order.

Select a résumé section and use Section style above the canvas to reveal its six presentations. The library names the current template; reselecting it creates no extra undo entry. Panel, template and preview transitions respect the system reduced-motion preference.

## Visual themes

Page style opens Visual theme by default: Original, Pencil sketch, Mint docs (Mintlify inspired), Mint editorial (the supplied serif/mint reference) and Night record (Spotify inspired). Page layout remains a separate six-option control. Themes preserve geometry, text, media and section presentation; undo, draft persistence, preview and reviewed publication share the same model.

Explicit node colors remain intact. If only text or background is customized, its inherited counterpart resolves to a readable contrast. Original restores the authored page background. Editor controls remain neutral.

Inter, Geist Mono and Cormorant Garamond are self-hosted SIL OFL fonts, sourced from the Google Fonts repository under `ofl/inter`, `ofl/geistmono` and `ofl/cormorantgaramond`; licenses ship beside the font files in `public/fonts`. CJK uses device fallbacks. No Spotify proprietary fonts are redistributed.

The visual themes also include Memphis (cream, bold geometry and playful color) and Volt terminal (near-black, emerald signals and monospace metadata). Each theme defines its own masthead composition, portrait shape, type hierarchy and section rhythm. The All sections menu replaces the long horizontal navigation on phones. Non-original themes omit only the unedited built-in contact annotation, ignoring measured height changes; returning to Original restores it. Authored stickers remain visible. Menu and button motion respects reduced-motion preferences.

## Typography and motion

Switch styles now includes Typography and Motion alongside themes and page layouts. Chinese and Latin faces can be chosen independently with a bilingual specimen. Bundled OFL fonts are self-hosted; see `public/fonts/README.md` for provenance. Theme default restores the inherited type; authored stickers keep their own lettering. Draft persistence, undo, preview and reviewed publication use the same settings.

Skills marquee uses the member's own skills and provides pause/resume, hover/focus pause, offscreen/hidden-tab suspension and a reduced-motion static wrapping list. Skill editing stays still. The optional header entrance animates only the portrait and title. The letter-free folded-space brand symbol generates SVG, ICO, Apple and PNG assets from a single source.

Theme interactions are available under Style → Motion and can be disabled independently. Original uses fine navigation rules; Pencil uses drawn rules and paper menus; Mint docs uses quick green feedback; Mint editorial uses centered rules and slow photo reframing; Night record uses cover focus and tactile presses; Memphis uses geometric turns and offset presses; Volt terminal uses stepped scans and signal outlines. Keyboard focus receives matching feedback. Menus and anchor targets use bounded animations, with no additional loops. Editing and reduced-motion modes stay stationary.
