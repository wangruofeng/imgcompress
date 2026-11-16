# 0.2.0 格式扩展验证

日期：2026-11-16。实际运行环境：本机 Apple Silicon 与 WKWebView；未进行 macOS 12 或 Intel 实机验证。

## 覆盖

- 8 项 Node 调度与格式结构测试通过，Go 测试通过，TypeScript 检查通过。
- 原有 18 项原生编码检查通过，新增 17 项原生格式检查通过。
- AVIF：PNG/JPG 编码、AVIF 转 JPG/PNG/WebP/AVIF、WASM 独立解码、透明区域和尺寸。
- SVG：保留 XML 矢量、viewBox、ID 及梯度引用，移除注释和编辑元数据；脚本拒绝。
- GIF/APNG：原格式优化后独立 Pillow 解码，2 帧逐像素一致，时长 80/120 ms、循环次数 3 不变。
- 实际打包的 mygo:// 页面导入七种格式，选择 AVIF 输出：4 张静态位图输出 AVIF，SVG/GIF/APNG 保留原格式；界面明确说明保留动画/矢量。
- 原生 ZIP 导出成功：7 项输出，重名自动序号。Python zipfile CRC 检查通过；Pillow 独立解码 AVIF/GIF/APNG，XML SVG 仍保留 viewBox。

## 边界与取舍

- GIF/APNG 优化为删除非视觉附加信息，不重新编码图像帧；没有附加信息时保持原体积。
- APNG 保留颜色和 EXIF 方向信息，避免因移除方向信息改变显示。
- SVG 使用保守 SVGO 插件，不修改几何精度；不支持脚本、外链资源、foreignObject 或 SMIL 动画。
- AVIF 编码/解码 WASM 和 SVG 优化器全部本地打包、按需加载。SVG 优化器单个异步 chunk 约 569 KB，Vite 有大小提醒，不影响首次启动主包（约 235 KB）。
- 本地 0.2.0 为 ad-hoc 签名；本次没有发布新的 GitHub Release，已发布的 v0.1.3 仍保持原样。
