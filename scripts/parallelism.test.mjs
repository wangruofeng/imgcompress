import test from 'node:test';
import assert from 'node:assert/strict';
import {parseParallelism,resolveParallelism} from '../src/lib/parallelism.ts';
import {runConcurrent} from '../src/lib/concurrent.ts';
test('migrates missing/invalid preferences and bounds auto based on CPU cores',()=>{
 for(const value of [undefined,null,0,3,100,'8',NaN])assert.equal(parseParallelism(value),'auto');
 for(const n of [1,2,4,6,8,12,16,24,32])assert.equal(resolveParallelism(n,16),n);
 assert.equal(resolveParallelism('auto',12),4);assert.equal(resolveParallelism('auto',4),2);assert.equal(resolveParallelism('auto',1),1);assert.equal(resolveParallelism('auto',NaN),2);
});
for(const limit of [4,6,8,12,16,24,32])test(`${limit} lanes execute concurrently without exceeding the selected limit`,async()=>{
 let release;const gate=new Promise(r=>{release=r});let active=0,peak=0,started=0,finished=0;
 const run=runConcurrent(Array.from({length:64},(_,i)=>i),limit,new AbortController().signal,async()=>{started++;peak=Math.max(peak,++active);await gate;active--;finished++});
 assert.equal(started,limit);release();await run;assert.equal(peak,limit);assert.equal(finished,64);
});
