import encodeWebp, { init as initWebp } from '@jsquash/webp/encode';
import wasmURL from '@jsquash/webp/codec/enc/webp_enc.wasm?url';
import simdWasmURL from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url';
import { simd } from 'wasm-feature-detect';
import type { EncodeReply, EncodeRequest } from './webp-protocol';

// Each worker owns its WASM instance and processes one message at a time.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<EncodeRequest>) => void) | null;
  postMessage(message: EncodeReply, transfer?: Transferable[]): void;
};
let initialized: Promise<unknown> | undefined;
scope.onmessage = async ({ data }) => {
  try {
    initialized ??= (async () => {
      const response = await fetch(await simd() ? simdWasmURL : wasmURL);
      if (!response.ok) throw new Error('无法加载本地 WebP 编码器');
      const module = await WebAssembly.compile(await response.arrayBuffer());
      await initWebp(module as unknown as Parameters<typeof initWebp>[0]);
    })().catch(error => { initialized = undefined; throw error; });
    await initialized;
    const buffer = await encodeWebp({ data: data.pixels, width: data.width, height: data.height, colorSpace: 'srgb' }, {
      quality: data.quality * 100, lossless: data.lossless ? 1 : 0,
      method: 4, exact: data.lossless ? 1 : 0,
    });
    scope.postMessage({ buffer }, [buffer]);
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : 'WebP 编码失败' });
  }
};
