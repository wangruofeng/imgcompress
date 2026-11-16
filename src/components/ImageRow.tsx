import { Check, CircleAlert, Eye, FolderOpen, LoaderCircle, X } from 'lucide-react';
import { formatName, size, type ImageItem } from '../lib/types';
interface Props { item: ImageItem; disabled: boolean; remove: () => void; preview: () => void; reveal: () => void }
export function ImageRow({ item, disabled, remove, preview, reveal }: Props) {
  const result = item.result;
  const ratio = result ? (1 - result.blob.size / item.file.size) * 100 : 0;
  return <li className={`image-row ${item.status}`}>
    <button className="thumbnail checker" onClick={preview} aria-label={`预览 ${item.file.name}`}><img src={item.url} alt=""/><span><Eye size={17}/></span></button>
    <div className="image-info"><button className="filename" title={item.file.name} onClick={preview}>{item.file.name}</button><div className="image-detail">{size(item.file.size)}{result && <> <span className="arrow">→</span> <strong>{size(result.blob.size)}</strong> <span>· {formatName(result.blob.type)} · {result.width} × {result.height}</span></>}</div>{item.error && <p className="row-error"><CircleAlert size={12}/>{item.error}</p>}</div>
    <div className="row-state">{item.status === 'pending' && <span className="muted">待处理</span>}{item.status === 'processing' && <span className="processing-label"><LoaderCircle size={14} className="spin"/>处理中</span>}{result && <><span className={`badge ${ratio > 0 ? 'saved' : ''}`}>{result.keptOriginal ? '已是较小体积' : ratio > 0 ? `−${ratio.toFixed(1)}%` : `+${Math.abs(ratio).toFixed(1)}%`}</span>{item.savedPath && <span className="exported"><Check size={12}/>已打包</span>}</>}</div>
    {item.savedPath && <button className="icon-button" aria-label={`在 Finder 中查看包含 ${item.file.name} 的 ZIP`} onClick={reveal}><FolderOpen size={16}/></button>}
    <button className="icon-button remove" disabled={disabled} onClick={remove} aria-label={`移除 ${item.file.name}`}><X size={16}/></button>
  </li>;
}
