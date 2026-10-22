# 平台与管理端分开部署

[English](README-split.en.md) | **简体中文**

以下说明面向已授权维护者，不构成部署授权。许可范围见 [LICENSE](../LICENSE)。

同一份代码构建一次，运行两个 Next 服务，共享 `APP_DATA_DIR`，前后端规则与数据一致。平台与管理端通过服务端 `APP_SURFACE` 分离，平台服务不提供管理 API。两个子域名必须属于你控制的域名，分别配置 DNS 和 HTTPS。

| 入口 | 示例 | 本机上游 | 模式 |
| --- | --- | --- | --- |
| 平台 | https://app.example.com | 127.0.0.1:3008 | 真实账号密码登录，公网注册关闭 |
| 管理端 | https://admin.example.com/admin/login | 127.0.0.1:3009 | 真实管理账号密码 |

1. 在 `/opt/spaceyew/app` 放置代码并执行 `npm ci`、`npm run build`。不要用开发或测试数据覆盖服务器数据。
2. 创建服务用户 `spaceyew`，让它拥有应用目录和 `/var/lib/spaceyew`；数据目录权限700，环境文件600。
3. 参照根目录 `.env.example` 创建 `/etc/spaceyew/common.env`，存放上传、统计、邮件等公共配置及已有初始管理员配置；不要把管理密码写入模板或源码。已有数据库继续使用原管理员账号，不重置密码。首次初始化未提供 `INITIAL_ADMIN_PASSWORD` 时，私有数据目录的 `initial-admin.txt` 保存随机初始凭据。
4. 将 `platform.env.example` 和 `admin.env.example` 分别复制为 `/etc/spaceyew/platform.env`、`/etc/spaceyew/admin.env`，替换两个域名；两个文件的 `APP_DATA_DIR` 必须相同。每个服务的 `PUBLIC_URL` 则必须与自己的外部入口一致。
5. 安装 `spaceyew@.service` 到 `/etc/systemd/system/`，执行 `systemctl daemon-reload`、`systemctl enable --now spaceyew@platform spaceyew@admin`。
6. 参考 `nginx-split.conf.example` 配置两个域名的证书和反向代理，先运行 `nginx -t` 再重载。上游只监听回环地址，Nginx覆盖 `Host`/`X-Real-IP`/`X-Forwarded-For`。仅在这个可信代理配置下使用 `TRUST_PROXY=true`。

平台Cookie为 `site_platform`，管理端为 `site_admin`，均为Host-only、HttpOnly、SameSite=Lax，HTTPS下带Secure；不配置父域名Cookie。Cookie与服务端会话还绑定平台/管理端范围，手动复制到另一端也不能换取身份。退出互不影响。

平台与管理端仅支持真实账号密码登录。演示免登录、任意账号体验登录及其环境开关已移除；旧体验会话失效，需要重新验证密码。管理员只从管理端登录，普通成员只从平台端登录，审核员只在管理端获得授权范围内的治理权限。登录不会自动创建账号或授予投稿资格。

这份模板只配置双入口；当前社区仍保留既有本机联调限制，不会因为拆域名就自动对公网开放注册、投稿或工具API。正式开放社区需按现有上线验收单单独启用，不通过修改Host、反向代理头或取消管理校验绕过。

`POST /api/auth/login` 校验所处入口允许的已有账号与密码，可省略 `authentication` 或传入 `"password"`；其他值被拒绝。`GET /api/auth/me` 在有效登录后返回 `user.authentication: "password"`。成员账号、密码及私有工作空间在同一后端管理；管理会话不会成为普通成员身份。服务端同时检查入口、角色、来源和会话范围。

这种部署复用代码、数据库和后台业务，在不同域名提供平台与管理界面，便于独立限制后台访问；域名划分之外，服务端权限校验仍是访问控制依据。首次初始化生成随机管理员凭据，也可通过私有环境配置初始凭据；不要在仓库中设置固定密码。

本地密码登录平台可用 `REGISTRATION_ENABLED=true` 开启邮箱验证码注册，部署示例默认仍关闭。参见[邮箱注册与 SMTP](../docs/email-registration.md)；本地环境限制和发布资格核查继续生效。
