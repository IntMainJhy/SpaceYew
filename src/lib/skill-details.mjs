import {curatedSkills} from './skill-catalog.mjs';

export const skillDetailContent={
 'react-best-practices':{
  features:['按影响优先级检查数据瀑布、服务端取数、客户端渲染和包体积。','把性能规则用于代码审查与重构，帮助判断应该先改哪里。'],
  scenarios:'适合 Next.js 页面加载慢、React 重渲染过多，或上线前需要检查取数与打包方式的项目。',
  requirements:'需要一个 React 或 Next.js 项目；此 Skill 提供工程规则，不会替代性能测量。',
 },
 'composition-patterns':{
  features:['用组合组件、Context 和状态提升替代不断增加的布尔参数。','围绕组件职责与公开 API 重组代码，并参考 React 19 的相关变化。'],
  scenarios:'适合一个组件承载太多变体、多个页面重复相同交互，或准备建立可复用组件库时使用。',
  requirements:'面向 React 组件；采用建议前，需要结合项目的 React 版本与现有 API。',
 },
 'frontend-design':{
  features:['从产品主题和受众出发，明确视觉方向、字体、配色与布局。','指导编写前端界面，把设计选择落实到可以运行的页面。'],
  scenarios:'适合新建落地页、制作作品集，或希望现有界面形成明确视觉风格的改版任务。',
  requirements:'提供产品背景、页面目标和现有设计约束；实际实现依赖所用的前端技术栈。',
 },
 impeccable:{
  features:['用审查、排版、布局、适配等指令检查并改善现有界面。','把产品与设计约束保存在项目中，支持持续修改时维持视觉一致。'],
  scenarios:'适合功能已完成但界面粗糙、手机布局不协调，或需要持续打磨可用性与设计细节的网站。',
  requirements:'安装器使用 Node.js / npx；引擎首次运行可能下载对应平台的二进制文件，工具可能要求确认项目钩子。',
 },
 'ui-ux-pro-max':{
  features:['检索配色、字体组合、交互规则、图表和技术栈相关设计建议。','围绕页面目标生成设计系统建议，帮助比较和选择实现方向。'],
  scenarios:'适合需要从零确定界面规范、比较视觉方案，或按前端框架查找具体设计建议的任务。',
  requirements:'CLI 安装需要 Node.js / npm；本地搜索脚本需要 Python 3，使用标准库。',
 },
 'systematic-debugging':{
  features:['先复现并收集日志与边界证据，再沿调用链定位根因。','将猜测变成可检验的假设，完成最小修复后再验证原问题。'],
  scenarios:'适合修了又出现的 Bug、环境相关故障，以及在多个模块之间难以定位的问题。',
  requirements:'提供可复现步骤、报错和相关代码；工具需要访问项目使用的测试或日志。',
 },
 'test-driven-development':{
  features:['先写能暴露目标行为的失败测试，再写满足测试的实现。','按失败、通过、重构的顺序推进，保留可执行的回归检查。'],
  scenarios:'适合新增业务行为、修复已知缺陷，或对需要保持行为一致的模块做重构。',
  requirements:'项目需要可运行的测试命令；此 Skill 约束开发流程，不附带通用测试框架。',
 },
 'webapp-testing':{
  features:['通过 Python Playwright 操作本地网页，检查交互和页面状态。','采集浏览器日志、截图和页面信息，辅助复现与验证 Web 问题。'],
  scenarios:'适合表单提交、导航、动态页面和本地 Web 功能的浏览器验证。',
  requirements:'本地脚本需要 Python、Playwright 与对应浏览器；需要启动被测网站。',
 },
 docx:{
  features:['创建、读取和修改 Word 文档，处理段落样式、表格和图片。','支持修订、批注及已有文档的结构调整，并附有处理脚本与参考资料。'],
  scenarios:'适合制作报告、编辑正式文稿，或在已有 Word 文档中保留格式地修改内容。',
  requirements:'使用原项目列出的 Claude 插件或服务入口；文档脚本与转换工具的依赖见官方资料。',
 },
 pdf:{
  features:['提取 PDF 的文字与表格，完成拆分、合并、旋转和生成。','根据任务处理 PDF 表单、扫描件与 OCR 等文档工作流。'],
  scenarios:'适合整理多份 PDF、提取研究资料、填写表单，或把扫描内容转换为可处理的信息。',
  requirements:'使用原项目列出的 Claude 插件或服务入口；扫描件与加密文档可能需要额外工具或授权密码。',
 },
 pptx:{
  features:['创建和修改演示文稿，处理页面版式、模板、图片与图表。','读取已有幻灯片及演讲备注，支持重排内容与结合渲染结果检查页面。'],
  scenarios:'适合制作项目汇报、演讲材料，或在已有 PowerPoint 模板中更新内容。',
  requirements:'使用原项目列出的 Claude 插件或服务入口；本地生成与预览工具以官方依赖说明为准。',
 },
 xlsx:{
  features:['读取、清洗和修改工作簿与 CSV 数据，设置公式、格式和图表。','根据任务检查公式结果与表格结构，生成可继续编辑的电子表格。'],
  scenarios:'适合清洗杂乱数据、制作分析工作簿，以及批量更新已有 Excel 表格。',
  requirements:'使用原项目列出的 Claude 插件或服务入口；公式重算等操作需要对应运行工具。',
 },
 'obsidian-markdown':{
  features:['编写 Obsidian 的双向链接、嵌入、提示块和属性。','在保留 Obsidian 语法的前提下组织 Markdown 笔记与知识关系。'],
  scenarios:'适合维护个人知识库、整理项目笔记，或把零散资料写成可互相链接的文档。',
  requirements:'需要可读写的 Markdown 笔记目录；在 Obsidian 中查看专用语法的呈现效果。',
 },
 'json-canvas':{
  features:['用 JSON 表达画布节点、连接、分组与位置。','创建或修改 .canvas 文件，检查连接引用与文件结构是否有效。'],
  scenarios:'适合制作思维导图、研究关系图和项目流程图，并在支持 JSON Canvas 的工具中继续编辑。',
  requirements:'需要能够打开 JSON Canvas 的应用，例如 Obsidian；此 Skill 编辑文件，不是独立画布应用。',
 },
 'mcp-builder':{
  features:['规划 MCP 工具的接口、输入输出、错误处理与服务连接方式。','提供 Python 与 TypeScript 实现路径，并指导测试工具调用。'],
  scenarios:'适合把团队 API、内部系统或外部服务封装成 AI 助手可以调用的工具。',
  requirements:'按选用方案配置 Python 或 Node.js / TypeScript；外部 API 凭据与运行权限需要自行配置。',
 },
 'skill-creator':{
  features:['将重复任务写成包含触发描述、步骤和配套资料的 Skill。','用测试提示、评估与结果比较改进 Skill 内容及触发准确性。'],
  scenarios:'适合沉淀团队工作流程、制作个人常用 Skill，或改进已有 Skill 的稳定性。',
  requirements:'准备具有代表性的任务与期望结果；自动评估能力取决于所用工具和相关脚本环境。',
 },
};

