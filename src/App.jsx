import React, { useEffect, useRef, useState } from 'react';
import './styles.css';
import { createPacketRenderer } from './packetClient';
import { googleFonts, fontDefinition, fontReady, canvasFont, loadFonts } from './fonts';

const formats = { horizontal: { width:1920, height:1080 }, vertical: { width:1080, height:1920 } };
function fitLayers(layers, from, to) {
 const ratio=to.width/from.width;
 return layers.map(l=>({...l,x:l.x*ratio,y:l.y*to.height/from.height,size:l.size*ratio,spacing:l.id==='coupon'?l.spacing:l.spacing*ratio}));
}
const initial = [
  { id: 'title', name: 'Headline', text: "BLACK FRIDAY 2026", x: 960, y: 205, size: 76, rotation: 0, color: '#10120b', weight: '700', spacing: -2 },
  { id: 'discount', name: 'Discount', text: '50%', x: 960, y: 580, size: 590, rotation: 0, weight: '900', spacing: -25 },
  { id: 'coupon', name: 'Coupon sticker', text: 'BF2026', x: 610, y: 925, size: 40, rotation: -7, color: '#ff650b', weight: '700', spacing: 0 },
];
const icons = {title: 'T', discount: '%', coupon: '✂'};
function Icon({name, size=18}) { const paths={download:<><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 16v5h14v-5"/></>,undo:<><path d="M3 10h7M3 10V3"/><path d="M3 10a9 9 0 1 1 1 9"/></>,arrow:<><path d="m5 3 14 10-7 1-3 7Z"/></>,check:<path d="m5 12 4 4L19 6"/>,plus:<path d="M12 5v14M5 12h14"/>,grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>}; return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg> }
let measurementContext;
const boundsCache=new Map();
function bounds(el) {
 if(el.id==='coupon') return {w:340*el.size/40,h:145*el.size/40};
 const key=JSON.stringify([el.text,el.weight,el.size,el.spacing,el.fontFamily]);
 if(boundsCache.has(key))return boundsCache.get(key);
 const ctx=measurementContext ||= document.createElement('canvas').getContext('2d');
 ctx.font=canvasFont(el);ctx.letterSpacing=`${el.spacing}px`;
 const result={w:ctx.measureText(el.text).width,h:el.size*1.04};
 if(boundsCache.size>=64)boundsCache.delete(boundsCache.keys().next().value);
 boundsCache.set(key,result);return result;
}
function ticketPath(c,w,h){let n=16;c.beginPath();c.moveTo(-w/2+n,-h/2);c.lineTo(w/2-n,-h/2);c.quadraticCurveTo(w/2-n,-h/2+n,w/2,-h/2+n);c.lineTo(w/2,h/2-n);c.quadraticCurveTo(w/2-n,h/2-n,w/2-n,h/2);c.lineTo(-w/2+n,h/2);c.quadraticCurveTo(-w/2+n,h/2-n,-w/2,h/2-n);c.lineTo(-w/2,-h/2+n);c.quadraticCurveTo(-w/2+n,-h/2+n,-w/2+n,-h/2);c.closePath();}
function renderDesign(canvas, layers, bg, packet) {
 const W=canvas.width,H=canvas.height;
 const c=canvas.getContext('2d');c.clearRect(0,0,W,H);c.fillStyle=bg;c.fillRect(0,0,W,H);
 const glow=c.createRadialGradient(W*.47,H*.23,20,W/2,H/2,Math.max(W,H)*.63);glow.addColorStop(0,'rgba(255,255,255,.045)');glow.addColorStop(1,'rgba(0,0,0,.025)');c.fillStyle=glow;c.fillRect(0,0,W,H);
 c.drawImage(packet,0,0);
 for (const el of layers) {if(el.id==='discount')continue;c.save();c.translate(el.x,el.y);c.rotate(el.rotation*Math.PI/180);c.textAlign='center';c.textBaseline='middle';c.font=canvasFont(el);c.letterSpacing=`${el.spacing}px`;
 if(el.id==='coupon'){c.scale(el.size/40,el.size/40);c.font=canvasFont(el,40);c.shadowColor='#26350045';c.shadowBlur=2;c.shadowOffsetY=2;ticketPath(c,340,145);c.fillStyle=el.color;c.fill();c.shadowColor='transparent';c.lineWidth=1.5;c.strokeStyle='#ffffffaa';c.beginPath();c.moveTo(105,-68);c.lineTo(105,68);c.stroke();c.setLineDash([]);c.fillStyle='#fff';c.fillText(el.text,-24,2);c.save();c.translate(138,0);c.rotate(-Math.PI/2);c.font='700 15px Arial';c.letterSpacing='2px';c.fillText('COUPON',0,0);c.restore();}
 else{c.fillStyle=el.color;c.fillText(el.text,0,0);}c.restore();}
}

export default function App(){
 const [format,setFormat]=useState('horizontal');
 const [,setFontRevision]=useState(0);
 const {width:W,height:H}=formats[format];
 const [layers,setLayers]=useState(initial),[selected,setSelected]=useState('title'),[bg,setBg]=useState('#a1ef00'),[tab,setTab]=useState('design'),[zoom,setZoom]=useState(100),[toast,setToast]=useState(''),[exporting,setExporting]=useState(false);
 const canvas=useRef(),stage=useRef(),drag=useRef(),history=useRef([]),packetRenderer=useRef(),moveFrame=useRef(),pendingMove=useRef();const active=layers.find(l=>l.id===selected);
 useEffect(()=>{
   const renderer=createPacketRenderer();packetRenderer.current=renderer;
   return ()=>{renderer.dispose();cancelAnimationFrame(moveFrame.current);};
 },[]);
 useEffect(()=>{
   let cancelled=false;
   const frame=requestAnimationFrame(()=>{
     const loading=layers.some(el=>!fontReady(el));
     loadFonts(layers).then(()=>{
       if(cancelled)return null;
       if(loading){boundsCache.clear();setFontRevision(version=>version+1);}
       return packetRenderer.current.render(layers.find(el=>el.id==='discount'),bg,W,H);
     }).then(packet=>{
       if(!cancelled&&packet)renderDesign(canvas.current,layers,bg,packet);
     }).catch(()=>{if(!cancelled)setToast('Preview could not render. Try adjusting the design again.');});
   });
   return ()=>{cancelled=true;cancelAnimationFrame(frame);};
 },[layers,bg,format]);
 function save(){history.current.push({layers:structuredClone(layers),bg,format});if(history.current.length>40)history.current.shift();}
 function changeBackground(color){
   const dark = value => Math.max(...[1,3,5].map(i=>parseInt(value.slice(i,i+2),16))) <= 80;
   if(dark(color)!==dark(bg)) setLayers(ls=>ls.map(l=>l.id==='title'?{...l,color:dark(color)?'#ffffff':(l.color.toLowerCase()==='#ffffff'?'#10120b':l.color)}:l));
   setBg(color);
 }
 function changeFormat(next){
   if(next===format)return;
   save();setLayers(ls=>fitLayers(ls,formats[format],formats[next]));setFormat(next);
 }
 function update(p){setLayers(ls=>ls.map(l=>l.id===selected?{...l,...p}:l));}
 function undo(){const prev=history.current.pop();if(prev){setLayers(prev.layers);setBg(prev.bg);setFormat(prev.format);}}
 function reset(){save();setLayers(fitLayers(structuredClone(initial),formats.horizontal,formats[format]));setBg('#a1ef00');setSelected('title');}
 async function download(){
   setExporting(true);
   try{
     await loadFonts(layers);
     const packet=await packetRenderer.current.render(layers.find(el=>el.id==='discount'),bg,W,H,{persistent:true});
     if(!packet)return;
     const output=document.createElement('canvas');output.width=W;output.height=H;
     renderDesign(output,layers,bg,packet);
     const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
     if(!blob)throw new Error('PNG encoding failed');
     const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`black-friday-${W}x${H}.png`;a.click();
     setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('Your design is ready. PNG downloaded.');setTimeout(()=>setToast(''),4000);
   }catch{setToast('Export could not finish. Please try again.');}
   finally{setExporting(false);}
 }

 function pointerDown(e,el){e.preventDefault();e.stopPropagation();save();setSelected(el.id);const rect=stage.current.getBoundingClientRect();drag.current={id:el.id,x:e.clientX,y:e.clientY,ox:el.x,oy:el.y,scale:W/rect.width};e.currentTarget.setPointerCapture(e.pointerId);}
 function applyMove(){
   moveFrame.current=null;
   const d=drag.current,point=pendingMove.current;pendingMove.current=null;
   if(!d||!point)return;
   setLayers(ls=>ls.map(l=>l.id===d.id?{...l,x:Math.round(Math.max(50,Math.min(W-50,d.ox+(point.x-d.x)*d.scale))),y:Math.round(Math.max(50,Math.min(H-50,d.oy+(point.y-d.y)*d.scale)))}:l));
 }
 function pointerMove(e){
   if(!drag.current)return;
   pendingMove.current={x:e.clientX,y:e.clientY};
   if(moveFrame.current==null)moveFrame.current=requestAnimationFrame(applyMove);
 }
 function finishDrag(){cancelAnimationFrame(moveFrame.current);applyMove();drag.current=null;}

 return <div className="app"><header className="header"><a href="#" className="brand"><span className="brand-mark">vsupro</span><span className="brand-divider"/>STUDIO</a><div className="project-name">Black Friday campaign <span className="project-badge">Draft</span></div><div className="header-actions"><span className="saved"><span/>All changes in this session</span><button className="export" onClick={download} disabled={exporting}><Icon name="download"/>{exporting?'Exporting…':'Export design'}</button></div></header>
 <div className="workspace"><aside className="left-sidebar"><div className="side-tabs"><button className={tab==='design'?'active':''} onClick={()=>setTab('design')}>Design</button><button className={tab==='layers'?'active':''} onClick={()=>setTab('layers')}>Layers <span>3</span></button></div>{tab==='design'?<><div className="panel-heading">YOUR CANVAS</div><div className="template-preview" style={{background:bg,'--preview-color':bg}}><div style={{color:layers.find(l=>l.id==='title').color}}>{layers.find(l=>l.id==='title').text}</div><strong>50%</strong><span>BF2026</span></div><div className="template-title">A little loud. A lot of impact.</div><p className="sidebar-copy">Your next big sale starts here.<br/>Make this design your own.</p><div className="section-rule"/><div className="panel-heading layer-title">ELEMENTS <span>3</span></div></>:<><div className="panel-heading">CANVAS LAYERS</div><p className="sidebar-copy layer-copy">Select an element to customize it.</p></>}
 <div className="layer-list">{layers.map(l=><button key={l.id} className={`layer ${selected===l.id?'selected':''}`} onClick={()=>setSelected(l.id)}><span className="layer-icon">{icons[l.id]}</span><span>{l.name}<small>{l.text}</small></span><span className="layer-dots">⋮</span></button>)}</div><div className="canvas-settings"><div className="panel-heading">CANVAS COLOR</div><Color value={bg} label="Background" onFocus={save} onChange={changeBackground}/><div className="swatches">{['#a1ef00','#f2efdf','#f6aacb','#b4bdff','#252722'].map(color=><button key={color} aria-label={`Set background to ${color}`} style={{background:color}} onClick={()=>{save();changeBackground(color)}} className={bg===color?'chosen':''}/>)}</div></div><div className="help-card"><span>↗</span><strong>Made to make it yours.</strong><p>Click any element on the canvas.<br/>Drag it. Edit it. Make some noise.</p></div></aside>
 <main className="editor"><div className="editor-heading"><div><div className="eyebrow">THE CREATIVE PLAYGROUND</div><h1>Big sale. Your style<span>.</span></h1><p>Three elements. Endless possibilities.</p></div><button className="reset" onClick={reset}><Icon name="undo" size={15}/> Reset design</button></div><div className="canvas-toolbar"><span><span className="artboard-icon">▤</span> Black Friday 2026 <span className="toolbar-separator">/</span><span className="muted">{W} × {H} px</span></span><label className="format-control"><span>Canvas</span><select aria-label="Canvas orientation" value={format} onChange={e=>changeFormat(e.target.value)}><option value="horizontal">Horizontal · 1920 × 1080</option><option value="vertical">Vertical · 1080 × 1920</option></select></label></div><div className={`canvas-area ${format==='vertical'?'vertical-canvas':''}`}><div className="canvas-wrap" style={{width:format==='vertical'?`${zoom*3}px`:`${zoom}%`}}><div className="artboard" style={{aspectRatio:`${W} / ${H}`}} ref={stage} onPointerDown={()=>setSelected(null)}><canvas ref={canvas} width={W} height={H} aria-label="Editable Black Friday design"/>{layers.map(l=>{const b=bounds(l);return <div key={l.id} role="button" tabIndex={0} aria-label={`Move ${l.name}`} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();save();setSelected(l.id);setLayers(ls=>ls.map(item=>item.id===l.id?{...item,x:item.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),y:item.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0)}:item));}}} className={`element-hit ${selected===l.id?'is-selected':''}`} style={{left:`${l.x/W*100}%`,top:`${l.y/H*100}%`,width:`${Math.min(b.w,W*.94)/W*100}%`,height:`${b.h/H*100}%`,transform:`translate(-50%,-50%) rotate(${l.rotation}deg)`}} onPointerDown={e=>pointerDown(e,l)} onPointerMove={pointerMove} onPointerUp={finishDrag} onPointerCancel={finishDrag} onDoubleClick={()=>document.querySelector('.text-edit')?.focus()}>{selected===l.id&&<><span className="selection-label">{l.name}</span>{['tl','tr','bl','br'].map(p=><i className={p} key={p}/>)}</>}</div>})}</div></div></div><div className="canvas-footer"><span><Icon name="arrow" size={14}/> Click to select · Drag to move · Double-click to edit</span><div className="zoom"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(50,z-10))}>−</button><span>{zoom}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(100,z+10))}>+</button><span className="zoom-divider"/><button onClick={()=>setZoom(100)} aria-label="Fit canvas"><Icon name="grid" size={14}/></button></div></div></main>
 <aside className="inspector"><div className="inspector-heading">Properties <span>↗</span></div>{active?<><div className="selected-element"><span className="selected-icon">{icons[active.id]}</span><div><strong>{active.name}</strong><small>{active.id==='discount'?'Inside the pouch':'Printed on the pouch'}</small></div><span className="green-dot"/></div><div className="property-section"><div className="panel-heading">CONTENT</div><label className="field-label" htmlFor="text-content">Your text</label><textarea id="text-content" className="text-edit" value={active.text} onFocus={save} onChange={e=>update({text:e.target.value.replace(/\n/g,'')})}/><div className="field-hint">A few words. A big impression.</div></div><div className="property-section"><div className="panel-heading">TYPOGRAPHY</div><label className="field-label" htmlFor="font-family">Font family</label><select id="font-family" className="font-select" aria-label="Font family" value={active.fontFamily||'Arial'} onFocus={save} onChange={e=>update({fontFamily:e.target.value,weight:fontDefinition(e.target.value)?.weight||'700'})}><option value="Arial">Arial · System</option>{googleFonts.map(font=><option key={font.family} value={font.family}>{font.family} · Bold</option>)}</select><div className="input-grid"><label className="field-label">Size <div className="number-input"><input aria-label="Font size" type="number" min="12" max="750" value={Math.round(active.size)} onFocus={save} onChange={e=>update({size:Math.max(12,Math.min(750,+e.target.value))})}/><span>px</span></div></label><label className="field-label">Weight<select value={fontDefinition(active.fontFamily)?.weight||active.weight} disabled={!!fontDefinition(active.fontFamily)} onFocus={save} onChange={e=>update({weight:e.target.value})}>{fontDefinition(active.fontFamily)?<option value={fontDefinition(active.fontFamily).weight}>Bold</option>:<><option value="400">Regular</option><option value="700">Bold</option><option value="900">Black</option></>}</select></label></div><label className="slider-label">Letter spacing <span>{Math.round(active.spacing*10)/10} px</span><input type="range" min="-35" max="20" value={active.spacing} onPointerDown={save} onChange={e=>update({spacing:+e.target.value})}/></label></div><div className="property-section"><div className="panel-heading">APPEARANCE</div>{active.id==='discount'?<><div className="effect-tag">✧ &nbsp; Inside the zip pouch <span>ON</span></div><p className="material-note">The discount sits inside the pouch. The entire canvas shares one material color.</p></>:<Color label={active.id==='coupon'?'Sticker color':'Text color'} value={active.color} onFocus={save} onChange={color=>update({color})}/>}<div className="mobile-canvas-color"><label className="field-label">Canvas color</label><Color label="Canvas background" value={bg} onFocus={save} onChange={changeBackground}/></div></div><div className="property-section"><div className="panel-heading">POSITION & TRANSFORM</div><div className="input-grid">{['x','y'].map(key=><label key={key} className="field-label">{key.toUpperCase()} position<div className="number-input"><input aria-label={`${key} position`} type="number" value={Math.round(active[key])} onFocus={save} onChange={e=>update({[key]:+e.target.value})}/><span>px</span></div></label>)}</div><label className="slider-label">Rotation <span>{active.rotation}°</span><input type="range" min="-180" max="180" value={active.rotation} onPointerDown={save} onChange={e=>update({rotation:+e.target.value})}/></label><button className="center-button" onClick={()=>{save();update({x:W/2})}}>↔ &nbsp; Center horizontally</button></div></>:<div className="empty-selection">Select an element on the canvas to make it yours.</div>}<div className="export-info"><strong>Export: {W} × {H} PNG</strong></div></aside></div>{toast&&<div className="toast"><Icon name="check"/>{toast}</div>}</div>
}
function Color({label,value,onChange,onFocus}){return <label className="color-field"><input type="color" aria-label={label} value={value} onFocus={onFocus} onChange={e=>onChange(e.target.value)}/><span>{value.toUpperCase()}</span><small>100%</small></label>}
