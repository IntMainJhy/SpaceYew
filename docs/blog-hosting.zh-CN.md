# 博客主页与既有静态托管

## 当前博客入口

`/blogs` 直接展示站长已公开的个人资料、经历、技能与作品，使用 Anx Portfolio 排版。主导航、语言切换和网站页脚保留；不展示主页管理导航、导出、草稿预览、主题选择、上传设置或发布面板。

旧地址 `/workspace/blog`（包括 `?template=anx`）、`/workspace/studio`、`/workspace/preview`、`/workspace/profile`、`/workspace/library`、`/workspace/files`、`/workspace/insights`、`/workspace/connect` 和 `/my-space` 统一跳转到 `/blogs`。已登录访客也看到站长公开主页，不会把自己的私有草稿当作展示内容。

站长原有 `/blog/<handle>` 分享地址继续有效，并展示相同的 Anx Portfolio 风格。原作者源码改编说明与许可保留在页面底部及 [第三方声明](../THIRD_PARTY_NOTICES.md)。

## 数据与权限

展示内容仍来自既有公开资料与审核后的内容。此变更只调整页面入口和站长主页的呈现，不重写账号资料、内容、审核快照、上传文件或数据库中的旧主题设置。下架、投诉冻结或账号限制仍使主页不可公开访问。页面内作品链接继续进入其公开详情。

既有成员 `/blog/<handle>`、静态网站包、账号隔离、后台审核和 API 保持兼容。主博客入口不再提供成员建站编辑器；需要处理既有资料时使用已授权的后台或工具 API。

## 既有静态网站兼容

已有托管网站仍在无同源权限的沙箱 iframe 内运行，支持 HTML 或 ZIP 静态构建结果。单页最大 5 MiB，ZIP 最大 25 MiB、解压后 50 MiB；网站根目录包含 index.html，素材使用相对路径。平台不执行用户仓库构建或 Next.js 服务端程序。预览令牌仍绑定会话；审核后的版本才可公开，举报和下架同步生效。

原始上传包不会公开提供下载。每账号 1 GB 存储额度及最多 20 个网站版本等现有约束不变。

## 来源与许可

Anx 模板适配自 [anx-portfolio](https://github.com/AnxForever/anx-portfolio/tree/a7434847797658402d50fba29827eef246102bb7)，保留头像与标题网格、细线分区、分层像素签名的结构。签名和资料均使用站点自己的内容，不引入原作者的个人身份、头像或虚构贡献记录。完整 [MIT 声明](licenses/anx-portfolio-MIT.txt) 与 [品牌政策](licenses/anx-portfolio-BRAND.md) 已保留；SpaceYew 的限制性许可不覆盖第三方原有权利。

[English guide](blog-hosting.md)
