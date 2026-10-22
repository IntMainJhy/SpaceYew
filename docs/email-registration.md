# Email registration / 邮箱验证码注册

The password-login platform supports `/join`: email, a six-digit code, nickname, password confirmation and explicit policy/adult acknowledgements. No invitation is required. After success, sign in with the verified email and password to edit your own private blog. Existing invitation-bound codes remain compatible with the API.

密码登录的平台端提供 `/join` 注册页：邮箱、六位验证码、昵称、密码及确认密码、协议与成年确认，无需邀请码。注册成功后使用已验证邮箱和密码登录，编辑自己的私有博客。旧的邀请绑定验证码仍与 API 兼容。

## Configuration / 配置

For authorized local maintainers, set `REGISTRATION_ENABLED=true` on the combined/password platform surface. `false` hides registration and blocks both registration and code requests. Admin and shared experience surfaces never permit registration. Requests still require a loopback deployment; this change does not activate public production registration or publication.

已授权维护者可在本地 combined / 密码登录的平台端设置 `REGISTRATION_ENABLED=true`。设置为 `false` 时同时关闭页面、注册接口与注册验证码请求；管理端及共享体验模式不开放注册。服务端继续校验本地部署环境，不会因此开放公网生产注册或投稿。

QQ SMTP example, with placeholders only:

```dotenv
MAIL_MODE=smtp
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-mailbox@qq.com
SMTP_PASSWORD=your-smtp-authorization-code
SMTP_FROM=your-mailbox@qq.com
```

QQ uses an SMTP authorization code rather than the QQ sign-in password; see [QQ Mail's official setup help](https://help.mail.qq.com/detail/106/985). Port 465 uses TLS; certificate verification remains enabled. Keep the real values in the ignored `.env.local` or the service's private environment and restart the process after changes. Do not commit credentials or captured mail.

QQ 邮箱使用 SMTP 授权码而不是 QQ 登录密码，参见 [QQ 邮箱官方说明](https://help.mail.qq.com/detail/106/985)。465 端口使用 TLS，并保留证书校验。真实配置存放在被 Git 忽略的 `.env.local` 或服务私有环境中，修改后重启进程。凭据和捕获的邮件均不提交。

`MAIL_MODE=capture` is only for isolated local tests: no email is delivered; messages go into the private data directory's `mail-outbox`. The API and registration page never reveal the code. SMTP connection/authentication success does not prove inbox delivery; confirm delivery in the destination mailbox.

`MAIL_MODE=capture` 仅用于隔离本地测试，不会发送邮件；邮件保存在私有数据目录的 `mail-outbox`。接口与注册页不会返回验证码。SMTP 连接和认证通过不等于收件箱投递成功，须在目标邮箱确认收信。

## Verification and access / 验证与权限

- Codes expire after 10 minutes, allow five attempts and can be consumed once. A successfully resent code invalidates the previous code for that email and purpose.
- Requests are limited by email and IP, with a 60-second resend interval. Duplicate and unknown emails use the same public request response.
- Email, purpose and optional invitation are bound to the challenge. Account creation, verified-email persistence and code consumption commit together.
- New members retain `pending` publication qualification. Email ownership does not grant administrator/reviewer access or verify a legal identity. Operators still confirm publishing qualification and review content.

验证码10分钟有效、最多尝试5次、单次使用；重发成功后旧码失效。发信按邮箱与 IP 限流、间隔60秒，重复邮箱与未知邮箱请求使用相同公开响应。验证绑定邮箱、用途及可选邀请，创建账号、保存已验证邮箱和消耗验证码在同一事务中完成。新成员的发布资格仍为待核查，邮箱认证不等于实名核验或管理权限。

## Checks / 验证命令

```sh
npm test
npm run typecheck
npm run build
npm run test:registration:http
node test/split-login-http.mjs
```

The HTTP registration test uses disposable data and captured mail, never the maintainer's mailbox or existing accounts.

HTTP 注册测试仅使用临时数据和捕获邮件，不访问维护者邮箱或改动已有账号。
