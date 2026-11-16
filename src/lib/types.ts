export type Format = 'auto' | 'image/jpeg' | 'image/png' | 'image/webp';
export interface Settings { quality: number; format: Format; maxWidth: number; lossless: boolean }
export interface Result { blob: Blob; url: string; width: number; height: number; keptOriginal: boolean }
export interface ImageItem {
  id: string; file: File; url: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: Result; error?: string; savedPath?: string;
}
export const defaults: Settings = { quality: 0.8, format: 'auto', maxWidth: 0, lossless: false };
export const formatName = (mime: string) => ({ 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' })[mime] ?? mime;
export function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
export function dimensions(width: number, height: number, maxWidth: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('图片尺寸无效');
  const ratio = maxWidth > 0 ? Math.min(1, maxWidth / width) : 1;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}
