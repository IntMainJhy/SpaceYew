// Local lab probe. Import this function in browser automation and inject its source
// before navigation; it is never imported by the application or sent as telemetry.
export function installAnimationProbe(){
 const raf=window.requestAnimationFrame.bind(window),frames=[],draws=new Map(),ids=new WeakMap();
 let active=false,cpu=0,nextId=0,lcp=0,cls=0,sequence=0,frame=0;const longTasks=[];
 const percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]||0;};
 for(const [type,receive]of[['largest-contentful-paint',entry=>{lcp=entry.startTime;}],['layout-shift',entry=>{if(!entry.hadRecentInput)cls+=entry.value;}],['longtask',entry=>longTasks.push({start:entry.startTime,duration:entry.duration})]]){
  try{new PerformanceObserver(list=>list.getEntries().forEach(receive)).observe({type,buffered:true});}catch{}
 }
 window.requestAnimationFrame=callback=>raf(time=>{const start=performance.now();try{callback(time);}finally{if(active)cpu+=performance.now()-start;}});
 for(const name of['WebGLRenderingContext','WebGL2RenderingContext']){
  const prototype=window[name]?.prototype;if(!prototype)continue;
  for(const method of['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
   const original=prototype[method];if(!original)continue;
   prototype[method]=function(...args){if(active){let id=ids.get(this.canvas);if(!id){id=++nextId;ids.set(this.canvas,id);}const entry=draws.get(id)||{id,label:this.canvas.className||this.canvas.parentElement?.className||'canvas',calls:0,pixels:this.canvas.width*this.canvas.height};entry.calls++;draws.set(id,entry);}return original.apply(this,args);};
  }
 }
 window.__animationProbe={
  measure(duration=2400){
   if(active)throw Error('A measurement is already running');frames.length=0;draws.clear();cpu=0;active=true;
   const start=performance.now(),generation=++sequence;
   const tick=time=>{if(!active||generation!==sequence)return;frames.push({time,cpu,draws:[...draws.values()].map(value=>({...value}))});cpu=0;draws.clear();frame=raf(tick);};frame=raf(tick);
   return new Promise(resolve=>setTimeout(()=>{
    active=false;sequence++;window.cancelAnimationFrame(frame);frame=0;const end=performance.now(),elapsed=end-start,intervals=frames.slice(1).map((frame,index)=>frame.time-frames[index].time),canvases=new Map();
    for(const frame of frames)for(const draw of frame.draws){const value=canvases.get(draw.id)||{label:draw.label,frames:0,calls:0,pixels:draw.pixels};value.frames++;value.calls+=draw.calls;canvases.set(draw.id,value);}
    const resources=performance.getEntriesByType('resource'),scripts=resources.filter(entry=>entry.initiatorType==='script'),navigation=performance.getEntriesByType('navigation')[0];
    resolve({durationMs:Math.round(elapsed),animationCallbacksPerSecond:Number((frames.length*1000/elapsed).toFixed(1)),frameIntervalP50Ms:percentile(intervals,.5),frameIntervalP95Ms:percentile(intervals,.95),callbackWorkP95Ms:percentile(frames.map(frame=>frame.cpu),.95),longTasks:longTasks.filter(entry=>entry.start>=start&&entry.start<end),canvases:[...canvases.values()].map(value=>({...value,drawSubmissionFramesPerSecond:Number((value.frames*1000/elapsed).toFixed(1)),callsPerRenderedFrame:Number((value.calls/value.frames).toFixed(1))})),load:{ttfbMs:navigation?.responseStart,lcpMs:lcp,cls,scriptCount:scripts.length,scriptDecodedBytes:scripts.reduce((sum,entry)=>sum+entry.decodedBodySize,0),scriptTransferredBytes:scripts.reduce((sum,entry)=>sum+entry.transferSize,0),resourceCount:resources.length}});
   },duration));
  }
 };
}
