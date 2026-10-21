// Editorial directory: original summaries and links only; upstream skills are not bundled.
// Checked against each project's README, skill definition and license on this date.
import {skillAiTools,skillSupportedTools} from './skill-installations.mjs';
export {skillAiTools};
export const skillCatalogVerifiedAt='2026-10-21';
export const skillCategories=[
 {id:'engineering',label:'开发工程',description:'组件架构、代码质量与性能。'},
 {id:'design',label:'界面设计',description:'从视觉方向到界面细节。'},
 {id:'testing',label:'测试排错',description:'复现问题、定位根因、验证结果。'},
 {id:'motion',label:'动效交互',description:'从补间到滚动，让动效有序且流畅。'},
 {id:'knowledge',label:'知识管理',description:'把笔记和想法组织起来。'},
 {id:'agents',label:'沟通协作',description:'把想法准确地交给 AI。'},
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
 const skill={id,name,category,repo,summary,tags,license,sourceUrl:root+'/blob/main/'+skillPath,installUrl:root+(repo==='greensock/gsap-skills'?'#installing':repo==='oil-oil/vibe-hub-skill'?'#github-安装':'#installation'),licenseUrl:root+'/blob/main/'+licensePath};
 return {...skill,tools:skillSupportedTools(skill)};
}

export const curatedSkills=[
 entry('react-best-practices','React Best Practices','engineering','vercel-labs/agent-skills','skills/react-best-practices/SKILL.md','检查 React 与 Next.js 的数据请求、渲染和包体积，适合开发新功能或做性能优化。',['React','Next.js','Performance'],'MIT','skills/react-best-practices/SKILL.md'),
 entry('composition-patterns','Composition Patterns','engineering','vercel-labs/agent-skills','skills/composition-patterns/SKILL.md','用组合组件、Context 与状态提升整理复杂组件，适合重构组件 API 和建设组件库。',['React','Component API'],'MIT','skills/composition-patterns/SKILL.md'),
 entry('impeccable','Impeccable','design','pbakaus/impeccable','.agents/skills/impeccable/SKILL.md','围绕已有界面做审查、排版、响应式适配与细节打磨，适合持续改进网站体验。',['UI','Accessibility','Responsive'],'Apache-2.0','LICENSE'),
 entry('ui-ux-pro-max','UI UX Pro Max','design','nextlevelbuilder/ui-ux-pro-max-skill','.claude/skills/ui-ux-pro-max/SKILL.md','检索配色、字体搭配、交互规范与技术栈建议，适合搭建设计系统和比较设计方向。',['UI/UX','Design system','Python 3'],'MIT','LICENSE'),
 entry('systematic-debugging','Systematic Debugging','testing','obra/superpowers','skills/systematic-debugging/SKILL.md','按复现、收集证据、验证假设的顺序排查问题，适合反复出现的故障和难定位的错误。',['Debugging','Root cause'],'MIT','LICENSE'),
 entry('test-driven-development','Test-Driven Development','testing','obra/superpowers','skills/test-driven-development/SKILL.md','用先失败、再通过、再重构的测试流程约束实现，适合为新功能和修复建立回归保障。',['TDD','Regression'],'MIT','LICENSE'),
 entry('obsidian-markdown','Obsidian Markdown','knowledge','kepano/obsidian-skills','skills/obsidian-markdown/SKILL.md','编写和整理带双向链接、属性、提示块与嵌入内容的 Obsidian 笔记，适合维护个人知识库。',['Obsidian','Markdown'],'MIT','LICENSE'),
 entry('json-canvas','JSON Canvas','knowledge','kepano/obsidian-skills','skills/json-canvas/SKILL.md','用节点、分组和连线创建或修改 .canvas 文件，适合在 Obsidian 等工具中梳理思路。',['Obsidian','.canvas','Mind map'],'MIT','LICENSE'),
 entry("gsap-core","GSAP Core","motion","greensock/gsap-skills","skills/gsap-core/SKILL.md","用 GSAP 的补间、缓动与错峰控制界面动效，并照顾响应式和减少动态效果的偏好。",["GSAP", "Animation"],"MIT","LICENSE"),
 entry("gsap-timeline","GSAP Timeline","motion","greensock/gsap-skills","skills/gsap-timeline/SKILL.md","用时间线、标签与相对位置编排连续动效，统一控制播放、暂停和反向。",["GSAP", "Animation"],"MIT","LICENSE"),
 entry("gsap-scrolltrigger","GSAP ScrollTrigger","motion","greensock/gsap-skills","skills/gsap-scrolltrigger/SKILL.md","把滚动进度与动画连接，处理固定区块、触发范围、刷新和页面离开时的清理。",["GSAP", "ScrollTrigger"],"MIT","LICENSE"),
 entry("gsap-plugins","GSAP Plugins","motion","greensock/gsap-skills","skills/gsap-plugins/SKILL.md","按交互选择 Flip、Draggable、SplitText 等 GSAP 插件，核对注册方式、生命周期与恢复行为。",["GSAP", "Animation"],"MIT","LICENSE"),
 entry("gsap-react","GSAP React","motion","greensock/gsap-skills","skills/gsap-react/SKILL.md","将 GSAP 接入 React 与 Next.js，处理作用域、依赖更新、Strict Mode 与组件卸载。",["GSAP", "React"],"MIT","LICENSE"),
 entry("gsap-performance","GSAP Performance","motion","greensock/gsap-skills","skills/gsap-performance/SKILL.md","检查动效中的布局计算、绘制与资源占用，优先用测量证据修复卡顿。",["GSAP", "Animation"],"MIT","LICENSE"),
 entry("gsap-frameworks","GSAP Frameworks","motion","greensock/gsap-skills","skills/gsap-frameworks/SKILL.md","在 Vue、Nuxt、Svelte 等框架中安排 GSAP 的初始化、作用域和卸载清理。",["GSAP", "Vue · Svelte"],"MIT","LICENSE"),
 entry("gsap-utils","GSAP Utilities","motion","greensock/gsap-skills","skills/gsap-utils/SKILL.md","用映射、范围限制、吸附和循环等 GSAP 工具函数简化交互计算。",["GSAP", "Animation"],"MIT","LICENSE"),
 entry("vibehub","VibeHub","agents","oil-oil/vibe-hub-skill","skills/vibehub/SKILL.md","把口语需求整理成准确的开发表达，并结合当前任务解释术语、提供可核对的词条链接。",["Communication", "Vibe coding", "Node.js"],"MIT","LICENSE"),
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
