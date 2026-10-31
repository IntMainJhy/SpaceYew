# Ego / Lusion 公开运行与 REA 分析（2026-10-31）

## 方法与范围

使用已有 REA CLI 6.8.0（无需下载），Ego browser TaskSpace 43 对两站进行公开页面观察、滚动和截图；只抓公开同源 JS/CSS，保存在本机临时研究目录，未登录第三方、未执行下载的 bundle、未把第三方资产加入 SpaceYew。浏览器空间已关闭。

REA 对捕获的发布代码做静态解析。这不是网站原始工程、完整源码恢复、像素级还原或物理仿真的证明。原始运行 JSON、来源 URL 与 SHA256 留存在本机研究目录 `/tmp/spaceyew-reference-research/` 中。

## Ego：已观察到的实际实现

- 页面使用 Next/Turbopack 发布包；3D 包含明确 React Three Fiber 指纹（R3F Canvas/frameloop/dpr）。首页使用真实 GLB、EXR 环境，页头还加载一个 glass-logo.webp 小图作为交接/降级。
- 浏览器实际请求 ego.glb...gz 和 GSG_PRO_STUDIOS_METAL_043_tiny...exr。GLB 代码会读取 Camera1 和 scrollani 动画，再把滚动进度应用到动画时间。
- 材质代码设置 transmission、IOR、thickness、roughness、envMapIntensity、dispersion。环境 EXR 被旋转，手指/鼠标相机运动是阻尼式。光照有环境光、方向光、点光；反射并非两根可见灯管。
- 后处理链包含 bloom（mipmap blur）、noise、色差；画布还按进度施加 blur。发布代码有明确首尾参数并进行插值，例首屏 transmission=1、IOR=1.3、thickness=.1、envIntensity=2.4、bloom=3；终点 IOR=1.7、thickness=.33、bloom=1.5。这些是该站测得值，不能在不同模型/色彩管线中直接照搬。
- 显示与交互状态切换 always/demand frameloop；3D不可见或切换工作区时让出渲染。背景深蓝→饱和蓝→浅色，主反射沿曲面形成宽窄有变化的渐隐边缘。视觉中心是单一大型玻璃装置，文字短、居中、留白大。
- 当前首屏截图中的 DOM 标题为 Mona Sans 600，28px；下文标题为64px。页面实际滚动发生在内部 div，不是 window.scrollY，已用真实 wheel 验证。

证据代码为 Ego 当前公开发布包中的 0dkni3x5isykl.js 与 00iviq-99lfrh.js；运行记录、来源 URL 与 SHA256 留在本机研究目录 `/tmp/spaceyew-reference-research/`，不把官网发布代码与资产随本站分发。

## Lusion About：已观察到的实际实现

- 当前公开页面为 Astro 发布（/_astro/），运行画布 data-engine 与 window.__THREE__ 均为 three.js r158。不是视频背景，运行有3个canvas；主画布有真实WebGL运动，页面为自定义滚动管理。
- 主发布包保留可读类名：AboutHeroParticlesSimulation、AboutHeroLightField、AboutHeroScatter、AboutHeroFog、AboutHeroHalo、AboutHeroGround、AboutHeroFaces、AboutPageHeroEfxPrepass、Bloom、ScreenPaintDistortion、Smaa。
- 粒子模拟用浮点 render target 的双缓冲，模拟纹理128×192（手机128×128）；光场有64³网格；雾层为32个实例，使用定制shader采样灯光/场景纹理。Hero有motion blur预通道，整体还有抗锯齿、Bloom与屏幕交互扭曲。
- 视觉呈现来自多层：近中远粒子大小/模糊、明暗对比、局部高光、雾、散射、镜头运动与大比例文字。没有证据表明当前About每一帧都进行完整真实光线追踪；不能把可见效果归因于单个Bloom或一个Blender模型。

