export function skillInstallCommand(baseUrl){
 const url=new URL('/skills/spaceyew-post.tar.gz',new URL(baseUrl).origin).href.replaceAll("'","'\\''");
 return `mkdir -p ~/.agents/skills\ncurl -fsSL '${url}' | tar -xz -C ~/.agents/skills`;
}

export function mountSkillTypewriter(root,target,command){
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let timer,visible=false,count=command.length,deleting=true;
 const stop=()=>{window.clearTimeout(timer);root.dataset.typing='false';target.textContent=command;};
 const tick=()=>{
  count=Math.max(0,Math.min(command.length,count+(deleting?-2:1)));
  target.textContent=command.slice(0,count);
  let delay=deleting?24:38;
  if(!count){deleting=false;delay=450;}
  else if(count===command.length){deleting=true;delay=2200;}
  timer=window.setTimeout(tick,delay);
 };
 const update=()=>{
  stop();
  if(reduced.matches||document.hidden||!visible)return;
  count=command.length;deleting=true;root.dataset.typing='true';
  timer=window.setTimeout(tick,1800);
 };
 const observer=new IntersectionObserver(([entry])=>{
  if(visible===entry.isIntersecting)return;
  visible=entry.isIntersecting;update();
 });
 observer.observe(root);
 reduced.addEventListener('change',update);
 document.addEventListener('visibilitychange',update);
 window.addEventListener('beforeprint',stop);
 window.addEventListener('afterprint',update);
 update();
 return()=>{stop();observer.disconnect();reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);window.removeEventListener('beforeprint',stop);window.removeEventListener('afterprint',update);};
}
