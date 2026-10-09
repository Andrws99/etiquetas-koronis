import type { Logo } from '../types';
import { rasterize } from './raster';
import type { Bloque, Etiqueta } from './compose';

/* ============================================================
   DIBUJO SVG
   ============================================================ */
const esc = (s: unknown) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function svgLabel(L: Etiqueta, zoom: number, dither: boolean): string {
  const {W,H,pad,bAvailW,blocks,bc,hrH,base,gap,cw} = L;
  let y = pad, out = '';

  const imgTag = (entry: Logo, x: number, yy: number, w: number, h: number) => {
    let href = entry.src;
    if(dither){
      const r = rasterize(entry, w, h);
      if(r) href = r.png;
    }
    return `<image x="${x.toFixed(2)}" y="${yy.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" href="${href}" preserveAspectRatio="xMidYMid meet"/>`;
  };

  const line = (txt: string, f: number, w: number, ls: number, anchor: string, b: Bloque) => {
    const x = anchor==='middle' ? b.cx : b.lx;
    out += `<text x="${x.toFixed(2)}" y="${(y+f*0.82).toFixed(2)}" font-family='Archivo Narrow, Arial Narrow, Arial, sans-serif' font-size="${f.toFixed(2)}" font-weight="${w}" letter-spacing="${(ls*f).toFixed(3)}" text-anchor="${anchor}" fill="#000">${esc(txt)}</text>`;
  };

  const drawBarcode = (yy: number, box: number) => {
    if(!bc) return;
    const total = bc.bits.length + bc.quiet*2;
    const X = bAvailW/total;
    const barsH = Math.max(1.5, box - hrH - base*0.3);
    let bx = (W - bAvailW)/2 + bc.quiet*X, run=0;
    for(let i=0;i<bc.bits.length;i++){
      if(bc.bits[i]==='1'){ run++; }
      if(bc.bits[i]==='0' || i===bc.bits.length-1){
        if(run){
          out += `<rect x="${bx.toFixed(3)}" y="${yy.toFixed(2)}" width="${(run*X).toFixed(3)}" height="${barsH.toFixed(2)}" fill="#000"/>`;
          bx += run*X; run=0;
        }
        if(bc.bits[i]==='0') bx += X;
      }
    }
    if(run) out += `<rect x="${bx.toFixed(3)}" y="${yy.toFixed(2)}" width="${(run*X).toFixed(3)}" height="${barsH.toFixed(2)}" fill="#000"/>`;
    out += `<text x="${(W/2).toFixed(2)}" y="${(yy+barsH+hrH*0.9).toFixed(2)}" font-family='IBM Plex Mono, monospace' font-size="${hrH.toFixed(2)}" letter-spacing="${(hrH*0.12).toFixed(2)}" text-anchor="middle" fill="#000">${esc(bc.txt)}</text>`;
  };

  blocks.forEach(b=>{
    b._y = y;                                   // se guarda para las zonas arrastrables
    if(b.t === 'logo' && b.img){
      out += imgTag(b.img.entry, (W-b.img.w)/2, y, b.img.w, b.img.h);
      y += b.h;
    }else if(b.t === 'barcode'){
      drawBarcode(y, b.h);
      y += b.h;
    }else{
      const mid = b.t==='desc' || b.t==='meta' || b.t==='extra' || b.t==='marca';
      if(b.lines){
        for(const l of b.lines){ line(l,b.f!,b.w!,b.ls!,mid?'middle':'start',b); y += b.f!*(b.t==='desc'?1.22:1.3); }
      }else{
        line(b.txt!,b.f!,b.w!,b.ls!,mid?'middle':'start',b);
        y += b.h;
      }
    }
    b._h = y - b._y;
    y += gap;
  });
  return `<svg width="${(W*zoom).toFixed(0)}" height="${(H*zoom).toFixed(0)}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Etiqueta ${W} por ${H} milímetros">`
    + `<defs><clipPath id="lbl"><rect width="${W}" height="${H}"/></clipPath>`
    + `<clipPath id="col"><rect x="${pad}" y="0" width="${cw}" height="${H}"/></clipPath></defs>`
    + `<rect width="${W}" height="${H}" fill="#fff"/>`
    + `<g clip-path="url(#lbl)">${out}</g></svg>`;
}
