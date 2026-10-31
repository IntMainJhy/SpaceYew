# 2026-10-31 死代码检查与清理

检查对象为本仓库的网站源代码、Next.js 入口、CLI/集成入口及测试。检查不读取站点数据库、上传文件或账号凭据，不涉及私有桌面客户端。

## 结果

- TypeScript 扩展检查初始发现 80 条未使用声明诊断，已通过删除不可达模块或移除未使用导入、参数绑定和变量处理。保留注册请求等有副作用的调用；未使用调用结果不等于可以删除调用。
- 移除 14 个不可达或已被替代的文件，详见下表；移除保留文件中孤立的 `OwnerBlog`、`SpaceConnect` 授权界面、旧展板渲染与分享实现、旧主题列表、`arrangeCanvasCards`、`restoreContentDraft`、旧策略哈希常量及未消费的品牌图标 URL 常量。
- 生成器与 `brand-icon.ts` 同步修改，重新生成不会还原未消费的 URL 常量。品牌测试继续检查实际渲染的导航符号 URL 的内容哈希，以及 PNG/ICO 规格和图像一致性。
- `tsconfig.json` 启用 `noUnusedLocals`、`noUnusedParameters`，让通常的类型检查也能阻止新增的未使用 TypeScript 局部声明。
- 测试直接使用的 `@xyflow/system` 已声明为固定版本的开发依赖；简历解析使用的 `jszip`、`pdfjs-dist`、`htmlparser2` 保留。

## 删除文件及证据

| 文件 | 删除原因 |
| --- | --- |
| `src/components/SpaceWorkspace.tsx` | 旧工作区各子入口已重定向至现有 `BlogEditor`，没有调用该组件的生产入口。 |
| `src/components/BlogStudio.tsx` | 仅旧工作区使用；现有博客编辑器不使用此实现。 |
| `src/components/SpaceFiles.tsx` | 仅旧工作区使用；文件后台和上传 API 保留。 |
| `src/components/SpacePublic.tsx` | 无调用入口；公开博客使用 `BlogPublic`。 |
| `src/components/SpaceStudio.tsx` | 无调用入口；旧展板编辑实现。 |
| `src/lib/space-labels.ts` | 删除上述旧展板渲染后不再有消费者。 |
| `src/components/ProductFeaturePreviews.tsx` | 当前首页没有引用旧产品预览组件。 |
| `src/components/ProductHomeMotion.tsx` | 仅其专用测试调用，没有生产消费者。 |
| `test/product-home-motion.test.mjs` | 仅覆盖已删除的旧首页动效实现。 |
| `src/components/PromotionBar.tsx` | `SitePromotion`/`PromotionBar` 均无生产消费者，仅专用测试调用。配置校验与存储兼容能力保留。 |
| `test/promotion-motion.test.mjs` | 仅覆盖已删除的旧推广条组件。 |
| `src/app/product-previews.css` | 选择器只对应上述已删除的旧预览组件；从全局 layout 移除导入。 |
| `src/lib/site-appearance.mjs` | 常量 light 偏好改为服务端 HTML 属性，避免内联脚本 nonce 引发 hydration 不一致。 |
| `test/site-appearance.test.mjs` | 只测试已删除的常量脚本；light 属性的页面覆盖转入 `test/security-http.mjs`，原有 CSP/nonce 安全断言保留。 |

`SpaceBoard.tsx` 保留实际博客使用的 `SpaceVisit` 与 `SpaceData`；`SpaceConnect.tsx` 保留当前接入文档使用的 `ConnectDocs`。`validContentDraft` 及其畸形输入测试、画布受控移动测量回归等现有功能测试保留。两个仅测试未消费函数的用例随对应函数删除。

## 复核工具提示，避免误删

默认 Knip 扫描并不知道所有独立执行入口。`scripts/knip.config.mjs` 将以下入口明确加入开发和生产检查：

- `integrations/**/*.mjs`：本地 stdio MCP、旧名称兼容入口与投稿请求 CLI，不由网站页面导入。
- `scripts/*.mjs`：初始化、备份、恢复、清理、构建与维护 CLI；例如 `scripts/import-nginx.mjs` 可独立执行。
- `src/lib/resume-extract-worker.mjs`：由简历导入器启动的独立 Node 子进程。其动态导入的 PDF/Word 解析依赖不是无用依赖。

配置使用 `ignoreExportsUsedInFile: true`：在本模块实际调用的函数或常量并非死代码，即使其导出没有外部消费者，也不应整段删除。Next.js 插件负责框架约定入口。没有用全局忽略规则屏蔽未引用文件或依赖。

生产图仍提示一个仅测试引用的导出 `src/lib/spaces.mjs#blogEntry`。这是本次明确保留的旧博客选择兼容接口；相关测试覆盖成员自身主页、精选主页、下架及访问限制。公开博客 HTTP/API 和静态托管、内容审核及账号隔离能力不因旧组件移除而被删除。

## 可复现验证

在网站仓库根目录执行：

```sh
npm test
npm run typecheck
npx --yes knip@6.44.1 --config scripts/knip.config.mjs --no-progress
npx --yes knip@6.44.1 --config scripts/knip.config.mjs --no-progress --production
```

本次清理后执行结果：

