# 法律咨询资源页

- 页面地址：`/resources/legal-consultation`；资源中心的“法律咨询”标签、资源卡片、搜索和分类均提供入口。
- 页面使用共享 `PublicFrame`、蓝色玻璃背景和站内光学按钮，桌面左右名片、手机上下排布。
- 律师姓名、律所、执业证号、十项业务、费用、微信和外部网址在 `src/lib/legal-consultation.mjs` 维护。
- 页面结构、简介和可见年份文案在 `src/components/LegalConsultation.tsx`；执业时间尚未直接使用数据模块的 `since`。
- 修改简介或年份时同步页面和 `src/lib/locales/messages.json`；局部样式在 `src/app/legal-consultation.css`。
- 真实人像在 `public/images/legal/zhang-yue.webp`；图片只缩放压缩，来源说明随同名 `.webp.json` 保存在本地。
- 联系交互在 `src/components/LegalContact.tsx`：微信号可选择，复制成功切换“已复制”并提醒备注“法律咨询”。
- 复制失败保留微信号，并提示长按或选中后手动复制；反馈使用 `role="status"` 和 polite 宣布。
- 页面不收集咨询内容，不预约、不收款；收费与服务安排通过联系律师确认。
- 文本通过 `t()` 和 `src/lib/locales/messages.json` 提供中文、英文、日文；修改可见文字时同步三语字段。
- 真律咨询平台作为独立外部入口，用户可查看服务条款及渠道码入口，不宣称其与律师或律所存在隶属、合作关系。
- 不发布资料中的案例数量示例，不添加胜诉率、认证或平台背书。
- 自动验证命令：`node test/legal-consultation-http.mjs`。
- 浏览器验收覆盖桌面（1440px）与手机（390px、320px），截图仅保留本地。
