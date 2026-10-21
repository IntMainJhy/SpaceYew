// Guides describe existing workflows; authored tutorials remain in the published article library.
export const guides=[
 {slug:'getting-started',title:'开始使用 SpaceYew',summary:'从登录账号到找到自己的工作台。',sections:[
  {title:'登录你的账号',text:'使用已有的网站账号或已验证邮箱和密码登录。邀请注册是否开放，以登录页面显示为准。',href:'/login',action:'前往登录'},
  {title:'找到你的工作台',text:'登录后，从顶部的“我的工作台”进入。你的展板、内容库、文件和账号设置都在这里。',href:'/workspace',action:'打开工作台'},
  {title:'选择下一步',text:'想展示作品，从个人展板开始；想交流发现，去社区看看。也可以先在内容库保存一份草稿。',href:'/docs/showcase',action:'学习搭建展板'}
 ]},
 {slug:'showcase',title:'搭建个人展板',summary:'整理资料、添加内容，预览后再提交公开。',sections:[
  {title:'完善资料与经历',text:'填写愿意公开的昵称、介绍、技能和经历。登录邮箱与公开联系邮箱分开管理。',href:'/workspace/profile',action:'编辑资料'},
  {title:'整理自己的内容',text:'在内容库添加项目、文章或资源，写清楚本人贡献、来源和使用许可。保存草稿后，可继续修改。',href:'/workspace/library',action:'打开内容库'},
  {title:'编排并预览展板',text:'在展板编辑器中选择模块或自由画布，调整内容和布局，检查桌面与手机预览。',href:'/workspace/studio',action:'打开展板编辑器'},
  {title:'提交审核后公开',text:'保存与公开是两个步骤。检查公开资料和内容后提交审核，通过后才会出现在公开展板中。',href:'/workspace/preview',action:'预览我的展板'}
 ]},
 {slug:'community',title:'在社区分享内容',summary:'写清来源与使用范围，让分享更容易被理解。',sections:[
  {title:'先看看社区',text:'浏览已公开的分享，按分类查找内容，也可以从成员主页了解作者。',href:'/community',action:'进入社区'},
  {title:'写一份有用的分享',text:'填写标题、摘要和正文，补齐来源、目标链接与许可依据。先保存草稿，检查后再提交。',href:'/workspace/submissions/new',action:'写一份分享'},
  {title:'确认规则并提交',text:'提交前阅读当前规则，确认来源和分享权限。提交后进入审核，未通过的内容可根据反馈修改。',href:'/legal/community',action:'阅读社区规则'},
  {title:'查看处理进度',text:'在“我的投稿”查看草稿、待审与公开版本。修改已公开内容时，新的版本仍需审核。',href:'/workspace/submissions',action:'查看我的投稿'}
 ]},
 {slug:'desktop',title:'使用桌面客户端',summary:'了解安装入口、服务连接与账号登录。',sections:[
  {title:'获取对应系统的客户端',text:'在下载页查看 macOS 与 Windows 的可用版本。尚未提供安装包时，可以继续使用网页版。',href:'/downloads',action:'查看客户端下载'},
  {title:'连接同一个网站服务',text:'在客户端的连接设置中填写你正在使用的网站地址。网站和客户端必须连接同一套服务，才能共用账号和内容。'},
  {title:'使用网站账号登录',text:'输入网站已有账号和密码。客户端会校验真实密码，不接受任意填写的体验登录；每次启动都需要登录。'},
  {title:'找不到账号或无法连接',text:'先检查服务地址与网络，再确认该服务是否支持客户端登录。本地服务只在运行时可连接；本地与线上服务的账号不会自动互通。'}
 ]}
];
