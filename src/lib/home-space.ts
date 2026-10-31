import {ACESFilmicToneMapping,AdditiveBlending,Box3,BufferGeometry,Color,DirectionalLight,DoubleSide,DynamicDrawUsage,Euler,Float32BufferAttribute,Group,InstancedMesh,MathUtils,Mesh,MeshStandardMaterial,Object3D,PerspectiveCamera,Points,Quaternion,Raycaster,Scene,ShaderMaterial,SRGBColorSpace,Vector2,Vector3,WebGLRenderer} from 'three';
import type {Material,Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {HomeGlassScene} from './home-glass';

const MOON_POSITION=new Vector3(8,-1,-22),MOON_RADIUS=5.6;
/** World-space camera beats. Scroll belongs to the page; this function accepts its normalized journey progress. */
export const SPACE_FLIGHT_STOPS=[
 {progress:0,position:[0,4,100],target:[0,1,-36],fov:40},
 {progress:.24,position:[-2,2.5,76],target:[1,0,-32],fov:40},
 {progress:.56,position:[-3,1.2,40],target:[3,-.5,-28],fov:39},
 {progress:.82,position:[0,1,8],target:[4,-.5,-25],fov:38},
 {progress:1,position:[0,1,-2],target:[5,-.5,-24],fov:36},
] as const;
const MOBILE_TARGETS=[[3,3,-36],[4,1,-32],[6,-.3,-26],[7,-.8,-23],[7.4,-1,-22]] as const;
const MOBILE_FOV=[42,42,41,40,40];
export function sampleSpaceFlight(value:number,aspect=16/9){
 const progress=Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
 let index=0;while(index<SPACE_FLIGHT_STOPS.length-2&&progress>SPACE_FLIGHT_STOPS[index+1].progress)index++;
 const a=SPACE_FLIGHT_STOPS[index],b=SPACE_FLIGHT_STOPS[index+1],span=b.progress-a.progress,t=(progress-a.progress)/span;
 const interpolate=(values:readonly number[])=>{
  const slope=(i:number)=>{
   if(i===0)return(values[1]-values[0])/(SPACE_FLIGHT_STOPS[1].progress-SPACE_FLIGHT_STOPS[0].progress);
   if(i===values.length-1)return(values[i]-values[i-1])/(SPACE_FLIGHT_STOPS[i].progress-SPACE_FLIGHT_STOPS[i-1].progress);
   const before=SPACE_FLIGHT_STOPS[i].progress-SPACE_FLIGHT_STOPS[i-1].progress,after=SPACE_FLIGHT_STOPS[i+1].progress-SPACE_FLIGHT_STOPS[i].progress,left=(values[i]-values[i-1])/before,right=(values[i+1]-values[i])/after;
   if(left*right<=0)return 0;
   const first=2*after+before,second=after+2*before;return(first+second)/(first/left+second/right);
  };
  return(2*t*t*t-3*t*t+1)*values[index]+(t*t*t-2*t*t+t)*span*slope(index)+(-2*t*t*t+3*t*t)*values[index+1]+(t*t*t-t*t)*span*slope(index+1);
 };
 const narrow=1-MathUtils.smoothstep(Number.isFinite(aspect)?aspect:16/9,.75,1.1);
 const position=[0,1,2].map(axis=>interpolate(SPACE_FLIGHT_STOPS.map(stop=>stop.position[axis]))) as [number,number,number];
 const target=[0,1,2].map(axis=>MathUtils.lerp(interpolate(SPACE_FLIGHT_STOPS.map(stop=>stop.target[axis])),interpolate(MOBILE_TARGETS.map(point=>point[axis])),narrow)) as [number,number,number];
 const fov=MathUtils.lerp(interpolate(SPACE_FLIGHT_STOPS.map(stop=>stop.fov)),interpolate(MOBILE_FOV),narrow);
 return{progress,position,target,fov};
}

function releaseModels(models:Group[]){
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>(),textures=new Set<Texture>();
 for(const model of models)model.traverse(node=>{if(node instanceof Mesh||node instanceof Points){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});
 for(const material of materials)for(const value of Object.values(material))if(value&&typeof value==='object'&&'isTexture' in value)textures.add(value as Texture);
 geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
 const bitmaps=new Set<ImageBitmap>();
 textures.forEach(texture=>{texture.dispose();const data=texture.source.data;if(typeof ImageBitmap!=='undefined'&&data instanceof ImageBitmap)bitmaps.add(data);});
 bitmaps.forEach(bitmap=>bitmap.close());
}
function randomSequence(seed:number){return()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};}

type Rock={position:Vector3;rotation:Euler;spin:Vector3;size:number;mesh:number;instance:number};
type SpaceScene=HomeGlassScene&{animated:true;activate:(x:number,y:number)=>boolean;focusNearest:()=>boolean;resetFocus:()=>void;drag:(dxNormalized:number,dyNormalized:number)=>void};

/** A finite world to fly through: a distant spiral galaxy, a lit lunar surface and individually selectable instanced rocks. */
export async function createHomeSpace(canvas:HTMLCanvasElement,signal:AbortSignal):Promise<SpaceScene>{
 const models:Group[]=[],extraGeometries:BufferGeometry[]=[],extraMaterials:Material[]=[],instancesToRelease:InstancedMesh[]=[];
 let closed=false,renderer:WebGLRenderer|undefined;
 const dispose=()=>{
  if(closed)return;closed=true;signal.removeEventListener('abort',dispose);
  instancesToRelease.forEach(mesh=>mesh.dispose());releaseModels(models);extraGeometries.forEach(geometry=>geometry.dispose());extraMaterials.forEach(material=>material.dispose());renderer?.dispose();
  canvas.dataset.spaceFocus='false';canvas.dataset.spaceDrag='false';
 };
 const loader=new GLTFLoader();
 const load=async(url:string)=>{
  const response=await fetch(url,{signal});if(!response.ok)throw Error('Space model unavailable');
  const gltf=await loader.parseAsync(await response.arrayBuffer(),'');
  if(closed||signal.aborted){releaseModels([gltf.scene]);throw new DOMException('Aborted','AbortError');}
  models.push(gltf.scene);return gltf.scene;
 };
 try{
  const [moonModel,rockModel,galaxyModel]=await Promise.all([load('/models/spaceyew-moon.glb'),load('/models/spaceyew-asteroids.glb'),load('/models/spaceyew-galaxy.glb').catch(error=>{if(signal.aborted||closed)throw error;return undefined;})]);
  let moonSurfaces=0,missingSurface=false;
  moonModel.traverse(node=>{if(node instanceof Mesh){moonSurfaces++;for(const material of Array.isArray(node.material)?node.material:[node.material])if(!(material instanceof MeshStandardMaterial)||!material.map?.image||!material.normalMap?.image)missingSurface=true;}});
  if(!moonSurfaces||missingSurface)throw Error('Lunar surface textures unavailable');
  renderer=new WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.outputColorSpace=SRGBColorSpace;renderer.toneMapping=ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;renderer.setClearColor('#030914',1);
  const scene=new Scene(),camera=new PerspectiveCamera(40,1,.1,1600),moon=new Group();
  const moonBounds=new Box3().setFromObject(moonModel,true),moonSize=moonBounds.getSize(new Vector3());
  moonModel.scale.multiplyScalar(MOON_RADIUS*2/Math.max(moonSize.x,moonSize.y,moonSize.z));
  moonModel.position.sub(new Box3().setFromObject(moonModel,true).getCenter(new Vector3()));
  moon.add(moonModel);moon.position.copy(MOON_POSITION);moon.rotation.y=.293;scene.add(moon);
  // Rotate the approved Moon/Sun relationship together, retaining the accepted terminator and surface orientation.
  const sunlight=new Vector3(.86099076,.41047233,.30034563).applyAxisAngle(new Vector3(0,1,0),.293);
  const sun=new DirectionalLight('#fff8ed',3.1);sun.position.copy(sunlight).multiplyScalar(100);scene.add(sun);
  const fill=new DirectionalLight('#adc3db',.07);fill.position.set(-30,20,100);scene.add(fill);

  const starGeometry=new BufferGeometry(),starPositions:number[]=[],starColors:number[]=[],starSizes:number[]=[],starAlphas:number[]=[],starPhases:number[]=[];
  extraGeometries.push(starGeometry);
  const random=randomSequence(813722),galaxyTilt=new Euler(1.24,0,.72,'ZXY'),galaxyCenter=new Vector3(130,48,-620),point=new Vector3(),color=new Color();
  const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(random()*Math.PI*2);
  let nativeStars=false;
  if(galaxyModel){
   galaxyModel.updateMatrixWorld(true);
   galaxyModel.traverse(node=>{
    if(!(node instanceof Points||node instanceof Mesh))return;
    const positions=node.geometry.getAttribute('position'),colors=node.geometry.getAttribute('color'),sizes=node.geometry.getAttribute('_asize'),alphas=node.geometry.getAttribute('_aalpha'),phases=node.geometry.getAttribute('_aphase');
    if(!positions)return;
    const indices=node.geometry.index,count=indices?.count??positions.count;
    const scalar=(attribute:typeof sizes,userData:string,index:number,fallback:number)=>{const value=attribute?.getX(index)??(node.userData[userData] as number[]|undefined)?.[index];return typeof value==='number'&&Number.isFinite(value)?value:fallback;};
    for(let i=0;i<count&&starSizes.length<21000;i++){
     const index=indices?.getX(i)??i;point.fromBufferAttribute(positions,index).applyMatrix4(node.matrixWorld);
     if(!Number.isFinite(point.x+point.y+point.z))continue;
     starPositions.push(point.x,point.y,point.z);
     if(colors)starColors.push(colors.getX(index),colors.getY(index),colors.getZ(index));else starColors.push(.84,.85,.82);
     starSizes.push(scalar(sizes,'aSize',index,.55+Math.pow(random(),4)*3.5));starAlphas.push(scalar(alphas,'aAlpha',index,.20+random()*.52));starPhases.push(scalar(phases,'aPhase',index,random()*Math.PI*2));
    }
   });
   nativeStars=starSizes.length>=1000;
   if(!nativeStars){starPositions.length=0;starColors.length=0;starSizes.length=0;starAlphas.length=0;starPhases.length=0;}
  }
  // The procedural layout is a resilience fallback; the primary spatial layout is authored in Blender.
  if(!nativeStars)for(let i=0;i<21000;i++){
   const disk=random()<.88;
   let size:number,alpha:number;
   if(disk){
    const bulge=random()<.17,r=bulge?Math.pow(random(),1.65)*105:30+Math.pow(random(),.67)*405;
    const arm=Math.floor(random()*4)*Math.PI/2,angle=arm+r*.015+gaussian()*(.07+r*.00039);
    point.set(Math.cos(angle)*r,Math.sin(angle)*r,(bulge?gaussian()*25:gaussian()*(4+r*.018))).applyEuler(galaxyTilt).add(galaxyCenter);
    const warmth=bulge?.9:.15+random()*.3;
    color.setRGB(.58+warmth*.36,.68+warmth*.14,.85-warmth*.27);
    const dust=random()<.28;
    size=dust?7+random()*14:.55+Math.pow(random(),4)*3.5;
    alpha=dust?.009+random()*.019:.20+random()*.52;
   }else{
    const theta=random()*Math.PI*2,z=random()*2-1,radius=430+random()*540;
    point.set(Math.sqrt(1-z*z)*Math.cos(theta)*radius,Math.sqrt(1-z*z)*Math.sin(theta)*radius,z*radius-180);
    color.setRGB(.64+random()*.29,.72+random()*.21,.81+random()*.18);
    size=.32+Math.pow(random(),6)*1.8;alpha=.35+random()*.57;
   }
   starPositions.push(point.x,point.y,point.z);starColors.push(color.r,color.g,color.b);starSizes.push(size);starAlphas.push(alpha);starPhases.push(random()*Math.PI*2);
  }
  const starCount=starSizes.length;canvas.dataset.spaceGalaxy=nativeStars?'blender':'fallback';
  starGeometry.setAttribute('position',new Float32BufferAttribute(starPositions,3));starGeometry.setAttribute('aColor',new Float32BufferAttribute(starColors,3));starGeometry.setAttribute('aSize',new Float32BufferAttribute(starSizes,1));starGeometry.setAttribute('aAlpha',new Float32BufferAttribute(starAlphas,1));starGeometry.setAttribute('aPhase',new Float32BufferAttribute(starPhases,1));
  const starMaterial=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uScale:{value:1000},uDpr:{value:1},uTime:{value:0},uOpacity:{value:1}},vertexShader:`
   attribute vec3 aColor;attribute float aSize;attribute float aAlpha;attribute float aPhase;
   uniform float uScale;uniform float uDpr;uniform float uTime;varying vec3 vColor;varying float vAlpha;
   void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float cloud=step(6.,aSize);float pointScale=mix(.82,1.08,cloud);gl_PointSize=clamp(aSize*uScale*uDpr*pointScale/max(1.,-mv.z),.65,38.*uDpr);vColor=aColor;vAlpha=aAlpha*mix(.60,1.,cloud)*(.93+.07*sin(uTime*.55+aPhase));}
  `,fragmentShader:`
   uniform float uOpacity;varying vec3 vColor;varying float vAlpha;
   void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;if(r>1.)discard;float soft=exp(-r*r*5.5);float core=exp(-r*r*32.)*.55;gl_FragColor=vec4(vColor,(soft+core)*vAlpha*uOpacity);}
  `});extraMaterials.push(starMaterial);
  const stars=new Points(starGeometry,starMaterial);stars.frustumCulled=false;scene.add(stars);

  rockModel.updateMatrixWorld(true);
  const rockSources:Mesh[]=[];rockModel.traverse(node=>{if(node instanceof Mesh)rockSources.push(node);});
  if(rockSources.length<3)throw Error('Asteroid geometry unavailable');
  const rocks:Rock[]=[],rockMeshes:InstancedMesh[]=[],rockRandom=randomSequence(44721),dummy=new Object3D(),white=new Color(1,1,1),selectedColor=new Color(1.55,1.37,1.11);
  const counts=[0,0,0];
  for(let i=0;i<42;i++){
   const band=i%3,z=band===0?52+rockRandom()*35:band===1?15+rockRandom()*37:-15+rockRandom()*30;
   const side=i%2===0?-1:1;
   let x=side*(5+rockRandom()*13),y=(rockRandom()-.5)*20;
   if(Math.abs(y)<2.5)y+=(y<0?-1:1)*2.5;
   // The lunar arrival stays open; the belt surrounds the flight corridor rather than filling its center.
   if(z<18&&x>0&&Math.abs(y)<5)y+=(y<0?-1:1)*5;
   const mesh=i%3,position=new Vector3(x,y,z),size=1.15+rockRandom()*2.4;
   rocks.push({position,rotation:new Euler(rockRandom()*6.28,rockRandom()*6.28,rockRandom()*6.28),spin:new Vector3((rockRandom()-.5)*.022,(rockRandom()-.5)*.028,(rockRandom()-.5)*.017),size,mesh,instance:counts[mesh]++});
  }
  // Three passing silhouettes, three arrival frames, then small depth markers that only resolve as the camera approaches.
  const featured=[
   {position:[-17,14,68],size:3.2},{position:[8,-2,45],size:3.6},{position:[-8,4,22],size:3.4},
   {position:[9,5.5,8],size:3.5},{position:[-4.2,-2.7,-16],size:2.6},{position:[15,3,-17],size:3.3},
   {position:[-5.2,-4.4,60],size:.35},{position:[-7,5,52],size:.4},{position:[7,4,36],size:.6},{position:[-6,-4,26],size:.6},
   {position:[1.8,4.5,4],size:.65},{position:[6,-3,-2],size:.7},{position:[2,-4.5,-6],size:.6},
   {position:[8,4,-10],size:.75},{position:[3,7,-14],size:.4},{position:[12,-5,-18],size:.55},
  ];
  featured.forEach((rock,i)=>{rocks[i].position.fromArray(rock.position);rocks[i].size=rock.size;});
  // The remaining native meshes are sparse outer-belt chips, not another layer of foreground boulders.
  for(let i=featured.length;i<rocks.length;i++){rocks[i].position.x*=2.3;rocks[i].position.y*=1.6;rocks[i].size*=.08;}
  for(let i=0;i<3;i++){
   const source=rockSources[i],material=Array.isArray(source.material)?source.material[0]:source.material;
   if(!(material instanceof MeshStandardMaterial)||!material.map?.image||!material.normalMap?.image)throw Error('Asteroid surface textures unavailable');
   const geometry=source.geometry.clone().applyMatrix4(source.matrixWorld),bounds=new Box3().setFromBufferAttribute(geometry.getAttribute('position') as Float32BufferAttribute),size=bounds.getSize(new Vector3()),center=bounds.getCenter(new Vector3());
   geometry.translate(-center.x,-center.y,-center.z);geometry.scale(1/Math.max(size.x,size.y,size.z),1/Math.max(size.x,size.y,size.z),1/Math.max(size.x,size.y,size.z));geometry.computeBoundingSphere();extraGeometries.push(geometry);
   const instances=new InstancedMesh(geometry,material,counts[i]);instances.instanceMatrix.setUsage(DynamicDrawUsage);instances.frustumCulled=false;
   for(let j=0;j<counts[i];j++)instances.setColorAt(j,white);
   rockMeshes.push(instances);instancesToRelease.push(instances);scene.add(instances);
  }
  const corridor=Array.from({length:801},(_,i)=>new Vector3().fromArray(sampleSpaceFlight(i/800).position));
  for(const rock of rocks){
   const clearance=rockMeshes[rock.mesh].geometry.boundingSphere!.radius*rock.size+3.05;
   for(let pass=0;pass<3;pass++){
    let closest=corridor[0],distance=Infinity;
    for(const position of corridor){const squared=position.distanceToSquared(rock.position);if(squared<distance){distance=squared;closest=position;}}
    if(distance>=clearance*clearance)break;
    const outward=new Vector3(rock.position.x-closest.x,rock.position.y-closest.y,0);if(outward.lengthSq()<.001)outward.x=rock.position.x<0?-1:1;
    outward.setLength(clearance);rock.position.x=closest.x+outward.x;rock.position.y=closest.y+outward.y;
   }
  }

  const tailSegments=18,tailPositions=new Float32Array((tailSegments+1)*2*3),tailUvs:number[]=[],tailIndices:number[]=[];
  for(let i=0;i<=tailSegments;i++){tailUvs.push(i/tailSegments,0,i/tailSegments,1);if(i<tailSegments){const n=i*2;tailIndices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const tailGeometry=new BufferGeometry();tailGeometry.setAttribute('position',new Float32BufferAttribute(tailPositions,3).setUsage(DynamicDrawUsage));tailGeometry.setAttribute('uv',new Float32BufferAttribute(tailUvs,2));tailGeometry.setIndex(tailIndices);extraGeometries.push(tailGeometry);
  const cometMaterial=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,side:DoubleSide,uniforms:{uFade:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uFade;void main(){float edge=exp(-pow((vUv.y-.5)*3.8,2.));float tail=pow(vUv.x,1.7);gl_FragColor=vec4(.86,.85,.78,edge*tail*uFade*.58);}`});extraMaterials.push(cometMaterial);
  const cometTail=new Mesh(tailGeometry,cometMaterial);cometTail.frustumCulled=false;cometTail.visible=false;scene.add(cometTail);
  const headGeometry=new BufferGeometry();headGeometry.setAttribute('position',new Float32BufferAttribute([0,0,0],3));extraGeometries.push(headGeometry);
  const headMaterial=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,uniforms:{uSize:{value:4},uFade:{value:0}},vertexShader:`uniform float uSize;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=uSize;}`,fragmentShader:`uniform float uFade;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.86,.94,1.,exp(-d*d*5.)*uFade);}`});extraMaterials.push(headMaterial);
  const cometHead=new Points(headGeometry,headMaterial);cometHead.frustumCulled=false;cometHead.visible=false;scene.add(cometHead);

  let height=1,dpr=1,mobile=false,visibleRocks=42,previousTime=0,lastProgress=0,focusAmount=0,focused=false,focusStartProgress=0,selected:Rock|undefined,diagnosticPhase='',diagnosticDistance=-1,disposed=false,lastReduced=false,cometClock=0,cometStartTime=-Infinity,nextCometTime=Infinity,cometNumber=0,dragYaw=0,dragPitch=0,dragYawTarget=0,dragPitchTarget=0;
  const raycaster=new Raycaster(),ndc=new Vector2(),basePosition=new Vector3(),baseTarget=new Vector3(),focusPositionDelta=new Vector3(),focusTargetDelta=new Vector3(),lookTarget=new Vector3(),forward=new Vector3(),right=new Vector3(),up=new Vector3(),cometStart=new Vector3(),cometVelocity=new Vector3(),cometPoint=new Vector3(),tailPoint=new Vector3(),tailDirection=new Vector3(),projected=new Vector3(),pointerQuaternion=new Quaternion(),pointerEuler=new Euler(0,0,0,'YXZ');
  const restoreColor=()=>{if(selected){rockMeshes[selected.mesh].setColorAt(selected.instance,white);rockMeshes[selected.mesh].instanceColor!.needsUpdate=true;selected=undefined;}};
  const resetFocus=()=>{focused=false;restoreColor();dragYawTarget=0;dragPitchTarget=0;canvas.dataset.spaceFocus='false';canvas.dataset.spaceDrag='false';};
  const focusRock=(rock:Rock)=>{
   if(closed||disposed||lastReduced||lastProgress<=.18||lastProgress>=.80)return false;
   dragYawTarget=0;dragPitchTarget=0;
   restoreColor();selected=rock;focused=true;focusStartProgress=lastProgress;
   const direction=rock.position.clone().sub(basePosition),distance=direction.length(),radius=rockMeshes[rock.mesh].geometry.boundingSphere!.radius*rock.size;
   const safeDistance=Math.max(radius+3.05,4*radius/(Math.tan(MathUtils.degToRad(camera.fov/2))*camera.aspect));
   let advance=Math.min(6,Math.max(0,distance-safeDistance));direction.normalize();
   // Check the entire short approach segment against every physical bounding sphere, not only its endpoint.
   for(let attempt=0;attempt<8;attempt++){
    const blocked=rocks.slice(0,visibleRocks).some(other=>{const offset=other.position.clone().sub(basePosition),along=Math.max(0,Math.min(advance,offset.dot(direction))),clearance=offset.addScaledVector(direction,-along).length(),otherRadius=rockMeshes[other.mesh].geometry.boundingSphere!.radius*other.size;return clearance<otherRadius+3.05;});
    if(!blocked)break;advance*=.5;
   }
   focusPositionDelta.copy(direction).multiplyScalar(advance);focusTargetDelta.copy(rock.position).sub(baseTarget);
   rockMeshes[rock.mesh].setColorAt(rock.instance,selectedColor);rockMeshes[rock.mesh].instanceColor!.needsUpdate=true;canvas.dataset.spaceFocus='true';return true;
  };
  const setInstances=(time:number)=>{
   const used=[0,0,0];
   for(let i=0;i<visibleRocks;i++){
    const rock=rocks[i];dummy.position.copy(rock.position);dummy.rotation.set(rock.rotation.x+rock.spin.x*time,rock.rotation.y+rock.spin.y*time,rock.rotation.z+rock.spin.z*time);dummy.scale.setScalar(rock.size);dummy.updateMatrix();rockMeshes[rock.mesh].setMatrixAt(rock.instance,dummy.matrix);used[rock.mesh]++;
   }
   rockMeshes.forEach((mesh,i)=>{mesh.count=used[i];mesh.instanceMatrix.needsUpdate=true;});
  };
  setInstances(0);rockMeshes.forEach(mesh=>mesh.computeBoundingSphere());
  canvas.dataset.spaceFocus='false';canvas.dataset.spaceStars=String(starCount);canvas.dataset.spaceRockCount=String(visibleRocks);canvas.dataset.spaceComets='0';
  signal.addEventListener('abort',dispose,{once:true});if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
  return{
   animated:true,
   resize(w,h,pixelRatio){
    if(focused){resetFocus();focusAmount=0;}
    height=h;mobile=w<768;dpr=Math.min(pixelRatio,mobile?1.5:1.65);visibleRocks=mobile?20:42;
    if(mobile){dragYaw=0;dragPitch=0;dragYawTarget=0;dragPitchTarget=0;}
    renderer!.setPixelRatio(dpr);renderer!.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const renderedStars=mobile?Math.min(8000,starCount):starCount;starGeometry.setDrawRange(0,renderedStars);starMaterial.uniforms.uDpr.value=dpr;
    canvas.dataset.spaceStars=String(renderedStars);canvas.dataset.spaceRockCount=String(visibleRocks);
   },
   render(x,y,_dark,scroll,reduced,elapsed=0){
    if(closed||disposed)return;
    lastReduced=reduced;const time=reduced?0:Math.max(0,elapsed),rawDelta=time-previousTime,delta=rawDelta>0&&rawDelta<=.1?rawDelta:0;previousTime=time;
    const flight=sampleSpaceFlight(reduced?.9:scroll,camera.aspect);lastProgress=flight.progress;basePosition.fromArray(flight.position);baseTarget.fromArray(flight.target);
    if(focused&&(reduced||Math.abs(lastProgress-focusStartProgress)>.003))resetFocus();
    focusAmount+=(Number(focused)-focusAmount)*(delta?1-Math.exp(-delta*(focused?4.5:8.5)):0);
    if(reduced)focusAmount=0;
    if(Math.abs(Number(focused)-focusAmount)<.001)focusAmount=Number(focused);
    if(reduced||mobile){dragYaw=0;dragPitch=0;dragYawTarget=0;dragPitchTarget=0;}else{
     const follow=delta?1-Math.exp(-delta*12):0;dragYaw+=(dragYawTarget-dragYaw)*follow;dragPitch+=(dragPitchTarget-dragPitch)*follow;
    }
    camera.position.copy(basePosition).addScaledVector(focusPositionDelta,focusAmount);lookTarget.copy(baseTarget).addScaledVector(focusTargetDelta,focusAmount);
    const pointerWeight=reduced||mobile?0:(1-focusAmount*.7)*(1-MathUtils.smoothstep(lastProgress,.72,1)*.35);
    camera.position.x-=x*.35*pointerWeight;camera.position.y+=y*.20*pointerWeight;
    const nearLook=MathUtils.smoothstep(lastProgress,.8,1),yawLimit=MathUtils.degToRad(MathUtils.lerp(6,3.5,nearLook)),pitchLimit=MathUtils.degToRad(MathUtils.lerp(3,2,nearLook));
    camera.lookAt(lookTarget);pointerEuler.set(MathUtils.clamp(-y*MathUtils.degToRad(.9)*pointerWeight+dragPitch*(1-focusAmount),-pitchLimit,pitchLimit),MathUtils.clamp(-x*MathUtils.degToRad(1.4)*pointerWeight+dragYaw*(1-focusAmount),-yawLimit,yawLimit),0);pointerQuaternion.setFromEuler(pointerEuler);camera.quaternion.multiply(pointerQuaternion);
    canvas.dataset.spaceLookYaw=MathUtils.radToDeg(pointerEuler.y).toFixed(2);canvas.dataset.spaceLookPitch=MathUtils.radToDeg(pointerEuler.x).toFixed(2);
    if(camera.fov!==flight.fov){camera.fov=flight.fov;camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
    starMaterial.uniforms.uScale.value=height/(2*Math.tan(MathUtils.degToRad(camera.fov/2)));starMaterial.uniforms.uTime.value=time;starMaterial.uniforms.uOpacity.value=1;
    setInstances(time);
    if(!reduced&&!focused)cometClock+=delta;
    const launchComet=()=>{
     camera.getWorldDirection(forward);right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
     const halfHeight=115*Math.tan(MathUtils.degToRad(camera.fov/2)),halfWidth=halfHeight*camera.aspect;
     cometStart.copy(camera.position).addScaledVector(forward,115).addScaledVector(right,halfWidth*.84).addScaledVector(up,halfHeight*(.68-(cometNumber%3)*.04));
     cometVelocity.copy(right).multiplyScalar(-halfWidth*.62/1.05).addScaledVector(up,-halfHeight*.40/1.05);cometStartTime=cometClock;nextCometTime=cometClock+29+(cometNumber%3)*4;cometNumber++;
    };
    if(!reduced&&!focused&&lastProgress>.36&&((cometNumber===0)||cometClock>=nextCometTime))launchComet();
    const phase=cometClock-cometStartTime,showComet=!reduced&&!focused&&phase>=0&&phase<1.05;
    if(showComet){
     camera.getWorldDirection(forward);right.set(1,0,0).applyQuaternion(camera.quaternion);up.set(0,1,0).applyQuaternion(camera.quaternion);
     cometPoint.copy(cometStart).addScaledVector(cometVelocity,phase);cometHead.position.copy(cometPoint);tailDirection.copy(cometVelocity).normalize();
     const tailLength=2*115*Math.tan(MathUtils.degToRad(camera.fov/2))*camera.aspect*.12;
     for(let i=0;i<=tailSegments;i++){
      const t=i/tailSegments,spread=(1-t)*.35+.035;tailPoint.copy(cometPoint).addScaledVector(tailDirection,-(1-t)*tailLength).addScaledVector(up,Math.sin((1-t)*Math.PI)*.3);
      const n=i*6;tailPositions[n]=tailPoint.x-up.x*spread;tailPositions[n+1]=tailPoint.y-up.y*spread;tailPositions[n+2]=tailPoint.z-up.z*spread;tailPositions[n+3]=tailPoint.x+up.x*spread;tailPositions[n+4]=tailPoint.y+up.y*spread;tailPositions[n+5]=tailPoint.z+up.z*spread;
     }
     // The attribute owns a copied array, so update its storage rather than leaving a stale ribbon behind.
     (tailGeometry.getAttribute('position') as Float32BufferAttribute).array.set(tailPositions);tailGeometry.getAttribute('position').needsUpdate=true;
     const fade=Math.min(1,phase/.12,(1.05-phase)/.20);cometMaterial.uniforms.uFade.value=fade;headMaterial.uniforms.uFade.value=fade;headMaterial.uniforms.uSize.value=(mobile?4:5.5)*dpr;
    }
    cometHead.visible=showComet;cometTail.visible=showComet;canvas.dataset.spaceComets=showComet?'1':'0';
    const journeyPhase=lastProgress<.27?'far':lastProgress<.82?'belt':'near';if(journeyPhase!==diagnosticPhase){diagnosticPhase=journeyPhase;canvas.dataset.journeyPhase=journeyPhase;}
    const distance=Math.round(camera.position.distanceTo(MOON_POSITION)*10)/10;if(distance!==diagnosticDistance){diagnosticDistance=distance;canvas.dataset.spaceDistance=String(distance);canvas.dataset.spaceCameraZ=camera.position.z.toFixed(2);}
    renderer!.render(scene,camera);
   },
   activate(x,y){
    if(closed||disposed||lastReduced||lastProgress<=.18||lastProgress>=.80){resetFocus();return false;}ndc.set(x,y);raycaster.setFromCamera(ndc,camera);scene.updateMatrixWorld(true);
    const hit=raycaster.intersectObjects(rockMeshes,false)[0];
    if(!hit||hit.instanceId===undefined){resetFocus();return false;}
    const mesh=rockMeshes.indexOf(hit.object as InstancedMesh),rock=rocks.find(candidate=>candidate.mesh===mesh&&candidate.instance===hit.instanceId);
    return rock?focusRock(rock):false;
   },
   focusNearest(){
    if(closed||disposed||lastReduced||lastProgress<=.18||lastProgress>=.80)return false;
    let nearest:Rock|undefined,score=Infinity;
    for(let i=0;i<visibleRocks;i++){const rock=rocks[i];projected.copy(rock.position).project(camera);if(Math.abs(projected.x)>.92||Math.abs(projected.y)>.88||projected.z< -1||projected.z>1)continue;const candidate=camera.position.distanceTo(rock.position)/rock.size;if(candidate<score){score=candidate;nearest=rock;}}
    return nearest?focusRock(nearest):false;
   },
   resetFocus,
   drag(dxNormalized,dyNormalized){
    if(closed||disposed||lastReduced||mobile||!Number.isFinite(dxNormalized)||!Number.isFinite(dyNormalized))return;
    if(focused)resetFocus();
    // Deltas are fractions of canvas width/height; a deliberate drag adds a bounded view rotation.
    dragYawTarget=MathUtils.clamp(dragYawTarget-dxNormalized*MathUtils.degToRad(45),-MathUtils.degToRad(6),MathUtils.degToRad(6));
    dragPitchTarget=MathUtils.clamp(dragPitchTarget-dyNormalized*MathUtils.degToRad(45),-MathUtils.degToRad(3),MathUtils.degToRad(3));canvas.dataset.spaceDrag='true';
   },
   dispose(){disposed=true;dispose();},
  };
 }catch(error){dispose();throw error;}
}
