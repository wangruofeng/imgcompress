# 2026-11-16 验证记录

环境：Apple Silicon arm64；Go 1.27.3（隔离下载）；MyGo CLI/框架/runtime 0.9.1；React 19；Vite 6.4.6。

## 自动检查

- TypeScript：`npm run check` 通过。
- 前端与原生构建：`npm run build` 成功生成 `.app`（10.3 MB）及 `.dmg`（3.1 MB）。
- Go：`go test ./...` 通过；覆盖重名不覆盖、格式不匹配、路径穿越、空数据、12 个并发同名导出、符号链接不跟随。
- 实际 Mac WKWebView：`scripts/codec-check.js` 18 项通过，覆盖 JPG/PNG/WebP 的真实签名、解码尺寸与透明度；无损 WebP 原尺寸和逐像素一致；缩小与不放大；自动模式不增大；拒绝 GIF/APNG/动画 WebP/损坏输入。
- 批量队列：2 张 1600×1000 PNG 转 WebP 成功，第 3 张损坏图片单独报错，其他文件继续完成。

## 发行包 GUI 实测

直接启动 `build/darwin-arm64/ImgCompress.app`，URL 为打包的 `mygo://localhost/`，无需开发服务器。

1. 系统文件选择器导入 PNG 成功。
2. 本地 WASM 编码为 WebP 成功（1024×1024，11.3 KB → 11.0 KB）。
3. 原生文件夹选择器选择 `/private/tmp/imgcompress-output` 成功。
4. 保存 `imgcompress-test-compressed.webp` 成功；界面显示「已保存」「已全部保存」。
5. 点击文件夹图标，Finder 选中对应 WebP 文件；Pillow 独立解码确认 WEBP、1024×1024、RGBA。
6. 原图/处理后预览可打开及关闭；浅色/深色切换正常。
7. `codesign --verify --deep --strict` 成功；`hdiutil verify` 校验和有效。

## 未覆盖

Intel Mac 运行、macOS 12 实机兼容、最大 100 MB/4000 万像素边界、200 张压力测试、正式签名与公证。上述平台或规模的兼容性不作为本次已验证结论。

## 0.1.1 控件样式调整

- 下拉框保留系统弹出菜单，使用扁平白色/深色控件外观。
- 滑块改为系统强调色轨道，质量预设使用原生 radio 语义的分段选择。
- WKWebView 中实测选择 60% 预设后，radio 和滑块数值均为 60；深浅色截图已检查。
- TypeScript 检查及 MyGo 完整构建通过。

## 0.1.2 并发压缩

- 4 项调度测试、18 项 WKWebView 编码检查全部通过。
- 实际打包页通过 8 项队列检查：两张同时处理、并发上限 2、停止无悬挂状态、恢复待处理、重新运行、失败隔离、顺序稳定、可导出。
- 同时编码纯红与纯蓝图片后独立解码，像素与各自输入一致，无串图。
- 固定样本 8 张 1600×1000，3 次预热基准：原串行中位 1172 ms；双 Worker 并发中位 669 ms，耗时缩短约 43%。完整数据与适用边界见 `concurrent-compression.md`。

## 0.1.3 单 ZIP 导出

- Go ZIP 测试通过：中文名称、同名及大小写冲突序号、真实格式扩展名、逐字节内容一致、取消清理、空包拒绝、多次导出不覆盖。
- Desktop 事务测试通过：仅一个 ZIP 输出、错误事务 ID 拒绝、取消后重试、Finder 路径注册。
- 原生打包版实际压缩 3 张图片后点击「导出 ZIP」，选择文件夹，界面显示「已保存 1 个 ZIP 压缩包，包含 3 张图片」。
- Python zipfile 独立验证：输出目录仅 1 个 ZIP；内部包含 3 张 WebP，中文名称正常，同名追加 -1；Pillow 解码全部为 640×480，颜色各自正确。
