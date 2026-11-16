(async () => {
  const { createCompressor } = await import('/src/lib/compress.ts');
  const session = createCompressor(2);
  const settings = { format:'image/webp', quality:.8, maxWidth:0, lossless:true };
  const make = async (name, color) => {
    const c=document.createElement('canvas');c.width=640;c.height=480;
    const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,640,480);
    const b=await new Promise(r=>c.toBlob(r,'image/png'));
    return new File([b],name,{type:'image/png'});
  };
  try {
    const inputs = await Promise.all([make('red.png','#ff0000'),make('blue.png','#0000ff')]);
    const outputs = await Promise.all(inputs.map(f=>session.compress(f,settings)));
    const colors = await Promise.all(outputs.map(async result=>{
      const image=new Image();image.src=result.url;await image.decode();
      const c=document.createElement('canvas');c.width=1;c.height=1;const x=c.getContext('2d');x.drawImage(image,0,0,1,1);
      const value=Array.from(x.getImageData(0,0,1,1).data);URL.revokeObjectURL(result.url);return value;
    }));
    if (JSON.stringify(colors)!=='[[255,0,0,255],[0,0,255,255]]') throw new Error(`worker output mismatch: ${JSON.stringify(colors)}`);
    return { passed:true, colors, message:'concurrent outputs retain their own pixels' };
  } finally { session.dispose(); }
})()
