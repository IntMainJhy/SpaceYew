// Only known, self-hosted typefaces are accepted. Latin faces lead the stack;
// the Chinese choice supplies CJK glyphs without changing the content language.
export const chineseFonts=[
 {id:'theme',name:'跟随主题',en:'Theme default',family:''},
 {id:'system',name:'清晰黑体',en:'System sans',family:'"PingFang SC","Microsoft YaHei",sans-serif'},
 {id:'xiaowei',name:'站酷小薇 · 文艺宋体',en:'ZCOOL XiaoWei',family:'"ZCOOL XiaoWei","Songti SC",serif'},
 {id:'kuaile',name:'站酷快乐 · 趣味手写',en:'ZCOOL KuaiLe',family:'"ZCOOL KuaiLe","PingFang SC",sans-serif'},
 {id:'mashan',name:'马善政 · 毛笔楷书',en:'Ma Shan Zheng',family:'"Ma Shan Zheng","Kaiti SC",serif'}
];
export const latinFonts=[
 {id:'theme',name:'跟随主题',en:'Theme default',family:''},
 {id:'inter',name:'Inter · 清晰现代',en:'Inter',family:'Inter'},
 {id:'dm-sans',name:'DM Sans · 柔和几何',en:'DM Sans',family:'"DM Sans"'},
 {id:'newsreader',name:'Newsreader · 编辑叙事',en:'Newsreader',family:'Newsreader'},
 {id:'cormorant',name:'Cormorant · 古典书页',en:'Cormorant Garamond',family:'"Cormorant Garamond"'},
 {id:'geist',name:'Geist Mono · 代码质感',en:'Geist Mono',family:'"Geist Mono"'}
];
export function blogFontStack(typography={},fallback='inherit'){
 const zh=chineseFonts.find(f=>f.id===typography.chinese)?.family,en=latinFonts.find(f=>f.id===typography.latin)?.family;
 if(!zh&&!en)return fallback;
 const base=fallback==='inherit'?'Inter,"PingFang SC","Microsoft YaHei",sans-serif':fallback;
 // Retain the unmodified language's theme face when only one is selected.
 const latinBase=base.split(',').filter(face=>!/PingFang|Microsoft YaHei|Songti|Kaiti|KaiTi|STKaiti|sans-serif|serif|monospace/i.test(face)).join(',')||'Georgia';
 return en?[en,zh||base].join(','):[latinBase,zh].join(',');
}
export const customBlogFont=design=>!!((design?.typography?.chinese&&design.typography.chinese!=='theme')||(design?.typography?.latin&&design.typography.latin!=='theme'));
