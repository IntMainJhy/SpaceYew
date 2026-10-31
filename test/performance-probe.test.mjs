import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {installAnimationProbe} from '../scripts/performance-probe.mjs';

// A synthetic queue checks accounting and lifecycle only; it is not a hardware FPS benchmark.
function lab(){
 let now=0,id=0;const pending=new Map(),timers=[],cancelled=[];
 class GL{constructor(canvas){this.canvas=canvas;}drawArrays(){}drawElements(){}}
 const window={
  requestAnimationFrame(callback){pending.set(++id,callback);return id;},
  cancelAnimationFrame(handle){cancelled.push(handle);pending.delete(handle);},
  WebGL2RenderingContext:GL,
 };
 vm.runInNewContext('('+installAnimationProbe.toString()+')();',{
  window,performance:{now:()=>now,getEntriesByType:()=>[]},
  setTimeout:callback=>timers.push(callback),PerformanceObserver:class{observe(){}},
 });
 return{probe:window.__animationProbe,pending,cancelled,GL,
  frame(time){now=time;const queued=[...pending.values()];pending.clear();for(const callback of queued)callback(time);},
  finish(time){now=time;assert.ok(timers.length,'a measurement timeout is queued');timers.shift()();},
 };
}

test('animation probe cancels its frame and rejects a delivered tick from an earlier measurement',async()=>{
 const s=lab(),first=s.probe.measure(8),[staleId,staleTick]=[...s.pending][0];
 s.finish(8);await first;assert.ok(s.cancelled.includes(staleId));assert.equal(s.pending.size,0);
 const second=s.probe.measure(50);
 // Cancellation may be too late for a callback already delivered by the browser queue.
 staleTick(8);assert.equal(s.pending.size,1,'the previous generation cannot start a second sampling chain');
 for(const time of[18,28,38])s.frame(time);
 s.finish(58);const result=await second;
 assert.equal(result.frameIntervalP50Ms,10);assert.equal(result.frameIntervalP95Ms,10);
 assert.equal(result.animationCallbacksPerSecond,60,'three synthetic callbacks are counted once over 50ms');
 assert.equal(s.pending.size,0);assert.equal('displayCallbacksPerSecond' in result,false);
});

test('animation callbacks with no draw do not count as canvas draw-submission frames',async()=>{
 const s=lab(),gl=new s.GL({className:'fixture-canvas',width:120,height:80}),measurement=s.probe.measure(100);
 s.frame(10);gl.drawArrays(0,0,3);gl.drawElements(0,3,0,0);
 s.frame(20);s.frame(30);gl.drawArrays(0,0,3);s.frame(40);
 s.finish(100);const result=await measurement;
 assert.equal(result.animationCallbacksPerSecond,40);
 assert.equal(result.canvases.length,1);const canvas=result.canvases[0];
 assert.equal(canvas.frames,2);assert.equal(canvas.calls,3);assert.equal(canvas.pixels,9600);
 assert.equal(canvas.drawSubmissionFramesPerSecond,20);assert.equal(canvas.callsPerRenderedFrame,1.5);
 assert.equal('renderedFramesPerSecond' in canvas,false);
});