证据代码：lusion/js/hoisted.CUO_IjfL.js（公开URL https://lusion.co/_astro/hoisted.CUO_IjfL.js），SHA256 b453312bc9b3ae3bdd64b4e57231ed06cd2cef222a26379288925afb4ae57a37。

## REA 留存证据和局限

- Lusion：rea-lusion-evidence.json，父Evidence ev_95a1ad8adead97f5cb98f73a76cdf6754dada5764786d4a000a4afb382ee3c7f。选择主bundle 1.25MB，269557 AST节点，syntax完整、无解析失败；语义图受5000节点/500 unknown等边界限制，状态partial，不宣称整站行为图完整。
- Ego参数：rea-ego-params-evidence.json，父Evidence ev_5edd5e3db89ef624ee2ecb244c16f18eb8d0284cc3c35f62a285d35360c1ace8。选中49690字节参数bundle，11546 AST节点，syntax完整，语义受限。其余32文件只盘点，不隐式解析。
- Ego大型Three/R3F合包初次在45秒单文件provider deadline到期，未重复同一调用；保留原始错误/部分Evidence于 rea-ego-summary.json 与 rea-ego-partial-evidence.json，Evidence ev_7e6b4d09a05aabd709f4402fe221d4da95404f1bc7a2b607006dc4d384dcab36。此包的具体材质/环境/后期观察来自公开源码文本定位和真实网络/画面交叉验证，不冒称由完整REA语义图推导。

## 给 SpaceYew 的可执行方向（推断/建议）

1. 让模型表面的反射表现灯光：把摄影棚大柔光面、暗反射卡放到环境贴图/PMREM中；主场景不摆两条可见的长直发光线。用曲面法线、厚度、倒角和环境层次塑造宽高光与暗部。
2. 先把无后期的灯光/模型调好，再加入克制的高光溢出和微弱色差；Bloom只能扩散已有高光，不会补出正确形体和折射。避免同时过度曝光、强色差、大blur造成乳白塑料感。
3. 摄影机、模型、背景、文字按一个统一滚动时间轴插值，导航接管只改变几何位置/大小，不突然换一套假光影；无交互时休眠，手机降低像素与后处理预算。
4. 使用已有 Blender + Three.js + GSAP 即可进行本轮改造；REA也已缓存可用。没有证据要求为当前目标再安装Houdini、Redshift、Unity、Ghidra。真正需要额外资源时优先自制合法HDR摄影棚，而非复制参考站EXR。

## 可用的官方/作者教程

- Three.js 物理玻璃材质： https://threejs.org/docs/pages/MeshPhysicalMaterial.html （透射、IOR、厚度、色散；官方明确建议环境贴图）
- Three.js 环境预过滤： https://threejs.org/docs/pages/PMREMGenerator.html
- Three.js 摄影棚环境示例： https://threejs.org/docs/pages/RoomEnvironment.html
- Blender Area Light： https://docs.blender.org/manual/en/latest/render/lights/light_object.html （面积光大小、矩形/圆盘、柔影）；Cycles设置 https://docs.blender.org/manual/en/5.2/render/cycles/light_settings.html
- 创作者的玻璃/焦散实验拆解： https://tympanus.net/codrops/2026/08/31/volatile-nexus-tinkering-with-glass-caustics-cubes-and-sound-in-three-js/ （透射层用facing term加权，避免加法洗白；地面反射与法线变形）
- Lusion自述的创作流程与研发方法： https://tympanus.net/codrops/2026/04/13/lusion-where-digital-craft-meets-ambitious-experimentation/ （作者Lusion；说明每个项目采用独立技术/逻辑，而非固定模板）

历史补充 https://www.commarts.com/webpicks/lusion 描述了2019版本的Houdini/ThreeJS/Redshift管线；它不能证明2026当前页面一定使用同一工具，不能拿它当下载Houdini的必要依据。

## 验证与交付边界

参考研究截图与完整 REA 证据保留在本机临时研究目录，不作为本站可发布素材。网页重建保留本站原创模型与内容，借鉴环境布光、真实透射、明暗层次和滚动叙事的方法；不复制参考站模型、付费环境图或整段发布代码。

