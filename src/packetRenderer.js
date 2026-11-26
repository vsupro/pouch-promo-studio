import { canvasFont } from './fonts.js';
// A lit height-field: rounded type under a continuous, tensioned plastic surface.
// The pouch spans the artboard. Only its internal type moves; printed artwork is composited afterward.
let cachedGeometry, cachedRender, cachedSheet;
function createCanvas(w,h) {
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):document.createElement('canvas');
 canvas.width=w;canvas.height=h;return canvas;
}
const clamp = (v, lo=0, hi=1) => Math.min(hi, Math.max(lo, v));
const smooth = v => { v=clamp(v); return v*v*(3-2*v); };
function distanceTransform(mask, inside, w, h) {
  const d = new Float32Array(w*h), diag=Math.SQRT2;
  for(let i=0;i<d.length;i++) d[i] = (mask[i]>127)===inside ? 10000 : 0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const i=y*w+x;
    if(x) d[i]=Math.min(d[i],d[i-1]+1);
    if(y) { d[i]=Math.min(d[i],d[i-w]+1); if(x) d[i]=Math.min(d[i],d[i-w-1]+diag); if(x<w-1) d[i]=Math.min(d[i],d[i-w+1]+diag); }
  }
  for(let y=h-1;y>=0;y--) for(let x=w-1;x>=0;x--) {
    const i=y*w+x;
    if(x<w-1) d[i]=Math.min(d[i],d[i+1]+1);
    if(y<h-1) { d[i]=Math.min(d[i],d[i+w]+1); if(x) d[i]=Math.min(d[i],d[i+w-1]+diag); if(x<w-1) d[i]=Math.min(d[i],d[i+w+1]+diag); }
  }
  return d;
}
function sheet(w,h) {
 if(cachedSheet?.w===w&&cachedSheet?.h===h)return cachedSheet;
 const inflation=new Float64Array(w*h),foldsField=new Float64Array(w*h),scaleField=new Float64Array(w*h),offsetField=new Float64Array(w*h),film=new Float32Array(w*h);
 const foldX1=new Float64Array(w),foldX2=new Float64Array(w),foldX3=new Float64Array(w);
 for(let x=0;x<w;x++){foldX1[x]=-110+25*Math.sin(x*.006)+10*Math.sin(x*.021);foldX2[x]=92+30*Math.sin(x*.005+1.4);foldX3[x]=175-38*Math.sin(x*.004+2);}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=y*w+x;
    // Broad soft folds in the empty pouch, stretched from the sealed edges.
    const bodyEdge=Math.min(x-25,w-25-x,y-95,h-35-y);
    const bulge=12*smooth(bodyEdge/100);
    const base=bulge;
    let folds=0;
    const leftEnvelope=Math.exp(-x/260),rightEnvelope=Math.exp(-(w-x)/240);
    const leftFold=x-(70+65*Math.sin(y*.007)+25*Math.sin(y*.019));
    const rightFold=(w-x)-(80+80*Math.sin(y*.006+1));
    folds+=(25*Math.exp(-leftFold*leftFold/2200)-15*Math.exp(-(leftFold-65)*(leftFold-65)/4000));
    folds+=(32*Math.exp(-rightFold*rightFold/1700)-18*Math.exp(-(rightFold-65)*(rightFold-65)/4200));
    folds+=(leftEnvelope*8*Math.sin(y*.023+x*.014)+rightEnvelope*10*Math.sin(y*.018-x*.017));
    // Long diagonal, softly pinched creases from the upper corners.
    const upperLeft=x-(35+(y-85)*.70), upperRight=(w-x)-(40+(y-85)*.55);
    const upperFade=Math.exp(-Math.max(0,y-90)/300)*smooth((y-75)/30);
    folds+=upperFade*(22*Math.exp(-upperLeft*upperLeft/600)-12*Math.exp(-(upperLeft-38)*(upperLeft-38)/1800)+28*Math.exp(-upperRight*upperRight/700)-15*Math.exp(-(upperRight-40)*(upperRight-40)/2000));
    // Ribbed zipper band extends from edge to edge, with crimped lower and side seals.
    const zip=y-78, lower=y-(h-29);
    const band=y<69?smooth((y-5)/7)*(1-smooth((y-63)/6)):0;
    let scale=1-band,offset=band*(3+1.1*Math.sin(y*2.1));
    offset+=5*Math.exp(-zip*zip/8)+3*Math.exp(-(zip-10)*(zip-10)/6);
    if(y>h-24){scale=0;offset=2+Math.sin(y*2)*.75;}
    offset+=3*Math.exp(-lower*lower/8);
    if(x<20||x>w-20){scale=0;offset=2+Math.sin(x*2)*.5;}

 inflation[i]=base;foldsField[i]=folds;scaleField[i]=scale;offsetField[i]=offset;
 const edge=Math.min(x-5,w-5-x,y-5,h-5-y);film[i]=smooth((edge+3)/7);
 }
 cachedSheet={w,h,inflation,folds:foldsField,scale:scaleField,offset:offsetField,film,foldX1,foldX2,foldX3};return cachedSheet;
}

