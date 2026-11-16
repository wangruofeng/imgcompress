# 更新日志

## 0.1.3 — 2026-11-16

首个 GitHub Release，提供 Apple Silicon Mac 的 DMG 安装包。

### 功能

- 静态 JPG、PNG、WebP 图片压缩与格式转换，全程本地处理。
- 双 Worker 并发压缩、质量预设、尺寸缩小和无损 WebP 模式。
- 原图与处理结果对比，支持浅色与深色界面。
- 已处理图片统一导出为一个 ZIP，处理包内重名，支持取消及重试。

### 安装包

- macOS 12+，Apple Silicon（arm64）。
- 采用 ad-hoc 签名，尚未进行 Apple Developer ID 签名及公证。
- Intel Mac 安装包尚未提供；macOS 12 实机运行和大批量边界尚未验证。
