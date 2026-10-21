# SpaceYew integration

POST `/api/connect` with `Authorization: Bearer <configured token>` and JSON:

```json
{"operation":"library.save","requestId":"a-stable-unique-operation-id","input":{"type":"projects","data":{"title":"Project title","summary":"What it does","bodyHtml":"<p>Your work</p>","career":true}}}
```

`me` returns the active account, handle, showcase URL and scopes. `library.list` reads compact library metadata and revision numbers; `library.get` takes `id` and reads your own full draft before editing; `library.save` creates or updates a draft (`id`, `revision`, `type`, optional `slug`, `data`). Library data supports `title`, `summary`, `bodyHtml`, `category`, `tags`, `coverId`, `attachmentId`, `kind` (`file`, `website`, `external`), `url`, `sourceUrl`, `role`, `contribution`, `outcome`, `career`, `license`, and text `translations` keyed `en`, `zh`, `ja`. Resource submission requires a license and access method. `library.submit` takes saved `id`, `revision`, `confirmed:true` and needs the separate submit scope.

`community.list` returns your own submissions. `community.get` takes `id`. `community.save` takes optional `id`/`version` plus `data`: `title` (2–80 chars for submission), `summary`, `body` (plain text), `category`, `sourceName`, full HTTPS `sourceUrl`, `license`, `basis` (`original`, `authorized`, `open`, `official`), `url` (target HTTPS source page), optional `tags`, optional `coverId`/`coverAlt`, and `note`. Consult `policy` for current rules/taxonomy. Summary and body must each have at least 20 characters for submission. Both sourceUrl and url are required. Original/authorized material must explain rights; official resources should link to their original source. Do not claim authorization without evidence. `community.submit` takes saved `id`, `version`, `confirmed:true`, and current `policyVersion`/`policyHash` from `policy`.

Every write requires a stable `requestId` (8–100 ASCII letters/digits/underscores/hyphens). Retrying the same token + request ID + exact input returns the original result for 24 hours. Reusing the ID with different input is rejected. Credentials expire within 90 days, may be revoked, and do not grant moderation access. Local-only community qualification, quotas, rate limits, immutable review snapshots and complaint holds still apply.

Blog studio: `/workspace/blog`; library: `/workspace/library`; community drafts: `/workspace/submissions/<id>`. Catalog submission may automatically publish low-risk text after checks; it never bypasses moderation. Current integration supports local REST and the repository's stdio MCP bridge (protocol 2025-11-25), not public remote HTTP MCP/OAuth.

## Shared catalog: documents, Skills, other resources

Create a new credential with **catalog** scope in `/workspace/connect`; old library/community credentials do not gain this scope. Add **submit** only when the agent is allowed to submit for publication. `catalog.list` lists your own entries; `catalog.get` reads an entry by `id`.

`catalog.save` takes flat fields: `kind` (`docs`, `skills`, `resources`), `title` (2–120 characters), `summary` (10–600), `bodyHtml` (at least 20 text characters, maximum 1,000,000), `category`, `license`, optional `sourceName`, `sourceUrl` (HTTPS; required for Skills/resources), `coverId` and `coverAlt` (owned community cover), `supportedTools` (up to 10 names), `installCommand` (up to 6,000), and `prompts` (up to 10 `{title,text}` objects). Update with `id` and current `version`. HTML is sanitized; inline media, scripts, iframes and file uploads are not accepted by this operation. The server supplies a default cover when `coverId` is omitted.

```json
{"operation":"catalog.save","requestId":"my-tutorial-draft-001","input":{"kind":"docs","title":"Accessible form basics","summary":"A practical tutorial for building clear, keyboard-friendly forms.","bodyHtml":"<h2>Start with labels</h2><p>Connect every input to an explicit label, then test the complete form using only the keyboard.</p>","category":"Frontend","license":"Original text by the account owner."}}
```

After explicit authorization, read `policy`, then call `catalog.submit` with saved `id`, `version`, `confirmed:true`, current `policyVersion`, current `policyHash`, and a new stable `requestId`. Result includes `status`, `visibility`, `moderation` and `url`. `status:published` means the public entry and its community share were committed atomically; `status:pending` means the entry awaits an administrator and is not published. No second `community.save` is needed. Updates reuse the same entry and community-post IDs. The private edit URL is `/<kind>?compose=1&edit=<id>` (where kind is `docs`, `skills` or `resources`); the former `/publish/<id>` address redirects to the matching catalog. public URLs are `/docs/shared/<id>`, `/skills/shared/<id>` or `/resources/shared/<id>`.

The current local rules engine is a triage mechanism, not a legal-compliance certificate or an AI semantic classifier. Suspicious text, images, external links and installation commands await a reviewer. Public production access remains disabled until real identity verification and operational requirements are fulfilled.

## MCP connection

Run the repository's `integrations/spaceyew-mcp.mjs` with Node.js 24+, `SPACEYEW_URL` set to the loopback site origin and `SPACEYEW_TOKEN` in the client's private environment. The stdio bridge discovers only tools allowed by the credential scopes, including `spaceyew_list_catalog`, `spaceyew_get_catalog_item`, `spaceyew_save_catalog_draft` and `spaceyew_submit_catalog`. No browser interaction or administrator password is needed.
