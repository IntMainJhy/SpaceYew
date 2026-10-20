# SpaceYew 网站

SpaceYew 的全栈网站源码，包含社区分享、个人展板、内容库、简历与管理中心。网站采用 Next.js、React、TypeScript 和 Node.js 内置 SQLite。

> **源码可见，仅供阅读学习。** 修改使用、直接使用、部署（包括个人或非商业部署）、商用和再分发，均须取得 IntMainJhy 的事先书面许可。完整条款见 [LICENSE](LICENSE)。本项目不采用 MIT、Apache 或 GPL 等开放许可。

**本仓库只发布网站。macOS、Windows 客户端的源码、安装包和专有资源不在本仓库发布，本仓库的许可不授予客户端使用或分发权利。** GitHub 平台内的查看与 Fork 按适用的平台条款处理。

## 网站功能

- 欢迎首页、社区动态、成员发现、关注、收藏与投稿审核。
- 按账号隔离的内容库、文件、展板编辑与公开简历。
- 站长及审核员管理、举报工单、通知、访问统计与审计日志。
- 中文、英文和日文界面，统一杂志字体与 X 社交布局。
- 网站投稿 Skill 与本地 MCP 接入；接入代码属于网站集成，不包含桌面客户端。
- 网站下载页支持配置外部客户端安装包链接；安装包不存放在此仓库。

当前项目仍处于开发阶段；仓库公开不代表已完成生产部署或社区开放验收。

## 目录

| 目录 | 内容 |
| --- | --- |
| `src/app/` | 页面、API、媒体/下载路由与样式 |
| `src/components/` | 网站界面及共享交互 |
| `src/lib/` | 认证、内容、社区、空间、文件、邮件、数据库与权限 |
| `test/` | 单元测试、隔离 HTTP 测试与显式执行的演示脚本 |
| `scripts/` | 初始化、备份、恢复、清理与 Skill 打包 |
| `integrations/` | 网站投稿 Skill、MCP 与请求脚本 |
| `deploy/` | Nginx、systemd 与平台/管理分入口部署示例 |
| `public/` | 网站静态资源与生成的投稿 Skill 包 |
| `docs/` | 网站管理说明与第三方许可 |

本地数据库、用户上传、邮件记录、真实环境变量、凭据、备份、设计验收截图、临时预览、依赖和构建输出均不在仓库中。演示脚本中的测试密码仅用于隔离测试，不是现有站点凭据。

## 已授权维护者的本地开发

以下命令只面向著作权人、维护者及已取得书面授权的人；操作说明不扩大 LICENSE 中的权限。

要求 Node.js **24.15 或更新的兼容版本**，使用 npm 和随仓库提供的锁文件。数据库采用单 Node 进程访问，不应以多个实例共写同一上传目录。

```sh
git clone https://github.com/IntMainJhy/SpaceYew.git
cd SpaceYew
npm ci
cp .env.local.example .env.local
npm run setup
npm run dev
```

默认本地入口为 `http://127.0.0.1:3008/`。此仓库本身就是网站根目录，无需再进入 site-v1 子目录。如果已有环境文件，不要覆盖它。

`APP_DATA_DIR` 默认位于应用目录之外的 `../.site-v1-data`，可设置为其他私有绝对路径。首次初始化创建随机管理员凭据文件 `initial-admin.txt`，仅存放在实际数据目录；已有数据不会因重复 setup 自动重置。不要上传该文件、数据库或真实配置。

本地环境模板只包含 loopback URL 与 Cookie 配置。需要邮件功能时，参照 [.env.example](.env.example) 配置 SMTP；本机 capture 模式只用于联调。真实 SMTP 投递、备份恢复及正式部署需在目标环境单独验证。

```sh
npm test
npm run typecheck
npm run build
npm start
```

HTTP 集成脚本位于 `test/`，使用临时数据目录执行；运行前确认测试端口未被开发服务占用。演示播种与数据刷新脚本不会由常规测试自动执行，应只对明确指定的测试数据运行。

## 部署与管理

- [平台/管理分入口部署](deploy/README-split.md)
- [管理中心说明](docs/管理中心说明.md)
- 配置示例：[平台](deploy/platform.env.example)、[管理](deploy/admin.env.example)、[Nginx](deploy/nginx-split.conf.example)。

正式环境须使用独立私有数据目录、正确的 HTTPS URL、Secure Cookie 及可信代理配置。客户端链接、备案展示、账号与邮件设置需与实际站点一致；代码中的默认资料与备案标识不可作为其他站点的授权证明。

## 许可与授权

原创部分按 [SpaceYew 网站源码阅读与学习许可 1.0](LICENSE) 提供，仅供阅读学习，其他使用需要事先书面授权。可通过 [IntMainJhy](https://github.com/IntMainJhy) 的公开联系渠道申请，说明用途、修改范围、部署范围及商业情况。

第三方材料继续适用各自许可，参见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
