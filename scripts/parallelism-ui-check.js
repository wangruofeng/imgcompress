(async()=>{
 const checks=[];const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw Error(name)};
 const wait=async f=>{const t=performance.now();while(!f()){if(performance.now()-t>30000)throw Error('timeout');await new Promise(r=>setTimeout(r,5))}};
 const pause=()=>new Promise(r=>setTimeout(r,30));
 const clear=document.querySelector('[aria-label="清空图片队列"]');clear?.click();await pause();
 const change=(id,value)=>{const el=document.querySelector(id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}))};
 change('#parallelism','8');change('#format','image/webp');await pause();
 const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d'),pixels=x.createImageData(1200,800);let seed=42;
 for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels.data[i]=seed&255;pixels.data[i+1]=(seed>>>8)&255;pixels.data[i+2]=(seed>>>16)&255;pixels.data[i+3]=255}
 x.putImageData(pixels,0,0);const blob=await new Promise(r=>c.toBlob(r,'image/png'));
 const dt=new DataTransfer();for(let i=0;i<12;i++)dt.items.add(new File([blob],`parallel-${i}.png`,{type:'image/png'}));
 const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>document.querySelectorAll('.image-row').length===12);
 document.querySelector('#process-images').click();await wait(()=>document.querySelectorAll('.image-row.processing').length===8);
 check('队列实际同时处理 8 张图片',true);
 const stop=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('停止'));stop.click();await wait(()=>!document.querySelector('.progress-wrap'));
 check('8 路停止后无悬挂任务',document.querySelectorAll('.image-row.processing').length===0);
 const before=document.querySelectorAll('.image-row.done').length;change('#parallelism','4');await pause();
 check('改变并发保留已完成结果',document.querySelectorAll('.image-row.done').length===before);
 document.querySelector('#process-images').click();await wait(()=>document.querySelector('.progress-wrap'));
 let peak=document.querySelectorAll('.image-row.processing').length;const timer=setInterval(()=>peak=Math.max(peak,document.querySelectorAll('.image-row.processing').length),5);
 await wait(()=>!document.querySelector('.progress-wrap'));clearInterval(timer);
 check('4 路继续处理不超过上限',peak>0&&peak<=4);
 check('12 张图片全部成功',document.querySelectorAll('.image-row.done').length===12&&document.querySelectorAll('.image-row.error').length===0);
 change('#parallelism','6');await pause();
 check('压缩完成后调并发不清空结果',document.querySelectorAll('.image-row.done').length===12&&!document.querySelector('#export-images').disabled);
 check('并发偏好已持久化',JSON.parse(localStorage.getItem('settings')).parallelism===6);
 return checks;
})()
