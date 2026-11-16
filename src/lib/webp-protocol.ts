export interface EncodeRequest {
  kind:'encode'; mime:'image/webp'|'image/avif';
  pixels: Uint8ClampedArray<ArrayBuffer>;
  width:number; height:number; quality:number; lossless:boolean;
}
export interface DecodeRequest { kind:'decode-avif'; buffer:ArrayBuffer }
export type CodecRequest=EncodeRequest|DecodeRequest;
export type CodecOutput={kind:'encoded';buffer:ArrayBuffer;mime:string}|{kind:'decoded';pixels:Uint8ClampedArray<ArrayBuffer>;width:number;height:number};
export type EncodeReply=CodecOutput|{error:string};
