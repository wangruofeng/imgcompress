(async () => {
  const results = [];
  const check = (name, passed, detail = '') => { results.push({ name, passed, detail }); if (!passed) throw new Error(`${name}: ${detail}`); };
  const wait = async (condition, ms = 30000) => {
    const start = performance.now();
    while (!condition()) { if (performance.now() - start > ms) throw new Error('queue test timed out'); await new Promise(r => setTimeout(r, 10)); }
  };
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
  const clear = document.querySelector('[aria-label="清空图片队列"]'); clear?.click();
  await new Promise(r => setTimeout(r, 20));
  const select = document.querySelector('#format'); select.value = 'image/webp'; select.dispatchEvent(new Event('change', { bubbles: true }));
  const width = document.querySelector('#width'); width.value = '0'; width.dispatchEvent(new Event('change', { bubbles: true }));
  const c = document.createElement('canvas'); c.width = 1800; c.height = 1200;
  const x = c.getContext('2d'), data = x.createImageData(c.width, c.height);
  let seed = 97;
  for (let i=0; i<data.data.length; i+=4) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; data.data[i]=seed&255; data.data[i+1]=(seed>>>8)&255; data.data[i+2]=(seed>>>16)&255; data.data[i+3]=255; }
  x.putImageData(data,0,0);
  const blob = await new Promise(r => c.toBlob(r,'image/png'));
  const transfer = new DataTransfer();
  for (let i=0;i<4;i++) transfer.items.add(new File([blob],`parallel-${i}.png`,{ type:'image/png' }));
  transfer.items.add(new File(['broken'],'broken.png',{type:'image/png'}));
  const input = document.querySelector('input[type=file]'); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));
  await wait(() => document.querySelectorAll('.image-row').length === 5);
  button('开始处理').click();
  await wait(() => document.querySelectorAll('.image-row.processing').length === 2);
  check('两张图片同时处理中',true);
  await new Promise(r=>setTimeout(r,50));
  button('停止').click();
  await wait(() => !button('停止'));
  check('停止后没有悬挂的处理中状态',document.querySelectorAll('.image-row.processing').length===0);
  check('停止后未完成图片恢复待处理',document.querySelectorAll('.image-row.pending').length>0);
  const savedDone = document.querySelectorAll('.image-row.done').length;
  const restart = button('继续处理') || button('重试未完成') || button('开始处理'); restart.click();
  await wait(() => button('停止'));
  let peak = document.querySelectorAll('.image-row.processing').length;
  const poll = setInterval(()=>{peak=Math.max(peak,document.querySelectorAll('.image-row.processing').length)},5);
  await wait(()=>!button('停止')); clearInterval(poll);
  check('并发数不超过 2',peak<=2 && peak>0,`${peak}`);
  check('停止后重新处理成功',document.querySelectorAll('.image-row.done').length===4);
  check('损坏图片失败隔离',document.querySelectorAll('.image-row.error').length===1);
  check('列表顺序不受完成顺序影响',[...document.querySelectorAll('.filename')].map(e=>e.textContent).join(',')==='parallel-0.png,parallel-1.png,parallel-2.png,parallel-3.png,broken.png');
  check('完成结果可导出',button('导出 ZIP') && !button('导出 ZIP').disabled);
  return { results, previouslyDone: savedDone };
})()
