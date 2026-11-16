(async () => {
  const module = await import('/src/lib/compress.ts');
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(canvas.width, canvas.height);
  let seed = 42;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = (i / 4) % canvas.width, y = Math.floor(i / 4 / canvas.width);
    pixels.data[i] = (x / 9 + (seed & 31)) % 256;
    pixels.data[i + 1] = (y / 6 + ((seed >> 5) & 31)) % 256;
    pixels.data[i + 2] = ((x + y) / 12 + ((seed >> 10) & 31)) % 256;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'benchmark.png', { type: 'image/png' });
  const settings = { quality: .8, format: 'image/webp', maxWidth: 0, lossless: false };
  const run = async (concurrency) => {
    const session = module.createCompressor?.(concurrency);
    const compress = session ? session.compress : module.compress;
    const warm = await Promise.all(Array.from({ length: concurrency }, () => compress(file, settings)));
    warm.forEach(result => URL.revokeObjectURL(result.url));
    let maxLag = 0, last = performance.now();
    const timer = setInterval(() => { const now = performance.now(); maxLag = Math.max(maxLag, now - last - 16); last = now; }, 16);
    const samples = [];
    try {
      for (let repeat = 0; repeat < 3; repeat++) {
        let next = 0;
        const start = performance.now();
        await Promise.all(Array.from({ length: concurrency }, async () => {
          while (next < 8) { next++; const result = await compress(file, settings); URL.revokeObjectURL(result.url); }
        }));
        samples.push(Math.round(performance.now() - start));
      }
      return { concurrency, images: 8, samplesMs: samples, medianMs: [...samples].sort((a,b)=>a-b)[1], maxMainThreadLagMs: Math.round(maxLag) };
    } finally { clearInterval(timer); session?.dispose(); }
  };
  const output = [];
  output.push(await run(1));
  if (module.createCompressor) output.push(await run(2));
  return output;
})()
