# SpaceYew

**English** | [简体中文](README.zh-CN.md)

**Let your work tell your story.**

SpaceYew brings blog homepages, shared documentation, independent AI Skills and useful resources into one community. Members can introduce themselves, publish tutorials and share tools under their own accounts. Choose a built-in blog theme or upload a static website, then share it through a branded link and QR code.

This repository contains the website's frontend, backend, tests and deployment examples, making its interface, content model and permission system available to study. It is built with Next.js, React, TypeScript and Node.js's built-in SQLite.

> **Source available for reading and study only.** Direct use, modification, deployment (including personal or non-commercial deployment), commercial use and redistribution require prior written permission from IntMainJhy. See [LICENSE](LICENSE) for the full terms and English summary. This project is not offered under an open-source license such as MIT, Apache or GPL.

**This repository publishes only the website. macOS and Windows client source code, installers and proprietary assets remain private. This repository's license grants no rights to use or distribute those clients.** Viewing and forking on GitHub remain subject to GitHub's applicable terms.

## Preview

Local previews of the English interface with English sample posts and fictional member profiles. These screenshots show the earlier homepage and community design; the current catalog and theme options are described below. The website also supports Simplified Chinese and Japanese.

### Homepage

An introduction to SpaceYew, the Skill installation entry and site navigation.

![SpaceYew homepage in English with editorial typography, pastel backgrounds and feature links](docs/screenshots/home-en.jpg)

### Community

A feed of shared work, member recommendations and category navigation.

![SpaceYew community feed in English with shared posts, interaction controls and sidebars](docs/screenshots/community-en.jpg)

### Blog homepage settings

Choose a built-in theme, preview your profile or upload an HTML/ZIP website. The current editor also includes the new Folio and Panorama themes.

![SpaceYew personal homepage settings in English](docs/screenshots/editor-en.png)

### Blog homepage

A profile-first page for your introduction, skills, experience and work.

![SpaceYew personal homepage in English](docs/screenshots/personal-homepage-en.png)

## Features

| Area | Capabilities |
| --- | --- |
| Blog homepages | Five responsive themes, including a light ruled Folio layout and a dark, cover-led Panorama layout; introduce your experience, skills, work and contact details, with optional notes and resources |
| Static website hosting | Upload HTML or a ZIP with relative CSS/JS/assets, inspect an isolated preview and submit a fixed version for review; downloadable English/Chinese HTML starters and a stable branded URL help members get started |
| Shared documentation | Categorized image-and-description boards, article details with section navigation, and member-authored tutorials; import text, Markdown or HTML into the editor |
| Skill directory | 17 independently maintained GitHub Skills: Vercel React/composition, Impeccable, UI UX Pro Max, Superpowers debugging/TDD, Obsidian Markdown/JSON Canvas, eight GSAP Skills and VibeHub; cover cards, category/search/tool filters, detailed scenarios, installation commands and localized copyable prompts |
| Other resources | Member-shared websites, tools and references; documentation and Skills have their own sections |
| Publishing & community | One account-scoped editor for documents, Skills and resources; an approved entry creates one linked community post, subsequent revisions reuse it, and taking the entry offline also removes its share from public view |
| Sharing & community profiles | Independent blog navigation and management, public links, system sharing and QR codes; community profiles retain a short introduction with a link to the full blog |
| Content and files | Private account-isolated drafts, versions, blog content, uploaded images, attachments and file references |
| Moderation & administration | Local risk screening can approve low-risk text; flagged text, images, external sources and installation commands wait for a reviewer; manual mode, reports, takedowns, notifications and audit logs remain available |
| AI integration | The SpaceYew Skill and local stdio MCP bridge can read, save and submit documents, Skills and resources through scoped credentials; publication uses the same moderation and community-sharing pipeline as the editor |

The download page can link to externally hosted client installers. Client binaries and source code are not stored in this repository.

## Interface and interaction

A white-and-ink palette, flowing pastel backgrounds and editorial serif typography give the website a consistent visual language. The community uses an X-style social layout, while blog management and publishing have independent editing areas. GSAP connects page and navigation transitions, and the promotional strip keeps scrolling continuously during in-site navigation.

The interface supports English, Simplified Chinese and Japanese across desktop, tablet and mobile, with keyboard interaction and reduced-motion behavior. Themes chosen by blog authors are independent of the shared website interface.

Static hosting accepts UTF-8 HTML (5 MB) or ZIP files (25 MB compressed, 50 MB extracted, up to 1,000 entries). Packages need `index.html` or `index.htm` and relative asset paths. Browser-side interactions work in an opaque-origin sandbox; external scripts, API requests, forms and server-side execution are blocked. Sources and extracted files count toward storage, with up to 20 immutable packages per account. Publishing remains limited to the existing local qualification and review workflow; this change does not enable public uploads on a production service. Backups retain source packages and restore their verified static assets.

Legacy `/u/...` and `/workspace/studio` URLs redirect to blogs and their settings. Existing content and backend data contracts remain intact. See the [static hosting guide](docs/blog-hosting.md) for packaging, previews and supported interactions.

## Publishing and AI workflows

The top-level sections are Home, Community, Blogs, Docs, Skills and Other resources. Use **Publish** to create a document, Skill or resource, then save a private draft or submit it. Every published entry keeps its author, source and usage terms. If no image is supplied, SpaceYew generates a typographic cover. Documents and Skills appear in their own catalogs; an approved submission also creates a linked community share automatically. There is no need to submit the same content again in the community.

