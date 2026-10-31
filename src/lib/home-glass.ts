import {ACESFilmicToneMapping,BackSide,Box3,BoxGeometry,CatmullRomCurve3,Color,DirectionalLight,Euler,Group,MathUtils,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Quaternion,REVISION,Scene,ShaderChunk,ShaderMaterial,TubeGeometry,Vector2,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export type HomeGlassScene={animated?:boolean;resize:(width:number,height:number,dpr:number)=>void;render:(x:number,y:number,dark:boolean,scroll:number,reduced:boolean,activeSeconds?:number)=>void;dispose:()=>void};
const MODEL_URL='/models/spaceyew-glass.glb';
const transmissionChunk=ShaderChunk.transmission_pars_fragment,bicubicSample='return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );';
// These polished folds need little blur. Linear mip filtering cuts r187's RGB sampling from 24 to 3 fetches,
// trading bicubic reconstruction for GPU headroom while preserving its volume rays, IOR and dispersion.
const linearTransmission=REVISION==='187'&&transmissionChunk.split(bicubicSample).length===2?transmissionChunk.replace(bicubicSample,'return textureLod( transmissionSamplerMap, fragCoord.xy, lod );'):null;

function disposeModel(model:Group){
 const materials=new Set<MeshPhysicalMaterial>();
 model.traverse(node=>{if(node instanceof Mesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});
 materials.forEach(material=>material.dispose());
}

/** Native folded glass in an original optical studio. The wall is the actual transmission receiver. */
export async function createHomeGlass(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<HomeGlassScene>{
 const response=await fetch(MODEL_URL,{signal});
 if(!response.ok)throw Error('Glass model unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),''),model=gltf.scene;
 if(signal.aborted){disposeModel(model);throw new DOMException('Aborted','AbortError');}
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}
 catch(error){disposeModel(model);throw error;}
 let environment:ReturnType<PMREMGenerator['fromScene']>|undefined,disposed=false;
 const extraGeometry:(PlaneGeometry|TubeGeometry)[]=[],extraMaterials:(ShaderMaterial|MeshBasicMaterial)[]=[];
 const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);disposeModel(model);environment?.dispose();extraGeometry.forEach(item=>item.dispose());extraMaterials.forEach(item=>item.dispose());renderer.dispose();};
 try{
  renderer.outputColorSpace='srgb';renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.transmissionResolutionScale=.7;
  const scene=new Scene(),camera=new PerspectiveCamera(40,1,.1,100),mark=new Group();camera.position.z=8.2;
  const baseCamera=camera.quaternion.clone(),pointerRotation=new Euler(0,0,0,'YXZ'),pointerQuaternion=new Quaternion();
  // A blue studio, HDR softboxes and moderate flags retain clear glass and controlled edge reflections.
  const studio=new Scene();studio.background=new Color('#284e7b');
  const studioGeometry=new BoxGeometry(),studioMaterials:MeshBasicMaterial[]=[];
  const panel=(position:number[],scale:number[],color:string,power:number)=>{
   const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(power),side:BackSide});studioMaterials.push(material);
   const box=new Mesh(studioGeometry,material);box.position.fromArray(position);box.scale.fromArray(scale);box.lookAt(0,0,0);studio.add(box);
  };
  panel([0,0,0],[32,26,30],'#719bc7',.6);
  panel([-6,4,6],[2.8,10,.12],'#eff9ff',5.2);
  panel([5.4,1.8,3],[.56,9,.12],'#d8efff',4.6);
  panel([0,7,2],[7,.8,.15],'#fff5e9',4.8);
  panel([1,-4,-4],[9,.52,.12],'#b8dcff',1.6);
  panel([-2,0,-7],[4.2,9,.12],'#375675',.55);
  panel([7,-1,-3],[2.4,12,.12],'#416487',.52);
  const pmrem=new PMREMGenerator(renderer);
  try{environment=pmrem.fromScene(studio,0);scene.environment=environment.texture;}
  finally{studioGeometry.dispose();studioMaterials.forEach(material=>material.dispose());pmrem.dispose();}
  const key=new DirectionalLight('#fff5e9',3);key.position.set(-4,6,7);scene.add(key);
  const rim=new DirectionalLight('#b7ddff',1.5);rim.position.set(5,1,4);scene.add(rim);
  const fill=new DirectionalLight('#a3cef5',.8);fill.position.set(0,-5,3);scene.add(fill);
  model.position.sub(new Box3().setFromObject(model,true).getCenter(new Vector3()));mark.add(model);scene.add(mark);
  const nativeSize=new Box3().setFromObject(model,true).getSize(new Vector3()),folds:{mesh:Mesh;x:number;side:number}[]=[];
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   const center=new Box3().setFromObject(node,true).getCenter(new Vector3());folds.push({mesh:node,x:node.position.x,side:center.x<0?-1:1});
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(!(material instanceof MeshPhysicalMaterial))continue;
    // Match the display-referred wall: an extra ACES pass through the glass would turn pale ice grey.
    // Keep the surface neutral; the physical volume supplies the restrained ice tint.
    material.color.set('#ffffff');material.toneMapped=false;material.transmission=1;material.opacity=1;material.metalness=0;
    material.ior=1.52;material.thickness=.85;material.roughness=.01;material.envMapIntensity=.95;material.dispersion=1.4;
    material.attenuationColor.set('#d4e9ff');material.attenuationDistance=12;material.clearcoat=0;material.clearcoatRoughness=.045;
    // Guard the pinned chunk exactly; unsupported Three versions keep their standard physical shader.
    if(linearTransmission){material.onBeforeCompile=shader=>{const include='#include <transmission_pars_fragment>';if(shader.fragmentShader.split(include).length===2)shader.fragmentShader=shader.fragmentShader.replace(include,linearTransmission);};material.customProgramCacheKey=()=> 'spaceyew-linear-volume-r187';}
   }
  });
  // Independent studio fixtures sit behind the glass and enter/leave beyond the viewport.
  // They stay in world space as the folds move, so the transmitted pattern cannot read as painted decoration.
  const lightGuides=new Group();lightGuides.name='spaceyew-transmission-guides';lightGuides.position.z=-1.5;scene.add(lightGuides);
  const desktopGuides=[
   [[-.18,.42],[.10,.36],[.21,.27],[.24,.14],[.24,-.22]],
   [[.76,-.22],[.76,.14],[.79,.24],[.91,.31],[1.18,.37]],
  ];
  const phoneGuides=[
   [[-.30,.53],[-.02,.48],[.12,.50],[.18,.55],[.10,.61],[-.30,.63]],
   [[1.30,.51],[1.02,.46],[.87,.49],[.82,.54],[.90,.60],[1.30,.62]],
  ];
  const guideGeometry=(points:number[][])=>new TubeGeometry(new CatmullRomCurve3(points.map(point=>new Vector3((point[0]-.5)*camera.aspect,.5-point[1],0))),56,.00145,8,false);
  const guide=(name:string,points:number[][],color:string,energy:number)=>{
   const geometry=guideGeometry(points);extraGeometry.push(geometry);
   const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(energy),toneMapped:false});extraMaterials.push(material);
   const mesh=new Mesh(geometry,material);mesh.name=name;lightGuides.add(mesh);return mesh;
  };
  const leftGuide=guide('warm-transmission-guide',desktopGuides[0],'#ffe4c7',.58);
  const rightGuide=guide('ice-transmission-guide',desktopGuides[1],'#bdddff',.62);
  const replaceGuide=(mesh:Mesh<TubeGeometry,MeshBasicMaterial>,points:number[][])=>{
   const index=extraGeometry.indexOf(mesh.geometry);mesh.geometry.dispose();mesh.geometry=guideGeometry(points);extraGeometry[index]=mesh.geometry;
  };
  // A structured blue wall is rendered behind the glass, so refraction and RGB dispersion have real contrast to sample.
  // The broad shadow/caustic lobes are art-directed receiver approximations, not ray-traced transport.
  const wallGeometry=new PlaneGeometry(80,52);extraGeometry.push(wallGeometry);
  const wallMaterial=new ShaderMaterial({depthWrite:false,uniforms:{uTime:{value:0},uBrightness:{value:1},uScroll:{value:0},uCenter:{value:new Vector2(.5,.38)},uSpread:{value:.35},uReading:{value:0},uBlueTop:{value:new Color('#1b376b')},uBlueMiddle:{value:new Color('#2a72c5')},uBlueBottom:{value:new Color('#c4dff4')},uIce:{value:new Color('#eef4fa')}},vertexShader:`
   varying vec2 vScreen;
   void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vScreen=p.xy/p.w*.5+.5;gl_Position=p;}
  `,fragmentShader:`
   varying vec2 vScreen;uniform float uTime;uniform float uBrightness;uniform float uScroll;uniform vec2 uCenter;uniform float uSpread;uniform float uReading;uniform vec3 uBlueTop;uniform vec3 uBlueMiddle;uniform vec3 uBlueBottom;uniform vec3 uIce;
   float stripe(float value,float center,float width){return exp(-pow((value-center)/width,2.));}
   void main(){
    vec2 uv=vScreen;float documentY=max(0.,(1.-uv.y)+uScroll),daylight=smoothstep(.65,1.4,documentY);
    vec3 color=mix(uBlueTop,uBlueMiddle,smoothstep(0.,.65,documentY));color=mix(color,uBlueBottom,daylight);color=mix(color,uIce,smoothstep(1.4,2.4,documentY));
    float quiet=exp(-pow((uv.x-.5)*3.2,2.))*stripe(uv.y,.56,.48);color*=1.-quiet*.08*(1.-daylight);
    float phase=sin(uTime*.38),left=uCenter.x-uSpread,right=uCenter.x+uSpread;
    float tilt=(uv.y-uCenter.y)*.12;
    float lightA=stripe(uv.x+tilt,left-.045+phase*.022,.010);
    float lightB=stripe(uv.x-tilt,right+.035-phase*.02,.016);
    float feather=stripe(uv.y,uCenter.y,.65);
    color+=vec3(.11,.15,.19)*(lightA+lightB*.72)*feather*(1.-daylight*.85);
    float shade=(stripe(uv.x+tilt,left+.025,.075)+stripe(uv.x-tilt,right-.025,.075))*stripe(uv.y,uCenter.y-.07,.48);
    color*=1.-shade*.16*(1.-daylight*.75);
    vec2 ground=vec2((uv.x-uCenter.x)*1.3,(uv.y-(uCenter.y-.28))*4.2);float radius=length(ground);
    float caustic=stripe(radius,.4+sin(uv.x*8.+uTime*.22)*.028,.025)*(1.-smoothstep(.16,.45,uv.y));
    color+=vec3(.045,.10,.15)*caustic*(.6+uReading*.2)*(1.-daylight*.85);
    color*=uBrightness;gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
   }
  `});wallMaterial.toneMapped=false;extraMaterials.push(wallMaterial);
  const wall=new Mesh(wallGeometry,wallMaterial);wall.position.z=-7;wall.renderOrder=-10;scene.add(wall);
  let width=1,height=1,lastMotionTick=-1;canvas.dataset.glassFilter=linearTransmission?'linear-mip-r187':'three-default';
  signal.addEventListener('abort',dispose,{once:true});if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
  return{
   animated:true,
   resize(nextWidth,nextHeight,dpr){
    if(disposed)return;const viewportChanged=width!==nextWidth||height!==nextHeight;width=nextWidth;height=nextHeight;const mobile=width<768;
    renderer.transmissionResolutionScale=mobile?.55:.7;renderer.setPixelRatio(Math.min(dpr,2));renderer.setSize(width,height,false);
    if(viewportChanged){camera.aspect=width/height;camera.updateProjectionMatrix();const sourcePoints=mobile?phoneGuides:desktopGuides;replaceGuide(leftGuide,sourcePoints[0]);replaceGuide(rightGuide,sourcePoints[1]);lightGuides.scale.setScalar(2*Math.tan(MathUtils.degToRad(camera.fov/2))*(8.2+1.5));}
   },
   render(x,y,dark,scroll,reduced,activeSeconds=0){
    if(disposed)return;
    const time=reduced||!Number.isFinite(activeSeconds)?0:Math.max(0,activeSeconds),mobile=width<768,reading=MathUtils.smoothstep(scroll,.35,1.2),spatial=reduced?0:reading,breath=Math.sin(time*.38);
    camera.position.z=8.2-spatial*.48;
    const centerY=mobile?Math.max(.70,.215+320/height):.68,split=(mobile?.58:.8)+spatial*(mobile?.10:.18);
    for(const fold of folds)fold.mesh.position.x=fold.x+fold.side*split;
    const combinedWidth=nativeSize.x+2*split,displayWidth=Math.min(width*(mobile?1.10:1.12),1500),displayHeight=Math.min(displayWidth*nativeSize.y/combinedWidth,height*(mobile?.43:1.14));
    const initialViewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*8.2,viewHeight=initialViewHeight*(camera.position.z/8.2);
    mark.scale.setScalar(initialViewHeight*(displayHeight/height)/nativeSize.y*(1-spatial*.045));
    mark.position.set(viewHeight*camera.aspect*x*(reduced?0:.011),viewHeight*(.5-centerY)+(!reduced?Math.sin(time*.32)*.035:0),0);
    mark.rotation.set(.04+spatial*.09+(reduced?0:-y*.055+breath*.016),-.10+spatial*.24+(reduced?0:x*.09+breath*.035),-.025-spatial*.045+(reduced?0:Math.sin(time*.28)*.012));
    const sourcePhase=reduced?0:time*.23;lightGuides.position.set(Math.sin(sourcePhase)*.012*lightGuides.scale.x,Math.sin(sourcePhase*1.17)*.016*lightGuides.scale.y,-1.5);lightGuides.rotation.z=reduced?0:Math.sin(sourcePhase*.8)*.025;
    pointerRotation.set(reduced?0:-y*.026,reduced?0:-x*.038,0,'YXZ');pointerQuaternion.setFromEuler(pointerRotation);camera.quaternion.copy(baseCamera).multiply(pointerQuaternion);
    const lightPhase=-.58+(reduced?0:breath*.28+x*.12);scene.environmentRotation.set(.018,lightPhase,0);scene.environmentIntensity=dark?.95:1;
    key.position.set(-4+Math.sin(lightPhase)*1.3,6,7);rim.intensity=(dark?1.44:1.5)+(reduced?0:Math.sin(time*.38+.8)*.12);
    wallMaterial.uniforms.uTime.value=time;wallMaterial.uniforms.uBrightness.value=dark?.96:1;wallMaterial.uniforms.uReading.value=reading;wallMaterial.uniforms.uScroll.value=scroll;
    wallMaterial.uniforms.uCenter.value.set(.5,1-centerY);const projectedWidth=displayHeight*combinedWidth/nativeSize.y*(8.2/camera.position.z)*(1-spatial*.045);wallMaterial.uniforms.uSpread.value=(split+.718)/combinedWidth*(projectedWidth/width);
    const tick=Math.floor(time*10);if(tick!==lastMotionTick){lastMotionTick=tick;canvas.dataset.glassTime=time.toFixed(1);canvas.dataset.glassLightPhase=lightPhase.toFixed(3);canvas.dataset.glassReading=reading.toFixed(3);canvas.dataset.glassDispersion='1.4';}
    renderer.render(scene,camera);
   },
   dispose
  };
 }catch(error){dispose();throw error;}
}
