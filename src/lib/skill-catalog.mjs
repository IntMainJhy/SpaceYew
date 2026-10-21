// Editorial directory: original summaries and links only; upstream skills are not bundled.
// Checked against each project's README, skill definition and license on this date.
import {skillAiTools,skillSupportedTools} from './skill-installations.mjs';
export {skillAiTools};
export const skillCatalogVerifiedAt='2026-10-21';
export const skillCategories=[
 {id:'engineering',label:'开发工程',description:'组件架构、代码质量与性能。'},
 {id:'design',label:'界面设计',description:'从视觉方向到界面细节。'},
 {id:'testing',label:'测试排错',description:'复现问题、定位根因、验证结果。'},
 {id:'documents',label:'文档办公',description:'处理文档、演示文稿与表格。'},
 {id:'knowledge',label:'知识管理',description:'把笔记和想法组织起来。'},
 {id:'agents',label:'Agent 扩展',description:'创建 Skill，连接外部工具。'},
];

/**
 * @param {string} id
 * @param {string} name
 * @param {string} category
 * @param {string} repo
 * @param {string} skillPath
 * @param {string} summary
 * @param {string[]} tags
 * @param {string} license
 * @param {string} licensePath
 */
function entry(id,name,category,repo,skillPath,summary,tags,license,licensePath){
 const root='https://github.com/'+repo;
 const skill={id,name,category,repo,summary,tags,license,sourceUrl:root+'/blob/main/'+skillPath,installUrl:root+'#installation',licenseUrl:root+'/blob/main/'+licensePath};
 return {...skill,tools:skillSupportedTools(skill)};
}
const anthropic=(id,name,category,summary,tags,proprietary=false)=>({...entry(id,name,category,'anthropics/skills','skills/'+id+'/SKILL.md',summary,tags,proprietary?'专有条款':'Apache-2.0','skills/'+id+'/LICENSE.txt'),installUrl:'https://github.com/anthropics/skills#try-in-claude-code-claudeai-and-the-api'});

export const curatedSkills=[
 entry('react-best-practices','React Best Practices','engineering','vercel-labs/agent-skills','skills/react-best-practices/SKILL.md','检查 React 与 Next.js 的数据请求、渲染和包体积，适合开发新功能或做性能优化。',['React','Next.js','Performance'],'MIT','skills/react-best-practices/SKILL.md'),
 entry('composition-patterns','Composition Patterns','engineering','vercel-labs/agent-skills','skills/composition-patterns/SKILL.md','用组合组件、Context 与状态提升整理复杂组件，适合重构组件 API 和建设组件库。',['React','Component API'],'MIT','skills/composition-patterns/SKILL.md'),
 anthropic('frontend-design','Frontend Design','design','帮助确定视觉方向、字体和布局，让新页面或改版拥有更鲜明的设计。',['UI','Typography']),
 entry('impeccable','Impeccable','design','pbakaus/impeccable','.agents/skills/impeccable/SKILL.md','围绕已有界面做审查、排版、响应式适配与细节打磨，适合持续改进网站体验。',['UI','Accessibility','Responsive'],'Apache-2.0','LICENSE'),
 entry('ui-ux-pro-max','UI UX Pro Max','design','nextlevelbuilder/ui-ux-pro-max-skill','.claude/skills/ui-ux-pro-max/SKILL.md','检索配色、字体搭配、交互规范与技术栈建议，适合搭建设计系统和比较设计方向。',['UI/UX','Design system','Python 3'],'MIT','LICENSE'),
 entry('systematic-debugging','Systematic Debugging','testing','obra/superpowers','skills/systematic-debugging/SKILL.md','按复现、收集证据、验证假设的顺序排查问题，适合反复出现的故障和难定位的错误。',['Debugging','Root cause'],'MIT','LICENSE'),
 entry('test-driven-development','Test-Driven Development','testing','obra/superpowers','skills/test-driven-development/SKILL.md','用先失败、再通过、再重构的测试流程约束实现，适合为新功能和修复建立回归保障。',['TDD','Regression'],'MIT','LICENSE'),
 anthropic('webapp-testing','Webapp Testing','testing','通过 Python 与 Playwright 检查本地网页交互、浏览器日志和截图，适合验证 Web 功能。',['Python','Playwright','Browser']),
 anthropic('docx','Word / DOCX','documents','创建、读取和修改 Word 文档，处理样式、图片、修订与批注，适合报告和正式文稿。',['Word','.docx'],true),
 anthropic('pdf','PDF','documents','提取文本和表格、拆分合并 PDF、处理表单与扫描件，适合资料整理和文档转换。',['PDF','Python','OCR'],true),
 anthropic('pptx','PowerPoint / PPTX','documents','创建或编辑演示文稿，处理模板、版式、备注与已有页面，适合汇报和演讲材料。',['PowerPoint','.pptx'],true),
 anthropic('xlsx','Excel / XLSX','documents','整理表格数据、编写公式并设置格式和图表，适合数据清洗、分析和工作簿制作。',['Excel','.xlsx','CSV'],true),
 entry('obsidian-markdown','Obsidian Markdown','knowledge','kepano/obsidian-skills','skills/obsidian-markdown/SKILL.md','编写和整理带双向链接、属性、提示块与嵌入内容的 Obsidian 笔记，适合维护个人知识库。',['Obsidian','Markdown'],'MIT','LICENSE'),
 entry('json-canvas','JSON Canvas','knowledge','kepano/obsidian-skills','skills/json-canvas/SKILL.md','用节点、分组和连线创建或修改 .canvas 文件，适合在 Obsidian 等工具中梳理思路。',['Obsidian','.canvas','Mind map'],'MIT','LICENSE'),
 anthropic('mcp-builder','MCP Builder','agents','指导设计和实现 MCP 服务，把外部 API 封装为 AI 可调用的工具，提供 Python 与 TypeScript 路径。',['MCP','Python','TypeScript']),
 anthropic('skill-creator','Skill Creator','agents','从需求编写 Skill，再用测试提示和评估结果改进描述与流程，适合沉淀重复工作。',['SKILL.md','Evaluation']),
];

export function skillFilters(query={}){
 const category=typeof query.type==='string'&&skillCategories.some(item=>item.id===query.type)?query.type:'all';
 const tool=typeof query.tool==='string'&&skillAiTools.some(item=>item.id===query.tool)?query.tool:'all';
 return {category,q:typeof query.q==='string'?query.q.trim().slice(0,120):'',tool};
}
export function filterSkills({category='all',q='',tool='all'}={},translate=text=>text){
 const terms=q.normalize('NFKC').toLocaleLowerCase().split(/\s+/).filter(Boolean);
 return curatedSkills.filter(skill=>{
  if(category!=='all'&&skill.category!==category)return false;
  if(tool!=='all'&&!skill.tools.some(item=>item.id===tool))return false;
  const categoryLabel=skillCategories.find(item=>item.id===skill.category)?.label||'';
  const haystack=[skill.name,skill.id,skill.repo,skill.summary,translate(skill.summary),categoryLabel,translate(categoryLabel),...skill.tags,...skill.tools.map(item=>item.label)].join(' ').normalize('NFKC').toLocaleLowerCase();
  return terms.every(term=>haystack.includes(term));
 });
}
export function skillFilterHref(category='all',q='',tool='all'){
 const params=new URLSearchParams();if(category!=='all')params.set('type',category);if(q)params.set('q',q);if(tool!=='all')params.set('tool',tool);
 return '/skills'+(params.size?'?'+params.toString():'');
}
