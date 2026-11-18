import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from './Icon';
import { size, type ImageItem } from '../lib/types';

export function Preview({ item, close }: { item: ImageItem; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [split, setSplit] = useState(50);
  const result = item.result;
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={ref} className="preview" aria-labelledby="preview-title" onCancel={close}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <header>
      <h2 id="preview-title" title={item.file.name}>{item.file.name}</h2>
      <button className="icon-button" aria-label="关闭预览" onClick={close}><Icon name="close" size={20}/></button>
    </header>
    {result ? <>
      <div className="compare-stage checker" style={{ '--split': split + '%' } as CSSProperties}>
        <img className="compare-before" src={item.url} alt="压缩前" draggable={false}/>
        <img className="compare-after" src={result.url} alt="压缩后" draggable={false}/>
        <input className="compare-range" type="range" min="0" max="100" value={split}
          aria-label="压缩前后对比" aria-valuetext={`压缩前 ${split}%，压缩后 ${100 - split}%`}
          onChange={event => setSplit(event.currentTarget.valueAsNumber)}/>
        <div className="compare-divider" aria-hidden="true"><span><Icon name="compare" size={18}/></span></div>
      </div>
      <div className="compare-caption"><span>压缩前 <strong>{size(item.file.size)}</strong></span><span>压缩后 <strong>{size(result.blob.size)}</strong></span></div>
      <p>左右拖动查看同一位置的变化，也可选中滑杆后使用 ← → 微调。</p>
    </> : <figure><div className="preview-image checker"><img src={item.url} alt="原始图片"/></div><figcaption>原图 <span>{size(item.file.size)}</span></figcaption></figure>}
  </dialog>;
}
