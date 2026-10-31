import {ACESFilmicToneMapping,Box3,Color,DataTexture,DirectionalLight,Group,LinearFilter,MathUtils,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Scene,ShaderMaterial,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export type GlassReveal={left:number;top:number;width:number;height:number;progress:number;variant?:string};
export type HomeGlassScene={animated?:boolean;interactive?:boolean;resize:(width:number,height:number,dpr:number)=>void;setReveals?:(panels:GlassReveal[])=>void;render:(x:number,y:number,dark:boolean,scroll:number,reduced:boolean,activeSeconds?:number)=>void;dispose:()=>void};

const MODEL_URL='/models/spaceyew-page.glb';
const FOV=38;

function disposeModel(model:Group){
 const materials=new Set<MeshPhysicalMaterial>();
 model.traverse(node=>{if(node instanceof Mesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material as MeshPhysicalMaterial);}});
 materials.forEach(material=>material.dispose());
}

function feather(size=64){
 const pixels=new Uint8Array(size*size*4);
 for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  const x=(column+.5)/size*2-1,y=(row+.5)/size*2-1;
  const value=Math.round(255*Math.pow(Math.max(0,1-Math.pow(x,4)-Math.pow(y,4)),1.7)),index=(row*size+column)*4;
  pixels.set([value,value,value,255],index);
 }
 const texture=new DataTexture(pixels,size,size);
 texture.minFilter=texture.magFilter=LinearFilter;texture.needsUpdate=true;
 return texture;
}

