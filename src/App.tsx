import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, ImageDown, ImagePlus, Moon, Plus, ShieldCheck, Square, Sun, Trash2, X } from 'lucide-react';
import { ImageRow } from './components/ImageRow';
import { Preview } from './components/Preview';
import { SettingsPanel } from './components/SettingsPanel';
import { chooseOutput, isDesktop, reveal } from './lib/desktop';
import { defaults, size, type Settings } from './lib/types';
import { useQueue } from './lib/useQueue';

function readSettings(): Settings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('settings') ?? 'null');
    if (saved && typeof saved === 'object' && 'quality' in saved && 'format' in saved && 'maxWidth' in saved && 'lossless' in saved && typeof saved.quality === 'number' && saved.quality >= 0.1 && saved.quality <= 1 && ['auto', 'image/jpeg', 'image/png', 'image/webp'].includes(String(saved.format)) && [0, 800, 1280, 1920, 2560].includes(Number(saved.maxWidth)) && typeof saved.lossless === 'boolean') return saved as Settings;
  } catch (error) { console.warn('无法读取设置', error); }
  return defaults;
}
export default function App() {
  const queue = useQueue();
  const [settings, setSettings] = useState(readSettings);
  const [output, setOutput] = useState('');
  const [choosing, setChoosing] = useState(false);
  const [previewId, setPreviewId] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [dark, setDark] = useState(() => {
    try { const value = localStorage.getItem('theme'); return value ? value === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
  });
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const busy = Boolean(queue.busy) || choosing;
  const done = queue.items.filter(item => item.result);
  const waiting = queue.items.some(item => item.status !== 'done');
  const unsaved = done.filter(item => !item.savedPath);
  const before = done.reduce((n, item) => n + item.file.size, 0);
  const after = done.reduce((n, item) => n + (item.result?.blob.size ?? 0), 0);
  const saving = Math.max(0, before - after);
  const preview = queue.items.find(item => item.id === previewId);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) { console.warn('无法保存主题', error); } }, [dark]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); if (!busy && !preview) input.current?.click(); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [busy, preview]);
  function change(next: Settings) {
    if (busy) return;
    queue.invalidate(); setSettings(next);
    try { localStorage.setItem('settings', JSON.stringify(next)); } catch (error) { console.warn('无法保存设置', error); }
  }
  async function selectOutput() {
    if (busy) return '';
    setChoosing(true);
    try { const dir = await chooseOutput(); if (dir) setOutput(dir); return dir; }
    catch (error) { queue.setNotice(error instanceof Error ? error.message : '无法选择输出位置'); return ''; }
    finally { setChoosing(false); }
  }
  async function exportImages() {
    if (busy) return;
    if (!output && !await selectOutput()) return;
    await queue.exportAll();
  }
  async function showInFinder(path: string) {
    try { await reveal(path); } catch (error) { queue.setNotice(error instanceof Error ? error.message : '无法打开 Finder'); }
  }
  return <div className="app-shell" onDragEnter={e => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) { dragDepth.current++; if (!busy) setDragging(true); } }} onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setDragging(false); }} onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (!busy) queue.add(Array.from(e.dataTransfer.files)); }}>
    <header className="app-header"><div className="app-mark"><ImageDown size={22}/></div><div className="brand"><h1>ImgCompress</h1><span>图片轻一点，工作快一点。</span></div><div className="header-actions"><span className="local-label"><ShieldCheck size={14}/>本地处理</span><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? '切换浅色模式' : '切换深色模式'}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div></header>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden onChange={e => { queue.add(Array.from(e.target.files ?? [])); e.target.value = ''; }}/>
    <main className="workspace"><section className="queue-panel" aria-label="图片队列">
      <div className="queue-toolbar"><div><h2>图片队列 <span className="count">{queue.items.length}</span></h2><p>压缩与转换，一次完成。</p></div><div className="toolbar-actions">{queue.items.length > 0 && <button className="icon-button" disabled={busy} onClick={() => { queue.remove(); setPreviewId(undefined); }} aria-label="清空图片队列"><Trash2 size={16}/></button>}<button className="button secondary" disabled={busy} onClick={() => input.current?.click()}><Plus size={15}/>添加图片</button></div></div>
      {queue.items.length === 0 ? <div className="empty-state"><button className="dropzone" onClick={() => input.current?.click()}><span className="empty-art"><span className="image-sheet back"/><span className="image-sheet front"><ImagePlus size={44} strokeWidth={1.3}/></span><span className="plus-dot"><Plus size={16}/></span></span><strong>把图片拖到这里</strong><span>或点击选择图片，开始轻装上阵</span><span className="format-tags"><i>JPG</i><i>PNG</i><i>WebP</i></span><span className="drop-limit">支持批量添加 · 单张最大 100 MB</span></button><div className="empty-note"><ShieldCheck size={15}/><span>你的图片留在你的电脑上。</span></div></div> : <><ul className="image-list">{queue.items.map(item => <ImageRow key={item.id} item={item} disabled={busy} remove={() => queue.remove(item.id)} preview={() => setPreviewId(item.id)} reveal={() => item.savedPath && void showInFinder(item.savedPath)}/>)}</ul><button className="add-more" disabled={busy} onClick={() => input.current?.click()}><ImagePlus size={18}/>继续拖入图片，或点击添加 <kbd>⌘ O</kbd></button></>}
      <div className="queue-summary"><span>{done.length ? <><Check size={14}/>{done.length} 张已完成{queue.items.some(item => item.status === 'error') && ' · 有图片处理失败'}</> : <>支持静态图片 · 保留原文件</>}</span><span>离线可用</span></div>
    </section><SettingsPanel settings={settings} change={change} disabled={busy} output={output} choose={() => void selectOutput()}/></main>
    {queue.notice && <div className="notice" role="status"><span>{queue.notice}</span><button className="icon-button" onClick={() => queue.setNotice('')} aria-label="关闭提示"><X size={14}/></button></div>}
    {!isDesktop() && <div className="browser-note">当前为网页预览；保存到文件夹和 Finder 功能请在 Mac 应用中使用。</div>}
    <footer className="app-footer"><div className="totals">{done.length ? <><strong>{size(before)} <ArrowRight size={14}/> {size(after)}</strong><span>{saving > 0 ? <>共节省 <em>{size(saving)}</em>{before > 0 && ` · ${(saving / before * 100).toFixed(1)}%`}</> : '转换已完成，结果可导出'}</span></> : <><strong>准备好，轻装出发。</strong><span>添加图片后，点击开始处理</span></>}</div><div className="footer-actions">{queue.busy ? <><div className="progress-wrap"><span>{queue.busy === 'export' ? `正在打包 ZIP · ${queue.exportProgress.done} / ${queue.exportProgress.total}` : `并发处理中 · ${done.length} / ${queue.items.length}`}</span><progress max={Math.max(1, queue.busy === 'export' ? queue.exportProgress.total : queue.items.length)} value={queue.busy === 'export' ? queue.exportProgress.done : queue.items.filter(item => item.status === 'done' || item.status === 'error').length}/></div><button className="button secondary" onClick={queue.stop}><Square size={13}/>停止</button></> : <><button className="button secondary" disabled={!queue.items.length || !waiting || choosing} onClick={() => void queue.run(settings)}>{queue.items.some(item => item.status === 'error') ? '重试未完成' : done.length && waiting ? '继续处理' : '开始处理'}<ArrowRight size={15}/></button><button className="button primary" disabled={!unsaved.length || choosing || !isDesktop()} onClick={() => void exportImages()}><ArrowDownToLine size={16}/>{done.length && !unsaved.length ? '已打包保存' : `导出 ZIP${done.length ? ` · ${done.length}` : ''}`}</button></>}</div></footer>
    {dragging && <div className="drag-overlay"><ImagePlus size={48}/><strong>松开，添加到图片队列</strong></div>}
    {preview && <Preview item={preview} close={() => setPreviewId(undefined)}/>}
  </div>;
}