const terminal='项目目录的终端',chat='AI 工具的对话输入框';
const cliGuide='https://github.com/vercel-labs/skills/blob/main/docs/agents.md';
const reload='完成后重启工具或开启新会话，在任务中明确提及该 Skill。';
const cliRequirements='需要 Node.js 22.20 或更高版本。命令只选择当前 Skill，按安装器提示确认项目内的安装位置。';
const tool=(id,label,where,commands,note,sourceUrl)=>({id,label,where,commands,note,sourceUrl});

export function skillInstallation(skill){
 const root='https://github.com/'+skill.repo;
 if(skill.repo==='vercel-labs/agent-skills'||skill.repo==='kepano/obsidian-skills'){
  const name=skill.repo==='vercel-labs/agent-skills'?'vercel-'+skill.id:skill.id;
  const agents=skill.repo==='kepano/obsidian-skills'?[['claude-code','Claude Code'],['codex','Codex'],['opencode','OpenCode']]:[['claude-code','Claude Code'],['codex','Codex'],['cursor','Cursor'],['gemini-cli','Gemini CLI']];
  return {supportNote:'下列工具由 Skills CLI 的支持列表确认；实际任务效果取决于模型、项目与所需运行环境。',requirements:cliRequirements,after:reload,methods:agents.map(([id,label])=>tool(id,label,terminal,[`npx skills add ${skill.repo} --skill ${name} -a ${id}`],'通过 Skills CLI 安装到所选工具；原项目还提供其他安装方式。',cliGuide))};
 }
 if(skill.repo==='anthropics/skills'){
  const proprietary=skill.license==='专有条款',bundle=proprietary?'document-skills':'example-skills';
  return {supportNote:'下列入口来自 Anthropic 官方说明。Claude.ai 与 API 的可用性取决于账号方案和服务功能。',requirements:proprietary?'此 Skill 采用专有条款，请通过官方列出的插件或服务使用，并先查阅许可。':'Claude Code 需要支持插件功能；插件按整组安装，包含当前 Skill。',after:reload,methods:[
   tool('claude-code','Claude Code',chat,['/plugin marketplace add anthropics/skills',`/plugin install ${bundle}@anthropic-agent-skills`],'依次运行两条指令，安装官方插件组；组内还包含其他 Skill。',skill.installUrl),
   tool('claude-ai','Claude.ai','Claude 网页设置',[],proprietary?'在 Settings > Capabilities 开启代码执行与文件创建，然后在对话中上传文件并提出文档任务；Claude 会按任务使用内置文档 Skill。':'先开启代码执行与文件创建。把官方仓库中该 Skill 的完整文件夹打包为 ZIP，再到 Customize > Skills，点击 +、Create skill、Upload a skill，上传并启用。','https://support.claude.com/en/articles/12512180-use-skills-in-claude'),
   tool('claude-api','Claude API','开发者的 API 集成',[],proprietary?'在 API 请求中按官方指南使用 Anthropic 预置的文档 Skill，并配置所需的执行工具。':'按官方 API 指南上传自定义 Skill，并在请求中配置所需的执行工具。','https://platform.claude.com/docs/en/build-with-claude/skills-guide'),
  ]};
 }
 if(skill.repo==='obra/superpowers')return {supportNote:'原项目明确提供 Claude Code、Codex 和 Cursor 的插件入口；这里安装的是包含当前 Skill 的完整 Superpowers 插件。',requirements:'先安装并登录对应 AI 工具，插件功能需要工具版本支持。',after:reload,methods:[
  tool('claude-code','Claude Code',chat,['/plugin install superpowers@claude-plugins-official'],'从 Claude Code 官方插件市场安装 Superpowers。',root+'#claude-code'),
  tool('codex-app','Codex App','工具的插件设置',[],'从 Codex App 侧栏的插件入口搜索 Superpowers，并选择安装。',root+'#codex-app'),
  tool('codex-cli','Codex CLI',chat,['/plugins'],'输入指令后搜索 Superpowers，并选择安装。',root+'#codex-cli'),
  tool('cursor','Cursor',chat,['/add-plugin superpowers'],'在 Cursor Agent 对话中安装，或在插件市场搜索 Superpowers。',root+'#cursor'),
 ]};
 if(skill.repo==='pbakaus/impeccable')return {supportNote:'以下为原项目安装器明确支持的常用工具；完整名单与项目钩子说明见原项目。',requirements:'在项目根目录运行，准备 Node.js / npx，并按工具提示处理项目信任与钩子权限。',after:'安装完成后重新打开 AI 工具，再在对话中运行 /impeccable init 记录项目背景。',methods:[['claude','Claude Code'],['codex','Codex'],['cursor','Cursor'],['gemini','Gemini CLI']].map(([id,label])=>tool(id,label,terminal,[`npx impeccable install --providers=${id} --scope=project`],'安装到当前项目的对应工具目录；安装器可能按平台下载引擎。',root+'#installation'))};
 if(skill.repo==='nextlevelbuilder/ui-ux-pro-max-skill')return {supportNote:'以下为原项目明确支持的常用工具；还支持 Windsurf、GitHub Copilot、OpenCode 等，完整名单见原项目。',requirements:'需要 Node.js / npm 和 Python 3。第一条命令安装全局 CLI，第二条命令在项目根目录执行。',after:reload,methods:[['claude','Claude Code'],['codex','Codex CLI'],['cursor','Cursor'],['gemini','Gemini CLI']].map(([id,label])=>tool(id,label,terminal,['npm install -g ui-ux-pro-max-cli',`uipro init --ai ${id}`],'使用当前的 ui-ux-pro-max-cli 包；安装后可在 UI/UX 任务中直接调用该 Skill。',root+'#installation'))};
 throw new Error('Missing installation profile: '+skill.id);
}

export function getSkillDetail(id){
 const skill=curatedSkills.find(item=>item.id===id);
 return skill&&skillDetailContent[id]?{...skill,...skillDetailContent[id],installation:skillInstallation(skill)}:null;
}
