// Original ornaments; stable IDs are shared by the editor and saved-page schema.
export const stickerGroups=[
 {id:'annotation',zh:'手写标注',en:'Annotations'},
 {id:'drawing',zh:'手绘线条',en:'Pen drawings'},
 {id:'paper',zh:'纸张手账',en:'Paper journal'},
 {id:'pop',zh:'缤纷剪贴',en:'Color cutouts'},
 {id:'pixel',zh:'像素趣味',en:'Pixel art'},
 {id:'labels',zh:'文字标签',en:'Type labels'}
];
export const stickerPresets=[
 {id:'note',group:'annotation',zh:'手写箭头',en:'Arrow note',text:'保持联系',english:'Keep in touch',w:132,fontSize:18},
 {id:'arrow',group:'annotation',zh:'弧线箭头',en:'Curved arrow',text:'',english:'',w:160,fontSize:18},
 {id:'loop',group:'annotation',zh:'绕圈箭头',en:'Loop arrow',text:'',english:'',w:180,fontSize:18},
 {id:'underline',group:'annotation',zh:'手写划线',en:'Underline',text:'',english:'',w:196,fontSize:18},
 {id:'circle',group:'annotation',zh:'圈画重点',en:'Circle mark',text:'',english:'',w:154,fontSize:18},
 {id:'check',group:'annotation',zh:'手写勾选',en:'Check mark',text:'',english:'',w:94,fontSize:18},
 {id:'bracket',group:'annotation',zh:'括号标记',en:'Bracket mark',text:'',english:'',w:176,fontSize:18},
 {id:'smile',group:'drawing',zh:'微笑',en:'Smile',text:'',english:'',w:92,fontSize:18},
 {id:'heart',group:'drawing',zh:'手绘爱心',en:'Heart',text:'',english:'',w:96,fontSize:18},
 {id:'flower',group:'drawing',zh:'小花',en:'Flower',text:'',english:'',w:106,fontSize:18},
 {id:'sun',group:'drawing',zh:'小太阳',en:'Sun',text:'',english:'',w:110,fontSize:18},
 {id:'star',group:'drawing',zh:'手绘星星',en:'Star',text:'',english:'',w:100,fontSize:18},
 {id:'sparkle',group:'drawing',zh:'闪光',en:'Sparkle',text:'',english:'',w:88,fontSize:18},
 {id:'burst',group:'drawing',zh:'灵感光芒',en:'Idea rays',text:'',english:'',w:102,fontSize:18},
 {id:'tape',group:'paper',zh:'纸胶带便签',en:'Paper note',text:'一点灵感',english:'A little inspiration',w:188,fontSize:21},
 {id:'stamp',group:'paper',zh:'文字印章',en:'Text stamp',text:'用心制作',english:'Made with care',w:168,fontSize:20},
 {id:'memo',group:'paper',zh:'方格便笺',en:'Grid memo',text:'记下灵感',english:'A little note',w:188,fontSize:20},
 {id:'torn',group:'paper',zh:'撕边纸片',en:'Torn paper',text:'慢慢来',english:'Take your time',w:192,fontSize:21},
 {id:'tab',group:'paper',zh:'折角书签',en:'Folded tab',text:'值得记录',english:'Worth keeping',w:168,fontSize:20},
 {id:'ticket',group:'paper',zh:'灵感票根',en:'Journal ticket',text:'下一站，灵感',english:'Next stop: ideas',w:210,fontSize:18},
 {id:'polaroid',group:'paper',zh:'留白相框',en:'Paper frame',text:'留住此刻',english:'Keep the moment',w:164,fontSize:18},
 {id:'emoji',group:'pop',zh:'表情',en:'Emoji',text:'👋',english:'👋',w:100,fontSize:60},
 {id:'pop-flower',group:'pop',zh:'奶油花朵',en:'Butter flower',text:'',english:'',w:116,fontSize:18},
 {id:'pop-bolt',group:'pop',zh:'亮色闪电',en:'Bright bolt',text:'',english:'',w:100,fontSize:18},
 {id:'pop-rainbow',group:'pop',zh:'小小彩虹',en:'Little rainbow',text:'',english:'',w:156,fontSize:18},
 {id:'pop-confetti',group:'pop',zh:'彩纸派对',en:'Confetti',text:'',english:'',w:124,fontSize:18},
 {id:'pop-orbit',group:'pop',zh:'环绕星球',en:'Orbit',text:'',english:'',w:152,fontSize:18},
 {id:'pop-heart',group:'pop',zh:'莓果爱心',en:'Berry heart',text:'',english:'',w:110,fontSize:18},
 {id:'pixel-heart',group:'pixel',zh:'像素爱心',en:'Pixel heart',text:'',english:'',w:104,fontSize:18},
 {id:'pixel-star',group:'pixel',zh:'像素星星',en:'Pixel star',text:'',english:'',w:108,fontSize:18},
 {id:'pixel-cursor',group:'pixel',zh:'像素指针',en:'Pixel cursor',text:'',english:'',w:94,fontSize:18},
 {id:'pixel-smile',group:'pixel',zh:'像素笑脸',en:'Pixel smile',text:'',english:'',w:104,fontSize:18},
 {id:'pixel-spark',group:'pixel',zh:'像素闪光',en:'Pixel spark',text:'',english:'',w:100,fontSize:18},
 {id:'pixel-window',group:'pixel',zh:'迷你窗口',en:'Mini window',text:'',english:'',w:160,fontSize:18},
 {id:'pixel-sprout',group:'pixel',zh:'像素新芽',en:'Pixel sprout',text:'',english:'',w:104,fontSize:18},
 {id:'label-outline',group:'labels',zh:'线框标签',en:'Outline label',text:'正在创作',english:'Work in progress',w:204,fontSize:18},
 {id:'label-solid',group:'labels',zh:'墨色标签',en:'Ink label',text:'欢迎来访',english:'Hello there',w:180,fontSize:20,style:{background:'#202124',color:'#ffffff',padding:0,radius:5}},
 {id:'label-ribbon',group:'labels',zh:'丝带标签',en:'Ribbon label',text:'用心制作',english:'Made with care',w:212,fontSize:18},
 {id:'label-ticket',group:'labels',zh:'编号票签',en:'Ticket label',text:'新的想法',english:'New ideas',w:200,fontSize:20},
 {id:'label-postmark',group:'labels',zh:'圆形邮戳',en:'Postmark',text:'原创记录',english:'Original notes',w:156,fontSize:18},
 {id:'label-bubble',group:'labels',zh:'对话气泡',en:'Speech label',text:'聊聊想法',english:"Let's talk",w:184,fontSize:20},
 {id:'label-mono',group:'labels',zh:'等宽标记',en:'Mono label',text:'持续更新',english:'Still building',w:204,fontSize:18}
];
export const stickerStyles=stickerPresets.map(p=>p.id);

export function filterStickerPresets(query='',group='all'){
 const term=String(query).trim().toLowerCase();
 return stickerPresets.filter(p=>{const family=stickerGroups.find(g=>g.id===p.group);return (group==='all'||p.group===group)&&(!term||[p.id,p.zh,p.en,p.text,p.english,family?.id,family?.zh,family?.en].join(' ').toLowerCase().includes(term))});
}
