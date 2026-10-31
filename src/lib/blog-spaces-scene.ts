import {BackSide,BoxGeometry,CanvasTexture,CatmullRomCurve3,Color,FrontSide,Group,MathUtils,Mesh,MeshBasicMaterial,MeshPhysicalMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Raycaster,REVISION,Scene,ShaderChunk,ShaderMaterial,Shape,ShapeGeometry,SRGBColorSpace,TubeGeometry,Vector2,Vector3,WebGLRenderer} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import type {BlogSpacePreview} from '@/components/BlogSpacesJourney';

const chunk=ShaderChunk.transmission_pars_fragment,sample='return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );';
const linearChunk=REVISION==='187'&&chunk.split(sample).length===2?chunk.replace(sample,'return textureLod( transmissionSamplerMap, fragCoord.xy, 0.0 );'):null;

export function blogJourneyCameraZ(progress:number,count:number,reduced=false){
 return reduced||count===0?9:9-MathUtils.smoothstep(MathUtils.clamp(progress,0,1),0,.88)*(Math.max(0,count-1)*6.6+14);
}
/** Pages move into a readable near-centre shot before their close pass peels to the side. */
export function blogJourneyPanelPose(cameraZ:number,index:number,aspect:number,mobile:boolean){
 const side=index%2?1:-1,z=-index*6.6-(mobile?3:0),distance=cameraZ-z;
 const centre=1-MathUtils.smoothstep(distance,5.5,mobile?10.5:8.8),peel=1-MathUtils.smoothstep(distance,1.1,3.1),baseScale=mobile?.58:.82;
 const fit=Math.max(.03,2*Math.tan(MathUtils.degToRad(21))*Math.max(distance,.3)*aspect*(mobile?.9:.72)/4.8);
 return{x:side*(MathUtils.lerp(mobile?.28:3.5,mobile?.025:.16,centre)+peel*(mobile?2.2:5.5)),y:MathUtils.lerp(mobile?-.9:index%2?-.3:.25,.05,centre)+side*peel*.45,z,scale:Math.min(baseScale,MathUtils.lerp(fit,baseScale,peel)),rotationY:side*(MathUtils.lerp(.09,.025,centre)+peel*.45),rotationZ:side*(.025+peel*.05),visible:distance>.35};
}
export type BlogSpacesScene={resize:(width:number,height:number,dpr:number)=>void;render:(progress:number,x:number,y:number,reduced:boolean)=>number;pick:(x:number,y:number)=>string|null;dispose:()=>void};

function lines(context:CanvasRenderingContext2D,value:string,x:number,y:number,maxWidth:number,lineHeight:number,maxLines:number){
 const words=Array.from(value.replace(/\s+/g,' ').trim());let cursor=0;
 for(let row=0;row<maxLines&&cursor<words.length;row++){
  let line='';while(cursor<words.length&&(!line||context.measureText(line+words[cursor]).width<=maxWidth))line+=words[cursor++];
  if(row===maxLines-1&&cursor<words.length){while(line&&context.measureText(line+'…').width>maxWidth)line=Array.from(line).slice(0,-1).join('');line+='…';}
  context.fillText(line,x,y+row*lineHeight);
 }
}
function cover(context:CanvasRenderingContext2D,image:ImageBitmap,x:number,y:number,width:number,height:number){
 const scale=Math.max(width/image.width,height/image.height),sw=width/scale,sh=height/scale;
 context.drawImage(image,(image.width-sw)/2,(image.height-sh)/2,sw,sh,x,y,width,height);
}

