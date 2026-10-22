# Separate platform and admin deployment

**English** | [简体中文](README-split.md)

These instructions are for authorized maintainers; they do not grant deployment permission. See [LICENSE](../LICENSE).

Build the code once and run two Next.js services sharing the same `APP_DATA_DIR`. Server-side `APP_SURFACE` separates the public platform from administration; the platform service does not serve admin APIs. Use two subdomains of a domain you control, each with DNS and HTTPS configured.

| Surface | Example | Local upstream | Mode |
| --- | --- | --- | --- |
| Platform | https://app.example.com | 127.0.0.1:3008 | Password login; public registration disabled |
| Admin | https://admin.example.com/admin/login | 127.0.0.1:3009 | Existing administrator credentials |

1. Install an official Node.js **24.15+** Linux runtime at `/opt/spaceyew/node` without replacing runtimes used by other services. Put website source in `/opt/spaceyew/releases/<commit>`, install Linux dependencies with `npm ci --include=optional` and run `npm run build` there. Point `/opt/spaceyew/current` to that release. Never upload macOS `node_modules`, native clients or the workspace root; never overwrite production data with test data.
2. Create the `spaceyew` service user, let it read the release, and give it ownership of `/var/lib/spaceyew`. Use permissions `700` for the data directory and `600` for environment files.
3. Create `/etc/spaceyew/common.env` using the root [.env.example](../.env.example), with shared upload, statistics and email settings and any existing initial administrator configuration. Never put administrator passwords in templates or source files. An existing database retains its administrator account and password. On first initialization without `INITIAL_ADMIN_PASSWORD`, random credentials are saved to `initial-admin.txt` in the private data directory.
4. Copy [platform.env.example](platform.env.example) and [admin.env.example](admin.env.example) to `/etc/spaceyew/platform.env` and `/etc/spaceyew/admin.env`, respectively, and replace the example domains. Both must use the same `APP_DATA_DIR`. Each service's `PUBLIC_URL` must match its own external URL.
5. Install [spaceyew@.service](spaceyew@.service) in `/etc/systemd/system/`. Run `systemctl daemon-reload`, then `systemctl enable --now spaceyew@platform spaceyew@admin`.
6. Use [nginx-split.conf.example](nginx-split.conf.example) to configure certificates and reverse proxies for both domains. Run `nginx -t` before reloading. Upstreams must listen only on loopback; Nginx must overwrite `Host`, `X-Real-IP` and `X-Forwarded-For`. Use `TRUST_PROXY=true` only behind this trusted proxy configuration.

The platform cookie is `site_platform`; the admin cookie is `site_admin`. Both are host-only, HttpOnly and SameSite=Lax, with Secure enabled over HTTPS. Do not set a parent-domain cookie. Cookies and server sessions are also bound to their platform/admin realm: copying a cookie to the other surface does not confer that identity. Logging out of one surface does not log out of the other.

Both surfaces require a real account password. Automatic demo sign-in, arbitrary-account experience login and their environment switches have been removed. Old experience sessions are invalid and require a new password login. Administrators sign in only on the admin surface, members only on the platform surface, and reviewers receive only their authorized governance permissions on the admin surface. Signing in neither creates an account nor grants publishing qualification.

Public features default to closed. Set `PUBLIC_FEATURES_ENABLED=true` separately on both services only after configuring their actual HTTPS origins and the trusted proxy. This enables production account and community routes without pretending requests are localhost. `REGISTRATION_ENABLED=true` separately opens email registration on the platform. Configure `LEGAL_OPERATOR`, `LEGAL_CONTACT_EMAIL` and `LEGAL_EFFECTIVE_DATE` in the private shared environment so acceptance records bind the actual public policies; incomplete policies block registration and submissions. See [public launch requirements](../docs/public-launch.en.md). Do not bypass checks through forged Host headers or removal of admin authorization.

`POST /api/auth/login` checks an existing account and password permitted on the selected surface. Omit `authentication` or use `"password"`; other values are rejected. A successful `GET /api/auth/me` includes `user.authentication: "password"`. Member accounts, passwords and private workspaces share the backend; an admin session does not become a member identity. The server checks surface, role, origin and session realm.

This deployment shares the code, database and backend logic while exposing platform and administration on separate domains, allowing independent restrictions on admin access. Server-side permissions remain the access-control boundary. First initialization generates random administrator credentials or accepts initial credentials from the private environment; never set a fixed repository password.

New email accounts can sign in and edit private drafts. Email ownership does not verify a real identity. Public publishing requires an active account with separately recorded identity verification; historical `local_test` flags grant no production publishing rights. An administrator must actually complete the appropriate verification before recording it. Existing approved featured-blog content stays visible without granting its owner a new publishing privilege.

Before exposure, replace weak migrated administrator credentials, invalidate old sessions and keep the replacement in private storage. Use `backup.mjs` and `restore.mjs` to migrate a consistent database and uploaded files; SMTP secrets must be transferred separately. Keep a previous release and data snapshot for rollback. Validate TLS, SMTP, host-only cookies, cross-account isolation, both publication paths, media visibility and service restart. A passing application test is not a legal compliance certification.
