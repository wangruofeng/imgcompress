# 0.2.4 Logo 一致性验证

- 获取网站 https://img-compress.wangruofeng007.com/logo.svg，与网站本地源码 public/logo.svg 逐字节一致。
- 桌面窗口直接使用同一 SVG，实际 mygo://localhost/logo.svg 解码、显示成功；截图见 test-results/logo-0.2.4.png。
- 使用 macOS AppKit 将 SVG 渲染为 1024×1024 PNG，保持原 Logo 图案，增加圆角透明外框适配 macOS 图标。
- 打包后的 Contents/Resources/icon.png 与源 PNG 完全一致；Info.plist 的 CFBundleIconFile 指向生成的 AppIcon.icns。
- TypeScript、完整 MyGo 构建及签名检查通过。渲染脚本保存在 scripts/render-logo.swift。