/** One native mesh per real public space. Sharp content sits on its front face; the glass perimeter remains optical. */
export async function createBlogSpacesScene(canvas:HTMLCanvasElement,spaces:BlogSpacePreview[],signal:AbortSignal,invalidate:()=>void):Promise<BlogSpacesScene>{
 const response=await fetch('/models/spaceyew-blog-panel.glb',{signal});if(!response.ok)throw Error('Glass panel unavailable');
 const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
 let disposed=false,renderer:WebGLRenderer|undefined,environment:ReturnType<PMREMGenerator['fromScene']>|undefined;
 const scene=new Scene(),camera=new PerspectiveCamera(42,1,.1,180),geometry=new Set<any>(),materials=new Set<any>(),textures:CanvasTexture[]=[],bitmaps=new Set<ImageBitmap>();
 const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);geometry.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());textures.forEach(item=>item.dispose());bitmaps.forEach(item=>item.close());environment?.dispose();renderer?.dispose();};
 gltf.scene.traverse(node=>{if(node instanceof Mesh){geometry.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);}});
 if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
 try{
  renderer=new WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'high-performance'});renderer.outputColorSpace=SRGBColorSpace;renderer.transmissionResolutionScale=.65;
  const studio=new Scene();studio.background=new Color('#315785');const boxGeometry=new BoxGeometry(),studioMaterials:MeshBasicMaterial[]=[];
  for(const [position,scale,color,power] of [
   [[0,0,0],[34,26,32],'#6b9ac5',.55],[[ -6,4,6],[2.7,10,.12],'#f1faff',5.4],[[6,1,4],[.65,9,.12],'#e2f4ff',5],[[0,7,2],[8,.7,.12],'#fff0dd',4.6],[[-2,0,-7],[4,10,.12],'#163958',.5],[[7,-1,-3],[2.2,12,.12],'#315472',.5],
  ] as [number[],number[],string,number][]){
   const material=new MeshBasicMaterial({color:new Color(color).multiplyScalar(power),side:BackSide});studioMaterials.push(material);const box=new Mesh(boxGeometry,material);box.position.fromArray(position);box.scale.fromArray(scale);box.lookAt(0,0,0);studio.add(box);
  }
  const pmrem=new PMREMGenerator(renderer);try{environment=pmrem.fromScene(studio,0);scene.environment=environment.texture;}finally{boxGeometry.dispose();studioMaterials.forEach(material=>material.dispose());pmrem.dispose();}
  scene.environmentRotation.y=-.45;
  gltf.scene.traverse(node=>{if(!(node instanceof Mesh))return;for(const material of Array.isArray(node.material)?node.material:[node.material])if(material instanceof MeshPhysicalMaterial){
   material.color.set('#ffffff');material.side=FrontSide;material.transmission=1;material.ior=1.52;material.thickness=.24;material.roughness=.01;material.dispersion=1.4;material.clearcoat=0;material.envMapIntensity=.95;material.attenuationColor.set('#d4e9ff');material.attenuationDistance=12;material.toneMapped=false;
   if(linearChunk){material.onBeforeCompile=shader=>{const include='#include <transmission_pars_fragment>';if(shader.fragmentShader.split(include).length===2)shader.fragmentShader=shader.fragmentShader.replace(include,linearChunk);};material.customProgramCacheKey=()=> 'spaceyew-blog-base-volume-r187';}
  }});
  const wallGeometry=new PlaneGeometry(600,360);geometry.add(wallGeometry);
  const wallMaterial=new ShaderMaterial({depthWrite:false,toneMapped:false,uniforms:{uProgress:{value:0},uTop:{value:new Color('#1b376b')},uBlue:{value:new Color('#2c79c8')},uIce:{value:new Color('#eaf3fa')}},vertexShader:'varying vec2 vScreen;void main(){vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vScreen=p.xy/p.w*.5+.5;gl_Position=p;}',fragmentShader:`varying vec2 vScreen;uniform float uProgress;uniform vec3 uTop;uniform vec3 uBlue;uniform vec3 uIce;void main(){float y=1.-vScreen.y;vec3 color=mix(uTop,uBlue,smoothstep(0.,.66,y));color=mix(color,uIce,smoothstep(.55,1.6,y+uProgress*.8));color=mix(color,uIce,smoothstep(.72,1.,uProgress));gl_FragColor=vec4(color,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});materials.add(wallMaterial);const wall=new Mesh(wallGeometry,wallMaterial);wall.position.z=-90;wall.renderOrder=-10;scene.add(wall);
  // This polished rim samples only mip 0; avoid rebuilding unused transmission mips every frame.
  if(linearChunk)wall.onBeforeRender=activeRenderer=>{const target=activeRenderer.getRenderTarget();if(target)(target.texture as typeof target.texture&{mipmapsAutoUpdate:boolean}).mipmapsAutoUpdate=false;};
  // Real rounded geometry gives MSAA a stable boundary; alpha-discard corners shimmer in motion.
  const halfWidth=2.24,halfHeight=1.425,radius=.15,outline=new Shape();
  outline.moveTo(-halfWidth+radius,-halfHeight);outline.lineTo(halfWidth-radius,-halfHeight);outline.absarc(halfWidth-radius,-halfHeight+radius,radius,-Math.PI/2,0);outline.lineTo(halfWidth,halfHeight-radius);outline.absarc(halfWidth-radius,halfHeight-radius,radius,0,Math.PI/2);outline.lineTo(-halfWidth+radius,halfHeight);outline.absarc(-halfWidth+radius,halfHeight-radius,radius,Math.PI/2,Math.PI);outline.lineTo(-halfWidth,-halfHeight+radius);outline.absarc(-halfWidth+radius,-halfHeight+radius,radius,Math.PI,Math.PI*1.5);outline.closePath();
  const contentGeometry=new ShapeGeometry(outline,12),positions=contentGeometry.getAttribute('position'),uvs=contentGeometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++)uvs.setXY(i,positions.getX(i)/(halfWidth*2)+.5,positions.getY(i)/(halfHeight*2)+.5);geometry.add(contentGeometry);
  const panels:{group:Group;index:number;glass:Mesh[];space:BlogSpacePreview}[]=[];
  for(const [index,space] of spaces.entries()){
   const group=new Group(),glass:Mesh[]=[];const native=gltf.scene.clone(true);native.traverse(node=>{if(node instanceof Mesh)glass.push(node);});group.add(native);
   const preview=document.createElement('canvas');preview.width=1600;preview.height=1040;const context=preview.getContext('2d');if(!context)throw Error('Preview unavailable');
   const texture=new CanvasTexture(preview);texture.colorSpace=SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures.push(texture);
   const images:{avatar?:ImageBitmap;cover?:ImageBitmap}={};
   const paint=()=>{
    if(disposed)return;const background=context.createLinearGradient(0,0,1600,1040);background.addColorStop(0,'#edf7ff');background.addColorStop(1,'#c8e1f5');context.fillStyle=background;context.fillRect(0,0,1600,1040);
    context.strokeStyle='#b0cde4';context.lineWidth=2;context.beginPath();context.moveTo(0,130);context.lineTo(1600,130);context.stroke();
    for(const [i,color] of ['#d7a19a','#d6be86','#95c3bb'].entries()){context.fillStyle=color;context.beginPath();context.arc(70+i*37,65,12,0,Math.PI*2);context.fill();}
    context.fillStyle='#365e84';context.font='500 28px "SpaceYew Sans","PingFang SC",sans-serif';context.fillText('/blog/'+space.handle,220,76);
    if(images.avatar){context.save();context.beginPath();context.arc(130,255,55,0,Math.PI*2);context.clip();cover(context,images.avatar,75,200,110,110);context.restore();}
    context.fillStyle='#173d63';context.font='600 72px "SpaceYew Sans","PingFang SC","Microsoft YaHei",sans-serif';lines(context,space.name,75,410,images.cover?700:1420,90,2);
    context.fillStyle='#406a90';context.font='400 34px "SpaceYew Sans","PingFang SC",sans-serif';context.fillText('@'+space.handle,75,595);
    context.fillStyle='#2b557b';context.font='400 38px "SpaceYew Sans","PingFang SC","Microsoft YaHei",sans-serif';lines(context,space.intro,75,690,images.cover?670:1410,62,4);
    if(images.cover){context.save();context.beginPath();context.roundRect(820,210,705,space.projectTitle?610:705,34);context.clip();cover(context,images.cover,820,210,705,space.projectTitle?610:705);context.restore();if(space.projectTitle){context.fillStyle='#1d4a73';context.font='600 36px "SpaceYew Sans","PingFang SC","Microsoft YaHei",sans-serif';lines(context,space.projectTitle,820,880,705,48,2);}}
    texture.needsUpdate=true;invalidate();
   };
   paint();document.fonts?.ready.then(paint).catch(()=>{});
   for(const [key,id] of [['avatar',space.avatarId],['cover',space.coverId]] as const){if(!id)continue;void fetch('/media/'+encodeURIComponent(id),{signal}).then(res=>{if(!res.ok)throw Error('Preview image unavailable');return res.blob();}).then(blob=>createImageBitmap(blob)).then(bitmap=>{if(disposed){bitmap.close();return;}bitmaps.add(bitmap);images[key]=bitmap;paint();}).catch(()=>{});}
   const material=new MeshBasicMaterial({map:texture,toneMapped:false});materials.add(material);const content=new Mesh(contentGeometry,material);content.position.z=.145;group.add(content);scene.add(group);panels.push({group,index,glass,space});
  }
  // Restore the original studio curve, keeping it behind even an eight-page flight.
  const lightDepth=Math.min(-30,-Math.max(0,spaces.length-1)*6.6-12),lightScale=(9-lightDepth)/39;
  const curve=new CatmullRomCurve3([[-60,-11.23],[-20,-2],[-7,1],[0,3],[8,1],[20,3],[60,9.67]].map(([x,y])=>new Vector3(x*lightScale,y*lightScale,lightDepth))),lightGeometry=new TubeGeometry(curve,512,.025*lightScale,8,false);geometry.add(lightGeometry);
  const lightMaterial=new MeshBasicMaterial({color:new Color('#d4ecff').multiplyScalar(.8),toneMapped:false});materials.add(lightMaterial);scene.add(new Mesh(lightGeometry,lightMaterial));
  let width=1,height=1,mobile=false;
  const raycaster=new Raycaster(),mouse=new Vector2();
  signal.addEventListener('abort',dispose,{once:true});if(signal.aborted){dispose();throw new DOMException('Aborted','AbortError');}
  return{
   resize(nextWidth,nextHeight,dpr){if(disposed)return;width=nextWidth;height=nextHeight;mobile=width<768;renderer!.setPixelRatio(Math.min(dpr,2));renderer!.setSize(width,height,false);renderer!.transmissionResolutionScale=mobile?.55:.7;camera.aspect=width/height;camera.updateProjectionMatrix();},
   render(progress,x,y,reduced){
    if(disposed)return 0;const p=reduced?0:MathUtils.clamp(progress,0,1);camera.position.set(reduced?0:x*.2+Math.sin(p*Math.PI*2)*.35,reduced?0:-y*.12,blogJourneyCameraZ(p,spaces.length,reduced));camera.rotation.set(reduced?0:-y*.018,reduced?0:-x*.025,0,'YXZ');wallMaterial.uniforms.uProgress.value=p;
    let selected=0,closest=Infinity;for(const panel of panels){const pose=blogJourneyPanelPose(camera.position.z,panel.index,camera.aspect,mobile);
     panel.group.position.set(pose.x,pose.y,pose.z);panel.group.scale.setScalar(pose.scale);panel.group.rotation.set(0,pose.rotationY+(reduced?0:x*.025),pose.rotationZ);panel.group.visible=pose.visible&&p<.99;
     const score=Math.abs(camera.position.z-panel.group.position.z-7);if(panel.group.visible&&score<closest){closest=score;selected=panel.index;}
    }
    renderer!.render(scene,camera);canvas.dataset.blogGlass='native-blender';canvas.dataset.blogProgress=p.toFixed(3);return selected;
   },
   pick(x,y){if(disposed)return null;mouse.set(x,y);raycaster.setFromCamera(mouse,camera);for(const hit of raycaster.intersectObjects(panels.filter(panel=>panel.group.visible).flatMap(panel=>panel.glass),false)){const panel=panels.find(panel=>panel.glass.includes(hit.object as Mesh));if(panel)return panel.space.href;}return null;},
   dispose,
  };
 }catch(error){dispose();throw error;}
}
