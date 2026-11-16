# 功能边界与开发参考

## 功能与边界

- 静态 JPG、PNG、WebP、AVIF 相互转换；AVIF 使用本地 WASM 编解码器。自动模式仍优先 WebP/JPG，未缩放且结果变大时保留原图。
- SVG 保守优化源码，保留矢量、viewBox 与 ID 引用；仅支持不含脚本、外链资源、嵌入页面或 SMIL 动画的独立 SVG。
- GIF/APNG 原格式优化，仅移除注释/文字/时间等附加元数据；保留图像帧、透明度、时序与循环，不改分辨率。格式、质量和最大宽度设置不作用于这三种原格式优化。没有可删除的附加内容时可能保持原体积。
- JPG 透明区域填白；PNG、WebP 保留透明度。
- WebP 使用随应用打包的 WASM 编码器，离线可用。
- 无损模式输出 WebP，保留解码后的像素和原尺寸；不保留或承诺原始 EXIF、ICC、GPS 等元数据，也不保证体积更小。
- PNG 为无损编码，质量滑块对此格式不生效。
- 最大宽度为 800 / 1280 / 1920 / 2560 px，保持比例，不放大小图。
- 每张图片显示处理耗时；底部显示整批累计处理时间，实时刷新，不含暂停和 ZIP 导出时间。
- 最多 200 张，单张最大 100 MB，解码后最多 4000 万像素。队列与预览会占用内存，处理完可以清空队列。
- 并发可选自动、1、2、4、6、8、12、16 路。自动模式按 CPU 核心数选择，最多 4 路；批量中小图可手动提高并发，最高 16 路，大图建议 2–4 路。AVIF/WebP 使用独立 Worker，每批次结束释放编码线程。更改并发不会清空已完成结果。
- 「停止」会立即终止 WebP 编码线程，停止领取后续任务；未完成图片恢复待处理，已完成结果保留。JPG/PNG 的系统 Canvas 编码会等待当前调用返回。打包停止时删除未完成的临时 ZIP，已处理图片保留，可以重新导出。
- 暂不支持 HEIC、动画 WebP 和 AVIF 动画序列。
- 本地自用构建采用 ad-hoc 签名，尚未进行 Apple Developer ID 签名或公证。分发给其他电脑前应配置正式签名。

## 开发

需要 Node.js 22+、npm、Go 1.27.3+。已安装较旧 Go 时默认会根据 go.mod 自动下载所需工具链；无需修改全局 Go。

```sh
npm ci
npm run dev
```

```sh
npm run check
npm test
go test ./...
npm run build
```

默认构建本机架构的 `.app` 和 `.dmg`，产物位于 `build/`。Intel Mac 可用 `npx mygo build -platform darwin/amd64 -sign -` 另外构建，当前未验证 Intel 运行。

`npm run dev:web` 仅启动前端预览，文件保存和 Finder 需要 MyGo 桌面进程。

## 代码结构

| 文件 | 职责 |
| --- | --- |
| `main.go` | MyGo 窗口和 Desktop 服务；仅向用户选择的目录保存 |
| `internal/exporter/` | 文件名及格式校验、独占创建、防覆盖、重名处理 |
| `src/lib/compress.ts` | 输入识别、动画检测、Canvas/WASM 编码 |
| `src/lib/useQueue.ts` | 批量队列、停止、逐项错误、导出 |
| `src/generated/mygo.ts` | MyGo 自动生成的类型化客户端 |
| `src/components/` | 设置、图片行和原生 HTML dialog 预览 |
| `automation_e2e.go` | 仅 e2e 构建启用的本地测试接口，发行包不包含 |

## 原生编码验证

测试使用真实 WKWebView，而非 Chromium 替代：

```sh
# 终端 1
npm run dev:web
# 终端 2
go build -tags e2e -o build/e2e/ImgCompress .
MYGO_AUTOMATION=/tmp/imgcompress-e2e.sock ./build/e2e/ImgCompress
# 终端 3
python3 scripts/native-client.py eval scripts/codec-check.js
```

测试版自动化 socket 仅在显式传入环境变量时启用。正常 `npm run build` 不包含该插件。

## Logo

窗口与应用图标复用 [ImgCompress 网站 Logo](https://img-compress.wangruofeng007.com/logo.svg)，源文件位于 `public/logo.svg`（相对于项目根目录）。应用图标可用 macOS 系统渲染重新生成：

```sh
swift scripts/render-logo.swift public/logo.svg resources/icon.png
```

## 来源与许可证

基于本地 [ImgCompress](https://img-compress.wangruofeng007.com/) 的 MIT 授权编码方案改编；原始许可见 [LICENSE](../LICENSE)。MyGo 与 SVGO 使用 MIT 许可，@jsquash/webp、@jsquash/avif 使用 Apache-2.0 许可。第三方许可证副本随应用位于 Resources/licenses。
