import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { size, type ImageItem } from '../lib/types';
export function Preview({ item, close }: { item: ImageItem; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="preview" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <header><h2 title={item.file.name}>{item.file.name}</h2><button className="icon-button" aria-label="关闭预览" onClick={close} autoFocus><X size={20}/></button></header>
    <div className={`preview-grid ${item.result ? '' : 'single'}`}><figure><div className="preview-image checker"><img src={item.url} alt="原始图片"/></div><figcaption>原图 <span>{size(item.file.size)}</span></figcaption></figure>{item.result && <figure><div className="preview-image checker"><img src={item.result.url} alt="处理后的图片"/></div><figcaption>处理后 <span>{size(item.result.blob.size)}</span></figcaption></figure>}</div>
    <p>预览已适应窗口显示，实际输出尺寸保持所选设置。</p>
  </dialog>;
}
