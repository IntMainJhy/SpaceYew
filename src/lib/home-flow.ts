/* Continuous, phase-offset curves keep the folds moving without keyframe stops. */
export function homeFlowPaths(time:number){
 const a=Math.sin(time*.29),b=Math.sin(time*.21+1.2),c=Math.sin(time*.25+2.4);
 return [
  `M-320 ${150+a*95} C${90+b*90} ${-80+a*100} ${300-a*75} ${110+b*85} ${490+b*75} ${365+c*85} S${1060+c*110} ${850+a*100} 1830 ${480+b*100} L1830 ${680+b*85} C${1030+c*90} ${1010+a*95} ${540+b*80} ${660+c*65} ${365-a*70} ${430+c*80} S${10+b*50} ${70+a*100} -320 ${390+a*95} Z`,
  `M1830 -170 C${1360+c*90} ${-20+b*80} ${1590-a*80} ${230+c*90} ${1190+b*100} ${345+a*85} S${1030+c*80} ${690+b*90} 1830 880 L1840 680 C${1320+b*80} ${560+c*75} ${1220+a*90} ${455+b*65} ${1440-c*80} ${345+a*80} S${1690+b*60} ${55+c*70} 1830 -30 Z`,
  `M-320 ${410+c*65} C${120+a*65} ${230+b*90} ${400+b*90} ${400+a*65} ${620-c*90} ${595+b*65} S${1280+b*70} ${830+c*70} 1830 ${650+a*70} L1830 ${820+a*70} C${1250+b*70} ${1030+c*70} ${650-c*90} ${840+b*65} ${470+b*90} ${630+a*65} S${60+a*65} ${390+b*90} -320 ${570+c*65} Z`
 ];
}

type FlowPoint={x:number;y:number;at:number};
type FlowParticle={node:SVGTextElement;x:number;y:number;vx:number;vy:number;born:number;life:number;strength:number};

