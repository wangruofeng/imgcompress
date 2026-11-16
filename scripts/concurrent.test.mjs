import assert from 'node:assert/strict';
import test from 'node:test';
import { runConcurrent } from '../src/lib/concurrent.ts';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('fills two lanes, caps concurrency, and associates out-of-order results with the right item', async () => {
  const gates = Array.from({ length: 4 }, deferred);
  const started = [], finished = [];
  let active = 0, peak = 0;
  const run = runConcurrent([0,1,2,3], 2, new AbortController().signal, async id => {
    started.push(id); peak = Math.max(peak, ++active);
    await gates[id].promise;
    active--; finished.push(id);
  });
  assert.deepEqual(started, [0,1]);
  gates[1].resolve(); await new Promise(setImmediate);
  assert.deepEqual(started, [0,1,2]);
  gates[2].resolve(); await new Promise(setImmediate);
  gates[3].resolve(); gates[0].resolve(); await run;
  assert.equal(peak, 2); assert.deepEqual(finished, [1,2,3,0]);
});

test('stopping prevents new work from being claimed', async () => {
  const controller = new AbortController(), gate = deferred(), started = [];
  const run = runConcurrent([0,1,2,3], 2, controller.signal, async id => { started.push(id); await gate.promise; });
  controller.abort(); gate.resolve(); await run;
  assert.deepEqual(started, [0,1]);
});

test('a failed image does not stop other images when handled per item', async () => {
  const success = [], failures = [];
  await runConcurrent([0,1,2,3], 2, new AbortController().signal, async id => {
    try { if (id === 1) throw Error('broken image'); success.push(id); }
    catch { failures.push(id); }
  });
  assert.deepEqual(success, [0,2,3]); assert.deepEqual(failures, [1]);
});

test('empty and already aborted batches do not start work; invalid limits reject', async () => {
  const controller = new AbortController(); controller.abort();
  const fail = () => assert.fail('should not start');
  await runConcurrent([1], 2, controller.signal, fail);
  await runConcurrent([], 2, new AbortController().signal, fail);
  await assert.rejects(runConcurrent([1], 0, controller.signal, fail));
});
