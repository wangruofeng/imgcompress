import { useEffect, useRef, useState } from 'react';
import { createCompressor } from './compress';
import { resolveParallelism } from './parallelism';
import { runConcurrent } from './concurrent';
import { beginZip, addToZip, finishZip, cancelZip } from './desktop';
import { type ImageItem, type Settings } from './types';

function release(item: ImageItem) {
  URL.revokeObjectURL(item.url);
  if (item.result) URL.revokeObjectURL(item.result.url);
}
export function useQueue() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [parallelism, setParallelism] = useState(2);
  const [busy, setBusy] = useState<'process' | 'export' | null>(null);
  const [notice, setNotice] = useState('');
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const current = useRef(items);
  const lock = useRef(false);
  const stopped = useRef(false);
  const cancelCompression = useRef<(() => void) | undefined>(undefined);
  const mounted = useRef(true);
  const update = (fn: (rows: ImageItem[]) => ImageItem[]) => {
    if (!mounted.current) return;
    const next = fn(current.current);
    current.current = next;
    setItems(next);
  };
  const patch = (id: string, changes: Partial<ImageItem>) => update(rows => rows.map(row => row.id === id ? { ...row, ...changes } : row));
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; stopped.current = true; cancelCompression.current?.(); current.current.forEach(release); };
  }, []);

  function add(files: File[]) {
    if (lock.current) return;
    let rejected = 0;
    const accepted: ImageItem[] = [];
    for (const file of files) {
      if (!/\.(jpe?g|png|webp|avif|svg|gif|apng)$/i.test(file.name) || file.size === 0 || file.size > 100 * 1024 * 1024) { rejected++; continue; }
      if ([...current.current, ...accepted].some(row => row.file.name === file.name && row.file.size === file.size && row.file.lastModified === file.lastModified)) continue;
      if (current.current.length + accepted.length >= 200) { rejected++; continue; }
      accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), status: 'pending' });
    }
    update(rows => [...rows, ...accepted]);
    setNotice(rejected ? `已跳过 ${rejected} 个文件：仅支持 100 MB 以内的 JPG、PNG、WebP、AVIF、SVG、GIF、APNG，最多添加 200 张。` : '');
  }
  function remove(id?: string) {
    if (lock.current) return;
    update(rows => rows.filter(row => { if (!id || row.id === id) { release(row); return false; } return true; }));
    setNotice('');
  }
  function invalidate() {
    if (lock.current) return;
    update(rows => rows.map(row => {
      if (row.result) URL.revokeObjectURL(row.result.url);
      return { ...row, status: 'pending', result: undefined, error: undefined, savedPath: undefined };
    }));
  }
  async function run(settings: Settings) {
    if (lock.current) return;
    lock.current = true; stopped.current = false; setBusy('process'); setNotice('');
    const controller = new AbortController();
    const limit = resolveParallelism(settings.parallelism,navigator.hardwareConcurrency);
    setParallelism(limit);
    const session = createCompressor(limit);
    cancelCompression.current = () => { controller.abort(); session.dispose(); };
    try {
      await runConcurrent(current.current.filter(row => row.status !== 'done'), limit, controller.signal, async item => {
        patch(item.id, { status: 'processing', error: undefined });
        try {
          const result = await session.compress(item.file, settings, controller.signal);
          if (controller.signal.aborted) {
            URL.revokeObjectURL(result.url);
            if(result.originalPreviewUrl)URL.revokeObjectURL(result.originalPreviewUrl);
            patch(item.id, { status: 'pending' });
          } else {
            if(result.originalPreviewUrl)URL.revokeObjectURL(item.url);
            patch(item.id, { status: 'done', result, ...(result.originalPreviewUrl?{url:result.originalPreviewUrl}:{}) });
          }
        } catch (error) {
          if (controller.signal.aborted) patch(item.id, { status: 'pending', error: undefined });
          else patch(item.id, { status: 'error', error: error instanceof Error ? error.message : '处理失败' });
        }
      });
      if (controller.signal.aborted) setNotice('已停止。已完成的图片可以导出，其余图片可继续处理。');
    } finally {
      session.dispose(); cancelCompression.current = undefined; lock.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  async function exportAll() {
    if (lock.current) return;
    const ready = current.current.filter(row => row.status === 'done' && row.result);
    if (!ready.length) return;
    lock.current = true; stopped.current = false; setBusy('export'); setNotice('');
    setExportProgress({ done: 0, total: ready.length });
    let archiveID: string | undefined;
    try {
      archiveID = await beginZip();
      for (let index = 0; index < ready.length; index++) {
        if (stopped.current) break;
        const item = ready[index];
        await addToZip(archiveID, item.file.name, item.result!.blob);
        setExportProgress({ done: index + 1, total: ready.length });
      }
      if (stopped.current) {
        await cancelZip(archiveID); archiveID = undefined;
        setNotice('已取消打包，未保存压缩包。已处理图片仍可重新导出。');
      } else {
        const path = await finishZip(archiveID); archiveID = undefined;
        const ids = new Set(ready.map(item => item.id));
        update(rows => rows.map(item => ids.has(item.id) ? { ...item, savedPath: path } : item));
        const skipped = current.current.length - ready.length;
        setNotice(`已保存 1 个 ZIP 压缩包，包含 ${ready.length} 张图片。${skipped ? `${skipped} 张未完成或失败的图片未加入。` : ''}`);
      }
    } catch (error) {
      setNotice(`打包失败：${error instanceof Error ? error.message : '无法保存压缩包'}。已处理图片保留，可以重试。`);
    } finally {
      if (archiveID) {
        try { await cancelZip(archiveID); }
        catch (error) { setNotice(`清理临时压缩包失败：${error instanceof Error ? error.message : '请检查输出文件夹'}`); }
      }
      lock.current = false;
      if (mounted.current) setBusy(null);
    }
  }
  return { items, busy, notice, parallelism, exportProgress, setNotice, add, remove, invalidate, run, exportAll, stop: () => { stopped.current = true; cancelCompression.current?.(); } };
}
