import { ChevronsUpDown, FolderOpen, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { type CSSProperties } from 'react';
import { type Format, type Settings } from '../lib/types';
interface Props { settings: Settings; change: (next: Settings) => void; disabled: boolean; output: string; choose: () => void }
export function SettingsPanel({ settings, change, disabled, output, choose }: Props) {
  return <aside className="settings-panel">
    <div className="panel-heading"><SlidersHorizontal size={17}/><h2>处理设置</h2></div>
    <fieldset disabled={disabled}>
      <label className="field-label" htmlFor="format">输出格式</label>
      <div className="native-select"><select id="format" value={settings.format} disabled={settings.lossless} onChange={e => change({ ...settings, format: e.target.value as Format })}>
        <option value="auto">智能选择 · 更小的体积</option><option value="image/webp">WebP</option><option value="image/jpeg">JPG</option><option value="image/png">PNG</option>
      </select><ChevronsUpDown size={13} aria-hidden="true"/></div>
      <p className="field-hint">{settings.lossless ? '无损模式输出 WebP，保留解码像素。' : settings.format === 'image/jpeg' ? '透明区域将填充白色背景。' : settings.format === 'image/png' ? 'PNG 为无损编码，体积可能更大。' : '智能模式会在结果变大时保留原文件。'}</p>
      <div className="field-label quality-label"><label htmlFor="quality">图片质量</label><span>{Math.round(settings.quality * 100)}<small>%</small></span></div>
      <input style={{ '--range-progress': `${(settings.quality * 100 - 10) / 90 * 100}%` } as CSSProperties} id="quality" type="range" min="10" max="100" step="1" disabled={settings.lossless || settings.format === 'image/png'} value={Math.round(settings.quality * 100)} onChange={e => change({ ...settings, quality: Number(e.target.value) / 100 })}/>
      <div className="range-labels"><span>体积更小</span><span>画质更好</span></div>
      <div className="presets" role="group" aria-label="图片质量预设">{[60, 80, 95].map((quality, i) => <label key={quality} className={Math.round(settings.quality * 100) === quality ? 'selected' : ''}><input type="radio" name="quality-preset" value={quality} checked={Math.round(settings.quality * 100) === quality} disabled={settings.lossless || settings.format === 'image/png'} onChange={() => change({ ...settings, quality: quality / 100 })}/><span>{['优先体积', '均衡', '优先画质'][i]}</span></label>)}</div>
      <div className="divider"/>
      <label className="field-label" htmlFor="width">最大宽度</label>
      <div className="native-select"><select id="width" value={settings.lossless ? 0 : settings.maxWidth} disabled={settings.lossless} onChange={e => change({ ...settings, maxWidth: Number(e.target.value) })}>
        <option value="0">保持原始尺寸</option><option value="2560">2560 px</option><option value="1920">1920 px</option><option value="1280">1280 px</option><option value="800">800 px</option>
      </select><ChevronsUpDown size={13} aria-hidden="true"/></div>
      <p className="field-hint">按比例缩小，不放大小图。</p>
      <label className="switch-row"><span><strong>无损模式</strong><small>保留像素与原始尺寸</small></span><input type="checkbox" role="switch" checked={settings.lossless} onChange={e => change({ ...settings, lossless: e.target.checked })}/></label>
    </fieldset>
    <div className="divider"/>
    <div className="field-label">输出位置</div>
    <button className="folder-button" disabled={disabled} onClick={choose}><FolderOpen size={17}/><span title={output}>{output ? output.split('/').pop() : '选择输出文件夹'}<small>{output || '仅保存一个 ZIP 压缩包'}</small></span></button>
    <p className="privacy"><ShieldCheck size={15}/><span>图片只在你的 Mac 上处理<br/>无需联网，不上传文件</span></p>
  </aside>;
}
