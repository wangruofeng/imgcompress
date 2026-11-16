// Adapted from ImgCompress utils/compressor.ts (MIT). All codecs are bundled.
import { dimensions, type Result, type Settings } from './types';
import { WebpPool, cancelled } from './webp-pool';

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

export function createCompressor(concurrency = 2) {
  const pool = new WebpPool(concurrency);
  return {
    compress: (file: File, settings: Settings, signal?: AbortSignal) => compressImage(file, settings, pool, signal),
    dispose: () => pool.dispose(),
  };
}
let shared: ReturnType<typeof createCompressor> | undefined;
// Convenience entry point for standalone codec checks; queues own their session.
export const compress = (file: File, settings: Settings) => (shared ??= createCompressor()).compress(file, settings);

/** Check real signatures and reject animation rather than silently discarding frames. */
export function inspect(data: Uint8Array): string {
  const text = (start: number, length: number) => String.fromCharCode(...data.subarray(start, start + length));
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.length >= 8 && text(0, 8) === '\x89PNG\r\n\x1a\n') {
    for (let offset = 8; offset + 12 <= data.length;) {
      const length = view.getUint32(offset);
      if (text(offset + 4, 4) === 'acTL') throw new Error('暂不支持 APNG 动图，请使用静态图片');
      if (text(offset + 4, 4) === 'IDAT') break;
      offset += length + 12;
    }
    return 'image/png';
  }
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  if (data.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    for (let offset = 12; offset + 8 <= data.length;) {
      const kind = text(offset, 4);
      if (kind === 'ANIM' || kind === 'ANMF' || (kind === 'VP8X' && offset + 8 < data.length && (data[offset + 8] & 2))) {
        throw new Error('暂不支持 WebP 动图，请使用静态图片');
      }
      const length = view.getUint32(offset + 4, true);
      offset += 8 + length + (length % 2);
    }
    return 'image/webp';
  }
  throw new Error('仅支持静态 JPG、PNG、WebP 图片');
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片损坏或无法解码')); };
    img.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob || blob.size === 0) reject(new Error('图片编码失败'));
    else if (blob.type !== mime) reject(new Error('系统不支持所选输出格式'));
    else resolve(blob);
  }, mime, quality));
}

async function compressImage(file: File, settings: Settings, pool: WebpPool, signal?: AbortSignal): Promise<Result> {
  const checkStopped = () => { if (signal?.aborted) throw cancelled(); };
  checkStopped();
  if (file.size === 0 || file.size > MAX_BYTES) throw new Error('图片为空或超过 100 MB');
  const inputMime = inspect(new Uint8Array(await file.arrayBuffer()));
  checkStopped();
  const image = await loadImage(file);
  checkStopped();
  if (image.naturalWidth * image.naturalHeight > MAX_PIXELS) throw new Error('图片超过 4000 万像素，请先缩小尺寸');
  const { width, height } = dimensions(image.naturalWidth, image.naturalHeight, settings.lossless ? 0 : settings.maxWidth);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建图片处理画布');
  try {
    const mime = settings.lossless || settings.format === 'auto' ? 'image/webp' : settings.format;
    if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
    ctx.drawImage(image, 0, 0, width, height);
    let blob = mime === 'image/webp' ? await pool.encode(ctx.getImageData(0, 0, width, height), settings) : await canvasBlob(canvas, mime, settings.quality);
    if (settings.format === 'auto' && !settings.lossless && inputMime === 'image/jpeg') {
      const jpeg = await canvasBlob(canvas, 'image/jpeg', settings.quality);
      if (jpeg.size < blob.size) blob = jpeg;
    }
    checkStopped();
    const keptOriginal = !settings.lossless && settings.format === 'auto' && width === image.naturalWidth && height === image.naturalHeight && blob.size >= file.size;
    if (keptOriginal) blob = file.slice(0, file.size, inputMime);
    return { blob, url: URL.createObjectURL(blob), width, height, keptOriginal };
  } finally { canvas.width = 0; canvas.height = 0; }
}
