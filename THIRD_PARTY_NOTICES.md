# Third-party notices / 第三方材料与许可

## English

The repository's restrictive license applies only to original material for which the author holds the relevant rights. Third-party code, dependencies and derived portions retain their original licenses and the rights those licenses grant.

### SocialKit

The color palette and name-hashing approach in `src/components/FeedAvatar.tsx` are adapted from SocialKit by AnxForever, licensed under MIT.

The full notice is preserved in [docs/licenses/SocialKit-MIT.txt](docs/licenses/SocialKit-MIT.txt). The original MIT-licensed material remains under MIT; this project's restrictive license does not override it.

### Anx portfolio

`src/components/AnxPortfolio.tsx` and `src/app/anx-portfolio.css` adapt the profile-header / panel composition, handwritten arrow and layered SVG extrusion from [AnxForever/anx-portfolio](https://github.com/AnxForever/anx-portfolio) at commit `a7434847797658402d50fba29827eef246102bb7`, by Chánh Đại and Anx (MIT). The adapted portions remain under MIT; SpaceYew's restrictive license does not override those rights.

The complete [MIT notice](docs/licenses/anx-portfolio-MIT.txt) and [upstream brand policy](docs/licenses/anx-portfolio-BRAND.md) are retained. Original author names, portraits, wordmarks, personal facts and contribution data are replaced by the signed-in member's content and SpaceYew's original pixel alphabet. This is a SpaceYew template adaptation, not the complete upstream Next.js application or an endorsement.

### React Flow

The blog editor uses `@xyflow/react` (MIT) for viewport gestures, node selection and dragging. Copyright and full MIT notice are preserved in [docs/licenses/React-Flow-MIT.txt](docs/licenses/React-Flow-MIT.txt). The public portfolio layout remains independent of canvas coordinates.

### Three.js

The homepage glass renderer uses Three.js, GLTFLoader and the procedural RoomEnvironment (MIT). The [complete license](docs/licenses/Three.js-MIT.txt) is retained. The glass GLB is an original extrusion of SpaceYew's existing folded-plane symbol; no Ego Lite model or environment image is included.

### npm dependencies

`package.json` and `package-lock.json` record website dependencies and versions. Dependencies are installed through npm; `node_modules` is not distributed in this repository. Their licenses, copyright notices and usage conditions are governed by each package and upstream project, including GSAP's upstream terms. This project's license neither grants nor restricts independent rights in those dependencies.

### Images and demo content

`public/images/` contains original project SVGs and AI-generated demo images. Demo images do not represent real members, photographed experiences or third-party endorsements. Publication of this repository grants no additional rights to third-party user content, personal profiles, brand identifiers or content at linked destinations.

macOS and Windows client source code, installers and proprietary assets are not published in this repository.

## 简体中文

本仓库的限制性许可仅适用于作者拥有相应权利的原创部分。第三方代码、依赖及其衍生部分继续适用原许可，不因本仓库的许可而失去原有权利。

### SocialKit

`src/components/FeedAvatar.tsx` 中的配色和名称哈希方案改编自 SocialKit，原作者为 AnxForever，原许可为 MIT。

完整声明保留于 [docs/licenses/SocialKit-MIT.txt](docs/licenses/SocialKit-MIT.txt)。其中受 MIT 许可的原始材料继续按 MIT 许可使用；本项目不以限制性许可覆盖这些材料。

### Anx portfolio

`src/components/AnxPortfolio.tsx` 与 `src/app/anx-portfolio.css` 改编自 [AnxForever/anx-portfolio](https://github.com/AnxForever/anx-portfolio) 的头像与标题布局、Panel 组合、手绘箭头及分层 SVG 立体效果，固定来源提交为 `a7434847797658402d50fba29827eef246102bb7`，原作者为 Chánh Đại、Anx，许可为 MIT。改编部分仍适用 MIT，本项目的限制性许可不覆盖其原有权利。

完整保留 [MIT 声明](docs/licenses/anx-portfolio-MIT.txt) 与 [上游品牌政策](docs/licenses/anx-portfolio-BRAND.md)。原作者的头像、字标、个人事实与贡献记录没有引入；替换为当前成员自己的内容与 SpaceYew 原创像素字母。此处为适配后的平台模板，不代表完整上游 Next.js 应用或原作者背书。

### React Flow

博客编辑器使用 MIT 许可的 `@xyflow/react` 实现画布平移、缩放、卡片选择与拖动。完整版权及许可保留于 [docs/licenses/React-Flow-MIT.txt](docs/licenses/React-Flow-MIT.txt)。公开博客的阅读排版独立于编辑画布坐标。

### Three.js

首页玻璃背景使用 MIT 许可的 Three.js、GLTFLoader 与程序化 RoomEnvironment，保留[完整许可](docs/licenses/Three.js-MIT.txt)。玻璃 GLB 基于 SpaceYew 现有折叠形标志原创建模，未引入 Ego Lite 的模型或环境图片。

### npm 依赖

`package.json` 和 `package-lock.json` 记录网站依赖及版本。依赖通过 npm 安装，`node_modules` 不在本仓库分发；依赖包的许可、版权与使用条件以各包及其上游项目附带的声明为准，包括 GSAP 的上游许可。项目自身的许可不授予或限制这些依赖的独立权利。

### 图片与示例内容

`public/images/` 包含项目自制 SVG 与 AI 生成的示例图片。示例图片不表示真实成员、实拍经历或第三方背书。第三方用户内容、个人资料、品牌标识及链接目标的内容不因本仓库公开而获得额外使用授权。

macOS、Windows 客户端源码、安装包与专有资源不在本仓库发布。
