import type { Logo } from '../types';

/* ============================================================
   IMÁGENES: rasterizado a 1 bit (203 dpi) + Floyd–Steinberg
   Una térmica solo sabe quemar o no quemar: no hay grises.
   ============================================================ */
export const DPMM = 8;                       // 203 dpi

export interface Raster {
  png: string;
  bits: Uint8Array;
  W: number;
  H: number;
}

const rasterCache = new Map<string, Raster>();

export function limpiarCacheRaster(): void {
  rasterCache.clear();
}

export function rasterize(entry: Logo, wmm: number, hmm: number): Raster | null {
  const key = `${entry.src.length}|${entry.mode}|${wmm.toFixed(2)}|${hmm.toFixed(2)}`;
  const hit = rasterCache.get(key);
  if(hit) return hit;

  const W = Math.max(1, Math.round(wmm*DPMM)), H = Math.max(1, Math.round(hmm*DPMM));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const cx = c.getContext('2d', {willReadFrequently:true});
  if(!cx) return null;
  cx.fillStyle = '#fff'; cx.fillRect(0,0,W,H);
  try{ cx.drawImage(entry.img, 0, 0, W, H); }catch(_){ return null; }

  const id = cx.getImageData(0,0,W,H), p = id.data;
  const g = new Float32Array(W*H);
  for(let i=0;i<W*H;i++){
    const a = p[i*4+3]/255;
    const lum = 0.299*p[i*4] + 0.587*p[i*4+1] + 0.114*p[i*4+2];
    g[i] = lum*a + 255*(1-a);           // lo transparente se vuelve blanco
  }
  const bits = new Uint8Array(W*H);
  if(entry.mode === 'line'){
    for(let i=0;i<W*H;i++) bits[i] = g[i] < 150 ? 1 : 0;
  }else{
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const i = y*W+x, old = g[i], nw = old < 128 ? 0 : 255;
      bits[i] = nw === 0 ? 1 : 0;
      const e = old - nw;
      if(x+1<W)            g[i+1]   += e*7/16;
      if(y+1<H){
        if(x>0)            g[i+W-1] += e*3/16;
                           g[i+W]   += e*5/16;
        if(x+1<W)          g[i+W+1] += e*1/16;
      }
    }
  }
  for(let i=0;i<W*H;i++){ const v = bits[i] ? 0 : 255; p[i*4]=p[i*4+1]=p[i*4+2]=v; p[i*4+3]=255; }
  cx.putImageData(id,0,0);
  const out: Raster = {png:c.toDataURL('image/png'), bits, W, H};
  if(rasterCache.size > 40) rasterCache.clear();
  rasterCache.set(key, out);
  return out;
}

/** Bitmap 1 bit -> comando ^GFA de ZPL. */
export function toGFA(r: Raster): {cmd: string; hex: string; total: number; bpr: number} {
  const bpr = Math.ceil(r.W/8), total = bpr*r.H;
  let hex = '';
  for(let y=0;y<r.H;y++){
    for(let b=0;b<bpr;b++){
      let byte = 0;
      for(let k=0;k<8;k++){
        const x = b*8+k;
        if(x < r.W && r.bits[y*r.W+x]) byte |= 0x80 >> k;
      }
      hex += byte.toString(16).padStart(2,'0').toUpperCase();
    }
  }
  return {cmd:`^GFA,${total},${total},${bpr},`, hex, total, bpr};
}