本站软接触影属于艺术近似，不能称为完整实时光线追踪焦散；去掉直接可见的光导与背景线状公式，不等于为页面加入昂贵的完整路径追踪。

## 本轮在 SpaceYew 的落地与验证

- 首屏删除直接可见的 Tube 光导、背景窄条/光柱与程序化焦散圆环；原创宽面柔光板与暗反射卡只进入独立摄影棚环境，通过 PMREM 参与真实模型的反射。
- 保留原创 GLB、体积透射、折射与克制色散。仅对反射高动态范围作平滑压缩，避免高光被裁成白片或让已映射的透射背景再次变灰。
- 中段 kinetic 装置同步移除可见发光面和装饰圆环，保留拖动、内容选择与暂停；原生模型、账号、三个既有内页背景及内容数据保留。
- 本轮没有照抄 Ego 的完整后处理链，也没有添加昂贵的完整路径追踪；接触影为明确的艺术近似。
- 后台空壳移除与保留能力详见 [后台功能链核查](admin-functionality-2026-10-31.md)。只清理无消费者的控件，不删除存储数据或兼容 API。
- 291 项单元测试、类型检查、生产构建与 18 组隔离 HTTP 回归通过；实际桌面/手机 WebGL、收拢、内容选择及暂停检查通过，无运行异常、破图或横向溢出。
- 独立成品复核裁定 **ship**，范围为本轮摄影棚光影、后台控件与页面查看；不代表参考站原工程恢复、像素复刻或完整生产审计。

## 玻璃通透与光谱效果追加优化

- 继续对照 Ego 首屏和约170px滚动状态：正面主要透出背景，白色高光集中在厚边；旋转与环境变化共同驱动高光迁移。
- 原照明没有使用滚动进度，现将滚动连接到环境三轴旋转、真实 `scene.environmentIntensity`、主/轮廓光、局部侧转与 IOR/厚度/色散；回滚可还原，减少动态时保持静止。r187 在材质继承 `scene.environment` 时以场景强度覆盖 `material.envMapIntensity`，因此不再靠无效的材质参数调光。
- 摄影棚减少正前方均匀填充，使用一次生成的原创64×64渐变柔光纹理，PMREM捕获后释放；保留高光白芯，避免硬矩形反射和泛灰正面。没有下载第三方环境图、增加依赖或更换GLB。
- 体积色散仍由 Three 原生 RGB/IOR 射线产生；为平滑背景补充倒角区域限定的环境折射取样，每通道增加一次环境采样。这是绕过屏幕空间限制的艺术近似，会忽略墙面对环境光的真实遮挡，不是完整路径追踪或焦散。
- 高光的角度相关彩边还使用光学薄膜虹彩辅助。薄膜干涉与体积色散是两个不同机制，不把所有彩色反射都归因为色散；页面文字和其它HTML内容没有全屏RGB错位。
- 光学回归增加同一时间不同滚动进度、逆向还原、减少动态、RGB环境取样的宏/模板保护与全局Three shader隔离检查。

## 按窄屏标注加强渐变与色散

- 首页顶部从原蓝色改为深藏蓝 `#070f29`，保留至约12svh后向亮蓝、浅冰色推进；Shader和无WebGL时的CSS渐变同步，顶部辅助光不再把深蓝洗浅。导航只在首页同步调整，以保持可读性。
- 增强摄影棚白芯和轮廓照明；色散取样改用倒角中等角度的带通窗口，正面和极掠射角归零。原增强在极掠射处会被原生Fresnel反射压过，导致参数存在但可见彩边很弱。
- 色散幅度有意高于常见物理玻璃，以便622px和手机宽度仍能观察到RGB分离，配合角度相关涂层彩边。这属于用户要求的艺术强化，不将其称为严格真实玻璃参数或完整光线追踪。