export function mountHomeFlow(svg:SVGSVGElement,interactive=true){
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)'),pointer=window.matchMedia('(hover: hover) and (pointer: fine)');
 const host=svg.parentElement!,ribbons=Array.from(svg.querySelectorAll<SVGPathElement>('[data-flow-ribbon]'));
 const folds=svg.querySelector<SVGGElement>('[data-flow-ribbons]')!,trail=svg.querySelector<SVGGElement>('[data-flow-trail]')!;
 const pool=Array.from(svg.querySelectorAll<SVGTextElement>('[data-flow-particle]'));
 const glyphs=['0','1','·',':','/','{','}','+'],inks=['#477b9f','#397e73','#a77956'];
 let visible=false,printing=false,running=false,frame=0,last=0,elapsed=0,bounds=svg.getBoundingClientRect();
 let particles:FlowParticle[]=[],target:FlowPoint|null=null,head:FlowPoint|null=null,drift={x:0,y:0},serial=0,travel=0;
 const clearTrail=()=>{particles=[];target=head=null;travel=0;trail.setAttribute('opacity','0');pool.forEach(node=>{node.setAttribute('opacity','0');node.textContent='';});};
 const emit=(x:number,y:number,now:number)=>{
  const sx=bounds.width/1600,sy=bounds.height/900;
  for(let i=0;i<3;i++){
   const seed=++serial,angle=seed*2.39996,radius=10+(seed%5)*4;
   // Snap to a small character field; movement releases it into a soft drift.
   const px=Math.round((x*sx+Math.cos(angle)*radius)/14)*14;
   const py=Math.round((y*sy+Math.sin(angle)*radius)/18)*18;
   const node=pool[seed%pool.length];
   particles=particles.filter(p=>p.node!==node);
   node.textContent=glyphs[seed%glyphs.length];node.setAttribute('fill',inks[seed%inks.length]);
   particles.push({node,x:px/sx,y:py/sy,vx:Math.cos(angle)*12/sx,vy:(Math.sin(angle)*9-7)/sy,born:now,life:1050+(seed%5)*100,strength:.4+.16*Math.sin(seed)**2});
  }
 };
 const measure=()=>{bounds=svg.getBoundingClientRect();clearTrail();};
 const move=(event:PointerEvent)=>{
  if(!interactive||!running||!pointer.matches||event.pointerType!=='mouse')return;
  const x=event.clientX-bounds.left,y=event.clientY-bounds.top;
  if(x<0||y<0||x>bounds.width||y>bounds.height){target=head=null;travel=0;return;}
  const now=performance.now();
  target={x:x/bounds.width*1600,y:y/bounds.height*900,at:now};
  if(!head)head={...target};
 };
 const leave=()=>{target=head=null;travel=0;};
 const tick=(now:number)=>{
  if(!running)return;
  frame=requestAnimationFrame(tick);
  const delta=last?Math.min(now-last,64):0;last=now;elapsed+=delta;
  const ease=1-Math.exp(-delta/110),pull=target&&now-target.at<300?target:null;
  drift.x+=((pull?(pull.x-800)*.022:0)-drift.x)*ease;
  drift.y+=((pull?(pull.y-450)*.018:0)-drift.y)*ease;
  homeFlowPaths(elapsed/1000).forEach((d,i)=>ribbons[i].setAttribute('d',d));
  folds.setAttribute('transform',`translate(${drift.x.toFixed(2)} ${drift.y.toFixed(2)})`);
  if(target&&head&&now-target.at<180){
   const previous={...head};head.x+=(target.x-head.x)*ease;head.y+=(target.y-head.y)*ease;
   const distance=Math.hypot((head.x-previous.x)*bounds.width/1600,(head.y-previous.y)*bounds.height/900);
   const steps=Math.min(6,Math.floor((travel+distance)/9));travel=(travel+distance)%9;
   for(let i=1;i<=steps;i++)emit(previous.x+(head.x-previous.x)*i/steps,previous.y+(head.y-previous.y)*i/steps,now);
  }
  particles=particles.filter(p=>{
   if(now-p.born<p.life)return true;
   p.node.setAttribute('opacity','0');p.node.textContent='';return false;
  });
  for(const p of particles){
   const age=now-p.born,progress=age/p.life,t=age/1000;
   const quiet=1-.5*Math.exp(-(((p.x-800)/390)**2+((p.y-190)/190)**2));
   const alpha=p.strength*quiet*Math.min(1,age/70)*Math.pow(1-progress,1.7);
   p.node.setAttribute('opacity',alpha.toFixed(3));
   p.node.setAttribute('transform',`translate(${(p.x+p.vx*t).toFixed(1)} ${(p.y+p.vy*t).toFixed(1)}) scale(${(1600/bounds.width).toFixed(4)} ${(900/bounds.height).toFixed(4)})`);
  }
  trail.setAttribute('opacity',particles.length?'1':'0');
  if(!particles.length&&target&&now-target.at>1500)target=head=null;
 };
 const update=()=>{
  const next=visible&&!document.hidden&&!preference.matches&&!printing;
  svg.dataset.flowState=next?'running':'paused';
  if(next===running)return;
  running=next;last=0;
  if(running){measure();frame=requestAnimationFrame(tick);}
  else{cancelAnimationFrame(frame);clearTrail();}
 };
 const pointerChange=()=>{if(!pointer.matches)clearTrail();};
 const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();});
 const beforePrint=()=>{printing=true;update();},afterPrint=()=>{printing=false;update();};
 observer.observe(svg);update();
 preference.addEventListener('change',update);pointer.addEventListener('change',pointerChange);
 document.addEventListener('visibilitychange',update);
 host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);
 window.addEventListener('resize',measure);window.addEventListener('scroll',measure,{passive:true});
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 return()=>{
  running=false;cancelAnimationFrame(frame);clearTrail();svg.dataset.flowState='paused';observer.disconnect();
  preference.removeEventListener('change',update);pointer.removeEventListener('change',pointerChange);
  document.removeEventListener('visibilitychange',update);
  host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);
  window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure);
  window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);
 };
}
