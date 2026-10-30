import {ACESFilmicToneMapping,Box3,BufferGeometry,DirectionalLight,Float32BufferAttribute,Group,MathUtils,Mesh,MeshStandardMaterial,PerspectiveCamera,Points,PointsMaterial,Scene,SRGBColorSpace,Vector3,WebGLRenderer} from 'three';
import type {Material,Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {HomeGlassScene} from './home-glass';

const MODEL_URL='/models/spaceyew-moon.glb';
/** The approved Blender Moon, including measured relief and baked LRO surface normals. */
export async function createHomeMoon(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<HomeGlassScene>{
 const response=await fetch(MODEL_URL,{signal});
 if(!response.ok)throw Error('Lunar model unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 const model=gltf.scene,materials=new Set<Material>(),textures=new Set<Texture>();
 let surfaceReady=false;
 model.traverse(node=>{if(node instanceof Mesh)for(const material of Array.isArray(node.material)?node.material:[node.material]){materials.add(material);if(material instanceof MeshStandardMaterial&&material.map?.image&&material.normalMap?.image)surfaceReady=true;if(material instanceof MeshStandardMaterial)for(const texture of [material.map,material.normalMap,material.roughnessMap,material.metalnessMap])if(texture)textures.add(texture);}});
 const releaseModel=()=>{model.traverse(node=>{if(node instanceof Mesh)node.geometry.dispose();});materials.forEach(material=>material.dispose());textures.forEach(texture=>{texture.dispose();const data=texture.source.data;if(typeof ImageBitmap!=='undefined'&&data instanceof ImageBitmap)data.close();});};
 if(signal.aborted){releaseModel();throw new DOMException('Aborted','AbortError');}
 if(!surfaceReady){releaseModel();throw Error('Lunar surface textures unavailable');}
 let renderer:WebGLRenderer;
 try{renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch(error){releaseModel();throw error;}
 const starGeometry=new BufferGeometry(),starMaterial=new PointsMaterial({color:'#ccd7e4',size:.013,transparent:true,opacity:.36,depthWrite:false});
 const dispose=()=>{releaseModel();starGeometry.dispose();starMaterial.dispose();renderer.dispose();};
 try{
  renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.setClearColor(0,0);
  const scene=new Scene(),camera=new PerspectiveCamera(36,1,.1,100),moon=new Group();
  const viewDirection=new Vector3(-.28901738,-.00999950,.95727164).normalize();
  const right=new Vector3().crossVectors(new Vector3(0,1,0),viewDirection).normalize(),up=new Vector3().crossVectors(viewDirection,right).normalize();
  camera.position.copy(viewDirection).multiplyScalar(8);camera.up.copy(up);camera.lookAt(0,0,0);
  const bounds=new Box3().setFromObject(model,true),size=bounds.getSize(new Vector3());
  model.scale.multiplyScalar(2/Math.max(size.x,size.y,size.z));model.position.sub(new Box3().setFromObject(model,true).getCenter(new Vector3()));moon.add(model);scene.add(moon);
  // The Sun direction matches the accepted Blender frame. The Moon has no emissive rim.
  const sun=new DirectionalLight('#fff8ed',3);sun.position.set(.86099076,.41047233,.30034563).multiplyScalar(10);scene.add(sun);
  const fill=new DirectionalLight('#b5c3d2',.035);fill.position.copy(viewDirection).multiplyScalar(8);scene.add(fill);
  const points:number[]=[];let seed=70321;
  const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<110;i++)points.push((random()-.5)*26,(random()-.5)*17,-8-random()*6);
  starGeometry.setAttribute('position',new Float32BufferAttribute(points,3));
  const stars=new Points(starGeometry,starMaterial);scene.add(stars);
  let width=1,height=1,mobileCenterY=.59;
  return{
   resize(w,h,dpr){width=w;height=h;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);const copy=canvas.closest('.v2-home')?.querySelector('.v2-hero-copy');if(w<768&&copy){const diameter=Math.min(w*.82,h*.36);mobileCenterY=(copy.getBoundingClientRect().bottom-canvas.getBoundingClientRect().top+28+diameter/2)/h;}camera.aspect=w/h;camera.updateProjectionMatrix();},
   render(x,y,dark,scroll,reduced){
    const mobile=width<768,reading=MathUtils.smoothstep(scroll,.18,1.0),travel=reduced?0:reading;
    const diameter=Math.min(width*(mobile?.82:.55),height*(mobile?.36:.74))*(1-travel*.35);
    const viewHeight=2*Math.tan(MathUtils.degToRad(18))*8;
    moon.scale.setScalar(viewHeight*(diameter/height)/2);
    const centerX=mobile?.5:.78,centerY=mobile?mobileCenterY:.36;
    camera.position.copy(viewDirection).multiplyScalar(8).addScaledVector(right,reduced?0:-x*.10).addScaledVector(up,reduced?0:y*.07);
    camera.lookAt(0,0,0);
    camera.setViewOffset(width,height,(.5-centerX-travel*.14)*width,(.5-centerY+travel*.07)*height,width,height);
    moon.rotation.y=travel*.10;moon.rotation.z=travel*-.025;
    stars.rotation.y=reduced?0:-x*.009;stars.rotation.x=reduced?0:y*.006;
    starMaterial.opacity=dark?.44:.30;
    renderer.render(scene,camera);
   },dispose
  };
 }catch(error){dispose();throw error;}
}
