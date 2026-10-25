'use client';
import {chineseFonts,latinFonts,blogFontStack} from '@/lib/blog-typography.mjs';
import {blogAppearance} from '@/lib/blog-appearances.mjs';
import {BlogMotionSkills} from './BlogMotionSkills';
type Data=Record<string,any>;
export function BlogPersonalization({design,mode,say,onChange,disabled}:{design:Data;mode:string;say:(zh:string,en:string)=>string;onChange:(key:string,value:Data)=>void;disabled:boolean}){
 const typography=design.typography||{},motion=design.motion||{};
 if(mode==='fonts')return <div className="bt-personalization"><h3>{say('让文字有自己的性格','Give your words a voice')}</h3><p>{say('中文与英文字体可独立搭配。应用到页面文字，保留主题配色和栏目结构。','Pair Chinese and Latin type independently, keeping your theme and sections.')}</p>
  <label>{say('中文字体','Chinese typeface')}<select aria-label={say('中文字体','Chinese typeface')} disabled={disabled} value={typography.chinese||'theme'} onChange={e=>onChange('typography',{...typography,chinese:e.target.value})}>{chineseFonts.map(f=><option key={f.id} value={f.id}>{say(f.name,f.en)}</option>)}</select></label>
  <label>{say('英文字体','Latin typeface')}<select aria-label={say('英文字体','Latin typeface')} disabled={disabled} value={typography.latin||'theme'} onChange={e=>onChange('typography',{...typography,latin:e.target.value})}>{latinFonts.map(f=><option key={f.id} value={f.id}>{say(f.name,f.en)}</option>)}</select></label>
  <div className="bt-font-specimen" style={{fontFamily:blogFontStack(typography,blogAppearance(design.appearance).font)}}><strong>把想法，写成风景。</strong><span>Make room for ideas.</span><p>记录日常，分享创造。<br/>A place for stories & discoveries.</p><small>Aa Bb Cc · 0123456789</small></div>
  <p className="bt-option-help">{say('书法与趣味字体更有个性；长篇阅读可选择清晰黑体。首次选择需要短暂加载。','Expressive fonts add character; system sans works well for long reads. First use may take a moment to load.')}</p>
  <button className="bt-reset-personalization" type="button" disabled={disabled||(!typography.chinese&&!typography.latin)||(typography.chinese==='theme'&&typography.latin==='theme')} onClick={()=>onChange('typography',{chinese:'theme',latin:'theme'})}>{say('恢复主题字体','Use theme fonts')}</button>
 </div>;
 return <div className="bt-personalization"><h3>{say('让页面轻轻动起来','A little movement')}</h3><p>{say('只在展示页面播放；编辑时保持静止，便于选字和拖动。','Motion plays in preview and on your page. Editing stays still.')}</p>
  <label className="bt-motion-option"><span><strong>{say('技能跑马灯','Skills marquee')}</strong><small>{say('技能横向连续滚动，可暂停；悬停时停下。','An easy-paced loop, with pause and hover controls.')}</small></span><input type="checkbox" checked={!!motion.marquee} disabled={disabled} onChange={e=>onChange('motion',{...motion,marquee:e.target.checked})}/></label>
  <div className="bt-motion-demo"><span>{say('动效预览','Motion preview')}</span><BlogMotionSkills skills={['Design','灵感','Development','创作','Writing']} enabled={!!motion.marquee} pauseLabel={say('暂停滚动','Pause scrolling')} playLabel={say('继续滚动','Resume scrolling')}/></div>
  <label className="bt-motion-option"><span><strong>{say('页首入场','Header entrance')}</strong><small>{say('头像展开、标题轻移，建立阅读起点。','A portrait reveal and a gentle title transition.')}</small></span><input type="checkbox" checked={motion.entrance!==false} disabled={disabled} onChange={e=>onChange('motion',{...motion,entrance:e.target.checked})}/></label>
  <p className="bt-option-help">{say('遵循系统「减少动态效果」设置。跑马灯离开屏幕或切换标签页后自动停下。','Respects reduced motion. The marquee stops offscreen and when the tab is hidden.')}</p>
 </div>;
}
