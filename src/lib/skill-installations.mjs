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

// Tool labels follow the setup paths documented in the directory, not an exhaustive compatibility claim.
export const skillAiTools=[
 {id:'codex',label:'Codex'},
 {id:'claude-code',label:'Claude Code'},
 {id:'cursor',label:'Cursor'},
 {id:'gemini-cli',label:'Gemini CLI'},
 {id:'opencode',label:'OpenCode'},
 {id:'claude-ai',label:'Claude.ai'},
 {id:'claude-api',label:'Claude API'},
];
const aliases={claude:'claude-code','codex-app':'codex','codex-cli':'codex',gemini:'gemini-cli'};
export function skillSupportedTools(skill){
 const methods=new Set(skillInstallation(skill).methods.map(method=>aliases[method.id]||method.id));
 return skillAiTools.filter(tool=>methods.has(tool.id));
}
