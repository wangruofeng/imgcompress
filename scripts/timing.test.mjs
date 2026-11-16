import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDuration,createProcessingTimer} from '../src/lib/timing.ts';
test('formats milliseconds, seconds, minutes and invalid values',()=>{
 assert.equal(formatDuration(42.3),'42 ms');assert.equal(formatDuration(1500),'1.50 秒');assert.equal(formatDuration(61500),'1 分 1.5 秒');assert.equal(formatDuration(NaN),'0 ms');assert.equal(formatDuration(-1),'0 ms');
});
test('accumulates wall time across resumed runs and excludes pauses/exports',()=>{
 let now=0;const t=createProcessingTimer(()=>now);
 t.start();now=500;assert.equal(t.elapsed(),500);t.start();now=800;t.stop();assert.equal(t.elapsed(),800);
 now=5000;assert.equal(t.elapsed(),800);t.start();now=5200;t.stop();assert.equal(t.elapsed(),1000);
 t.stop();assert.equal(t.elapsed(),1000);t.reset();assert.equal(t.elapsed(),0);
});
