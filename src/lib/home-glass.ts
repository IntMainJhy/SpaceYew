import {ACESFilmicToneMapping,Box3,Color,DataTexture,DirectionalLight,Euler,Group,LinearFilter,MathUtils,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Quaternion,REVISION,RGBAFormat,Scene,ShaderChunk,ShaderMaterial,Vector2,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export type GlassReveal={left:number;top:number;width:number;height:number;progress:number;variant?:string};
export type HomeGlassScene={animated?:boolean;resize:(width:number,height:number,dpr:number)=>void;setReveals?:(panels:GlassReveal[])=>void;setCollectionOverlay?:(enabled:boolean)=>void;setHeaderDock?:(dock:{x:number;y:number;width:number}|null)=>void;render:(x:number,y:number,dark:boolean,scroll:number,reduced:boolean,activeSeconds?:number)=>void;dispose:()=>void};
const MODEL_URL='/models/spaceyew-glass.glb';
const transmissionChunk=ShaderChunk.transmission_pars_fragment,bicubicSample='return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );';
// These polished folds need little blur. Linear mip filtering cuts r187's RGB sampling from 24 to 3 fetches,
// trading bicubic reconstruction for GPU headroom while preserving its volume rays, IOR and dispersion.
const specularSum='vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;';
// Retain a white highlight core without lifting every clear face into a grey veil.
// Only reflection energy receives this shoulder; the transmitted wall keeps its display mapping.
const reflectionShoulder=specularSum+'\n totalSpecular /= vec3(1.0) + totalSpecular * 0.32;';
const spectralSample='vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );';
// Bounded studio-refraction approximation: the screen receiver cannot contain off-camera lights.
// Across the bevel, each native RGB volume ray also sees the original HDR studio.
// This supplies narrow spectral edges, not a full-screen RGB offset or a path-traced caustic.
const studioRefraction=spectralSample+`
 #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
  vec3 studioDirection = envMapRotation * normalize( transmissionRay );
  vec3 studioRadiance = textureLod( envMap, studioDirection, roughnessToMip( roughness ) ).rgb * envMapIntensity;
  float obliqueness = 1.0 - clamp( abs( dot( n, v ) ), 0.0, 1.0 );
  // Mid-angle bevels can transmit colour; at extreme grazing Fresnel reflects almost everything.
  float bevelWindow = smoothstep( 0.06, 0.42, obliqueness ) * ( 1.0 - smoothstep( 0.78, 1.0, obliqueness ) );
  transmissionSample[ i ] = mix( transmissionSample[ i ], studioRadiance[ i ], bevelWindow * 0.20 );
 #endif
`;
const linearTransmission=REVISION==='187'&&transmissionChunk.split(bicubicSample).length===2&&transmissionChunk.split(spectralSample).length===2?transmissionChunk.replace(bicubicSample,'return textureLod( transmissionSamplerMap, fragCoord.xy, lod );').replace(spectralSample,studioRefraction):null;

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
 const extraGeometry:PlaneGeometry[]=[],extraMaterials:(ShaderMaterial|MeshBasicMaterial|MeshPhysicalMaterial)[]=[];
 const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);disposeModel(model);environment?.dispose();extraGeometry.forEach(item=>item.dispose());extraMaterials.forEach(item=>item.dispose());renderer.dispose();};
 try{
  renderer.outputColorSpace='srgb';renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.transmissionResolutionScale=.7;
  const scene=new Scene(),camera=new PerspectiveCamera(40,1,.1,100),mark=new Group();camera.position.z=8.2;
  const baseCamera=camera.quaternion.clone(),pointerRotation=new Euler(0,0,0,'YXZ'),pointerQuaternion=new Quaternion();
  // Original photographic lighting rig. These broad cards exist only in the
  // environment capture: their reflections follow the actual glass normals.
  // No lamp geometry is drawn in the page or painted onto the receiver.
  const studio=new Scene();studio.name='spaceyew-photographic-environment';studio.background=new Color('#101a29');
  const studioGeometry=new PlaneGeometry(),studioMaterials:MeshBasicMaterial[]=[];
  // Original feathered diffuser, captured once. Smooth HDR gradients reflect as
  // shaped white cores rather than rectangular stickers on the bevels.
  const lightSize=64,lightPixels=new Uint8Array(lightSize*lightSize*4);
  for(let row=0;row<lightSize;row++)for(let col=0;col<lightSize;col++){
   const x=(col+.5)/lightSize*2-1,y=(row+.5)/lightSize*2-1;
   const light=Math.round(255*Math.pow(Math.max(0,1-Math.pow(x,4)-Math.pow(y,4)),1.6)),index=(row*lightSize+col)*4;
   lightPixels.set([light,light,light,255],index);
  }
  const lightTexture=new DataTexture(lightPixels,lightSize,lightSize,RGBAFormat);lightTexture.minFilter=lightTexture.magFilter=LinearFilter;lightTexture.needsUpdate=true;
  const panel=(name:string,position:number[],scale:number[],color:string,power:number)=>{
   const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(power),map:power>1?lightTexture:null,toneMapped:false});studioMaterials.push(material);
   const card=new Mesh(studioGeometry,material);card.name=name;card.position.fromArray(position);card.scale.fromArray(scale);card.lookAt(0,0,0);studio.add(card);
  };
  panel('large-left-softbox',[-4,4.6,5.8],[4.8,3.2,1],'#f8fbff',8.5);
  panel('ceiling-diffusion',[0,6,-1],[9,5,1],'#fff4e8',7.5);
  panel('right-bounce',[6,1,1],[3.8,7,1],'#e1f1ff',3.2);
  panel('low-silver-bounce',[0,-5,2],[8,4,1],'#b8d7f0',.25);
  panel('left-negative-fill',[-5,-.5,-3],[4.5,10,1],'#0b1524',.45);
  panel('right-negative-fill',[5,2,-4],[5,11,1],'#101b2a',.45);
  panel('front-negative-fill',[0,0,6.8],[3.8,4.5,1],'#0c1624',.4);
  panel('rear-window',[-3,2,-6],[4,5.5,1],'#f3f9ff',5.5);
  const pmrem=new PMREMGenerator(renderer);
  try{environment=pmrem.fromScene(studio,.012);scene.environment=environment.texture;}
  finally{studioGeometry.dispose();studioMaterials.forEach(material=>material.dispose());lightTexture.dispose();pmrem.dispose();}
  const key=new DirectionalLight('#fff5e9',3);key.position.set(-4,6,7);scene.add(key);
  const rim=new DirectionalLight('#c3e3ff',1.15);rim.position.set(5,1,4);scene.add(rim);
  const fill=new DirectionalLight('#a3cef5',.12);fill.position.set(0,-5,3);scene.add(fill);
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
    material.ior=1.45;material.thickness=.46;material.roughness=.012;material.dispersion=4.2;
    material.attenuationColor.set('#eff8ff');material.attenuationDistance=18;material.clearcoat=0;material.clearcoatRoughness=.045;
    // A restrained optical coating adds angle-dependent colour to reflected edges;
    // native dispersion above separately splits the three transmitted volume rays.
    material.iridescence=.48;material.iridescenceIOR=2.05;Object.assign(material,{iridescenceThicknessMinimum:180,iridescenceThicknessMaximum:300});
    // Guard the pinned chunk exactly; unsupported Three versions keep their standard physical shader.
    if(linearTransmission){material.onBeforeCompile=shader=>{const include='#include <transmission_pars_fragment>';if(shader.fragmentShader.split(include).length===2&&shader.fragmentShader.split(specularSum).length===2)shader.fragmentShader=shader.fragmentShader.replace(include,linearTransmission).replace(specularSum,reflectionShoulder);};material.customProgramCacheKey=()=> 'spaceyew-prismatic-studio-r187';}
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
  // A continuous receiver supplies genuine colour to volume refraction. Its
  // broad room illumination and soft contact shadow are art-directed, not a
  // simulated caustic pass. Specular highlights come only from the HDR rig.
  const wallGeometry=new PlaneGeometry(80,52);extraGeometry.push(wallGeometry);
  const wallMaterial=new ShaderMaterial({depthWrite:false,uniforms:{uTime:{value:0},uLightSweep:{value:0},uBrightness:{value:1},uScroll:{value:0},uBackdropAlpha:{value:1},uCenter:{value:new Vector2(.5,.38)},uContact:{value:new Vector2(.31,.20)},uBlueTop:{value:new Color('#070f29')},uBlueMiddle:{value:new Color('#1858c9')},uBlueBottom:{value:new Color('#c4dff4')},uIce:{value:new Color('#eef4fa')}},vertexShader:`
   varying vec2 vScreen;
   void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vScreen=p.xy/p.w*.5+.5;gl_Position=p;}
  `,fragmentShader:`
   varying vec2 vScreen;uniform float uTime;uniform float uLightSweep;uniform float uBrightness;uniform float uScroll;uniform float uBackdropAlpha;uniform vec2 uCenter;uniform vec2 uContact;uniform vec3 uBlueTop;uniform vec3 uBlueMiddle;uniform vec3 uBlueBottom;uniform vec3 uIce;
   float softPool(vec2 point,vec2 center,vec2 extent){vec2 offset=(point-center)/extent;return exp(-dot(offset,offset)*2.);}
   void main(){
    vec2 uv=vScreen;float documentY=max(0.,(1.-uv.y)+uScroll),daylight=smoothstep(.88,1.55,documentY);
    vec3 color=mix(uBlueTop,uBlueMiddle,smoothstep(.12,.88,documentY));color=mix(color,uBlueBottom,daylight);color=mix(color,uIce,smoothstep(1.55,2.4,documentY));
    float quiet=softPool(uv,vec2(.5,.60),vec2(.52,.9));color*=1.-quiet*.06*(1.-daylight);
    float drift=sin(uTime*.22)*.025;
    float window=softPool(uv,vec2(.12+drift,.77),vec2(.42,.55));
    float bounce=softPool(uv,vec2(.91-drift,.28),vec2(.52,.58));
    float ambientRise=smoothstep(.18,.75,documentY);
    color+=vec3(.035,.06,.085)*window*(1.-daylight*.85)*ambientRise;
    color+=vec3(.025,.045,.065)*bounce*(1.-daylight*.85)*ambientRise;
    // A broad oblique window wash creates real contrast for the three refraction rays.
    float windowEdge=uv.y+uv.x*.32-.25-uLightSweep*.22;
    float windowWash=(1.-smoothstep(-.08,.16,windowEdge))*softPool(uv,vec2(.48,.12),vec2(.95,.48));
    color=mix(color,vec3(.84,.93,1.),windowWash*.52*(1.-daylight));
    float groundY=uCenter.y-uContact.y;
    float contact=softPool(uv,vec2(.5-uContact.x,groundY),vec2(.23,.10))+softPool(uv,vec2(.5+uContact.x,groundY),vec2(.23,.10));
    color*=1.-contact*.11*(1.-smoothstep(.15,.95,uScroll))*(1.-daylight);
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
    if(viewportChanged){camera.aspect=width/height;camera.updateProjectionMatrix();}
   },
   render(x,y,dark,scroll,reduced,activeSeconds=0){
    if(disposed)return;
    const time=reduced||!Number.isFinite(activeSeconds)?0:Math.max(0,activeSeconds),mobile=width<768,reading=MathUtils.smoothstep(scroll,.2,1.3),spatial=reduced?0:MathUtils.smootherstep(scroll,.2,1.3),breath=Math.sin(time*.38);
    camera.position.z=8.2+spatial*.9;
    // Once foregrounded, the same native folds dock entirely inside the clear navigation gap.
    // Interior routes retain their quieter background pose rather than entering the header layer.
    const collectedHeight=collectionOverlay?Math.min(50,headerDock?headerDock.width*nativeSize.y/(nativeSize.x+.08):Infinity):Math.min(mobile?140:180,height*(mobile?.17:.20)),collectedCenter=collectionOverlay?(headerDock?.y??(mobile?32:36)):(mobile?74:82)+collectedHeight*.5;
    const centerY=MathUtils.lerp(mobile?Math.max(.70,.215+320/height):.68,collectedCenter/height,spatial),split=MathUtils.lerp(mobile?.58:.8,.04,spatial);
    const opticalSweep=reduced?0:MathUtils.smootherstep(scroll,0,1.05),turn=reduced?0:Math.sin(spatial*Math.PI);
    for(const fold of folds){fold.mesh.position.x=fold.x+fold.side*split;fold.mesh.rotation.y=fold.side*turn*.38;}
    const combinedWidth=nativeSize.x+2*split,displayWidth=Math.min(width*(mobile?1.10:1.12),1500),displayHeight=Math.min(displayWidth*nativeSize.y/combinedWidth,height*(mobile?.43:1.14));
    const initialViewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*8.2,viewHeight=initialViewHeight*(camera.position.z/8.2);
    mark.scale.setScalar(initialViewHeight*(MathUtils.lerp(displayHeight,collectedHeight,spatial)/height)/nativeSize.y);
    const parallax=reduced?0:1-(collectionOverlay?spatial:0);
    const dockX=collectionOverlay&&headerDock?headerDock.x/width-.5:0;
    mark.position.set(viewHeight*camera.aspect*(dockX*spatial+x*.011*parallax*(1-spatial*.8)),viewHeight*(.5-centerY)+Math.sin(time*.32)*.035*parallax*(1-spatial*.8),0);
    mark.rotation.set(.04+spatial*.10+turn*.10+(reduced?0:-y*.055+breath*.016),-.10+spatial*.16+turn*.22+(reduced?0:x*.09+breath*.035),-.025+spatial*.025+(reduced?0:Math.sin(time*.28)*.012));
    pointerRotation.set(-y*.026*parallax,-x*.038*parallax,0,'YXZ');pointerQuaternion.setFromEuler(pointerRotation);camera.quaternion.copy(baseCamera).multiply(pointerQuaternion);
    const lightPhase=-.68+opticalSweep*1.75+(reduced?0:breath*.16+x*.10);
    scene.environmentRotation.set(.05+opticalSweep*.15,lightPhase,-opticalSweep*.12);
    // r187 uses the scene intensity when the material inherits scene.environment.
    scene.environmentIntensity=(dark?.92:.97)+Math.sin(opticalSweep*Math.PI)*.30;
    key.position.set(-4+opticalSweep*6,6-opticalSweep*2,7);key.intensity=3+Math.sin(opticalSweep*Math.PI)*1.1;
    rim.intensity=1.15+opticalSweep*.55;rim.position.set(5-opticalSweep*3,1+opticalSweep*3,4);
    wallMaterial.uniforms.uTime.value=time;wallMaterial.uniforms.uLightSweep.value=opticalSweep;wallMaterial.uniforms.uBrightness.value=dark?.96:1;wallMaterial.uniforms.uScroll.value=scroll;
    wallMaterial.uniforms.uCenter.value.set(.5,1-centerY);const projectedWidth=MathUtils.lerp(displayHeight,collectedHeight,spatial)*combinedWidth/nativeSize.y*(8.2/camera.position.z);wallMaterial.uniforms.uContact.value.set((split+.718)/combinedWidth*(projectedWidth/width),MathUtils.lerp(displayHeight,collectedHeight,spatial)/height*.43);
    const sheetDepth=.85,sheetViewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*(camera.position.z-sheetDepth);
    for(const curtain of curtains){const panel=curtain.panel;curtain.mesh.visible=!reduced&&!!panel;if(!panel)continue;const sheetHeight=panel.height/height*sheetViewHeight*1.18;curtain.mesh.position.set(((panel.left+panel.width*.5)/width-.5)*sheetViewHeight*camera.aspect,(.5-(panel.top+panel.height*.5)/height)*sheetViewHeight,sheetDepth);curtain.mesh.scale.set(panel.width/width*sheetViewHeight*camera.aspect*1.18,sheetHeight,sheetHeight);}
    // Deliberately amplified for visible spectral separation at phone sizes.
    const dispersion=4.2+Math.sin(opticalSweep*Math.PI)*1.2;
    for(const material of nativeMaterials){material.ior=1.45+opticalSweep*.07;material.thickness=.46+opticalSweep*.10;material.dispersion=dispersion;material.iridescence=.48+Math.sin(opticalSweep*Math.PI)*.12;}
    const tick=Math.floor(time*10);if(tick!==lastMotionTick){lastMotionTick=tick;canvas.dataset.glassTime=time.toFixed(1);}
    canvas.dataset.glassLightPhase=lightPhase.toFixed(3);canvas.dataset.glassReading=reading.toFixed(3);canvas.dataset.glassDispersion=dispersion.toFixed(2);
    canvas.dataset.glassCollected=spatial.toFixed(3);
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