function geometry(el,w,h) {
  const key=JSON.stringify([el.text,el.size,el.weight,el.spacing,el.x,el.y,el.rotation,el.fontFamily,w,h]);
  if(cachedGeometry?.key===key) return cachedGeometry;
  const image=createCanvas(w,h);
  const ctx=image.getContext('2d',{willReadFrequently:true});
  ctx.font=canvasFont(el);ctx.textAlign='center';ctx.textBaseline='middle';ctx.letterSpacing=`${el.spacing}px`;
  ctx.save();ctx.translate(el.x,el.y-8);ctx.rotate(el.rotation*Math.PI/180);ctx.fillText(el.text,0,0);ctx.restore();
  const pixels=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);
  for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3];
  const fixed=sheet(w,h);
  const inner=distanceTransform(mask,true,w,h),outer=distanceTransform(mask,false,w,h);
  const heights=new Float32Array(w*h),film=fixed.film,occlusion=new Float32Array(w*h);
  const edgeL=5,edgeR=w-5,edgeT=5,edgeB=h-5;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,inside=mask[i]>127,d=inside?inner[i]:-outer[i];
    // An inflated bevel, with a broad, gently curved face instead of a flat extrusion.
    let z=d>=0 ? 20+55*Math.sin(clamp(d/60)*Math.PI/2) : 20*Math.exp(d/30);
    const edge=Math.min(x-edgeL,edgeR-x,y-edgeT,edgeB-y);
    const coverage=film[i];
    const near=inside ? .28 : Math.exp(-outer[i]/95);
    // Irregular tension folds continue over the face and into the free film.
    const yy=y-el.y;
    const fold1=yy-fixed.foldX1[x];
    const fold2=yy-fixed.foldX2[x];
    const fold3=yy-fixed.foldX3[x];
    const crease=(f,a)=>a*(Math.exp(-f*f/100)-.5*Math.exp(-(f-14)*(f-14)/300));
    z+=(crease(fold1,6)+crease(fold2,4)+crease(fold3,3))*near;
    const free=1-smooth(Math.max(d,0)/12);
    z+=fixed.inflation[i];z+=free*fixed.folds[i];
    z=fixed.scale[i]*z+fixed.offset[i];
    heights[i]=z*coverage;
    occlusion[i]=inside?0:Math.exp(-outer[i]/21)*.10;
  }
  // Smooth the sampled distance geometry before deriving normals, avoiding contour artifacts.
  const temp=new Float32Array(w*h);
  for(let pass=0;pass<2;pass++) {
    for(let y=0;y<h;y++) for(let x=2;x<w-2;x++){const i=y*w+x;temp[i]=(heights[i-2]+4*heights[i-1]+6*heights[i]+4*heights[i+1]+heights[i+2])/16;}
    for(let y=2;y<h-2;y++) for(let x=0;x<w;x++){const i=y*w+x;heights[i]=(temp[i-2*w]+4*temp[i-w]+6*temp[i]+4*temp[i+w]+temp[i+2*w])/16;}
  }
  cachedGeometry={key,w,h,heights,film,occlusion,edgeL,edgeR,edgeT,edgeB};
  return cachedGeometry;
}
export function drawPackedDiscount(ctx,el,color) {
  const g=geometry(el,ctx.canvas.width,ctx.canvas.height),key=g.key+color;
  if(cachedRender?.key!==key){
    const {w,h,heights:z,film,occlusion,edgeL,edgeR,edgeT,edgeB}=g;
    const canvas=createCanvas(w,h);
    const c=canvas.getContext('2d'),data=c.createImageData(w,h),p=data.data;
    const base=[1,3,5].map(start=>parseInt(color.slice(start,start+2),16)/255);
    if(!g.lighting){
    const shadeField=new Float32Array(w*h),highlightField=new Float32Array(w*h);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x;if(film[i]===0)continue;
      let nx=-(z[i+1]-z[i-1])*.36,ny=-(z[i+w]-z[i-w])*.36,nz=1;
      const inv=1/Math.hypot(nx,ny,nz);nx*=inv;ny*=inv;nz*=inv;
      const diffuse=Math.max(0,nx*-.39+ny*-.55+nz*.74);
      // Large studio softbox and a smaller bright strip reflected in glossy film.
      const soft=Math.pow(Math.max(0,nx*-.22+ny*-.34+nz*.914),20);
      const strip=Math.pow(Math.max(0,nx*.28+ny*-.24+nz*.929),95);
      const edge=Math.min(x-edgeL,edgeR-x,y-edgeT,edgeB-y);
      const seam=(edge<3?.07:0);
      const noise=(Math.sin(x*12.9898+y*78.233)*43758.5453)%1*.003;
      const shade=.76+.26*diffuse-occlusion[i]+noise-seam;
      // Slightly translucent plastic inherits the canvas pigment throughout.
      const highlight=.22*soft+.31*strip;
      shadeField[i]=shade;highlightField[i]=highlight;
    }
    g.lighting={shade:shadeField,highlight:highlightField};
    }
    const {shade:shadeField,highlight:highlightField}=g.lighting;
    for(let i=0;i<w*h;i++){
      const shade=shadeField[i],highlight=highlightField[i];
      if(!film[i]||!shade)continue;
      const j=i*4;
      for(let k=0;k<3;k++)p[j+k]=Math.round(255*clamp(base[k]*shade+(1-base[k])*(highlight*.48)+highlight*.22));
      p[j+3]=Math.round(film[i]*255);
    }
    c.putImageData(data,0,0);
    // Transparent edges catch light along the zip and the sealed rim.
    c.lineJoin='round';c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=1.3;
    c.strokeRect(edgeL+3,edgeT+3,edgeR-edgeL-6,edgeB-edgeT-6);
    c.strokeStyle='rgba(255,255,255,.20)';c.beginPath();c.moveTo(edgeL+9,edgeT+73);c.lineTo(edgeR-9,edgeT+73);c.stroke();
    cachedRender={key,canvas};
  }
  ctx.drawImage(cachedRender.canvas,0,0);
}
