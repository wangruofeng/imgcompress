/** Claim jobs only when a lane is free; failures belong to the caller per item. */
export async function runConcurrent<T>(
  items: readonly T[], concurrency: number, signal: AbortSignal,
  process: (item: T) => Promise<void>,
): Promise<void> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('并发数必须为正整数');
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!signal.aborted && next < items.length) {
      const item = items[next++];
      await process(item);
    }
  }));
}
