(async()=>{
 const {createCompressor,inspect}=await import('/src/lib/compress.ts');
 const {WebpPool}=await import('/src/lib/webp-pool.ts');
 const {optimizeSVG}=await import('/src/lib/svg.ts');
 const session=createCompressor(2),decoder=new WebpPool(1),checks=[],outputs=[];
 const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name)};
 const settings={quality:.8,format:'image/avif',maxWidth:0,lossless:false};
 const base64=async blob=>{const bytes=new Uint8Array(await blob.arrayBuffer());let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text)};
 const collect=async(name,result)=>{outputs.push({name,mime:result.blob.type,data:await base64(result.blob)});URL.revokeObjectURL(result.url)};
 try{
  const c=document.createElement('canvas');c.width=96;c.height=64;const x=c.getContext('2d');x.fillStyle='#e07433';x.fillRect(0,0,48,64);
  const png=await new Promise(r=>c.toBlob(r,'image/png')),file=new File([png],'sample.png',{type:'image/png'});
  const avif=await session.compress(file,settings);
  check('AVIF 输出真实格式',inspect(new Uint8Array(await avif.blob.arrayBuffer()))==='image/avif');
  const pixels=await decoder.decode(await avif.blob.arrayBuffer());
  check('AVIF WASM 解码尺寸',pixels.width===96&&pixels.height===64);
  check('AVIF 保留透明区域',pixels.data[(40*96+80)*4+3]===0);
  const decoded=await session.compress(new File([avif.blob],'sample.avif',{type:'image/avif'}),{...settings,format:'image/png'});
  check('AVIF 输入转 PNG',decoded.blob.type==='image/png'&&decoded.width===96&&decoded.height===64);
  for(const format of ['image/jpeg','image/webp','image/avif']){
    const converted=await session.compress(new File([avif.blob],'input.avif',{type:'image/avif'}),{...settings,format});
    check(`AVIF 输入转换 ${format}`,inspect(new Uint8Array(await converted.blob.arrayBuffer()))===format);
    if(format==='image/jpeg'||format==='image/webp')await collect(format==='image/jpeg'?'converted.jpg':'converted.webp',converted);else URL.revokeObjectURL(converted.url);
  }
  const jpeg=await new Promise(r=>c.toBlob(r,'image/jpeg',.9));
  const jpgAvif=await session.compress(new File([jpeg],'photo.jpg',{type:'image/jpeg'}),settings);
  check('JPG 输入转换 AVIF',inspect(new Uint8Array(await jpgAvif.blob.arrayBuffer()))==='image/avif');URL.revokeObjectURL(jpgAvif.url);
  await collect('roundtrip.png',decoded);await collect('sample.avif',avif);
  const svg='<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><!-- comment to remove --><metadata>editor metadata</metadata><defs><linearGradient id="paint"><stop stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="96" height="64" fill="url(#paint)"/></svg>';
  const vector=await session.compress(new File([svg],'sample.svg',{type:'image/svg+xml'}),settings);
  const text=await vector.blob.text();
  check('SVG 保留矢量与 viewBox/ID 引用',vector.blob.type==='image/svg+xml'&&text.includes('viewBox')&&text.includes('id="paint"')&&text.includes('url(#paint)'));
  check('SVG 移除注释元数据',!text.includes('metadata')&&!text.includes('comment to remove'));
  await collect('sample.svg',vector);
  let rejected=false;try{await optimizeSVG('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')}catch{rejected=true}check('SVG 拒绝脚本',rejected);
  const fixtures=await fetch('/scripts/fixtures/animation.json').then(r=>r.json());
  for(const kind of ['gif','apng']){
   const bytes=Uint8Array.from(atob(fixtures[kind]),c=>c.charCodeAt(0));
   const result=await session.compress(new File([bytes],`sample.${kind}`,{type:`image/${kind}`}),{...settings,maxWidth:1,lossless:true});
   check(`${kind} 保留原格式与动画`,result.blob.type===`image/${kind}`&&result.preserved==='animation');
   check(`${kind} 不缩放或转成静态图`,result.width===32&&result.height===24);
   check(`${kind} 删除附加元数据后体积减小`,result.blob.size<bytes.length);
   await collect(`sample.${kind}`,result);
  }
  return {checks,outputs};
 }finally{session.dispose();decoder.dispose()}
})()
