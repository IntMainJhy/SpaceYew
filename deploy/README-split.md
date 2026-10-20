# 平台与管理端分开部署

同一份代码构建一次，运行两个 Next 服务，共享 `APP_DATA_DIR`，前后端规则与数据一致。平台与管理端通过服务端 `APP_SURFACE` 分离，平台服务不提供管理 API。两个子域名必须属于你控制的域名，分别配置 DNS 和 HTTPS。

| 入口 | 示例 | 本机上游 | 模式 |
| --- | --- | --- | --- |
| 平台 | https://app.example.com | 127.0.0.1:3008 | 体验登录，不创建正式账号 |
| 管理端 | https://admin.example.com/admin/login | 127.0.0.1:3009 | 真实管理账号密码 |

1. 在 `/opt/spaceyew/app` 放置代码并执行 `npm ci`、`npm run build`。不要复制本地演示数据覆盖服务器数据。
2. 创建服务用户 `spaceyew`，让它拥有应用目录和 `/var/lib/spaceyew`；数据目录权限700，环境文件600。
3. 参照根目录 `.env.example` 创建 `/etc/spaceyew/common.env`，存放上传、统计、邮件等公共配置及已有初始管理员配置；不要把管理密码写入模板或源码。已有数据库继续使用原管理员账号，不重置密码。首次初始化未提供 `INITIAL_ADMIN_PASSWORD` 时，私有数据目录的 `initial-admin.txt` 保存随机初始凭据。
4. 将 `platform.env.example` 和 `admin.env.example` 分别复制为 `/etc/spaceyew/platform.env`、`/etc/spaceyew/admin.env`，替换两个域名；两个文件的 `APP_DATA_DIR` 必须相同。每个服务的 `PUBLIC_URL` 则必须与自己的外部入口一致。
5. 安装 `spaceyew@.service` 到 `/etc/systemd/system/`，执行 `systemctl daemon-reload`、`systemctl enable --now spaceyew@platform spaceyew@admin`。
6. 参考 `nginx-split.conf.example` 配置两个域名的证书和反向代理，先运行 `nginx -t` 再重载。上游只监听回环地址，Nginx覆盖 `Host`/`X-Real-IP`/`X-Forwarded-For`。仅在这个可信代理配置下使用 `TRUST_PROXY=true`。

平台Cookie为 `site_platform`，管理端为 `site_admin`，均为Host-only、HttpOnly、SameSite=Lax，HTTPS下带Secure；不配置父域名Cookie。Cookie与服务端会话还绑定平台/管理端范围，手动复制到另一端也不能换取身份。退出互不影响。

`PLATFORM_LOGIN_MODE=experience` 是明确的体验模式：任意非空账号、密码进入同一个普通体验空间，不保存输入的密码，不允许修改账号安全信息、注销或创建工具凭据，不会获取管理权限。注册页面及接口关闭。以后做正式用户体系时再替换这一模式，不能把它描述为真实的用户身份校验。

这份模板只配置双入口；当前社区仍保留既有本机联调限制，不会因为拆域名就自动对公网开放注册、投稿或工具API。正式开放社区需按现有上线验收单单独启用，不通过修改Host、反向代理头或取消管理校验绕过。
