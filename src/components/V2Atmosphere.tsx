'use client';

import {useEffect,useRef} from 'react';

const vertexSource=`
attribute vec2 position;
varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}
`;

const fragmentSource=`
precision mediump float;
varying vec2 uv;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float time;
uniform float dark;

void main(){
 vec2 p=vec2(uv.x,1.-uv.y);
 vec3 navy=vec3(.075,.135,.335);
 vec3 cobalt=vec3(.055,.385,.91);
 vec3 paper=mix(vec3(.93333,.95294,.97647),vec3(.06275,.10196,.19216),dark);
 float drift=sin(time*.12)*.012;
 float blueField=smoothstep(.08,.66,p.y)+.045*sin(p.x*3.1+time*.06);
 vec3 color=mix(navy,cobalt,clamp(blueField,0.,1.));
 float lower=smoothstep(.51,.99,p.y);
 color=mix(color,paper,lower);

 // A broad, clear lens; the ellipse keeps its crest in the first viewport.
 float narrow=1.-smoothstep(550.,1000.,resolution.x);
 vec2 radii=vec2(mix(.60,.94,narrow),mix(.94,.80,narrow));
 vec2 center=vec2(.50+pointer.x*.018,1.16+drift+pointer.y*.012);
 vec2 q=(p-center)/radii;
 float distance=length(q);
 vec2 normal=q/max(distance,.0001);
 float inside=1.-smoothstep(.996,1.004,distance);
 float edgeWidth=max(.0022,1.35/resolution.y);
 float rim=exp(-pow((distance-1.)/edgeWidth,2.));
 float scatter=exp(-abs(distance-1.)*31.);
 float leftLight=pow(max(dot(normal,normalize(vec2(-.56,-.83))),0.),12.);
 float rightLight=pow(max(dot(normal,normalize(vec2(.66,-.75))),0.),20.);
 float highlight=.10+.9*leftLight+.55*rightLight;

 // The interior bends a little light; it never becomes an opaque panel.
 color=mix(color,color*vec3(.97,1.015,1.035),inside*(1.-lower)*.42);
 color+=scatter*vec3(.10,.19,.30)*(.12+.24*leftLight)*(1.-lower);
 vec3 pearl=mix(vec3(.67,.81,1.),vec3(.98,.99,1.),leftLight);
 color=mix(color,pearl,clamp(rim*highlight*.90,0.,.9)*(1.-lower*.93));
 float innerRim=exp(-pow((distance-.991)/.0032,2.));
 color=mix(color,vec3(.33,.55,.92),innerRim*(.05+.11*rightLight)*(1.-lower));
 color=mix(color,paper,smoothstep(.93,1.,p.y));
 gl_FragColor=vec4(clamp(color,0.,1.),1.);
}
`;

