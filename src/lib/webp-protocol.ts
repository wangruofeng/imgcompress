export interface EncodeRequest {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  quality: number;
  lossless: boolean;
}
export type EncodeReply = { buffer: ArrayBuffer; error?: never } | { error: string; buffer?: never };
