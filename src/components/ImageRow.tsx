import { Icon } from './Icon';
import { formatDuration } from '../lib/timing';
import { formatName, size, type ImageItem } from '../lib/types';
interface Props { now:number; item: ImageItem; disabled: boolean; remove: () => void; preview: () => void; download: () => void; reveal: () => void }
export function ImageRow({ now, item, disabled, remove, preview, reveal, download }: Props) {
  const result = item.result;
  const ratio = result ? (1 - result.blob.size / item.file.size) * 100 : 0;
  return <li className={`image-row ${item.status}`} onClick={event => {
    if (event.target instanceof Element && !event.target.closest("button")) preview();
  }}>
    <span className="thumbnail checker" aria-hidden="true"><img src={item.url} alt=""/><span><Icon name="view" size={17}/></span></span>
    <div className="image-info"><button className="filename" aria-label={`预览 ${item.file.name}`} title={item.file.name} onClick={preview}>{item.file.name}</button><div className="image-detail">{size(item.file.size)}{result && <> <Icon name="next" size={12} className="arrow"/> <strong>{size(result.blob.size)}</strong> <span>· {formatName(result.blob.type)} · {result.width} × {result.height}</span></>}{(item.elapsedMs!==undefined||item.startedAt!==undefined)&&<span className="conversion-time" title="本张图片处理耗时，不含排队和导出">· 耗时 {formatDuration(item.startedAt!==undefined?Math.max(0,now-item.startedAt):item.elapsedMs??0)}</span>}</div>{result?.preserved && <p className="format-note">{result.preserved==='vector'?'保留矢量':'保留动画'} · 原格式优化</p>}{item.error && <p className="row-error"><Icon name="alert" size={12}/>{item.error}</p>}</div>
    <div className="row-state">{item.status === 'pending' && <span className="muted">待处理</span>}{item.status === 'processing' && <span className="processing-label"><Icon name="processing" size={14} className="spin"/>处理中</span>}{result && <><span className={`badge ${ratio > 0 ? 'saved' : ''}`}>{result.keptOriginal ? '已是较小体积' : ratio > 0 ? `−${ratio.toFixed(1)}%` : `+${Math.abs(ratio).toFixed(1)}%`}</span>{item.savedPath && <span className="exported"><Icon name="done" size={12}/>已打包</span>}</>}</div>
    {result && <button className="icon-button" disabled={disabled} onClick={download} title="单独下载" aria-label={`单独下载 ${item.file.name}`}><Icon name="download" size={16}/></button>}
    {item.savedPath && <button className="icon-button" aria-label={`定位包含 ${item.file.name} 的 ZIP`} onClick={reveal}><Icon name="folder" size={16}/></button>}
    <button className="icon-button remove" disabled={disabled} onClick={remove} aria-label={`移除 ${item.file.name}`}><Icon name="close" size={16}/></button>
  </li>;
}
