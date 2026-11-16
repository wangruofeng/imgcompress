# ImgCompress Mac 实现计划

**目标：** 提供能在本机运行、离线批量压缩转换图片的 MyGo Mac 应用。

**架构：** React 管理本地 File、Canvas/WASM 编码与 Blob 预览，MyGo 绑定 Go 导出服务，输出目录由原生对话框选择。

**技术栈：** MyGo v0.9.1、Go 1.27.3、React 19、TypeScript、Vite、@jsquash/webp。

**设计：** `../specs/2026-11-16-imgcompress-design.md`

## 全局约束

中文、本地离线、不覆盖已有文件、真实 MIME 与扩展名一致、无损模式不缩放、不支持动画与 SVG、不发布远端。

## 执行步骤（当前会话顺序执行）

- [x] 建立独立项目、固定 MyGo 版本、安装依赖和所需 Go 工具链。文件：package.json、go.mod、mygo.json、vite.config.ts。
- [x] 实现 `internal/exporter`：校验文件名和 MIME、独占创建、重名后缀、失败清理；`go test ./internal/exporter` 验证不覆盖、拒绝穿越、正确扩展名和并发同名导出。
- [x] 实现 `main.go`：绑定 `Desktop.ChooseOutput`、`Desktop.Save`、`Desktop.Reveal`；保存只允许已选输出目录。
- [x] 实现 `src/lib/compress.ts`：图片头部识别、动画拒绝、尺寸检查、WASM WebP 和 Canvas JPEG/PNG 编码、真实格式校验、自动模式保留原文件。
- [x] 实现队列和界面：`src/App.tsx`、`src/components`、`src/styles.css`，处理导入/删除/清空/取消/重试/预览/导出、主题持久化与快捷键。
- [x] 运行 `npm run check`、`npm run build:web`、Go 测试；用真实图片测试格式、尺寸、透明度和无损像素。
- [x] `npm run build` 生成本机安装包，启动并检查窗口，记录验证结果与 README 使用说明。
