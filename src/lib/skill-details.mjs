import {skillInstallation} from './skill-installations.mjs';
import {curatedSkills} from './skill-catalog.mjs';
import {skillUsage} from './skill-usage.mjs';

export const skillDetailContent={
  "react-best-practices": {
    "features": [
      "按影响优先级检查数据瀑布、服务端取数、客户端渲染和包体积。",
      "把性能规则用于代码审查与重构，帮助判断应该先改哪里。"
    ],
    "scenarios": "适合 Next.js 页面加载慢、React 重渲染过多，或上线前需要检查取数与打包方式的项目。",
    "requirements": "需要一个 React 或 Next.js 项目；此 Skill 提供工程规则，不会替代性能测量。"
  },
  "composition-patterns": {
    "features": [
      "用组合组件、Context 和状态提升替代不断增加的布尔参数。",
      "围绕组件职责与公开 API 重组代码，并参考 React 19 的相关变化。"
    ],
    "scenarios": "适合一个组件承载太多变体、多个页面重复相同交互，或准备建立可复用组件库时使用。",
    "requirements": "面向 React 组件；采用建议前，需要结合项目的 React 版本与现有 API。"
  },
  "impeccable": {
    "features": [
      "用审查、排版、布局、适配等指令检查并改善现有界面。",
      "把产品与设计约束保存在项目中，支持持续修改时维持视觉一致。"
    ],
    "scenarios": "适合功能已完成但界面粗糙、手机布局不协调，或需要持续打磨可用性与设计细节的网站。",
    "requirements": "安装器使用 Node.js / npx；引擎首次运行可能下载对应平台的二进制文件，工具可能要求确认项目钩子。"
  },
  "ui-ux-pro-max": {
    "features": [
      "检索配色、字体组合、交互规则、图表和技术栈相关设计建议。",
      "围绕页面目标生成设计系统建议，帮助比较和选择实现方向。"
    ],
    "scenarios": "适合需要从零确定界面规范、比较视觉方案，或按前端框架查找具体设计建议的任务。",
    "requirements": "CLI 安装需要 Node.js / npm；本地搜索脚本需要 Python 3，使用标准库。"
  },
  "systematic-debugging": {
    "features": [
      "先复现并收集日志与边界证据，再沿调用链定位根因。",
      "将猜测变成可检验的假设，完成最小修复后再验证原问题。"
    ],
    "scenarios": "适合修了又出现的 Bug、环境相关故障，以及在多个模块之间难以定位的问题。",
    "requirements": "提供可复现步骤、报错和相关代码；工具需要访问项目使用的测试或日志。"
  },
  "test-driven-development": {
    "features": [
      "先写能暴露目标行为的失败测试，再写满足测试的实现。",
      "按失败、通过、重构的顺序推进，保留可执行的回归检查。"
    ],
    "scenarios": "适合新增业务行为、修复已知缺陷，或对需要保持行为一致的模块做重构。",
    "requirements": "项目需要可运行的测试命令；此 Skill 约束开发流程，不附带通用测试框架。"
  },
  "obsidian-markdown": {
    "features": [
      "编写 Obsidian 的双向链接、嵌入、提示块和属性。",
      "在保留 Obsidian 语法的前提下组织 Markdown 笔记与知识关系。"
    ],
    "scenarios": "适合维护个人知识库、整理项目笔记，或把零散资料写成可互相链接的文档。",
    "requirements": "需要可读写的 Markdown 笔记目录；在 Obsidian 中查看专用语法的呈现效果。"
  },
  "json-canvas": {
    "features": [
      "用 JSON 表达画布节点、连接、分组与位置。",
      "创建或修改 .canvas 文件，检查连接引用与文件结构是否有效。"
    ],
    "scenarios": "适合制作思维导图、研究关系图和项目流程图，并在支持 JSON Canvas 的工具中继续编辑。",
    "requirements": "需要能够打开 JSON Canvas 的应用，例如 Obsidian；此 Skill 编辑文件，不是独立画布应用。"
  },
  "gsap-core": {
    "features": [
      "理解 to、from、fromTo 的起止状态，避免重复动画和样式覆盖。",
      "通过 matchMedia 适配屏幕尺寸与减少动态效果设置。"
    ],
    "scenarios": "适合按钮反馈、列表进入、抽屉展开等需要运行时控制的界面动画。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-timeline": {
    "features": [
      "通过位置参数与标签安排并行动画、等待和嵌套时间线。",
      "用统一的播放控制处理打开、关闭和中途反向。"
    ],
    "scenarios": "适合多步骤介绍、导航展开，以及多个元素需要一起响应的状态切换。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-scrolltrigger": {
    "features": [
      "设置 start、end、scrub 与 pin，让动效对应真实滚动距离。",
      "在图片加载、尺寸变化和组件卸载时刷新或清理触发器。"
    ],
    "scenarios": "适合产品故事、分段演示与滚动叙事；移动端需要独立检查阅读和滚动体验。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-plugins": {
    "features": [
      "区分布局过渡、拖拽、文字拆分与 SVG 动画各自需要的插件。",
      "检查插件注册与销毁，避免重复包裹文字或残留事件监听。"
    ],
    "scenarios": "适合筛选后的布局变换、可拖拽界面和复杂文字动效；按实际需求安装运行依赖。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-react": {
    "features": [
      "用 useGSAP 或 gsap.context 将动画限定在组件范围内。",
      "在依赖变化与卸载时回收动画，避免 SSR 期间访问浏览器对象。"
    ],
    "scenarios": "适合 React 动态列表、页面进入和已有 GSAP 代码的生命周期修复。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-performance": {
    "features": [
      "优先变换属性，避免循环读写布局，并控制 will-change 的范围。",
      "围绕真实设备上的性能记录检查触发器数量和动画开销。"
    ],
    "scenarios": "适合长列表动效、滚动卡顿和低性能设备上的交互优化。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-frameworks": {
    "features": [
      "把动画放到 DOM 可用的挂载阶段，并遵循框架的更新机制。",
      "组件卸载时恢复样式并清理监听，避免跨页面残留。"
    ],
    "scenarios": "适合 Vue 与 Svelte 页面过渡、动态区块和服务端渲染应用的动效接入。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "gsap-utils": {
    "features": [
      "将输入范围映射成动画数值，组合 clamp、mapRange 与 interpolate。",
      "用 snap、wrap 和选择器工具处理边界、循环与元素集合。"
    ],
    "scenarios": "适合指针跟随、进度映射、轮播循环和拖拽吸附的计算逻辑。",
    "requirements": "需要可运行的前端项目及 GSAP。Skill 安装不会自动替项目安装动画依赖；GSAP 运行库与插件适用其自身许可。"
  },
  "vibehub": {
    "features": [
      "保留需求原意，只补充影响实现判断的少量准确术语。",
      "用脱敏后的短术语查询词条，引用解析器真实返回的链接。"
    ],
    "scenarios": "适合向 AI 描述界面交互、澄清含糊需求，或理解 Agent 回复中的技术表达。",
    "requirements": "需要 Node.js 20 或更高版本及网络连接。查询只发送脱敏短术语，不应发送源代码、密钥或整段项目需求。"
  }
};

export function getSkillDetail(id){
 const skill=curatedSkills.find(item=>item.id===id);
 return skill&&skillDetailContent[id]&&skillUsage[id]?{...skill,...skillDetailContent[id],...skillUsage[id],installation:skillInstallation(skill)}:null;
}