/** One curved glass page in an original photographic studio, on a continuous light field. */
export async function createHomeGlass(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<HomeGlassScene>{
 const response=await fetch(MODEL_URL,{signal});
 if(!response.ok)throw Error('Glass page unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),''),model=gltf.scene;
 if(signal.aborted){disposeModel(model);throw new DOMException('Aborted','AbortError');}
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}
 catch(error){disposeModel(model);throw error;}
 let environment:ReturnType<PMREMGenerator['fromScene']>|undefined,disposed=false;
 const wallGeometry=new PlaneGeometry(90,54),extraMaterials:(ShaderMaterial|MeshBasicMaterial|MeshPhysicalMaterial)[]=[];
 const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);disposeModel(model);environment?.dispose();wallGeometry.dispose();extraMaterials.forEach(material=>material.dispose());renderer.dispose();};
 try{
  renderer.outputColorSpace='srgb';renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.transmissionResolutionScale=.62;
  const scene=new Scene(),camera=new PerspectiveCamera(FOV,1,.1,120),group=new Group();
  camera.position.set(0,.55,9.2);
  // Original studio: broad softboxes, negative fill and a cool rim. The cards
  // exist only in the PMREM capture, never as page geometry.
  const studio=new Scene();studio.name='spaceyew-page-studio';studio.background=new Color('#060c18');
  const studioGeometry=new PlaneGeometry(),studioMaterials:MeshBasicMaterial[]=[],lightTexture=feather();
  const panel=(name:string,position:number[],scale:number[],color:string,power:number)=>{
   const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(power),map:power>1?lightTexture:null,toneMapped:false});
   studioMaterials.push(material);
   const card=new Mesh(studioGeometry,material);card.name=name;card.position.fromArray(position);card.scale.fromArray(scale);card.lookAt(0,0,0);studio.add(card);
  };
  panel('warm-key',[-5.2,4.8,6.4],[6.4,4.2,1],'#fff0d8',7);
  panel('cool-rim',[6.2,1.4,3.4],[2.2,8.4,1],'#bfd9ff',5);
  panel('top-diffusion',[0,7.2,-.6],[10.5,5.2,1],'#eaf2ff',5);
  panel('rear-window',[-3.2,2.2,-6.4],[5,6.4,1],'#f3f9ff',3);
  panel('left-negative',[-5.4,-.4,-3],[4.6,11,1],'#0a1524',.4);
  panel('right-negative',[5.4,2.2,-4],[5,12,1],'#101b2a',.42);
  panel('front-negative',[0,0,7],[4,4.8,1],'#0c1624',.36);
  const pmrem=new PMREMGenerator(renderer);
  try{environment=pmrem.fromScene(studio,.018);scene.environment=environment.texture;}
  finally{studioGeometry.dispose();studioMaterials.forEach(material=>material.dispose());lightTexture.dispose();pmrem.dispose();}
  const key=new DirectionalLight('#fff4e8',2.6);key.position.set(-4.5,6,7);scene.add(key);
  const rim=new DirectionalLight('#c3e3ff',1.1);rim.position.set(5.5,1.5,4.5);scene.add(rim);
  const fill=new DirectionalLight('#a3cef5',.14);fill.position.set(0,-5,4);scene.add(fill);

  // Centre the authored page, then fit it to the viewport on every resize.
  const bounds=new Box3().setFromObject(model,true),size=bounds.getSize(new Vector3()),centre=bounds.getCenter(new Vector3());
  model.position.sub(centre);
  const material=new MeshPhysicalMaterial();
  material.color.set('#ffffff');material.toneMapped=false;material.transmission=1;material.opacity=1;
  material.metalness=0;material.ior=1.46;material.thickness=.42;material.roughness=.035;material.dispersion=2.8;
  material.attenuationColor.set('#e8f3ff');material.attenuationDistance=22;material.clearcoat=0;
  material.iridescence=.08;material.iridescenceIOR=1.9;Object.assign(material,{iridescenceThicknessMinimum:170,iridescenceThicknessMaximum:300});
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   const current=Array.isArray(node.material)?node.material[0]:node.material;
   if(current!==material)current?.dispose?.();
   node.material=material;
  });
  extraMaterials.push(material);
  group.add(model);scene.add(group);

  // The receiver paints the studio light field, the horizon, the floor and the
  // contact shadow. It shares the CSS fallback palette and document progress.
  const wallMaterial=new ShaderMaterial({depthWrite:false,transparent:false,uniforms:{
   uScroll:{value:0},uTime:{value:0},uBrightness:{value:1},
   uInk:{value:new Color('#04060c')},uNavy:{value:new Color('#071426')},uDeep:{value:new Color('#0e2a55')},
   uSky:{value:new Color('#4a7fb8')},uBand:{value:new Color('#bfd7ec')},uGlow:{value:new Color('#f2f5f7')},
   uFloor:{value:new Color('#0a1424')},uFloorDeep:{value:new Color('#03060b')},uPaper:{value:new Color('#f3f1ec')}
  },vertexShader:`
   varying vec2 vScreen;
   void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vScreen=p.xy/p.w*.5+.5;gl_Position=p;}
  `,fragmentShader:`
   varying vec2 vScreen;uniform float uScroll;uniform float uTime;uniform float uBrightness;
   uniform vec3 uInk;uniform vec3 uNavy;uniform vec3 uDeep;uniform vec3 uSky;uniform vec3 uBand;uniform vec3 uGlow;uniform vec3 uFloor;uniform vec3 uFloorDeep;uniform vec3 uPaper;
   float pool(vec2 point,vec2 centre,vec2 extent){vec2 offset=(point-centre)/extent;return exp(-dot(offset,offset)*2.);}
   void main(){
    vec2 uv=vScreen;
    float d=(1.-uv.y)+uScroll*.92;
    vec3 color=uInk;
    color=mix(color,uNavy,smoothstep(.08,.36,d));
    color=mix(color,uDeep,smoothstep(.36,.53,d));
    color=mix(color,uSky,smoothstep(.64,.69,d));
    color=mix(color,uBand,smoothstep(.69,.705,d));
    color=mix(color,uGlow,smoothstep(.705,.718,d));
    color=mix(color,uBand,smoothstep(.718,.732,d));
    color=mix(color,uFloor,smoothstep(.732,.80,d));
    color=mix(color,uFloorDeep,smoothstep(.80,.90,d));
    color=mix(color,uPaper,smoothstep(.98,1.18,d));
    // broad glow behind the page, then the horizon reflection on the floor
    float halo=pool(uv,vec2(.5,.56),vec2(.52,.34));
    color+=vec3(.03,.055,.09)*halo*(1.-smoothstep(.55,.92,d));
    float sheen=pool(uv,vec2(.5,.615),vec2(.62,.055));
    color+=vec3(.055,.085,.12)*sheen*(1.-smoothstep(.62,.95,d));
    float drift=sin(uTime*.18)*.012;
    float contact=pool(uv,vec2(.5+drift,.79),vec2(.26,.055));
    color*=1.-contact*.16*(1.-smoothstep(.2,1.,uScroll));
    color*=uBrightness;
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
   }
  `});
  wallMaterial.toneMapped=false;extraMaterials.push(wallMaterial);
  const wall=new Mesh(wallGeometry,wallMaterial);wall.position.z=-8;wall.renderOrder=-10;scene.add(wall);

  let width=1,height=1,mobile=false,visibleWidth=1,displayScale=1,baseX=0,baseY=0,lastTick=-1;
  const measure=()=>{
   const visibleHeight=2*Math.tan(MathUtils.degToRad(FOV/2))*camera.position.z;visibleWidth=visibleHeight*camera.aspect;
   const target=visibleHeight*(mobile?1.16:1.28);
   displayScale=target/size.y;
   group.scale.setScalar(displayScale);
   baseY=-(size.y*displayScale)*.5+(mobile?visibleHeight*.05:visibleHeight*-.06);
   baseX=mobile?visibleWidth*.42:.34;
   group.position.x=baseX;
  };
  const place=(progress:number,motion=true)=>{
   const p=motion?MathUtils.smoothstep(progress,0,1.15):0,recede=motion?MathUtils.smoothstep(progress,.15,1.25):0;
   group.position.y=baseY+p*1.15;
   group.position.z=recede*1.35;
   group.rotation.y=.55+recede*.14;
   group.rotation.x=.015-recede*.05;
   const opacity=1-MathUtils.smoothstep(progress,.55,1.05);
   const transparent=opacity<.999;
   if(material.transparent!==transparent){material.transparent=transparent;material.depthWrite=!transparent;material.needsUpdate=true;}
   material.opacity=opacity;
   group.visible=opacity>.001;
   wallMaterial.uniforms.uScroll.value=progress;
   return p;
  };
  canvas.dataset.glassFilter='physical-page';
  signal.addEventListener('abort',dispose,{once:true});if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
  return{
   get animated(){return !disposed&&group.visible;},
   get interactive(){return !disposed&&group.visible;},
   setReveals(){/* the creator window is semantic HTML; no glass sheet is generated */},
   resize(nextWidth,nextHeight,dpr){
    if(disposed)return;width=nextWidth;height=nextHeight;mobile=width<768;
    renderer.transmissionResolutionScale=mobile?.5:.62;
    renderer.setPixelRatio(Math.min(dpr,2));renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();measure();
   },
   render(x,y,dark,scroll,reduced,activeSeconds=0){
    if(disposed)return;
    const time=reduced||!Number.isFinite(activeSeconds)?0:Math.max(0,activeSeconds);
    const p=place(scroll,!reduced);
    const turn=reduced?0:Math.sin(p*Math.PI);
    group.rotation.y+=reduced?0:x*.035;
    group.rotation.x+=reduced?0:-y*.02;
    if(!reduced){group.position.x=baseX+x*.05;group.rotation.z=Math.sin(time*.22)*.006;}else{group.position.x=baseX;group.rotation.z=0;}
    // one light story: the page, its receiver and the studio sweep together
    scene.environmentRotation.set(.04+p*.12,-.42+p*.55+(reduced?0:Math.sin(time*.16)*.1),-p*.08);
    scene.environmentIntensity=(dark?.74:.78)+(reduced?0:Math.sin(time*.2)*.03);
    key.intensity=1.8+turn*.8;rim.intensity=1.3+turn*.35;
    wallMaterial.uniforms.uTime.value=time;wallMaterial.uniforms.uBrightness.value=dark?.97:1;
    const tick=Math.floor(time*10);if(tick!==lastTick){lastTick=tick;canvas.dataset.glassTime=time.toFixed(1);}
    canvas.dataset.glassHeroVisible=group.visible?'true':'false';
    canvas.dataset.glassReading=MathUtils.smoothstep(scroll,.2,1.1).toFixed(3);
    renderer.transmissionResolutionScale=group.visible?(mobile?.5:.62):.1;
    renderer.render(scene,camera);
   },
   dispose
  };
 }catch(error){dispose();throw error;}
}
