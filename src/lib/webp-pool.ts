import { MAX_PARALLELISM } from './parallelism';
import type { Settings } from './types';
import type { EncodeReply, CodecRequest } from './webp-protocol';

interface Job {
  request: CodecRequest;
  resolve: (result: Blob | ImageData) => void;
  reject: (error: Error) => void;
}
interface Slot { worker: Worker; job?: Job }
export const cancelled = () => new DOMException('已停止压缩', 'AbortError');

/** A bounded pool; no WASM instance or pixel buffer is shared between workers. */
export class WebpPool {
  private slots: Slot[] = [];
  private pending: Job[] = [];
  private closed = false;
  constructor(private readonly concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > MAX_PARALLELISM) throw new Error(`并发数必须为 1–${MAX_PARALLELISM}`);
  }
  encode = async (image: ImageData, settings: Settings, mime:'image/webp'|'image/avif'='image/webp'): Promise<Blob> => {
    const request:CodecRequest={kind:'encode',mime,pixels:image.data as Uint8ClampedArray<ArrayBuffer>,width:image.width,height:image.height,quality:settings.quality,lossless:settings.lossless};
    const result=await this.enqueue(request);
    if(!(result instanceof Blob))throw new Error('编码线程返回数据无效');return result;
  };
  decode = async (buffer:ArrayBuffer):Promise<ImageData> => {
    const result=await this.enqueue({kind:'decode-avif',buffer});
    if(result instanceof Blob)throw new Error('解码线程返回数据无效');return result;
  };
  private enqueue(request:CodecRequest):Promise<Blob|ImageData>{
    if(this.closed)return Promise.reject(cancelled());
    return new Promise((resolve,reject)=>{this.pending.push({request,resolve,reject});this.dispatch()});
  }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    for (const slot of this.slots) { slot.worker.terminate(); slot.job?.reject(cancelled()); slot.job = undefined; }
    for (const job of this.pending) job.reject(cancelled());
    this.slots = []; this.pending = [];
  }
  private createSlot(): Slot {
    const slot: Slot = { worker: new Worker(new URL('./webp.worker.ts', import.meta.url), { type: 'module', name: 'imgcompress-codec' }) };
    slot.worker.onmessage = ({ data }: MessageEvent<EncodeReply>) => {
      const job = slot.job;
      slot.job = undefined;
      if (job) {
        if ('error' in data) job.reject(new Error(data.error));
        else if(data.kind==='encoded') job.resolve(new Blob([data.buffer],{type:data.mime}));
        else job.resolve(new ImageData(data.pixels,data.width,data.height));
      }
      this.dispatch();
    };
    const failed = () => {
      const job = slot.job;
      slot.job = undefined;
      slot.worker.terminate();
      this.slots = this.slots.filter(item => item !== slot);
      job?.reject(new Error('本地图片编解码线程异常，请重试'));
      this.dispatch();
    };
    slot.worker.onerror = event => { event.preventDefault(); failed(); };
    slot.worker.onmessageerror = failed;
    this.slots.push(slot);
    return slot;
  }
  private dispatch() {
    if (this.closed) return;
    while (this.pending.length) {
      let slot = this.slots.find(item => !item.job);
      if (!slot && this.slots.length >= this.concurrency) return;
      const job = this.pending.shift()!;
      try {
        slot ??= this.createSlot();
        slot.job = job;
        slot.worker.postMessage(job.request,[job.request.kind==='encode'?job.request.pixels.buffer:job.request.buffer]);
      } catch (error) {
        if (slot) {
          slot.job = undefined; slot.worker.terminate();
          this.slots = this.slots.filter(item => item !== slot);
        }
        job.reject(error instanceof Error ? error : new Error('无法启动本地编码线程'));
      }
    }
  }
}
