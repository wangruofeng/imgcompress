# 七种图片格式支持

用户已确认：JPG、PNG、WebP、AVIF 支持静态图片压缩和相互转换；SVG 保留矢量；GIF/APNG 原格式优化并保留帧、时序及循环。继续双并发及单 ZIP 导出。

- AVIF 使用 @jsquash/avif WASM；编码在现有双 Worker 池内运行。解码先使用系统能力，必要时本地 WASM 兜底，不依赖用户系统的 AVIF 编码支持。
- SVG 使用 svgo/browser，保守优化，保留 viewBox、ID 和引用关系，拒绝脚本、外部资源等非独立 SVG，结果变大时保留输入。
- GIF 解析块结构，仅移除注释块；图像帧、LZW 数据、Graphic Control、应用扩展及循环信息原样保留。
- APNG 检测 acTL；移除文字/时间元数据块，保留 EXIF 方向与色彩信息，保留 IHDR、颜色信息、acTL/fcTL/fdAT/IDAT 及其顺序和 CRC，不将动画栅格化。
- GIF/APNG/SVG 不执行质量、缩放或跨格式转换；在设置和每项结果明确标注“原格式优化，保留动画/矢量”，避免忽略设置而无解释。
- 新格式必须支持正确 ZIP 扩展名、MIME 校验和独立解码；AVIF 动画及动画 WebP 暂不支持并明确拒绝。
