# 七种图片格式实施计划

目标：扩展为 JPG、PNG、WebP、AVIF、SVG、GIF、APNG；保留并发与单 ZIP。
设计：../specs/2026-11-16-more-formats.md。

- [x] 提取图片头部识别和动画块优化模块，添加损坏输入/元数据/动画内容不变测试。
- [x] 扩展 Worker 协议和池，支持 AVIF 编码及兼容解码；保留取消和独立实例。
- [x] 接入保守 SVG 优化、GIF/APNG 原格式优化，更新导入、提示、文件类型与预览。
- [x] 扩展 Go ZIP 导出格式校验，覆盖 AVIF、SVG、GIF、APNG 测试。
- [x] 实际 WKWebView 编解码与 ZIP 验证：静态像素、透明度；动画帧、时序、循环；SVG 仍为矢量。
- [x] 更新 README/版本为 0.2.0，构建本机安装包并记录边界；本次不自动发布新 Release。
