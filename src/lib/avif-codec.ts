import createEncoder from '@jsquash/avif/codec/enc/avif_enc.js';
import createDecoder from '@jsquash/avif/codec/dec/avif_dec.js';
import { initEmscriptenModule } from '@jsquash/avif/utils.js';
import { defaultOptions } from '@jsquash/avif/meta.js';
import encodeURL from '@jsquash/avif/codec/enc/avif_enc.wasm?url';
import decodeURL from '@jsquash/avif/codec/dec/avif_dec.wasm?url';

let encoder:ReturnType<typeof initEncoder>|undefined;
let decoder:ReturnType<typeof initDecoder>|undefined;
async function moduleAt(url:string){const r=await fetch(url);if(!r.ok)throw new Error('无法加载本地 AVIF 编解码器');return WebAssembly.compile(await r.arrayBuffer())}
async function initEncoder(){return initEmscriptenModule(createEncoder,await moduleAt(encodeURL))}
async function initDecoder(){return initEmscriptenModule(createDecoder,await moduleAt(decodeURL))}
export async function encodeAVIF(pixels:Uint8ClampedArray<ArrayBuffer>,width:number,height:number,quality:number):Promise<ArrayBuffer>{
  encoder??=initEncoder().catch(e=>{encoder=undefined;throw e});
  const result=(await encoder).encode(pixels,width,height,{...defaultOptions,quality:quality*100,speed:8});
  if(!result)throw new Error('AVIF 编码失败');return result.slice().buffer;
}
export async function decodeAVIF(buffer:ArrayBuffer):Promise<ImageData>{
  decoder??=initDecoder().catch(e=>{decoder=undefined;throw e});
  const result=(await decoder).decode(buffer,8);
  if(!result)throw new Error('AVIF 解码失败');
  if(result.width*result.height>40_000_000)throw new Error('AVIF 超过 4000 万像素');
  return result;
}
