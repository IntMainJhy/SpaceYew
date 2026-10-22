# Résumé to portfolio

The owner can use **Administration → Profile and experience** to upload a PDF, DOCX, UTF-8 TXT or Markdown résumé. Extracted text is shown for review. The owner can edit that text, regenerate a draft, apply it to the profile form, then explicitly save. Uploading or parsing never publishes content.

The importer uses local text extraction and common Chinese/English section headings. PDF text is read with [Mozilla PDF.js](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html) and reassembled by page coordinates, so glyphs emitted in separate font groups keep their visual reading order. It does not call an external AI provider, translate content, infer missing dates, or verify achievements. Image-only PDFs require OCR before upload. Complex columns may need manual text corrections. Applying a new draft clears old profile translations; fill the new translations in the profile language tabs. Existing résumé items can also be edited in the same administration screen.

The structured profile supports education, experience, projects, open source, recognition and other sections, plus optional images and per-item translations. The owner's Anx page renders these sections instead of the older project/content list when a structured résumé is present. Profiles without a résumé keep their previous rendering. Main `/blogs` and existing owner share links use the same profile.

## Privacy and download

The original upload remains unreferenced and private. Common mobile phone and identity fields are filtered from extracted text as a convenience, not a complete privacy guarantee. Review the preview before saving. Choose a separately redacted PDF in **Public résumé PDF** if visitors should be able to download one. That attachment becomes public only on save. The file manager retains original uploads until the owner deletes them.

Only the existing owner administration session can call `POST /api/admin/resume/import` (`fileId`) or `/api/admin/resume/parse` (`text`). Existing same-origin checks apply. Publishing uses the normal profile configuration endpoint and audit log.

## Processing limits

Uploads must be at most 8 MiB; PDFs at most 30 pages. DOCX central-directory limits are checked before parsing: 2,000 entries, 12 MiB per member, 40 MiB combined declared size. A short-lived Node process limits extraction to 20 seconds and a 256 MiB V8 heap, with two concurrent imports per web process and 20 file extractions per owner per hour. This is a resource bound, not an operating-system sandbox. Run the application as an unprivileged service account. Original document scripts and macros are not executed.

Deployments must include `src/lib/resume-extract-worker.mjs` alongside the server sources and install the locked npm dependencies. The worker is loaded from the application's working directory, outside the Next.js request event loop.

Validation: `npm test`, `npm run typecheck`, `npm run build`, `npm run test:resume:http`.

Personal résumé files, presentation sources, user photos and populated databases belong in private storage, not this repository.

[简体中文](resume-import.zh-CN.md)
