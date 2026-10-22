# Separate platform and admin deployment

**English** | [简体中文](README-split.md)

These instructions are for authorized maintainers; they do not grant deployment permission. See [LICENSE](../LICENSE).

Build the code once and run two Next.js services sharing the same `APP_DATA_DIR`. Server-side `APP_SURFACE` separates the public platform from administration; the platform service does not serve admin APIs. Use two subdomains of a domain you control, each with DNS and HTTPS configured.

| Surface | Example | Local upstream | Mode |
| --- | --- | --- | --- |
| Platform | https://app.example.com | 127.0.0.1:3008 | Password login; public registration disabled |
| Admin | https://admin.example.com/admin/login | 127.0.0.1:3009 | Existing administrator credentials |

1. Place the code in `/opt/spaceyew/app`, then run `npm ci` and `npm run build`. Do not overwrite server data with development or test data.
2. Create the `spaceyew` service user and give it ownership of the application directory and `/var/lib/spaceyew`. Use permissions `700` for the data directory and `600` for environment files.
3. Create `/etc/spaceyew/common.env` using the root [.env.example](../.env.example), with shared upload, statistics and email settings and any existing initial administrator configuration. Never put administrator passwords in templates or source files. An existing database retains its administrator account and password. On first initialization without `INITIAL_ADMIN_PASSWORD`, random credentials are saved to `initial-admin.txt` in the private data directory.
4. Copy [platform.env.example](platform.env.example) and [admin.env.example](admin.env.example) to `/etc/spaceyew/platform.env` and `/etc/spaceyew/admin.env`, respectively, and replace the example domains. Both must use the same `APP_DATA_DIR`. Each service's `PUBLIC_URL` must match its own external URL.
5. Install [spaceyew@.service](spaceyew@.service) in `/etc/systemd/system/`. Run `systemctl daemon-reload`, then `systemctl enable --now spaceyew@platform spaceyew@admin`.
6. Use [nginx-split.conf.example](nginx-split.conf.example) to configure certificates and reverse proxies for both domains. Run `nginx -t` before reloading. Upstreams must listen only on loopback; Nginx must overwrite `Host`, `X-Real-IP` and `X-Forwarded-For`. Use `TRUST_PROXY=true` only behind this trusted proxy configuration.

The platform cookie is `site_platform`; the admin cookie is `site_admin`. Both are host-only, HttpOnly and SameSite=Lax, with Secure enabled over HTTPS. Do not set a parent-domain cookie. Cookies and server sessions are also bound to their platform/admin realm: copying a cookie to the other surface does not confer that identity. Logging out of one surface does not log out of the other.

Both surfaces require a real account password. Automatic demo sign-in, arbitrary-account experience login and their environment switches have been removed. Old experience sessions are invalid and require a new password login. Administrators sign in only on the admin surface, members only on the platform surface, and reviewers receive only their authorized governance permissions on the admin surface. Signing in neither creates an account nor grants publishing qualification.

This template configures separate entry points only. Existing local-only community restrictions remain in effect: separate domains do not automatically enable public registration, submissions or tool APIs. A public community launch requires separate acceptance checks and explicit enablement. Do not bypass restrictions through Host headers, proxy headers or removal of admin checks.

`POST /api/auth/login` checks an existing account and password permitted on the selected surface. Omit `authentication` or use `"password"`; other values are rejected. A successful `GET /api/auth/me` includes `user.authentication: "password"`. Member accounts, passwords and private workspaces share the backend; an admin session does not become a member identity. The server checks surface, role, origin and session realm.

This deployment shares the code, database and backend logic while exposing platform and administration on separate domains, allowing independent restrictions on admin access. Server-side permissions remain the access-control boundary. First initialization generates random administrator credentials or accepts initial credentials from the private environment; never set a fixed repository password.

Local email registration can be enabled with `REGISTRATION_ENABLED=true` on the password platform. The deployment template keeps it disabled by default. See [email registration and SMTP](../docs/email-registration.md); the local gate and publication qualification still apply.