/** One decorative GPU surface. Its parent supplies a CSS gradient fallback. */
export function mountV2Atmosphere(canvas:HTMLCanvasElement){
 let gl:WebGLRenderingContext|null;
 try{gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});}catch{return()=>{};}
 if(!gl)return()=>{};
 const context=gl,shaders:WebGLShader[]=[];
 let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;
 const release=()=>{if(buffer)context.deleteBuffer(buffer);if(program)context.deleteProgram(program);shaders.forEach(shader=>context.deleteShader(shader));};
 try{
  const compile=(type:number,source:string)=>{
   const shader=context.createShader(type);if(!shader)throw Error('Shader unavailable');
   shaders.push(shader);context.shaderSource(shader,source);context.compileShader(shader);
   if(!context.getShaderParameter(shader,context.COMPILE_STATUS))throw Error('Shader unavailable');
   return shader;
  };
  const vertex=compile(context.VERTEX_SHADER,vertexSource),fragment=compile(context.FRAGMENT_SHADER,fragmentSource);
  program=context.createProgram();if(!program)throw Error('Program unavailable');
  context.attachShader(program,vertex);context.attachShader(program,fragment);context.linkProgram(program);
  if(!context.getProgramParameter(program,context.LINK_STATUS))throw Error('Program unavailable');
  buffer=context.createBuffer();if(!buffer)throw Error('Buffer unavailable');
  context.useProgram(program);context.bindBuffer(context.ARRAY_BUFFER,buffer);
  context.bufferData(context.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),context.STATIC_DRAW);
  const position=context.getAttribLocation(program,'position');
  context.enableVertexAttribArray(position);context.vertexAttribPointer(position,2,context.FLOAT,false,0,0);
 }catch{release();canvas.dataset.atmosphere='fallback';return()=>{};}

 const uniforms={resolution:context.getUniformLocation(program,'resolution'),pointer:context.getUniformLocation(program,'pointer'),time:context.getUniformLocation(program,'time'),dark:context.getUniformLocation(program,'dark')};
 const host=canvas.parentElement||canvas,preference=window.matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,elapsed=0,last=0,lastDraw=0,visible=false,printing=false,lost=false,disposed=false;
 let targetX=0,targetY=0,pointerX=0,pointerY=0;
 const draw=()=>{
  if(disposed||lost||!canvas.width||!canvas.height)return;
  context.uniform2f(uniforms.resolution,canvas.width,canvas.height);
  context.uniform2f(uniforms.pointer,pointerX,pointerY);
  context.uniform1f(uniforms.time,elapsed);
  context.uniform1f(uniforms.dark,document.documentElement.dataset.colorMode==='dark'?1:0);
  context.drawArrays(context.TRIANGLES,0,3);
 };
 const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=lastDraw=0;canvas.dataset.atmosphere=lost?'fallback':'paused';};
 const tick=(now:number)=>{
  frame=0;if(disposed||lost)return;
  // Slow atmospheric motion does not need to shade at a monitor's 120/144 Hz.
  if(!lastDraw||now-lastDraw>=1000/30){
   if(last)elapsed+=Math.min((now-last)/1000,.05);
   last=lastDraw=now;pointerX+=(targetX-pointerX)*.07;pointerY+=(targetY-pointerY)*.07;draw();
  }
  frame=requestAnimationFrame(tick);
 };
 const sync=()=>{
  if(!disposed&&!lost&&visible&&!document.hidden&&!printing&&!preference.matches){
   if(!frame){canvas.dataset.atmosphere='running';frame=requestAnimationFrame(tick);}
  }else stop();
 };
 const measure=()=>{
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,rect.width<768?1.25:1.5);
  canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
  context.viewport(0,0,canvas.width,canvas.height);draw();
 };
 const move=(event:PointerEvent)=>{
  if(event.pointerType==='touch'||preference.matches)return;
  const rect=host.getBoundingClientRect();
  targetX=Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/Math.max(rect.width,1)-.5));
  targetY=Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/Math.max(rect.height,1)-.5));
 };
 const leave=()=>{targetX=0;targetY=0;};
 const beforePrint=()=>{printing=true;sync();};
 const afterPrint=()=>{printing=false;sync();};
 const reduced=()=>{if(preference.matches){pointerX=pointerY=targetX=targetY=elapsed=0;draw();}sync();};
 const contextLost=(event:Event)=>{event.preventDefault();lost=true;stop();canvas.style.opacity='0';};
 const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);
 const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync();},{threshold:.01});
 const theme=typeof MutationObserver==='undefined'?null:new MutationObserver(draw);
 resize?.observe(host);intersection?.observe(canvas);theme?.observe(document.documentElement,{attributes:true,attributeFilter:['data-color-mode']});
 if(!resize)window.addEventListener('resize',measure);
 if(!intersection)visible=true;
 host.addEventListener('pointermove',move as EventListener,{passive:true});host.addEventListener('pointerleave',leave);
 canvas.addEventListener('webglcontextlost',contextLost);
 document.addEventListener('visibilitychange',sync);preference.addEventListener('change',reduced);
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 canvas.dataset.atmosphere='paused';measure();sync();
 return()=>{
  disposed=true;stop();resize?.disconnect();intersection?.disconnect();theme?.disconnect();
  if(!resize)window.removeEventListener('resize',measure);
  host.removeEventListener('pointermove',move as EventListener);host.removeEventListener('pointerleave',leave);
  canvas.removeEventListener('webglcontextlost',contextLost);
  document.removeEventListener('visibilitychange',sync);preference.removeEventListener('change',reduced);
  window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
  release();
 };
}

export function V2Atmosphere(){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>canvas.current?mountV2Atmosphere(canvas.current):undefined,[]);
 return <canvas ref={canvas} className="v2-atmosphere" aria-hidden="true" style={{display:'block',width:'100%',height:'100%'}}/>;
}