- `npm test`：258 项通过，0 失败。初始 269 项中的 11 项只覆盖已删除的旧组件、未消费辅助函数或常量脚本；不是通过跳过失败用例取得通过。
- TypeScript `--noEmit --noUnusedLocals --noUnusedParameters --incremental false`：通过。
- Knip 6.44.1 完整依赖图：0 项问题，退出码 0。
- Knip 生产依赖图：仅上述保留的 `blogEntry` 导出提示，退出码 1；无未引用文件、未声明依赖或无用依赖提示。
- 差异空白检查通过。生产构建、HTTP 集成和实际浏览器检查由本次维护的其他验证步骤执行，不以此静态检查代替。

检查范围不包含通用 CSS 选择器覆盖率、所有静态资源的实际访问情况、Python 维护脚本的可达性或第三方依赖内部实现。动态执行、外部使用者与未来配置可能超出静态图；以上结果不代表能够数学证明整个项目绝对没有死代码。

## 补充 HTTP 复核：当前页面契约

以下五组追加复核已通过；前两组各自创建并清理临时数据，后三组只读访问本地 3009 服务，没有修改真实站点内容。

| 脚本 | 本次结果及覆盖 | 本机日志（不入库） |
| --- | --- | --- |
| `test/content-locales-http.mjs` | 隔离端口 3122。三种内容类型的三语言、元数据、搜索、缺失翻译回退、私有修改与发布隔离、管理员编辑权限及图片访问；首页/关于/求职页原有资料翻译检查保留，增加真实公开博客检查。四种旧主题 Cookie 均应使用统一 `x-social` 外观。 | `/tmp/spaceyew-maint-content-locales-http.log` |
| `test/promotions-http.mjs` | 隔离端口 3011。旧推广配置继续检查鉴权、持久化和危险 URL 拒绝；首页按当前行为不渲染已弃用的推广条。下载页待发布/可下载/清空状态、设置兼容保存、三语言、带账号密码的 URL 拒绝等断言保留。 | `/tmp/spaceyew-maint-promotions-http.log` |
| `test/locales-http.mjs` | 三语言集合标题、当前资源 Hub 标题/导航/搜索标签、`html.lang`、原始分类参数和管理登录文案。资源页已改为 Hub，测试不再要求旧 `<em>` 标语；使用实际 `translate`/`htmlLocale` 核对文案及语言，处理 HTML 文本转义。 | `/tmp/spaceyew-maint-locales-http.log` |
| `test/themes-http.mjs` | 30 个路由/旧偏好组合均使用统一外观，保留语言选择；旧主题 Cookie 不授予管理员访问权。 | `/tmp/spaceyew-maint-themes-http.log` |
| `test/skills-http.mjs` | 三语言下 30 个详情页、15 个工具筛选列表、6 个目录页面，以及筛选状态保留、可见选项、站点地图和不存在条目处理。 | `/tmp/spaceyew-maint-skills-http.log` |

只读复核命令显式使用本次服务地址：

```sh
LOCALE_TEST_URL=http://127.0.0.1:3009 node test/locales-http.mjs
THEME_TEST_URL=http://127.0.0.1:3009 node test/themes-http.mjs
TEST_PUBLIC_URL=http://127.0.0.1:3009 node test/skills-http.mjs
```

三项旧测试契约更新只涉及测试文件；上述补充复核没有新增运行时代码修改。

## 同次维护的运行修复与最终回归

- 修复开发模式下的水合不匹配：外观固定为 light，服务端直接输出两个 HTML 属性，移除不必要的带 nonce 内联脚本与警告抑制。中间件 CSP、每次请求独立的 nonce 及框架脚本安全断言保留。
- 博客导航与管理筛选栏的 Flex 对齐改用 `flex-start`/`flex-end`，消除编译兼容警告；清理不再存在的 `mammoth` 外部包配置。
- 生产构建成功，无编译警告；包含新增未使用声明规则的类型检查通过；完整依赖审计（含开发依赖）为 0 个已知漏洞。
- 共 17 组 HTTP 脚本通过：`integration`、`security-http`、`spaces-http`、`community-http`、`catalog-http`、`management-tools-http`、`learning-http`、`blog-http`、`blog-editor-http`、`resume-http`、`email-registration-http`、`split-login-http`，以及上表 5 组。写入型脚本使用独立临时数据目录；只读脚本显式指定本地预览服务。
- 另外维护了 `spaces-http`、`management-tools-http`、`learning-http` 的旧路由假设，按现有博客目录、已审快照、工作区重定向与资源子导航验证，保留账号隔离、固定审核版本、隐私、MCP、QR、文件过滤与授权断言。首页精选作者选择继续由 `blog-http` 检查。
- 桌面与 390px 手机浏览器检查首页、博客、社区、资源：未见控制台错误、运行异常、破图或横向溢出；已验证公开博客资料与头像正常加载。开发模式重载后无 Issues，生产预览通过。
- 未执行 `large-upload.mjs` 的默认 10GB 大文件压力检查；本次覆盖常规分片、恢复、媒体访问与权限流程。

站点资料与头像存储于私有数据库及文件目录，Git 源码导出包不包含这些数据。在新目录直接初始化会使用新库；继续使用既有资料时，应显式配置私有 `APP_DATA_DIR`，或经备份及校验后恢复到独立目录。数据库、上传、恢复备份、账号信息与真实环境配置始终不加入本次源码提交。
