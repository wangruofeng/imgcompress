import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identify,pngChunks} from '../src/lib/formats.ts';
import {optimizeGIF,optimizeAPNG} from '../src/lib/animation.ts';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/animation.json',import.meta.url)));
const gif=new Uint8Array(Buffer.from(fixture.gif,'base64')),apng=new Uint8Array(Buffer.from(fixture.apng,'base64'));
test('GIF optimization removes comments and keeps all image/control/loop blocks',()=>{
 const result=optimizeGIF(gif);
 assert.equal(identify(result).mime,'image/gif');assert.ok(result.length<gif.length);
 const start=gif.indexOf(0x21,13),comment=Buffer.from(gif).indexOf(Buffer.from([0x21,0xfe]));
 assert.ok(start>=0&&comment>=0);
 let end=comment+2;while(gif[end])end+=1+gif[end];end++;
 assert.deepEqual(result,new Uint8Array([...gif.subarray(0,comment),...gif.subarray(end)]));
});
test('APNG strips metadata while preserving every animation and image chunk byte-for-byte',()=>{
 assert.equal(identify(apng).mime,'image/apng');const result=optimizeAPNG(apng);assert.ok(result.length<apng.length);
 const keep=data=>pngChunks(data).filter(c=>['IHDR','acTL','fcTL','fdAT','IDAT','IEND'].includes(c.type)).map(c=>Buffer.from(data.subarray(c.start,c.end)));
 assert.deepEqual(keep(result),keep(apng));assert.equal(identify(result).preserve,'animation');
});
test('truncated PNG/GIF and unsupported AVIF animation are rejected',()=>{
 assert.throws(()=>optimizeGIF(gif.subarray(0,gif.length-2)));
 assert.throws(()=>identify(apng.subarray(0,60)));
 const brand=Buffer.alloc(24);brand.writeUInt32BE(24);brand.write('ftyp',4);brand.write('avis',8);brand.write('avif',16);assert.throws(()=>identify(brand));
});
test('SVG and static AVIF are identified by content rather than filename',()=>{
 assert.equal(identify(new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>')).mime,'image/svg+xml');
 const brand=Buffer.alloc(24);brand.writeUInt32BE(24);brand.write('ftyp',4);brand.write('avif',8);brand.write('mif1',16);assert.equal(identify(brand).mime,'image/avif');
});
