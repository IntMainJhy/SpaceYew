import {ACESFilmicToneMapping,AdditiveBlending,Box3,Color,DirectionalLight,Group,MathUtils,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Scene,ShaderMaterial,Vector3,WebGLRenderer} from 'three';
import type {BufferGeometry,Material} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/** One bounded optical installation; native scroll and all navigation remain HTML. */
export async function mountHomeKinetic(canvas:HTMLCanvasElement,host:HTMLElement,signal:AbortSignal){
 const response=await fetch('/models/spaceyew-home-kinetic.glb',{signal});
 if(!response.ok)throw Error('Kinetic model unavailable');
 const {scene:model}=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 let renderer:WebGLRenderer|undefined,environment:ReturnType<PMREMGenerator['fromScene']>|undefined,frame=0,disposed=false,detach=()=>{};
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
 const dispose=()=>{if(disposed)return;disposed=true;detach();cancelAnimationFrame(frame);model.traverse(node=>{if(node instanceof Mesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment?.dispose();renderer?.dispose();};
 if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
 try{
  renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.outputColorSpace='srgb';renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.transmissionResolutionScale=.5;
  const scene=new Scene(),camera=new PerspectiveCamera(37,1,.1,40),sculpture=new Group();camera.position.set(0,.05,8.6);
  const studio=new RoomEnvironment(),pmrem=new PMREMGenerator(renderer);
  try{environment=pmrem.fromScene(studio,.02);scene.environment=environment.texture;}finally{studio.dispose();pmrem.dispose();}
  scene.environmentIntensity=.75;
  const key=new DirectionalLight('#f4faff',3);key.position.set(-3,5,4);scene.add(key);
  const rim=new DirectionalLight('#8dbdff',2);rim.position.set(4,1,-2);scene.add(rim);
  model.position.sub(new Box3().setFromObject(model,true).getCenter(new Vector3()));sculpture.add(model);scene.add(sculpture);
  const arcs:Mesh[]=[],nodes:Mesh[]=[];
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   if(node.name.startsWith('PrismArc_'))arcs.push(node);else nodes.push(node);
   for(const material of Array.isArray(node.material)?node.material:[node.material])if(material instanceof MeshPhysicalMaterial){
    material.color.set('#ffffff');material.toneMapped=false;material.transmission=1;material.thickness=.42;material.roughness=.025;material.ior=1.48;material.dispersion=.75;material.envMapIntensity=.55;material.attenuationColor.set('#c3dcf6');material.attenuationDistance=6;
   }
  });
  // Opaque illuminated geometry behind the ribbons is genuinely refracted by Three's volume pass.
  const backdropGeometry=new PlaneGeometry(20,18);geometries.add(backdropGeometry);
  const backdropMaterial=new ShaderMaterial({uniforms:{uTime:{value:0},uPhase:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
   varying vec2 vUv;uniform float uTime,uPhase;
   void main(){vec2 p=vUv-.5;float band=exp(-pow((p.x+p.y*.5-sin(uTime*.25)*.05)/.045,2.));float second=exp(-pow((p.x-p.y*.7-.13)/.016,2.));vec3 ice=vec3(.62,.78,.90);ice+=vec3(.22,.17,.06)*band+vec3(.13,.16,.19)*second;ice=mix(ice,vec3(.81,.77,.94),uPhase*.09);gl_FragColor=vec4(ice,1.);
   #include <colorspace_fragment>
   }
  `});backdropMaterial.toneMapped=false;materials.add(backdropMaterial);
  const backdrop=new Mesh(backdropGeometry,backdropMaterial);backdrop.position.z=-3;scene.add(backdrop);
  // These two luminous strokes are an art-directed light receiver, without another render target.
  const glowGeometry=new PlaneGeometry(9,7);geometries.add(glowGeometry);
  const glowMaterial=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uTime:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float uTime;void main(){vec2 p=(vUv-.5)*vec2(1.,1.7);float r=length(p);float ring=exp(-pow((r-.31-sin(atan(p.y,p.x)*3.+uTime*.35)*.024)/.007,2.));float fade=exp(-dot(p,p)*7.);gl_FragColor=vec4(vec3(.17,.28,.43)*ring*fade,.48);}'});materials.add(glowMaterial);
  const glow=new Mesh(glowGeometry,glowMaterial);glow.position.set(0,-.8,-2.8);scene.add(glow);
  const emitGeometry=new PlaneGeometry(.075,5);geometries.add(emitGeometry);
  const emitMaterial=new MeshBasicMaterial({color:new Color('#fff5d6').multiplyScalar(1.3),toneMapped:false});materials.add(emitMaterial);
  const emitter=new Mesh(emitGeometry,emitMaterial);emitter.position.set(-1.3,0,-1.2);emitter.rotation.z=-.42;scene.add(emitter);
  let width=1,height=1,time=0,last=0,visible=false,paused=false,lost=false,printing=false,mode=0,pose=0,scroll=0,targetX=0,targetY=0,x=0,y=0,dragging=false,dragX=0,dragOffset=0;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');let reduced=preference.matches;
  const canDraw=()=>!disposed&&!lost&&!printing&&visible&&!document.hidden;
  const stop=()=>{cancelAnimationFrame(frame);frame=0;last=0;};
  const draw=()=>{
   if(disposed||lost)return;
   pose=MathUtils.damp(pose,mode,6,1/30);x=MathUtils.damp(x,reduced?0:targetX,5,1/30);y=MathUtils.damp(y,reduced?0:targetY,5,1/30);
   sculpture.rotation.set(.18+(reduced?0:y*.18),-.30+pose*.63+(reduced?0:time*.1+x*.22+dragOffset),-.12+(reduced?0:Math.sin(time*.32)*.06+scroll*.20));
   sculpture.position.y=reduced?0:Math.sin(time*.8)*.07;
   arcs.forEach((arc,index)=>{arc.rotation.set(index*.66+pose*(index-1)*.15,index*.42,pose*(index%2?-.32:.32));arc.position.z=(index-1)*.15;});
   nodes.forEach((node,index)=>{const active=index===mode;node.scale.setScalar(active?1.3:1);const material=node.material as MeshPhysicalMaterial;material.emissive.set(active?'#3879c5':'#000000');material.emissiveIntensity=active?.18:0;});
   backdropMaterial.uniforms.uTime.value=reduced?0:time;backdropMaterial.uniforms.uPhase.value=pose;glowMaterial.uniforms.uTime.value=reduced?0:time;
   emitter.position.x=-1.3+(reduced?0:Math.sin(time*.4)*.65);scene.environmentRotation.y=reduced?0:time*.035;scene.updateMatrixWorld();renderer!.render(scene,camera);
  };
  const tick=(now:number)=>{frame=0;if(!canDraw())return;const delta=last?(now-last)/1000:1/30;if(delta<1/30-.002){frame=requestAnimationFrame(tick);return;}last=now;if(!reduced&&!paused)time+=Math.min(delta,.08);draw();if(!reduced&&!paused||Math.abs(pose-mode)>.002||Math.abs(x-(reduced?0:targetX))>.002||Math.abs(y-(reduced?0:targetY))>.002)frame=requestAnimationFrame(tick);};
  const wake=()=>{if(canDraw()){if(!frame)frame=requestAnimationFrame(tick);}else stop();};
  const measure=()=>{if(disposed||lost)return;const box=host.getBoundingClientRect();width=Math.max(box.width,1);height=Math.max(box.height,1);renderer!.setPixelRatio(Math.min(devicePixelRatio||1,1.6,Math.sqrt(1100000/(width*height))));renderer!.setSize(width,height,false);camera.aspect=width/height;camera.position.z=width<500?10.2:8.6;camera.updateProjectionMatrix();draw();wake();};
  const move=(event:PointerEvent)=>{if(reduced)return;const box=host.getBoundingClientRect();if(event.pointerType!=='touch'){targetX=(event.clientX-box.left)/box.width*2-1;targetY=(event.clientY-box.top)/box.height*2-1;}if(dragging){dragOffset+=(event.clientX-dragX)*.006;dragX=event.clientX;}wake();};
  const down=(event:PointerEvent)=>{if(reduced||event.button>0||(event.target as HTMLElement)?.closest?.('button,a,input,select,textarea'))return;dragging=true;dragX=event.clientX;host.setPointerCapture(event.pointerId);host.dataset.dragging='true';};
  const up=()=>{dragging=false;delete host.dataset.dragging;};
  const leave=()=>{targetX=targetY=0;up();wake();};
  const onScroll=()=>{const box=host.getBoundingClientRect();scroll=MathUtils.clamp((innerHeight*.5-box.top)/Math.max(innerHeight,1),-1,1);wake();};
  const motion=()=>{reduced=preference.matches;if(reduced){x=y=targetX=targetY=dragOffset=0;time=0;}draw();wake();};
  const loss=(event:Event)=>{event.preventDefault();lost=true;stop();host.dataset.kinetic='fallback';};
  const beforePrint=()=>{printing=true;stop();};const afterPrint=()=>{printing=false;wake();};
  const resize=new ResizeObserver(measure),intersection=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);if(visible){onScroll();draw();}wake();},{threshold:0});
  resize.observe(host);intersection.observe(host);host.addEventListener('pointermove',move);host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('pointerleave',leave);canvas.addEventListener('webglcontextlost',loss);window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',wake);preference.addEventListener('change',motion);window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
  const cleanup=()=>dispose();
  detach=()=>{resize.disconnect();intersection.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('pointerleave',leave);canvas.removeEventListener('webglcontextlost',loss);window.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',wake);preference.removeEventListener('change',motion);window.removeEventListener('beforeprint',beforePrint);window.removeEventListener('afterprint',afterPrint);signal.removeEventListener('abort',cleanup);delete host.dataset.dragging;};
  signal.addEventListener('abort',cleanup,{once:true});if(signal.aborted){cleanup();throw new DOMException('Aborted','AbortError');}
  measure();host.dataset.kinetic='ready';
  return{select(value:number){if(disposed||!Number.isFinite(value))return;mode=Math.round(MathUtils.clamp(value,0,2));if(reduced)pose=mode;draw();wake();},pause(value:boolean){if(disposed)return;paused=value;wake();},dispose:cleanup};
 }catch(error){dispose();throw error;}
}
