(async()=>{
 const {createCompressor}=await import('/src/lib/compress.ts');const session=createCompressor(8);
 const settings={quality:.8,format:'image/avif',maxWidth:0,lossless:false};
 try{
  const inputs=[];
  for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=96;c.height=64;const x=c.getContext('2d');x.fillStyle=`rgb(${30+i*25},80,150)`;x.fillRect(0,0,96,64);const b=await new Promise(r=>c.toBlob(r,'image/png'));inputs.push(new File([b],`avif-${i}.png`,{type:'image/png'}))}
  const outputs=await Promise.all(inputs.map(file=>session.compress(file,settings)));
  const pixels=await Promise.all(outputs.map(async(result,i)=>{
   if(result.blob.type!=='image/avif')throw Error('unexpected output format');
   const img=new Image();img.src=result.url;await img.decode();const c=document.createElement('canvas');c.width=1;c.height=1;const x=c.getContext('2d');x.drawImage(img,0,0,1,1);const color=x.getImageData(0,0,1,1).data;URL.revokeObjectURL(result.url);
   if(Math.abs(color[0]-(30+i*25))>8||Math.abs(color[1]-80)>8||Math.abs(color[2]-150)>8)throw Error('output association mismatch');return Array.from(color);
  }));
  return {passed:true,concurrency:8,images:outputs.length,pixels};
 }finally{session.dispose()}
})()
