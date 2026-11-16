export interface FormatInfo { mime: string; preserve?: 'vector' | 'animation'; width?: number; height?: number }
const text = (data: Uint8Array, start: number, length: number) => String.fromCharCode(...data.subarray(start,start+length));
export interface PngChunk { type: string; start: number; end: number }
export function pngChunks(data: Uint8Array): PngChunk[] {
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength), chunks:PngChunk[]=[];
  let offset=8;
  while(offset+12<=data.length){
    const length=view.getUint32(offset),type=text(data,offset+4,4),end=offset+12+length;
    if(end>data.length || !/^[A-Za-z]{4}$/.test(type))throw new Error('PNG 数据块损坏');
    if(chunks.length===0 && (type!=='IHDR'||length!==13))throw new Error('PNG 头部损坏');
    chunks.push({type,start:offset,end});offset=end;
    if(type==='IEND'){
      if(length!==0 || !chunks.some(c=>c.type==='IDAT'))throw new Error('PNG 缺少图片数据');
      return chunks;
    }
  }
  throw new Error('PNG 文件不完整');
}
export function avifBrand(data: Uint8Array): boolean {
  if(data.length<20 || text(data,4,4)!=='ftyp')return false;
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength),end=view.getUint32(0);
  if(end<20 || end>data.length)throw new Error('AVIF 文件头损坏');
  const brands=[text(data,8,4)];
  for(let i=16;i+4<=end;i+=4)brands.push(text(data,i,4));
  if(brands.includes('avis'))throw new Error('暂不支持 AVIF 动画序列');
  return brands.includes('avif');
}
export function identify(data: Uint8Array): FormatInfo {
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength);
  if(data.length>=8 && text(data,0,8)==='\x89PNG\r\n\x1a\n'){
    const chunks=pngChunks(data),animated=chunks.some(c=>c.type==='acTL');
    return {mime:animated?'image/apng':'image/png',preserve:animated?'animation':undefined,width:view.getUint32(16),height:view.getUint32(20)};
  }
  if(data.length>=13 && ['GIF87a','GIF89a'].includes(text(data,0,6)))return {mime:'image/gif',preserve:'animation',width:view.getUint16(6,true),height:view.getUint16(8,true)};
  if(data.length>=3 && data[0]===255 && data[1]===216 && data[2]===255)return {mime:'image/jpeg'};
  if(data.length>=12 && text(data,0,4)==='RIFF' && text(data,8,4)==='WEBP'){
    for(let offset=12;offset+8<=data.length;){
      const kind=text(data,offset,4),length=view.getUint32(offset+4,true);
      if(offset+8+length>data.length)throw new Error('WebP 数据块损坏');
      if(kind==='ANIM'||kind==='ANMF'||(kind==='VP8X'&&length>0&&(data[offset+8]&2)))throw new Error('暂不支持动画 WebP，请使用 GIF 或 APNG');
      offset+=8+length+(length%2);
    }
    return {mime:'image/webp'};
  }
  if(avifBrand(data))return {mime:'image/avif'};
  const prefix=new TextDecoder().decode(data.subarray(0,4096)).replace(/^\uFEFF/,'').trimStart();
  if(/^(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(prefix))return {mime:'image/svg+xml',preserve:'vector'};
  throw new Error('仅支持 JPG、PNG、WebP、AVIF、SVG、GIF、APNG');
}
