import { pngChunks } from './formats.ts';

/** Strip ancillary text only. Frame/compositing/colour/control data is byte-identical. */
export function optimizeAPNG(data:Uint8Array):Uint8Array {
  const chunks=pngChunks(data),removed=new Set(['tEXt','zTXt','iTXt','tIME']);
  if(!chunks.some(c=>c.type==='acTL'))throw new Error('不是 APNG 动画');
  const parts=[data.subarray(0,8),...chunks.filter(c=>!removed.has(c.type)).map(c=>data.subarray(c.start,c.end))];
  return join(parts);
}
function join(parts:Uint8Array[]):Uint8Array {
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;
  for(const part of parts){result.set(part,offset);offset+=part.length}return result;
}
/** Only comment extensions are removed; image/LZW/control/loop blocks are preserved. */
export function optimizeGIF(data:Uint8Array):Uint8Array {
  if(data.length<13)throw new Error('GIF 文件损坏');
  let offset=13+((data[10]&128)?3*(1<<((data[10]&7)+1)):0),frames=0;
  if(offset>data.length)throw new Error('GIF 调色板损坏');
  const parts=[data.subarray(0,offset)];
  const blocks=()=>{while(offset<data.length){const length=data[offset++];if(length===0)return;offset+=length;if(offset>data.length)throw new Error('GIF 数据块不完整')}throw new Error('GIF 数据块未结束')};
  while(offset<data.length){
    const start=offset,kind=data[offset++];
    if(kind===0x3b){if(!frames)throw new Error('GIF 缺少图像帧');parts.push(data.subarray(start,offset));return join(parts)}
    if(kind===0x21){if(offset>=data.length)throw new Error('GIF 扩展损坏');const label=data[offset++];blocks();if(label!==0xfe)parts.push(data.subarray(start,offset));}
    else if(kind===0x2c){
      if(offset+9>data.length)throw new Error('GIF 帧损坏');
      const packed=data[offset+8];offset+=9;if(packed&128)offset+=3*(1<<((packed&7)+1));
      if(offset>=data.length)throw new Error('GIF 帧调色板损坏');offset++;blocks();frames++;parts.push(data.subarray(start,offset));
    }else throw new Error('GIF 块类型无效');
  }
  throw new Error('GIF 文件缺少结束标记');
}