Each member owns their drafts and credentials. Existing public content stays visible while a revision awaits review. Suspicious content remains private to the author and reviewers, and linked reports or takedowns affect public visibility. The current rules engine is local triage, not semantic AI moderation or a guarantee of legal compliance. Public production publishing remains gated; see [moderation and launch requirements](docs/moderation-and-launch.md).

For AI publishing, create a credential at `/workspace/connect` with **catalog** scope, adding **submit** only if the agent may submit content for publication. Existing library/community credentials are not silently expanded. Configure the [stdio MCP bridge](integrations/spaceyew-mcp.mjs) or [SpaceYew Skill](integrations/spaceyew-post/SKILL.md) with a private site URL and token. The workflow is `catalog.save`, then `catalog.submit` after authorization and reading the current policy. A submission returns its actual published or pending status; it cannot approve its own review. Writes use stable request IDs to prevent duplicate retries. See the [API reference](integrations/spaceyew-post/references/api.md) for fields and MCP setup.

The curated Skill directory links to upstream repositories rather than bundling third-party code. It focuses on independent projects rather than duplicating skills bundled with AI tools; the previously listed Anthropic examples and document Skills have been removed. Tool badges describe the installation paths documented by this directory, not universal compatibility. GSAP Skills use MIT; the GSAP runtime has separate license terms.

## Technology

| Layer | Implementation |
| --- | --- |
| Pages and API | Next.js 15 App Router, server-rendered pages and same-site APIs |
| Interface | React 19, TypeScript 5, CSS and GSAP |
| Rich text | Tiptap |
| Runtime and storage | Node.js 24.15+, built-in SQLite and a private file directory |
| Email and media | Nodemailer, Sharp and QRCode |
| Validation and deployment | Node.js test runner, isolated HTTP tests, Nginx and systemd examples |

## Project status

SpaceYew is under active development. Publishing its source demonstrates the implementation; it does not certify production deployment, email delivery or readiness to open the community to the public.

This repository covers website development only. macOS and Windows clients remain private. Client source, installers and real site data are not included.

## Repository layout

| Directory | Contents |
| --- | --- |
| `src/app/` | Pages, APIs, media/download routes and styles |
| `src/components/` | Website components and shared interactions |
| `src/lib/` | Authentication, content, community, workspaces, files, email, database and permissions |
| `test/` | Unit tests, isolated HTTP tests and explicitly run demo scripts |
| `scripts/` | Initialization, backup, restore, cleanup and Skill packaging |
| `integrations/` | Website submission Skill, MCP integration and request scripts |
| `deploy/` | Nginx, systemd and separate platform/admin deployment examples |
| `public/` | Static website assets and the generated submission Skill package |
| `docs/` | Website administration guides, screenshots and third-party licenses |

Local databases, user uploads, captured email, real environment variables, credentials, backups, local design-review artifacts, temporary previews, dependencies and build output are excluded. Passwords in demo scripts are synthetic test values, not live site credentials.

## Local development for authorized maintainers

These instructions are for the copyright holder, maintainers and people with separate written authorization. They do not expand the permissions in LICENSE.

Use Node.js **24.15 or a newer compatible version**, npm and the committed lockfile. Database access uses a single Node process; multiple instances must not write concurrently to the same upload directory.

```sh
git clone https://github.com/IntMainJhy/SpaceYew.git
cd SpaceYew
npm ci
cp .env.local.example .env.local
npm run setup
npm run dev
```

The default local URL is `http://127.0.0.1:3008/`. The repository is already the website root; there is no additional `site-v1` directory to enter. Preserve any existing environment file.

`APP_DATA_DIR` defaults to `../.site-v1-data`, outside the application directory, and can be set to another private absolute path. On first initialization, randomly generated administrator credentials are saved to `initial-admin.txt` in the actual data directory. Re-running setup does not reset existing data. Never upload that file, the database or real configuration.

The local environment template contains only loopback URLs and cookie settings. For email, configure SMTP using [.env.example](.env.example); local capture mode is for integration testing. Real SMTP delivery, backup restoration and production deployment require separate validation in the target environment.

```sh
npm test
npm run typecheck
npm run build
npm run test:homepage:http
npm start
```

HTTP integration scripts in `test/` use temporary data directories. Check that their test ports are free before running them. Demo seeding and data-refresh scripts do not run as part of regular tests and should target only explicitly designated test data.

## Deployment and administration

- [Separate platform and admin deployment](deploy/README-split.en.md)
- [Administration guide](docs/administration.en.md)
- Configuration examples: [platform](deploy/platform.env.example), [admin](deploy/admin.env.example) and [Nginx](deploy/nginx-split.conf.example).

Production requires a separate private data directory, correct HTTPS URLs, Secure cookies and a trusted proxy configuration. Client links, ICP registration details, account settings and email settings must match the actual site. Default content and registration identifiers in the code do not authorize their use on another site.

## License and permission

Original material is provided under the [SpaceYew Website Source Reading and Study License 1.0](LICENSE), for reading and study only. Other uses require prior written permission. Contact [IntMainJhy](https://github.com/IntMainJhy) through the author's public contact channels, describing your purpose, intended modifications, deployment scope and any commercial use.

LICENSE includes an English summary; its Chinese text controls if there is a discrepancy. Third-party materials retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
