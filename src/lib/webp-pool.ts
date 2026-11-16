import type { Settings } from './types';
import type { EncodeReply, EncodeRequest } from './webp-protocol';

interface Job {
  request: EncodeRequest;
  resolve: (blob: Blob) => void;
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
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error('并发数必须为 1 或 2');
  }
  encode = (image: ImageData, settings: Settings): Promise<Blob> => {
    if (this.closed) return Promise.reject(cancelled());
    return new Promise((resolve, reject) => {
      // getImageData supplies an owned ArrayBuffer, transferred rather than copied.
      const pixels = image.data as Uint8ClampedArray<ArrayBuffer>;
      this.pending.push({ request: { pixels, width: image.width, height: image.height, quality: settings.quality, lossless: settings.lossless }, resolve, reject });
      this.dispatch();
    });
  };
  dispose() {
    if (this.closed) return;
    this.closed = true;
    for (const slot of this.slots) { slot.worker.terminate(); slot.job?.reject(cancelled()); slot.job = undefined; }
    for (const job of this.pending) job.reject(cancelled());
    this.slots = []; this.pending = [];
  }
  private createSlot(): Slot {
    const slot: Slot = { worker: new Worker(new URL('./webp.worker.ts', import.meta.url), { type: 'module', name: 'imgcompress-webp' }) };
    slot.worker.onmessage = ({ data }: MessageEvent<EncodeReply>) => {
      const job = slot.job;
      slot.job = undefined;
      if (job) {
        if (data.error !== undefined) job.reject(new Error(data.error));
        else job.resolve(new Blob([data.buffer], { type: 'image/webp' }));
      }
      this.dispatch();
    };
    const failed = () => {
      const job = slot.job;
      slot.job = undefined;
      slot.worker.terminate();
      this.slots = this.slots.filter(item => item !== slot);
      job?.reject(new Error('本地 WebP 编码线程异常，请重试'));
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
        slot.worker.postMessage(job.request, [job.request.pixels.buffer]);
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
