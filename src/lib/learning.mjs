// Guides describe existing workflows; authored tutorials remain in the published article library.
export const guides=[
 {slug:'getting-started',title:'开始使用 SpaceYew',summary:'认识社区、博客主页和共享内容栏目。',sections:[
  {title:'登录你的账号',text:'使用已有的网站账号或已验证邮箱和密码登录。邮箱注册是否开放，以登录页面显示为准。',href:'/login',action:'前往登录'},
  {title:'选择你的内容栏目',text:'在文档、Skill 或其他资源页面直接发布内容，也可以在该栏目的发布页面查看草稿和审核状态。',href:'/docs',action:'浏览内容栏目'},
  {title:'选择下一步',text:'想介绍自己，从博客主页开始；想分享教程或工具，在对应栏目发布，审核通过后也会出现在社区。',href:'/docs/showcase',action:'学习搭建主页'}
 ]},
 {slug:'showcase',title:'搭建博客主页',summary:'整理资料、添加内容，预览后再提交公开。',sections:[
  {title:'完善资料与经历',text:'填写愿意公开的昵称、介绍、技能和经历。登录邮箱与公开联系邮箱分开管理。',href:'/workspace/profile',action:'编辑资料'},
  {title:'整理自己的内容',text:'在内容库添加项目、文章或资源，写清楚本人贡献、来源和使用许可。保存草稿后，可继续修改。',href:'/workspace/library',action:'打开内容库'},
  {title:'编排并预览主页',text:'选择内置主题预览自己的资料；也可以上传 HTML 或 ZIP 静态网站，并打开隔离预览检查页面。',href:'/workspace/blog',action:'打开主页编辑器'},
  {title:'提交审核后公开',text:'保存与公开是两个步骤。检查公开资料和内容后提交审核，通过后才会出现在公开主页中。',href:'/workspace/blog',action:'预览我的主页'}
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

guides.push({slug:'moderation',title:'审核与公开发布',summary:'了解自动筛查、人工复核与正式上线前的准备。',sections:[
 {title:'先检查，再公开',text:'文档、Skill 和其他资源发布后会同步分享到社区。默认自动模式下，低风险纯文字可通过；风险信号、图片、外部链接和安装命令转人工复核。草稿和待审版本不会提前公开。'},
 {title:'保留人工判断与申诉',text:'规则命中表示需要复核，不等于违法认定。管理员可以退回、下架和处理投诉，作者可以修改后重新提交或提出申诉。平台仍需持续巡查。',href:'/report',action:'举报与投诉'},
 {title:'账号与发布资格',text:'邮箱验证用于登录和账号恢复，不等于真实身份核验。新账号可编辑并保存自己的草稿；发布博客、社区投稿与互动需要完成适用的身份及昵称核验。核验通过后，内容仍按规则进行自动筛查或人工审核。'},
 {title:'核对现行规定',text:'审核机制参考网信办《互联网跟帖评论服务管理规定》和《网络信息内容生态治理规定》。新闻信息的跟帖评论适用先审后发；实际运营需结合服务范围核对全部适用要求。',href:'https://www.cac.gov.cn/2022-11/16/c_1670253725725039.htm',action:'阅读网信办规定'}
]});
