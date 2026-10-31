import {ACESFilmicToneMapping,BackSide,Box3,BoxGeometry,CatmullRomCurve3,Color,DirectionalLight,Euler,Group,MathUtils,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Quaternion,REVISION,Scene,ShaderChunk,ShaderMaterial,TubeGeometry,Vector2,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export type GlassReveal={left:number;top:number;width:number;height:number;progress:number;variant?:string};
export type HomeGlassScene={animated?:boolean;resize:(width:number,height:number,dpr:number)=>void;setReveals?:(panels:GlassReveal[])=>void;setCollectionOverlay?:(enabled:boolean)=>void;setHeaderDock?:(dock:{x:number;y:number;width:number}|null)=>void;render:(x:number,y:number,dark:boolean,scroll:number,reduced:boolean,activeSeconds?:number)=>void;dispose:()=>void};
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
 const extraGeometry:(PlaneGeometry|TubeGeometry)[]=[],extraMaterials:(ShaderMaterial|MeshBasicMaterial|MeshPhysicalMaterial)[]=[];
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
  const nativeSize=new Box3().setFromObject(model,true).getSize(new Vector3()),folds:{mesh:Mesh;x:number;side:number}[]=[],nativeMaterials=new Set<MeshPhysicalMaterial>();
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   const center=new Box3().setFromObject(node,true).getCenter(new Vector3());folds.push({mesh:node,x:node.position.x,side:center.x<0?-1:1});
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(!(material instanceof MeshPhysicalMaterial))continue;
    nativeMaterials.add(material);
    // Match the display-referred wall: an extra ACES pass through the glass would turn pale ice grey.
    // Keep the surface neutral; the physical volume supplies the restrained ice tint.
    material.color.set('#ffffff');material.toneMapped=false;material.transmission=1;material.opacity=1;material.metalness=0;
    material.ior=1.52;material.thickness=1.05;material.roughness=.007;material.envMapIntensity=.72;material.dispersion=1.4;
    material.attenuationColor.set('#e3f2ff');material.attenuationDistance=18;material.clearcoat=0;material.clearcoatRoughness=.045;
    // Guard the pinned chunk exactly; unsupported Three versions keep their standard physical shader.
    if(linearTransmission){material.onBeforeCompile=shader=>{const include='#include <transmission_pars_fragment>';if(shader.fragmentShader.split(include).length===2)shader.fragmentShader=shader.fragmentShader.replace(include,linearTransmission);};material.customProgramCacheKey=()=> 'spaceyew-linear-volume-r187';}
   }
  });
  // Two small segmented glass sheets share this renderer and its transmission pass.
  // Their real vertices curl open behind semantic HTML; no text is flattened into a texture.
  const curtainSource=(folds[0].mesh.material instanceof MeshPhysicalMaterial?folds[0].mesh.material:null);
  const curtains=Array.from({length:2},(_,index)=>{
   const geometry=new PlaneGeometry(1,1,24,16);extraGeometry.push(geometry);
   const material=curtainSource?.clone()||new MeshPhysicalMaterial({transmission:1,ior:1.52,toneMapped:false});
   if(curtainSource){material.onBeforeCompile=curtainSource.onBeforeCompile;material.customProgramCacheKey=curtainSource.customProgramCacheKey;}
   material.transparent=true;material.depthWrite=false;material.thickness=.09;material.dispersion=.65;material.roughness=.018;
   extraMaterials.push(material);const mesh=new Mesh(geometry,material);mesh.name='spaceyew-unfurl-'+index;mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
   return{mesh,base:new Float32Array(geometry.attributes.position.array),panel:null as GlassReveal|null};
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
  const guideGeometry=(points:number[][])=>new TubeGeometry(new CatmullRomCurve3(points.map(point=>new Vector3((point[0]-.5)*camera.aspect,.5-point[1],0))),56,.0034,8,false);
  const guide=(name:string,points:number[][],color:string,energy:number)=>{
   const geometry=guideGeometry(points);extraGeometry.push(geometry);
   const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(energy),toneMapped:false});extraMaterials.push(material);
   const mesh=new Mesh(geometry,material);mesh.name=name;lightGuides.add(mesh);return mesh;
  };
  const leftGuide=guide('warm-transmission-guide',desktopGuides[0],'#ffe4c7',.76);
  const rightGuide=guide('ice-transmission-guide',desktopGuides[1],'#d7edff',.78);
  const replaceGuide=(mesh:Mesh<TubeGeometry,MeshBasicMaterial>,points:number[][])=>{
   const index=extraGeometry.indexOf(mesh.geometry);mesh.geometry.dispose();mesh.geometry=guideGeometry(points);extraGeometry[index]=mesh.geometry;
  };
  // A structured blue wall is rendered behind the glass, so refraction and RGB dispersion have real contrast to sample.
  // The broad shadow/caustic lobes are art-directed receiver approximations, not ray-traced transport.
  const wallGeometry=new PlaneGeometry(80,52);extraGeometry.push(wallGeometry);
  const wallMaterial=new ShaderMaterial({depthWrite:false,uniforms:{uTime:{value:0},uPointer:{value:new Vector2()},uOpticalEnergy:{value:1},uBrightness:{value:1},uScroll:{value:0},uBackdropAlpha:{value:1},uCenter:{value:new Vector2(.5,.38)},uSpread:{value:.35},uReading:{value:0},uBlueTop:{value:new Color('#1b376b')},uBlueMiddle:{value:new Color('#2a72c5')},uBlueBottom:{value:new Color('#c4dff4')},uIce:{value:new Color('#eef4fa')}},vertexShader:`
   varying vec2 vScreen;
   void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vScreen=p.xy/p.w*.5+.5;gl_Position=p;}
  `,fragmentShader:`
   varying vec2 vScreen;uniform float uTime;uniform vec2 uPointer;uniform float uOpticalEnergy;uniform float uBrightness;uniform float uScroll;uniform float uBackdropAlpha;uniform vec2 uCenter;uniform float uSpread;uniform float uReading;uniform vec3 uBlueTop;uniform vec3 uBlueMiddle;uniform vec3 uBlueBottom;uniform vec3 uIce;
   float stripe(float value,float center,float width){return exp(-pow((value-center)/width,2.));}
   void main(){
    vec2 uv=vScreen;float documentY=max(0.,(1.-uv.y)+uScroll),daylight=smoothstep(.65,1.4,documentY);
    vec3 color=mix(uBlueTop,uBlueMiddle,smoothstep(0.,.65,documentY));color=mix(color,uBlueBottom,daylight);color=mix(color,uIce,smoothstep(1.4,2.4,documentY));
    float quiet=exp(-pow((uv.x-.5)*3.2,2.))*stripe(uv.y,.56,.48);color*=1.-quiet*.08*(1.-daylight);
    float phase=sin(uTime*.38),left=uCenter.x-uSpread,right=uCenter.x+uSpread;
    float relativeY=uv.y-uCenter.y,tilt=relativeY*.12;
    // The luminous slits and their dark flags are projected onto this opaque wall.
    // They stay independent of the mesh: the volume rays really bend their image.
    float sweep=phase*.022+uPointer.x*.018;
    float leftAxis=uv.x-(left+.018-relativeY*.20+sweep);
    float rightAxis=uv.x-(right-.018+relativeY*.15-sweep*.8);
    float sourceGate=stripe(uv.y,uCenter.y+.12,.46);
    float warmCore=stripe(leftAxis,0.,.008),iceCore=stripe(rightAxis,0.,.011);
    float warmBloom=stripe(leftAxis,0.,.045),iceBloom=stripe(rightAxis,0.,.06);
    float sourceShadow=(stripe(leftAxis,.034,.031)+stripe(rightAxis,-.044,.035))*sourceGate;
    color*=1.-sourceShadow*.38*uOpticalEnergy;
    color+=vec3(.86,.65,.39)*(warmCore*.8+warmBloom*.18)*sourceGate*uOpticalEnergy;
    color+=vec3(.38,.65,.94)*(iceCore*.9+iceBloom*.2)*sourceGate*uOpticalEnergy;
    // One secondary slit breaks across the bevel as a clear, narrow spectral seam.
    float seam=stripe(leftAxis,-.018,.0025)+stripe(rightAxis,.022,.003);
    color+=vec3(.20,.30,.40)*seam*sourceGate*uOpticalEnergy;
    // ponytail: art-directed receiver caustics, not ray-traced light transport.
    // Paired folded arcs and a soft focus pool relate the outgoing light to each fold.
    float groundY=max(.07,uCenter.y-.29)+uPointer.y*.012;
    vec2 ground=vec2((uv.x-uCenter.x)*1.45,(uv.y-groundY)*4.2);
    float radius=length(ground),waviness=sin(uv.x*11.+uTime*.25)*.025;
    float causticGate=1.-smoothstep(groundY+.03,groundY+.22,uv.y);
    float caustic=stripe(radius,.43+waviness,.012);
    float spectralWarm=stripe(radius,.453+waviness,.008);
    float spectralIce=stripe(radius,.419+waviness,.007);
    vec2 leftFocus=vec2((uv.x-left-.04)*3.7,(uv.y-groundY)*4.0);
    vec2 rightFocus=vec2((uv.x-right+.04)*3.7,(uv.y-groundY)*4.0);
    float focusPool=exp(-dot(leftFocus,leftFocus)*2.)+exp(-dot(rightFocus,rightFocus)*2.);
    color+=vec3(.14,.22,.32)*focusPool*.48*uOpticalEnergy;
    color+=(vec3(.34,.48,.62)*caustic+vec3(.30,.14,.055)*spectralWarm+vec3(.055,.16,.32)*spectralIce)*causticGate*uOpticalEnergy;
    color*=uBrightness;gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
    gl_FragColor.rgb*=uBackdropAlpha;gl_FragColor.a=uBackdropAlpha;
   }
  `});wallMaterial.toneMapped=false;extraMaterials.push(wallMaterial);
  const wall=new Mesh(wallGeometry,wallMaterial);wall.position.z=-7;wall.renderOrder=-10;scene.add(wall);
  let width=1,height=1,lastMotionTick=-1,collectionOverlay=true,overlayAmount=0,headerDock:{x:number;y:number;width:number}|null=null;canvas.dataset.glassFilter=linearTransmission?'linear-mip-r187':'three-default';
  // The collected mark can sit above HTML using this same canvas. Its glass still samples the
  // opaque studio in the transmission target; only the final backdrop becomes transparent.
  wall.onBeforeRender=passRenderer=>{wallMaterial.uniforms.uBackdropAlpha.value=passRenderer.getRenderTarget()?1:1-overlayAmount;};
  signal.addEventListener('abort',dispose,{once:true});if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
  return{
   animated:true,
   setCollectionOverlay(enabled){collectionOverlay=enabled;},
   setHeaderDock(dock){headerDock=dock;},
   setReveals(panels){
    for(let index=0;index<curtains.length;index++){
     const curtain=curtains[index],panel=panels[index];curtain.panel=panel||null;curtain.mesh.visible=!!panel;
     if(!panel)continue;
     const open=Math.pow(MathUtils.smootherstep(panel.progress,0,1),1.7),bend=Math.max(.001,(1-open)*2.3),positions=curtain.mesh.geometry.attributes.position;
     const direction=panel.variant==='profiles'?-1:1;
     for(let vertex=0;vertex<positions.count;vertex++){
      const x=curtain.base[vertex*3],t=.5-curtain.base[vertex*3+1],angle=t*bend;
      const ripple=Math.sin((x+.5)*Math.PI*2+open*2)*Math.sin(t*Math.PI)*(1-open)*.035;
      positions.setXYZ(vertex,x+ripple*direction,.5-Math.sin(angle)/bend,(1-Math.cos(angle))/bend*.72+ripple);
     }
     positions.needsUpdate=true;curtain.mesh.geometry.computeVertexNormals();
     curtain.mesh.material.opacity=Math.sin(Math.PI*panel.progress)*.6;
    }
   },
   resize(nextWidth,nextHeight,dpr){
    if(disposed)return;const viewportChanged=width!==nextWidth||height!==nextHeight;width=nextWidth;height=nextHeight;const mobile=width<768;
    renderer.transmissionResolutionScale=mobile?.55:.7;renderer.setPixelRatio(Math.min(dpr,2));renderer.setSize(width,height,false);
    if(viewportChanged){camera.aspect=width/height;camera.updateProjectionMatrix();const sourcePoints=mobile?phoneGuides:desktopGuides;replaceGuide(leftGuide,sourcePoints[0]);replaceGuide(rightGuide,sourcePoints[1]);lightGuides.scale.setScalar(2*Math.tan(MathUtils.degToRad(camera.fov/2))*(8.2+1.5));}
   },
   render(x,y,dark,scroll,reduced,activeSeconds=0){
    if(disposed)return;
    const time=reduced||!Number.isFinite(activeSeconds)?0:Math.max(0,activeSeconds),mobile=width<768,reading=MathUtils.smoothstep(scroll,.2,1.3),spatial=reduced?0:MathUtils.smootherstep(scroll,.2,1.3),breath=Math.sin(time*.38);
    camera.position.z=8.2+spatial*.9;
    // Once foregrounded, the same native folds dock entirely inside the clear navigation gap.
    // Interior routes retain their quieter background pose rather than entering the header layer.
    const collectedHeight=collectionOverlay?Math.min(50,headerDock?headerDock.width*nativeSize.y/(nativeSize.x+.08):Infinity):Math.min(mobile?140:180,height*(mobile?.17:.20)),collectedCenter=collectionOverlay?(headerDock?.y??(mobile?32:36)):(mobile?74:82)+collectedHeight*.5;
    const centerY=MathUtils.lerp(mobile?Math.max(.70,.215+320/height):.68,collectedCenter/height,spatial),split=MathUtils.lerp(mobile?.58:.8,.04,spatial);
    for(const fold of folds)fold.mesh.position.x=fold.x+fold.side*split;
    const combinedWidth=nativeSize.x+2*split,displayWidth=Math.min(width*(mobile?1.10:1.12),1500),displayHeight=Math.min(displayWidth*nativeSize.y/combinedWidth,height*(mobile?.43:1.14));
    const initialViewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*8.2,viewHeight=initialViewHeight*(camera.position.z/8.2);
    mark.scale.setScalar(initialViewHeight*(MathUtils.lerp(displayHeight,collectedHeight,spatial)/height)/nativeSize.y);
    const parallax=reduced?0:1-(collectionOverlay?spatial:0);
    const dockX=collectionOverlay&&headerDock?headerDock.x/width-.5:0;
    mark.position.set(viewHeight*camera.aspect*(dockX*spatial+x*.011*parallax*(1-spatial*.8)),viewHeight*(.5-centerY)+Math.sin(time*.32)*.035*parallax*(1-spatial*.8),0);
    mark.rotation.set(.04+spatial*.10+(reduced?0:-y*.055+breath*.016),-.10+spatial*.16+(reduced?0:x*.09+breath*.035),-.025+spatial*.025+(reduced?0:Math.sin(time*.28)*.012));
    // Withdraw the studio fixtures with the opening. Dimming opaque RGB alone would leave dark wires.
    const fixtureCollection=MathUtils.smootherstep(scroll,.2,1.3),fixtureOpacity=1-MathUtils.smoothstep(fixtureCollection,0,.9)*.95;
    lightGuides.visible=fixtureOpacity>.075;
    for(const guide of[leftGuide,rightGuide]){const transparent=fixtureOpacity<.999;if(guide.material.transparent!==transparent){guide.material.transparent=transparent;guide.material.needsUpdate=true;}guide.material.opacity=fixtureOpacity;}
    const sourcePhase=reduced?0:time*.23;lightGuides.position.set(Math.sin(sourcePhase)*.045*lightGuides.scale.x,Math.sin(sourcePhase*1.17)*.028*lightGuides.scale.y,-1.5);lightGuides.rotation.z=reduced?0:Math.sin(sourcePhase*.8)*.025;
    pointerRotation.set(-y*.026*parallax,-x*.038*parallax,0,'YXZ');pointerQuaternion.setFromEuler(pointerRotation);camera.quaternion.copy(baseCamera).multiply(pointerQuaternion);
    const lightPhase=-.58+(reduced?0:breath*.28+x*.12);scene.environmentRotation.set(.018,lightPhase,0);scene.environmentIntensity=dark?.95:1;
    key.position.set(-4+Math.sin(lightPhase)*1.3,6,7);rim.intensity=(dark?1.44:1.5)+(reduced?0:Math.sin(time*.38+.8)*.12);
    wallMaterial.uniforms.uTime.value=time;wallMaterial.uniforms.uPointer.value.set(reduced?0:x,reduced?0:y);wallMaterial.uniforms.uOpticalEnergy.value=1-MathUtils.smoothstep(fixtureCollection,0,.8);wallMaterial.uniforms.uBrightness.value=dark?.96:1;wallMaterial.uniforms.uReading.value=reading;wallMaterial.uniforms.uScroll.value=scroll;
    wallMaterial.uniforms.uCenter.value.set(.5,1-centerY);const projectedWidth=MathUtils.lerp(displayHeight,collectedHeight,spatial)*combinedWidth/nativeSize.y*(8.2/camera.position.z);wallMaterial.uniforms.uSpread.value=(split+.718)/combinedWidth*(projectedWidth/width);
    const sheetDepth=.85,sheetViewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*(camera.position.z-sheetDepth);
    for(const curtain of curtains){const panel=curtain.panel;curtain.mesh.visible=!reduced&&!!panel;if(!panel)continue;const sheetHeight=panel.height/height*sheetViewHeight*1.18;curtain.mesh.position.set(((panel.left+panel.width*.5)/width-.5)*sheetViewHeight*camera.aspect,(.5-(panel.top+panel.height*.5)/height)*sheetViewHeight,sheetDepth);curtain.mesh.scale.set(panel.width/width*sheetViewHeight*camera.aspect*1.18,sheetHeight,sheetHeight);}
    const tick=Math.floor(time*10);if(tick!==lastMotionTick){lastMotionTick=tick;canvas.dataset.glassTime=time.toFixed(1);canvas.dataset.glassLightPhase=lightPhase.toFixed(3);canvas.dataset.glassReading=reading.toFixed(3);canvas.dataset.glassDispersion='1.4';}
    canvas.dataset.glassCollected=spatial.toFixed(3);canvas.dataset.glassOptics='volume-transmission+projected-caustics';
    overlayAmount=collectionOverlay&&!reduced?MathUtils.smoothstep(spatial,.86,1):0;canvas.dataset.glassOverlay=overlayAmount.toFixed(3);
    // Optical transmission still samples the studio, while alpha gently blends the dock with
    // the live header behind it. This small foreground mark never becomes a pale content cutout.
    for(const material of nativeMaterials){const opacity=1-overlayAmount*.45,transparent=opacity<.999;if(material.transparent!==transparent){material.transparent=transparent;material.depthWrite=!transparent;material.needsUpdate=true;}material.opacity=opacity;}
    renderer.render(scene,camera);
   },
   dispose
  };
 }catch(error){dispose();throw error;}
}
