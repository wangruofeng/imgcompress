// Run with native-client.py eval while the e2e app uses the Vite dev server.
(async () => {
  const { compress, inspect } = await import('/src/lib/compress.ts');
  const results = [];
  function check(name, ok, detail = '') {
    results.push({ name, passed: !!ok, detail });
    if (!ok) throw new Error(`${name}: ${detail}`);
  }
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e07433'; ctx.fillRect(0, 0, 48, 64);
  ctx.fillStyle = '#3399cc'; ctx.fillRect(48, 0, 48, 32);
  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const file = new File([png], 'transparency.png', { type: 'image/png' });
  const defaults = { quality: .8, format: 'auto', maxWidth: 0, lossless: false };
  const decode = async blob => {
    const url = URL.createObjectURL(blob); const image = new Image(); image.src = url; await image.decode();
    const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(image, 0, 0); URL.revokeObjectURL(url);
    return { data: x.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
  };
  for (const mime of ['image/jpeg', 'image/png', 'image/webp']) {
    const result = await compress(file, { ...defaults, format: mime });
    check(`显式输出 ${mime}`, result.blob.type === mime && inspect(new Uint8Array(await result.blob.arrayBuffer())) === mime);
    const pixels = await decode(result.blob);
    check(`${mime} 尺寸`, pixels.width === 96 && pixels.height === 64);
    const i = (48 * 96 + 80) * 4;
    check(`${mime} 透明区域`, mime === 'image/jpeg' ? pixels.data[i] > 245 && pixels.data[i+1] > 245 && pixels.data[i+2] > 245 && pixels.data[i+3] === 255 : pixels.data[i+3] === 0);
    URL.revokeObjectURL(result.url);
  }
  const lossless = await compress(file, { ...defaults, lossless: true, maxWidth: 20 });
  const pixels = await decode(lossless.blob);
  const original = ctx.getImageData(0, 0, 96, 64).data;
  check('无损模式保持原尺寸', pixels.width === 96 && pixels.height === 64);
  check('无损 WebP 逐像素一致', pixels.data.every((value, i) => value === original[i]));
  URL.revokeObjectURL(lossless.url);
  const small = await compress(file, { ...defaults, format: 'image/png', maxWidth: 48 });
  check('按比例缩小', small.width === 48 && small.height === 32); URL.revokeObjectURL(small.url);
  const noUpscale = await compress(file, { ...defaults, format: 'image/png', maxWidth: 1920 });
  check('不放大小图', noUpscale.width === 96 && noUpscale.height === 64); URL.revokeObjectURL(noUpscale.url);
  const automatic = await compress(file, defaults);
  check('自动模式不会增大原尺寸图片', automatic.blob.size <= file.size); URL.revokeObjectURL(automatic.url);
  for (const [name, bytes] of [
    ['GIF', new TextEncoder().encode('GIF89a')],
    ['APNG', new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,97,99,84,76,0,0,0,0])],
    ['WebP 动图', new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80,65,78,73,77,0,0,0,0])],
  ]) {
    let rejected = false; try { inspect(bytes); } catch { rejected = true; }
    check(`拒绝 ${name}`, rejected);
  }
  let brokenRejected = false;
  try { await compress(new File(['invalid'], 'broken.png', { type: 'image/png' }), defaults); } catch { brokenRejected = true; }
  check('拒绝损坏图片', brokenRejected);
  window.__codecCheck = results;
  return results;
})()
