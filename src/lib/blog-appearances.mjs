// Visual themes are independent of page geometry and résumé section presentation.
export const blogAppearances=[
 {id:'original',zh:'原版主题',en:'Original',description:'保留原有配色与字体',english:'Keep the original colors and type',paper:'#ffffff',ink:'#202124',muted:'#656971',line:'#e1e2e5',accent:'#202124',surface:'#f6f7f8',font:'Baskerville,"Songti SC",serif'},
 {id:'sketch',zh:'铅笔手绘',en:'Pencil sketch',description:'暖纸纹理 · 铅笔虚线 · 衬线手写感',english:'Warm paper, pencil strokes and handwritten serifs',paper:'#f5f0e8',ink:'#2c2c2c',muted:'#5a5147',line:'#8a8073',accent:'#2c2c2c',surface:'#e8e2d8',font:'"Kaiti SC",STKaiti,KaiTi,Georgia,serif'},
 {id:'mint-docs',zh:'清新文档',en:'Mint docs',description:'Mintlify 灵感 · 通透白底 · 薄荷绿',english:'Mintlify inspired clarity, white space and green',paper:'#ffffff',ink:'#0d0d0d',muted:'#505b56',line:'#dce7e1',accent:'#18e299',surface:'#f1faf6',font:'"Inter","Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif'},
 {id:'mint-serif',zh:'薄荷书页',en:'Mint editorial',description:'参考图风格 · 大衬线标题 · 柔和薄荷',english:'Reference-inspired serif headlines and soft mint',paper:'#f9f7f4',ink:'#171b19',muted:'#5c625e',line:'#ddd5c9',accent:'#bedfd5',surface:'#bedfd5',font:'"Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif'},
 {id:'night-player',zh:'深夜唱片',en:'Night record',description:'Spotify 灵感 · 炭黑层次 · 鲜绿点缀',english:'Spotify inspired charcoal surfaces and vivid green',paper:'#121212',ink:'#f5f5f5',muted:'#b3b3b3',line:'#383838',accent:'#1ed760',surface:'#181818',font:'"Inter","Helvetica Neue","PingFang SC","Microsoft YaHei",sans-serif'},
 {id:'memphis',zh:'孟菲斯',en:'Memphis',description:'八十年代几何 · 奶油底色 · 明快撞色',english:'Playful geometry, cream paper and bold color',paper:'#fff8ed',ink:'#202020',muted:'#60594e',line:'#202020',accent:'#ffce5c',surface:'#ffebc0',font:'Inter,"PingFang SC","Microsoft YaHei",sans-serif'},
 {id:'volt-terminal',zh:'深空终端',en:'Volt terminal',description:'VoltAgent 灵感 · 深空黑 · 翡翠信号绿',english:'VoltAgent inspired black canvas and emerald signals',paper:'#050507',ink:'#f4f4f2',muted:'#b8b3b0',line:'#3d3a39',accent:'#00d992',surface:'#111514',font:'Inter,"PingFang SC","Microsoft YaHei",sans-serif'}
];
export const blogAppearance=id=>blogAppearances.find(item=>item.id===id)||blogAppearances[0];
export const blogPaper=design=>design?.appearance&&design.appearance!=='original'?blogAppearance(design.appearance).paper:design?.background||'#ffffff';
export function applyBlogAppearance(design,id){return blogAppearances.some(item=>item.id===id)?{...design,appearance:id}:design}
const luminance=color=>{const rgb=color.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
export const colorContrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
export function blogNodeColors(style={},appearance='original',background='#ffffff'){
 const theme=blogAppearance(appearance),paper=appearance==='original'?background:theme.paper;
 let bg=style.background||paper,fg=style.color||theme.ink;
 // Preserve explicit author colors while giving the inherited counterpart readable contrast.
 if(style.background&&!style.color&&colorContrast(bg,fg)<4.5)fg=colorContrast(bg,'#202124')>=4.5?'#202124':'#f5f5f5';
 if(style.color&&!style.background&&colorContrast(bg,fg)<4.5)bg=colorContrast('#ffffff',fg)>=4.5?'#ffffff':'#121212';
 return {background:bg,color:fg};
}
