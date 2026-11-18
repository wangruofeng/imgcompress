(async()=>{
 const wait=async fn=>{const t=performance.now();while(!fn()){if(performance.now()-t>20000)throw Error('timeout');await new Promise(r=>setTimeout(r,20))}};
 const clear=document.querySelector('[aria-label="清空图片队列"]');clear?.click();await new Promise(r=>setTimeout(r,20));
 const select=document.querySelector('#format');select.value='image/webp';select.dispatchEvent(new Event('change',{bubbles:true}));
 const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');
 const dt=new DataTransfer();
 for(const [name,color] of [['photo.png','#dd4400'],['photo.jpg','#0044dd'],['图像.png','#00aa44']]){
  x.fillStyle=color;x.fillRect(0,0,640,480);const b=await new Promise(r=>c.toBlob(r,'image/png'));dt.items.add(new File([b],name,{type:'image/png'}));
 }
 const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
 await wait(()=>document.querySelectorAll('.image-row').length===3);
 document.querySelector('#process-images').click();
 await wait(()=>document.querySelectorAll('.image-row.done').length===3);
 if(document.querySelectorAll('.image-row.error').length)throw Error('compression failed');
 return {ready:3,button:document.querySelector('#export-images').textContent};
})()
