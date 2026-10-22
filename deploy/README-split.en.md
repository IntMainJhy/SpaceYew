# Separate platform and admin deployment

**English** | [简体中文](README-split.md)

These instructions are for authorized maintainers; they do not grant deployment permission. See [LICENSE](../LICENSE).

Build the code once and run two Next.js services sharing the same `APP_DATA_DIR`. Server-side `APP_SURFACE` separates the public platform from administration; the platform service does not serve admin APIs. Use two subdomains of a domain you control, each with DNS and HTTPS configured.

| Surface | Example | Local upstream | Mode |
| --- | --- | --- | --- |
| Platform | https://app.example.com | 127.0.0.1:3008 | Password login; public registration disabled |
| Admin | https://admin.example.com/admin/login | 127.0.0.1:3009 | Existing administrator credentials |

1. Place the code in `/opt/spaceyew/app`, then run `npm ci` and `npm run build`. Do not overwrite server data with local demo data.
2. Create the `spaceyew` service user and give it ownership of the application directory and `/var/lib/spaceyew`. Use permissions `700` for the data directory and `600` for environment files.
3. Create `/etc/spaceyew/common.env` using the root [.env.example](../.env.example), with shared upload, statistics and email settings and any existing initial administrator configuration. Never put administrator passwords in templates or source files. An existing database retains its administrator account and password. On first initialization without `INITIAL_ADMIN_PASSWORD`, random credentials are saved to `initial-admin.txt` in the private data directory.
4. Copy [platform.env.example](platform.env.example) and [admin.env.example](admin.env.example) to `/etc/spaceyew/platform.env` and `/etc/spaceyew/admin.env`, respectively, and replace the example domains. Both must use the same `APP_DATA_DIR`. Each service's `PUBLIC_URL` must match its own external URL.
5. Install [spaceyew@.service](spaceyew@.service) in `/etc/systemd/system/`. Run `systemctl daemon-reload`, then `systemctl enable --now spaceyew@platform spaceyew@admin`.
6. Use [nginx-split.conf.example](nginx-split.conf.example) to configure certificates and reverse proxies for both domains. Run `nginx -t` before reloading. Upstreams must listen only on loopback; Nginx must overwrite `Host`, `X-Real-IP` and `X-Forwarded-For`. Use `TRUST_PROXY=true` only behind this trusted proxy configuration.

The platform cookie is `site_platform`; the admin cookie is `site_admin`. Both are host-only, HttpOnly and SameSite=Lax, with Secure enabled over HTTPS. Do not set a parent-domain cookie. Cookies and server sessions are also bound to their platform/admin realm: copying a cookie to the other surface does not confer that identity. Logging out of one surface does not log out of the other.

The platform example defaults to `PLATFORM_LOGIN_MODE=password`, which verifies existing website accounts. This does not create users or grant local publishing qualification.

`PLATFORM_LOGIN_MODE=experience` remains an explicitly selected demo mode. Any non-empty username and password enter the same ordinary experience workspace. Entered passwords are not stored. Shared experience sessions cannot access private blog workspaces, upload résumés, change account security settings, delete the account or create tool credentials, and do not receive admin access. Registration pages and APIs are disabled. Use password mode for real account authentication; experience mode must not be presented as identity verification.

This template configures separate entry points only. Existing local-only community restrictions remain in effect: separate domains do not automatically enable public registration, submissions or tool APIs. A public community launch requires separate acceptance checks and explicit enablement. Do not bypass restrictions through Host headers, proxy headers or removal of admin checks.

Clients that require verified accounts can send `authentication: "password"` to the existing `POST /api/auth/login` endpoint. This always checks the stored website password, even when the browser entry offers experience login. A successful `GET /api/auth/me` includes `user.authentication: "password"`; experience and automatic demo identities are marked `"experience"`. The method is stored with the server session, so requesting password authentication cannot upgrade an existing experience token. Legacy platform tokens are treated as experience sessions and require a new login for password authentication. The same account IDs, password changes and workspace data are shared; registration, origin checks, role isolation and local-only community restrictions still apply. This does not enable public member access.

Local email registration can be enabled with `REGISTRATION_ENABLED=true` on the password platform. The deployment template keeps it disabled by default. See [email registration and SMTP](../docs/email-registration.md); the local gate and publication qualification still apply.
