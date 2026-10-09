import type { Estado } from '../types';
import { normalize } from '../barcode/encode';
import { compose } from './compose';
import { rasterize, toGFA } from './raster';

/* ============================================================
   ZPL (203 dpi = 8 puntos/mm)
   ============================================================ */
export function zpl(st: Estado): string {
  const L = compose(st, st.fitScale), D = 8;
  const mm = (v: number) => Math.round(v*D);
  const {W,H,pad,bAvailW,blocks,bc,hrH,base,gap} = L;
  const out = [`^XA`, `^CI28`, `^PW${mm(W)}`, `^LL${mm(H)}`, `^LH0,0`];
  let y = pad;

  const gfa = (entry: Parameters<typeof rasterize>[0], x: number, yy: number, w: number, h: number, etiqueta: string) => {
    const r = rasterize(entry, w, h);
    if(!r) return;
    const g = toGFA(r);
    const corto = g.hex.length > 600 ? g.hex.slice(0,600) + `\n… (${g.total} bytes en total)` : g.hex;
    out.push(`^FO${mm(x)},${mm(yy)}${g.cmd}${corto}^FS   ${etiqueta} ${r.W}×${r.H} px`);
  };

  blocks.forEach(b=>{
    if(b.t === 'logo' && b.img){
      gfa(b.img.entry, (W-b.img.w)/2, y, b.img.w, b.img.h, '; logo');
      y += b.h;
    }else if(b.t === 'barcode'){
      if(!bc) { y += b.h + gap; return; }
      const total = bc.bits.length + bc.quiet*2;
      const X = Math.max(1, Math.round(bAvailW/total*D));
      const barsH = mm(Math.max(1.5, b.h - hrH - base*0.3));
      const bx = mm((W - bAvailW)/2);
      out.push(`^BY${X},2.5,${barsH}`);
      if(st.sym==='ean13')      out.push(`^FO${bx},${mm(y)}^BEN,${barsH},Y,N^FD${bc.txt.slice(0,12)}^FS`);
      else if(st.sym==='itf14') out.push(`^FO${bx},${mm(y)}^BIN,${barsH},Y,N^FD${bc.txt}^FS`);
      else if(st.sym==='code39') out.push(`^FO${bx},${mm(y)}^B3N,N,${barsH},Y,N^FD${normalize(st.code,'code39')}^FS`);
      else                      out.push(`^FO${bx},${mm(y)}^BCN,${barsH},Y,N,N^FD${bc.txt}^FS`);
      y += b.h;
    }else if(b.lines){
      for(const l of b.lines){
        out.push(`^FO${mm(b.lx)},${mm(y)}^A0N,${mm(b.f!)},${mm(b.f!*0.55)}^FB${mm((b.cx-b.lx)*2)},1,0,C^FD${l}^FS`);
        y += b.f!*(b.t==='desc'?1.22:1.3);
      }
    }else{
      out.push(`^FO${mm(b.lx)},${mm(y)}^A0N,${mm(b.f!)},${mm(b.f!*0.55)}^FB${mm((b.cx-b.lx)*2)},1,0,C^FD${b.txt}^FS`);
      y += b.h;
    }
    y += gap;
  });
  out.push(`^PQ${st.copies}`, `^XZ`);
  return out.join('\n');
}
