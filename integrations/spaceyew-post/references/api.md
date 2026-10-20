# SpaceYew integration

POST `/api/connect` with `Authorization: Bearer <configured token>` and JSON:

```json
{"operation":"library.save","requestId":"a-stable-unique-operation-id","input":{"type":"projects","data":{"title":"Project title","summary":"What it does","bodyHtml":"<p>Your work</p>","career":true}}}
```

`me` returns the active account, handle, showcase URL and scopes. `library.list` reads compact library metadata and revision numbers; `library.get` takes `id` and reads your own full draft before editing; `library.save` creates or updates a draft (`id`, `revision`, `type`, optional `slug`, `data`). Library data supports `title`, `summary`, `bodyHtml`, `category`, `tags`, `coverId`, `attachmentId`, `kind` (`file`, `website`, `external`), `url`, `sourceUrl`, `role`, `contribution`, `outcome`, `career`, `license`, and text `translations` keyed `en`, `zh`, `ja`. Resource submission requires a license and access method. `library.submit` takes saved `id`, `revision`, `confirmed:true` and needs the separate submit scope.

`community.list` returns your own submissions. `community.get` takes `id`. `community.save` takes optional `id`/`version` plus `data`: `title` (2–80 chars for submission), `summary`, `body` (plain text), `category`, `sourceName`, full HTTPS `sourceUrl`, `license`, `basis` (`original`, `authorized`, `open`, `official`), `url` (target HTTPS source page), optional `tags`, optional `coverId`/`coverAlt`, and `note`. Consult `policy` for current rules/taxonomy. Summary and body must each have at least 20 characters for submission. Both sourceUrl and url are required. Original/authorized material must explain rights; official resources should link to their original source. Do not claim authorization without evidence. `community.submit` takes saved `id`, `version`, `confirmed:true`, and current `policyVersion`/`policyHash` from `policy`.

Every write requires a stable `requestId` (8–100 ASCII letters/digits/underscores/hyphens). Retrying the same token + request ID + exact input returns the original result for 24 hours. Reusing the ID with different input is rejected. Credentials expire within 90 days, may be revoked, and do not grant moderation access. Local-only community qualification, quotas, rate limits, immutable review snapshots and complaint holds still apply.

Studio: `/workspace/studio`; library: `/workspace/library`; community drafts: `/workspace/submissions/<id>`. No integration route directly publishes. Current integration supports local REST and the repository's stdio MCP bridge (protocol 2025-11-25), not public remote HTTP MCP/OAuth.
