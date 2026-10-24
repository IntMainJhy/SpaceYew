// Original pen-line ornaments; IDs are shared by the editor and the saved-page schema.
export const stickerPresets=[
 {id:'note',group:'annotation',zh:'手写箭头',en:'Arrow note',text:'保持联系',english:'Keep in touch',w:132,fontSize:18},
 {id:'arrow',group:'annotation',zh:'弧线箭头',en:'Curved arrow',text:'',english:'',w:160,fontSize:18},
 {id:'loop',group:'annotation',zh:'绕圈箭头',en:'Loop arrow',text:'',english:'',w:180,fontSize:18},
 {id:'underline',group:'annotation',zh:'手写划线',en:'Underline',text:'',english:'',w:196,fontSize:18},
 {id:'circle',group:'annotation',zh:'圈画重点',en:'Circle mark',text:'',english:'',w:154,fontSize:18},
 {id:'check',group:'annotation',zh:'手写勾选',en:'Check mark',text:'',english:'',w:94,fontSize:18},
 {id:'smile',group:'drawing',zh:'微笑',en:'Smile',text:'',english:'',w:92,fontSize:18},
 {id:'heart',group:'drawing',zh:'手绘爱心',en:'Heart',text:'',english:'',w:96,fontSize:18},
 {id:'flower',group:'drawing',zh:'小花',en:'Flower',text:'',english:'',w:106,fontSize:18},
 {id:'sun',group:'drawing',zh:'小太阳',en:'Sun',text:'',english:'',w:110,fontSize:18},
 {id:'star',group:'drawing',zh:'手绘星星',en:'Star',text:'',english:'',w:100,fontSize:18},
 {id:'sparkle',group:'drawing',zh:'闪光',en:'Sparkle',text:'',english:'',w:88,fontSize:18},
 {id:'burst',group:'drawing',zh:'灵感光芒',en:'Idea rays',text:'',english:'',w:102,fontSize:18},
 {id:'tape',group:'paper',zh:'纸胶带便签',en:'Paper note',text:'一点灵感',english:'A little inspiration',w:188,fontSize:21},
 {id:'stamp',group:'paper',zh:'文字印章',en:'Text stamp',text:'用心制作',english:'Made with care',w:168,fontSize:20},
 {id:'emoji',group:'paper',zh:'表情',en:'Emoji',text:'👋',english:'👋',w:100,fontSize:60}
];
export const stickerStyles=stickerPresets.map(p=>p.id);
