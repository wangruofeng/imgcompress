import { useEffect, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { ImageRow } from './components/ImageRow';
import { Preview } from './components/Preview';
import { SettingsPanel } from './components/SettingsPanel';
import { chooseOutput, isDesktop, reveal, saveImage } from './lib/desktop';
import { parseParallelism } from './lib/parallelism';
import { formatDuration } from './lib/timing';
import { defaults, formatName, size, type ImageItem, type Settings } from './lib/types';
import { useQueue } from './lib/useQueue';

const shortcutKey = /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';

function readSettings(): Settings {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('settings') ?? 'null');
    if (saved && typeof saved === 'object' && 'quality' in saved && 'format' in saved && 'maxWidth' in saved && 'lossless' in saved && typeof saved.quality === 'number' && saved.quality >= 0.1 && saved.quality <= 1 && ['auto', 'image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(String(saved.format)) && [0, 800, 1280, 1920, 2560].includes(Number(saved.maxWidth)) && typeof saved.lossless === 'boolean') return {...saved as Settings,parallelism:parseParallelism('parallelism' in saved?saved.parallelism:undefined)};
  } catch (error) { console.warn('无法读取设置', error); }
  return defaults;
}
export default function App() {
  const queue = useQueue();
  const [settings, setSettings] = useState(readSettings);
  const [output, setOutput] = useState('');
  const [savingImage, setSavingImage] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [previewId, setPreviewId] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [dark, setDark] = useState(() => {
    try { const value = localStorage.getItem('theme'); return value ? value === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
  });
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const busy = Boolean(queue.busy) || choosing || savingImage;
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
  useEffect(() => {
    function paste(event: ClipboardEvent) {
      if (busy || preview || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('textarea, input:not([type]), input[type="text"], input[type="search"]'))) return;
      const data = event.clipboardData;
      if (!data) return;
      const files = Array.from(data.files);
      if (!files.length) {
        for (const item of Array.from(data.items)) {
          const file = item.kind === 'file' ? item.getAsFile() : null;
          if (file) files.push(file);
        }
      }
      if (!files.length) return;
      event.preventDefault();
      queue.add(files.map(file => {
        if (/\.[^.]+$/.test(file.name)) return file;
        const extension = formatName(file.type).toLowerCase();
        if (!['jpg', 'png', 'webp', 'avif', 'svg', 'gif', 'apng'].includes(extension)) return file;
        return new File([file], (file.name || '粘贴图片') + '.' + extension, {
          type: file.type, lastModified: file.lastModified,
        });
      }));
    }
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [busy, preview, queue.add]);
  function change(next: Settings) {
    if (busy) return;
    if(next.quality!==settings.quality||next.format!==settings.format||next.maxWidth!==settings.maxWidth||next.lossless!==settings.lossless)queue.invalidate();
    setSettings(next);
    try { localStorage.setItem('settings', JSON.stringify(next)); } catch (error) { console.warn('无法保存设置', error); }
  }
  async function selectOutput() {
    if (busy) return '';
    setChoosing(true);
    try { const dir = await chooseOutput(); if (dir) setOutput(dir); return dir; }
    catch (error) { queue.setNotice(error instanceof Error ? error.message : '无法选择输出位置'); return ''; }
    finally { setChoosing(false); }
  }
  async function downloadImage(item: ImageItem) {
    if (busy || !item.result) return;
    const blob = item.result.blob;
    if (!isDesktop()) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const stem = item.file.name.replace(/\.[^.]+$/, '') || 'image';
      link.download = stem + '-compressed.' + formatName(blob.type).toLowerCase();
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      return;
    }
    if (!output && !await selectOutput()) return;
    setSavingImage(true);
    try {
      const path = await saveImage(item.file.name, blob);
      queue.setNotice(`图片已保存至 ${path}`);
    } catch (error) {
      queue.setNotice(error instanceof Error ? error.message : '图片保存失败');
    } finally {
      setSavingImage(false);
    }
  }
  async function exportImages() {
    if (busy) return;
    if (!output && !await selectOutput()) return;
    await queue.exportAll();
  }
  async function showInFolder(path: string) {
    try { await reveal(path); } catch (error) { queue.setNotice(error instanceof Error ? error.message : '无法打开所在文件夹'); }
  }
  return <div className="app-shell" onDragEnter={e => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) { dragDepth.current++; if (!busy) setDragging(true); } }} onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setDragging(false); }} onDrop={e => { e.preventDefault(); dragDepth.current = 0; setDragging(false); if (!busy) queue.add(Array.from(e.dataTransfer.files)); }}>
    <header className="app-header"><div className="app-mark"><img src="./logo.svg" alt="ImgCompress"/></div><div className="brand"><h1>ImgCompress</h1><span>图片压缩与格式转换</span></div><div className="header-actions"><span className="local-label"><Icon name="privacy" size={14}/>本地处理</span><button className="icon-button theme-toggle" onClick={() => setDark(!dark)} aria-label={dark ? '切换浅色模式' : '切换深色模式'}>{dark ? <Icon name="sun" size={18}/> : <Icon name="moon" size={18}/>}</button></div></header>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,image/gif,image/apng,.jpg,.jpeg,.png,.webp,.avif,.svg,.gif,.apng" multiple hidden onChange={e => { queue.add(Array.from(e.target.files ?? [])); e.target.value = ''; }}/>
    <main className="workspace"><section className="queue-panel" aria-label="图片队列">
      <div className="queue-toolbar"><div><h2>图片队列 <span className="count">{queue.items.length}</span></h2><p>{queue.items.length ? "点击任意图片行查看预览" : "添加需要处理的图片"}</p></div><div className="toolbar-actions">{queue.items.length > 0 && <button className="icon-button" disabled={busy} onClick={() => { queue.remove(); setPreviewId(undefined); }} aria-label="清空图片队列"><Icon name="trash" size={16}/></button>}<button className="button secondary" disabled={busy} onClick={() => input.current?.click()}><Icon name="add" size={15}/>添加图片 <kbd>{shortcutKey} O</kbd></button></div></div>
      {queue.items.length === 0 ? <div className="empty-state"><button className="dropzone" onClick={() => input.current?.click()}><img className="import-art" src="./import-landscape.svg" alt="" draggable={false}/><strong>把图片拖到这里</strong><span>点击选择文件，或按 {shortcutKey} V 粘贴</span><span className="format-tags"><i>PNG</i><i>JPG</i><i>WebP</i><i>AVIF</i><i>SVG</i><i>GIF</i><i>APNG</i></span><span className="drop-limit">支持批量添加 · 单张最大 100 MB</span></button></div> : <><ul className="image-list">{queue.items.map(item => <ImageRow now={queue.now} key={item.id} item={item} download={() => void downloadImage(item)} disabled={busy} remove={() => queue.remove(item.id)} preview={() => setPreviewId(item.id)} reveal={() => item.savedPath && void showInFolder(item.savedPath)}/>)}</ul><button className="add-more" disabled={busy} onClick={() => input.current?.click()}><Icon name="image" size={18}/>点击、拖入或粘贴图片 <kbd>{shortcutKey} V</kbd></button></>}
      <div className="queue-summary"><span>{done.length ? <><Icon name="done" size={14}/>{done.length} 张已完成{queue.items.some(item => item.status === 'error') && ' · 有图片处理失败'}</> : <>支持矢量与动画 · 保留原文件</>}</span><span>离线可用</span></div>
    </section><SettingsPanel pendingCount={queue.items.filter(item=>item.status!=='done').length} settings={settings} change={change} disabled={busy} output={output} choose={() => void selectOutput()}/></main>
    {queue.notice && <div className="notice" role="status"><span>{queue.notice}</span><button className="icon-button" onClick={() => queue.setNotice('')} aria-label="关闭提示"><Icon name="close" size={14}/></button></div>}
    {!isDesktop() && <div className="browser-note">当前为网页预览；保存到文件夹和定位文件功能请在桌面应用中使用。</div>}
    <footer className="app-footer"><div className="totals">{done.length ? <><strong>{size(before)} <Icon name="next" size={14}/> {size(after)}</strong><span>{saving > 0 ? <>共节省 <em>{size(saving)}</em>{before > 0 && ` · ${(saving / before * 100).toFixed(1)}%`}</> : '转换已完成，结果可导出'}</span></> : <><strong>{queue.items.length ? (queue.busy === 'process' ? '正在处理图片' : '待处理 · ' + queue.items.length + ' 张图片') : '等待添加图片'}</strong><span>{queue.items.length ? '使用右侧设置处理当前队列' : '可从文件夹拖入多张图片'}</span></>}{(queue.elapsedMs>0||queue.busy==='process')&&<span className="batch-timing" title="并发处理的实际累计时间，不含暂停和 ZIP 导出">累计处理耗时 {formatDuration(queue.elapsedMs)}</span>}</div><div className="footer-actions">{queue.busy ? <><div className="progress-wrap"><span>{queue.busy === 'export' ? `正在打包 ZIP · ${queue.exportProgress.done} / ${queue.exportProgress.total}` : `并发 ${queue.parallelism} 路 · ${done.length} / ${queue.items.length}`}</span><progress max={Math.max(1, queue.busy === 'export' ? queue.exportProgress.total : queue.items.length)} value={queue.busy === 'export' ? queue.exportProgress.done : queue.items.filter(item => item.status === 'done' || item.status === 'error').length}/></div><button className="button secondary" onClick={queue.stop}><Icon name="stop" size={13}/>停止</button></> : <><button id="process-images" className={waiting ? "button primary" : "button secondary"} disabled={!queue.items.length || !waiting || busy} onClick={() => void queue.run(settings)}>{queue.items.some(item => item.status === 'error') ? '重试未完成' : done.length && waiting ? '继续处理' : '开始处理'}</button><button id="export-images" className={waiting ? "button secondary" : "button primary"} disabled={!unsaved.length || busy || !isDesktop()} onClick={() => void exportImages()}><Icon name="export" size={16}/>{done.length && !unsaved.length ? '已打包保存' : `导出 ZIP${done.length ? ` · ${done.length}` : ''}`}</button></>}</div></footer>
    {dragging && <div className="drag-overlay"><Icon name="image" size={48}/><strong>松开，添加到图片队列</strong></div>}
    {preview && <Preview item={preview} close={() => setPreviewId(undefined)}/>}
  </div>;
}
