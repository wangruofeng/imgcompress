import { Desktop } from '../generated/mygo';
export const isDesktop = () => Boolean(window.mygo);
export const chooseOutput = () => Desktop.chooseOutput();
export const reveal = (path: string) => Desktop.reveal(path);
export const beginZip = () => Desktop.beginZip();
export const finishZip = (id: string) => Desktop.finishZip(id);
export const cancelZip = (id: string) => Desktop.cancelZip(id);
export async function addToZip(id: string, name: string, blob: Blob): Promise<void> {
  const encoded = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') reject(new Error('无法读取输出图片'));
      else resolve(reader.result.slice(reader.result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('无法读取输出图片'));
    reader.readAsDataURL(blob);
  });
  return Desktop.addZip(id, name, blob.type, encoded);
}
