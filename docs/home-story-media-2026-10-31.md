# 首页真实媒体（2026-10-31）

首页下半段使用当前站点的公开页面，未引入旧版文档中的虚构社区帖子。

| 文件 | 实际来源 | 用途 |
| --- | --- | --- |
| public/media/home/blog-space.webp | /blog/jianghaoyu2006 | 博客主页示例 |
| public/media/home/resources.webp | /resources | 资源3D卡片纹理与WebGL降级图 |
| public/media/home/skills-poster.webp | /resources?type=skills | 演示封面与低动态偏好静态图 |
| public/media/home/skills-loop.mp4 | /resources?type=skills | 6秒真实目录滚动循环 |

截图录自1200×900的实际公开页面。视频由72个真实浏览器帧组成，12fps采样后输出24fps H.264、无音轨；滚动位置使用余弦往返，首尾位置与速度连续。内容和数值没有伪造。

视频接近视口时加载，离屏、页面隐藏、减少动态效果、用户暂停或卸载时停止播放。资源卡片延迟加载React Three Fiber，保留真实截图作为加载及错误降级。柔和渐变来自WebGL Shader，30个低透明度粒子缓慢流动；玻璃照明仅参与环境反射，不把光管或光环画入场景。

截图中的站长资料和作品来自公开内容；原始用户上传、私有数据库与账号凭据不随这些媒体提交。
