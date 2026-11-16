// Adapted from ImgCompress utils/compressor.ts (MIT). All codecs are bundled.
import { dimensions, type Result, type Settings } from './types';
import { identify } from './formats';
import { optimizeGIF, optimizeAPNG } from './animation';
import { optimizeSVG } from './svg';
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

/** Identify the real format; animated and vector files never enter Canvas encoding. */
export const inspect=(data:Uint8Array):string=>identify(data).mime;

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
  if(file.size===0||file.size>MAX_BYTES)throw new Error('图片为空或超过 100 MB');
  const bytes=new Uint8Array(await file.arrayBuffer()),info=identify(bytes),inputMime=info.mime;
  checkStopped();
  if(info.preserve){
    let optimized:Uint8Array;
    if(info.preserve==='vector')optimized=new TextEncoder().encode(await optimizeSVG(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
    else optimized=inputMime==='image/gif'?optimizeGIF(bytes):optimizeAPNG(bytes);
    const image=await loadImage(file);
    const width=image.naturalWidth,height=image.naturalHeight;
    if(width*height>MAX_PIXELS)throw new Error('图片超过 4000 万像素');
    checkStopped();
    const keptOriginal=optimized.length>=bytes.length;
    const blob=new Blob([keptOriginal?bytes:optimized],{type:inputMime});
    return {blob,url:URL.createObjectURL(blob),width,height,keptOriginal,preserved:info.preserve};
  }
  let image:HTMLImageElement|HTMLCanvasElement;
  let fallback:HTMLCanvasElement|undefined;
  try{image=await loadImage(file)}catch(error){
    if(inputMime!=='image/avif')throw error;
    const decoded=await pool.decode(bytes.buffer);checkStopped();
    fallback=document.createElement('canvas');fallback.width=decoded.width;fallback.height=decoded.height;
    const context=fallback.getContext('2d');if(!context)throw new Error('无法解码 AVIF');
    context.putImageData(decoded,0,0);image=fallback;
  }
  checkStopped();
  const originalWidth=image instanceof HTMLImageElement?image.naturalWidth:image.width;
  const originalHeight=image instanceof HTMLImageElement?image.naturalHeight:image.height;
  if(originalWidth*originalHeight>MAX_PIXELS)throw new Error('图片超过 4000 万像素，请先缩小尺寸');
  const {width,height}=dimensions(originalWidth,originalHeight,settings.lossless?0:settings.maxWidth);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('无法创建图片处理画布');
  try{
    const mime=settings.lossless||settings.format==='auto'?'image/webp':settings.format;
    if(mime==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height)}
    ctx.drawImage(image,0,0,width,height);
    let blob=mime==='image/webp'||mime==='image/avif'?await pool.encode(ctx.getImageData(0,0,width,height),settings,mime):await canvasBlob(canvas,mime,settings.quality);
    if(settings.format==='auto'&&!settings.lossless&&inputMime==='image/jpeg'){
      const jpeg=await canvasBlob(canvas,'image/jpeg',settings.quality);if(jpeg.size<blob.size)blob=jpeg;
    }
    const preview=fallback?await canvasBlob(fallback,'image/png',1):undefined;
    checkStopped();
    const keptOriginal=!settings.lossless&&settings.format==='auto'&&width===originalWidth&&height===originalHeight&&blob.size>=file.size;
    if(keptOriginal)blob=file.slice(0,file.size,inputMime);
    return {blob,url:URL.createObjectURL(blob),width,height,keptOriginal,originalPreviewUrl:preview?URL.createObjectURL(preview):undefined};
  }finally{canvas.width=0;canvas.height=0;if(fallback){fallback.width=0;fallback.height=0}}
}
