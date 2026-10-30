import {Box3,CanvasTexture,Color,DirectionalLight,Euler,Group,MathUtils,Mesh,MeshPhysicalMaterial,PerspectiveCamera,PMREMGenerator,Quaternion,Scene,SRGBColorSpace,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export type HomeGlassScene={resize:(width:number,height:number,dpr:number)=>void;render:(x:number,y:number,dark:boolean,scroll:number,reduced:boolean)=>void;dispose:()=>void};
const MODEL_URL='/models/spaceyew-glass.glb';

function disposeModel(model:Group){
 const materials=new Set<MeshPhysicalMaterial>();
 model.traverse(node=>{if(node instanceof Mesh){node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});
 materials.forEach(material=>material.dispose());
}

/** Self-hosted original mark, with a procedural studio instead of a remote HDR. */
export async function createHomeGlass(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<HomeGlassScene>{
 const response=await fetch(MODEL_URL,{signal});
 if(!response.ok)throw Error('Glass model unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 const model=gltf.scene;
 if(signal.aborted){disposeModel(model);throw new DOMException('Aborted','AbortError');}
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}
 catch(error){disposeModel(model);throw error;}
 let environment:ReturnType<PMREMGenerator['fromScene']>|undefined;
 let background:CanvasTexture|undefined;
 const dispose=()=>{disposeModel(model);environment?.dispose();background?.dispose();renderer.dispose();};
 try{
  renderer.outputColorSpace=SRGBColorSpace;
  renderer.transmissionResolutionScale=.5;
  const scene=new Scene(),camera=new PerspectiveCamera(40,1,.1,100),mark=new Group();
  camera.position.z=8;
  const baseCamera=camera.quaternion.clone(),pointerRotation=new Euler(0,0,0,'YXZ'),pointerQuaternion=new Quaternion();
  const pmrem=new PMREMGenerator(renderer),room=new RoomEnvironment();
  try{environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;}
  finally{room.dispose();pmrem.dispose();}
  scene.environmentRotation.y=-.65;
  const key=new DirectionalLight('#dceeff',3);key.position.set(-3,5,6);scene.add(key);
  const rim=new DirectionalLight('#d2bcff',2);rim.position.set(4,-1,3);scene.add(rim);
  model.position.sub(new Box3().setFromObject(model).getCenter(new Vector3()));
  mark.add(model);mark.rotation.set(.06,-.18,-.04);scene.add(mark);
  const size=new Box3().setFromObject(mark).getSize(new Vector3());
  model.traverse(node=>{
   if(!(node instanceof Mesh))return;
   for(const material of Array.isArray(node.material)?node.material:[node.material]){
    if(!(material instanceof MeshPhysicalMaterial))continue;
    material.color.set('#e3f3ff');material.transmission=1;material.opacity=1;
    material.ior=1.35;material.roughness=.055;material.envMapIntensity=1.4;material.dispersion=.5;
   }
  });
  const backdrop=document.createElement('canvas');backdrop.width=8;backdrop.height=512;
  const context=backdrop.getContext('2d');if(!context)throw Error('Background unavailable');
  background=new CanvasTexture(backdrop);background.colorSpace=SRGBColorSpace;
  scene.background=background;
  let previousTheme:boolean|undefined,previousReading=-1,width=1,height=1;
  const paper=new Color(),topColor=new Color(),middleColor=new Color();
  return{
   resize(nextWidth,nextHeight,dpr){
    width=nextWidth;height=nextHeight;renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();
   },
   render(x,y,dark,scroll,reduced){
    const reading=MathUtils.smoothstep(scroll,.18,.7);
    if(dark!==previousTheme||reading!==previousReading){
     paper.set(dark?'#101a31':'#eef3f9');
     topColor.set('#142a5d').lerp(paper,reading);middleColor.set(dark?'#1c426d':'#3288ed').lerp(paper,reading);
     const gradient=context.createLinearGradient(0,0,0,512);
     gradient.addColorStop(0,topColor.getStyle());gradient.addColorStop(.48,middleColor.getStyle());gradient.addColorStop(1,paper.getStyle());
     context.fillStyle=gradient;context.fillRect(0,0,8,512);background!.needsUpdate=true;
     scene.environmentIntensity=dark?.7:1;
     previousTheme=dark;previousReading=reading;
    }
    const mobile=width<768,spatial=reduced?0:reading,drift=reduced?0:Math.sin(scroll*.4);
    const viewHeight=2*Math.tan(MathUtils.degToRad(camera.fov/2))*camera.position.z;
    const displayWidth=Math.min(width*(mobile?1.3:.55),820)*(1-spatial*.14);
    mark.scale.setScalar(viewHeight*(displayWidth/width)*camera.aspect/size.x);
    const centerX=mobile?.92:width<1100?.9:.75;
    mark.position.set(viewHeight*camera.aspect*(centerX+spatial*.08-.5),viewHeight*(.5-(mobile?.69:.64)+spatial*.04),0);
    mark.rotation.set(.06+drift*.04,-.18+spatial*.3,-.04+drift*.06);
    pointerRotation.set(-y*.014,-x*.022,0,'YXZ');pointerQuaternion.setFromEuler(pointerRotation);
    camera.quaternion.copy(baseCamera).multiply(pointerQuaternion);
    renderer.render(scene,camera);
   },
   dispose
  };
 }catch(error){dispose();throw error;}
}
