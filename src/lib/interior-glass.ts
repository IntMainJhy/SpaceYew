import {ACESFilmicToneMapping,Box3,Color,DirectionalLight,Group,MathUtils,Mesh,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,REVISION,Scene,ShaderChunk,ShaderMaterial,Vector2,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {interiorModels} from './interior-scene.mjs';
import type {HomeGlassScene} from './home-glass';

export type InteriorScene=keyof typeof interiorModels;
const palette=['#9bbde1','#c0dcf1','#e5ebf0','#f0f0f0'];
const transmissionChunk=ShaderChunk.transmission_pars_fragment,bicubicSample='return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );';
// Keep the native RGB volume rays and roughness LOD, using one hardware-filtered
// sample per channel rather than r187's eight-fetch bicubic reconstruction.
const linearTransmission=REVISION==='187'&&transmissionChunk.split(bicubicSample).length===2?transmissionChunk.replace(bicubicSample,'return textureLod( transmissionSamplerMap, fragCoord.xy, lod );'):null;

/** Three native Blender sculptures share optical materials, never the homepage mark. */
export async function createInteriorGlass(canvas:HTMLCanvasElement,signal:AbortSignal,kind:InteriorScene):Promise<HomeGlassScene>{
 const response=await fetch(interiorModels[kind],{signal});
 if(!response.ok)throw Error('Interior glass model unavailable');
 const {scene:model}=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 let renderer:WebGLRenderer|undefined,environment:ReturnType<PMREMGenerator['fromScene']>|undefined;
 let wallGeometry:PlaneGeometry|undefined,wallMaterial:ShaderMaterial|undefined,disposed=false;
 const dispose=()=>{
  if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);
  const materials=new Set<MeshPhysicalMaterial>();
  model.traverse(node=>{if(node instanceof Mesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});
  materials.forEach(material=>material.dispose());environment?.dispose();wallGeometry?.dispose();wallMaterial?.dispose();renderer?.dispose();
 };
 try{
  if(signal.aborted)throw new DOMException('Aborted','AbortError');
  renderer=new WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'low-power'});
  renderer.outputColorSpace='srgb';renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.transmissionResolutionScale=.5;
  const scene=new Scene(),camera=new PerspectiveCamera(36,1,.1,40),sculpture=new Group();camera.position.z=8;
  const studio=new RoomEnvironment(),pmrem=new PMREMGenerator(renderer);
  try{environment=pmrem.fromScene(studio,.03);scene.environment=environment.texture;}
  finally{studio.dispose();pmrem.dispose();}
  scene.environmentIntensity=.85;
  const light=new DirectionalLight('#f4fbff',2.2);light.position.set(-3,5,6);scene.add(light);
  const rim=new DirectionalLight('#c4e6ff',1.3);rim.position.set(4,-1,4);scene.add(rim);
  model.position.sub(new Box3().setFromObject(model,true).getCenter(new Vector3()));
  const nativeSize=new Box3().setFromObject(model,true).getSize(new Vector3());
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(!(material instanceof MeshPhysicalMaterial))continue;
    material.color.set('#ffffff');material.transmission=1;material.thickness=.36;
    material.ior=1.46;material.roughness=.045;material.metalness=0;material.envMapIntensity=.9;
    material.attenuationColor.set('#bfddf5');material.attenuationDistance=7;material.dispersion=.72;material.toneMapped=false;
    if(linearTransmission){material.onBeforeCompile=shader=>{const include='#include <transmission_pars_fragment>';if(shader.fragmentShader.split(include).length===2)shader.fragmentShader=shader.fragmentShader.replace(include,linearTransmission);};material.customProgramCacheKey=()=> 'spaceyew-interior-volume-r187';}
   }
  });
  sculpture.add(model);scene.add(sculpture);
  const colors=palette.map(color=>new Color(color));
  wallGeometry=new PlaneGeometry(40,30);
  wallMaterial=new ShaderMaterial({depthWrite:false,uniforms:{uResolution:{value:new Vector2(1,1)},uProgress:{value:0},uTop:{value:colors[0]},uBlue:{value:colors[1]},uBottom:{value:colors[2]},uIce:{value:colors[3]}},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
   uniform vec2 uResolution;uniform float uProgress;uniform vec3 uTop,uBlue,uBottom,uIce;
   void main(){
    vec2 uv=gl_FragCoord.xy/uResolution;
    float documentY=1.-uv.y+uProgress;
    vec3 color=mix(uTop,uBlue,smoothstep(.12,.88,documentY));
    color=mix(color,uBottom,smoothstep(.88,1.55,documentY));
    color=mix(color,uIce,smoothstep(1.55,2.4,documentY));
    vec2 pool=(vec2(uv.x,documentY)-vec2(.56,.86))*vec2(1.5,1.1);
    float wash=exp(-dot(pool,pool)*3.)*.075;
    color=mix(color,uBottom,wash);
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
   }
  `});wallMaterial.toneMapped=false;
  const wall=new Mesh(wallGeometry,wallMaterial);wall.position.z=-6;wall.renderOrder=-10;scene.add(wall);
  wall.onBeforeRender=passRenderer=>{const target=passRenderer.getRenderTarget(),resolution=wallMaterial!.uniforms.uResolution.value;if(target)resolution.set(target.width,target.height);else passRenderer.getDrawingBufferSize(resolution);};
  let width=1,height=1,pixelRatio=0;
  signal.addEventListener('abort',dispose,{once:true});
  return{
   // The shared lifecycle renders only while the pointer/scroll changes and sleeps when settled.
   animated:false,
   resize(nextWidth,nextHeight,dpr){
    if(disposed||!renderer)return;
    const pixelBudget=nextWidth<768?850000:2400000,nextRatio=Math.min(dpr,1.5,Math.sqrt(pixelBudget/(nextWidth*nextHeight)));
    if(width===nextWidth&&height===nextHeight&&pixelRatio===nextRatio)return;
    width=nextWidth;height=nextHeight;pixelRatio=nextRatio;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width,height,false);renderer.getDrawingBufferSize(wallMaterial!.uniforms.uResolution.value);
    camera.aspect=width/height;camera.updateProjectionMatrix();
   },
   render(x,y,_dark,scroll,reduced){
    if(disposed||!renderer)return;
    const mobile=width<768,viewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*8,viewWidth=viewHeight*camera.aspect;
    const displayHeight=mobile?Math.min(height*.44,360):Math.min(height*.72,670);
    const centerX=mobile?(kind==='resources'?.97:1.01):(kind==='community'?.88:kind==='resources'?.105:.235);
    const centerY=mobile?.265:kind==='resources'?.57:.50;
    sculpture.scale.setScalar(viewHeight*(displayHeight/height)/nativeSize.y);
    wallMaterial!.uniforms.uProgress.value=Math.max(scroll-1.05,0);
    const progress=reduced?0:Math.min(Math.max(scroll-1.05,0),1);
    sculpture.position.set(viewWidth*(centerX-.5)+(reduced?0:x*.035),viewHeight*(.5-centerY)+progress*.07+(reduced?0:y*.025),0);
    sculpture.rotation.set(kind==='login'?.04:-.08,kind==='resources'?.17:kind==='login'?-.28:.16,kind==='login'?-.06:kind==='resources'?-.08:.10);
    if(!reduced){sculpture.rotation.y+=x*.035;sculpture.rotation.x+=y*.025;}
    renderer.render(scene,camera);
   },
   dispose,
  };
 }catch(error){dispose();throw error;}
}
