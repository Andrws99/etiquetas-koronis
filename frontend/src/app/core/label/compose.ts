import type { CampoOrden, Estado, Issue, Logo, Tamanyo } from '../types';
import { barcode, normalize } from '../barcode/encode';
import { SYMS } from '../barcode/symbols';
import { DPMM } from './raster';
import { tamanyoDe } from './sizes';

export const FONT_LBL = '"Archivo Narrow","Arial Narrow",Arial,sans-serif';

/* Medición de texto en milímetros sobre un canvas fuera de pantalla.
   Si el navegador no da contexto (entornos de test), devuelve 0 y el motor
   sigue calculando: solo cambia el reparto de líneas, nunca los códigos. */
let mCanvas: CanvasRenderingContext2D | null = null;
let mCanvasFallado = false;
function ctx(): CanvasRenderingContext2D | null {
  if(mCanvas) return mCanvas;
  if(mCanvasFallado) return null;
  try{
    mCanvas = document.createElement('canvas').getContext('2d');
  }catch(_){
    mCanvas = null;
  }
  if(!mCanvas) mCanvasFallado = true;
  return mCanvas;
}

export function textW(txt: string, mm: number, weight: number): number {
  const c = ctx();
  if(!c) return 0;
  c.font = `${weight} ${mm*10}px ${FONT_LBL}`;
  return c.measureText(txt).width/10;
}

export function wrap(txt: string, mm: number, weight: number, maxW: number, maxLines: number){
  const words = txt.split(/\s+/).filter(Boolean);
  const lines:string[] = []; let cur='';
  for(const w of words){
    const t = cur ? cur+' '+w : w;
    if(textW(t,mm,weight) <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if(cur) lines.push(cur);
  const cut = lines.length > maxLines;
  return {lines: lines.slice(0,maxLines), cut, widest: Math.max(0,...lines.map(l=>textW(l,mm,weight)))};
}

export interface Bloque {
  t: CampoOrden;
  cx: number;
  lx: number;
  h: number;
  txt?: string;
  lines?: string[];
  f?: number;
  w?: number;
  ls?: number;
  img?: { w: number; h: number; entry: Logo };
  _y?: number;
  _h?: number;
}

export interface Etiqueta {
  S: Tamanyo;
  W: number;
  H: number;
  pad: number;
  availW: number;
  bAvailW: number;
  blocks: Bloque[];
  bc: ReturnType<typeof barcode>;
  bcBox: number;
  hrH: number;
  base: number;
  gap: number;
  cw: number;
  issues: Issue[];
  fits: boolean;
}

/* ============================================================
   MOTOR DE COMPOSICIÓN (todo en milímetros)
   ============================================================ */
export function compose(st: Estado, scale: number): Etiqueta {
  const S = tamanyoDe(st), W = S.w, H = S.h;
  const pad = Math.max(0.7, Math.min(3.2, W*0.045));
  const availW = W - pad*2;
  const bAvailW = W - Math.max(0.5, pad*0.4)*2;   // el código aprovecha casi todo el ancho
  const issues: Issue[] = [];
  const k = scale;

  const base = Math.max(1.2, Math.min(4.2, H*0.075)) * k;
  const tiny = () => base*0.66;

  const gap = base*0.22;
  const bc = barcode(normalize(st.code, st.sym), st.sym);
  const hrH = base*0.8;

  /* ---- qué campos hay contenido para pintar ---- */
  const metaTxt = [st.uds ? st.uds+' UDS' : null, st.lote ? 'LOTE '+st.lote : null]
                  .filter(Boolean).join('  ·  ');
  const has = {
    logo:  !!(st.logo && st.logo.img),
    marca: !!st.marca,
    ref:   !!st.ref,
    desc:  !!st.desc,
    meta:  !!metaTxt,
    extra: !!st.extra,
    barcode: !!bc
  };
  const ids = st.order.filter(id => has[id]);

  const cw = availW;

  /* ---- construir los bloques en el orden elegido ---- */
  const blocks: Bloque[] = [];
  const push = (o: Partial<Bloque> & {t: CampoOrden; h: number}) =>
    blocks.push(Object.assign({cx:W/2, lx:pad}, o) as Bloque);

  for(const id of ids){
    if(id === 'logo'){
      const ar = st.logo!.img.naturalWidth / st.logo!.img.naturalHeight || 3;
      let lh = Math.min(base*2.1, H*0.13), lw = lh*ar;
      if(lw > availW*0.8){ lw = availW*0.8; lh = lw/ar; }
      push({t:'logo', img:{w:lw, h:lh, entry:st.logo!}, h:lh});
      if(lw*DPMM < 40) issues.push({k:'logores', lvl:'warn',
        msg:`El logo sale a ${Math.round(lw*DPMM)} puntos de ancho. Por debajo de 40 no se distingue: usa un SVG o un PNG grande.`});
    }
    else if(id === 'marca') push({t:'marca', txt:st.marca.toUpperCase(), f:base*0.95, w:700, ls:.06, h:base*1.25});
    else if(id === 'ref')   push({t:'ref',   txt:'REF: '+st.ref, f:tiny(), w:400, ls:.03, h:tiny()*1.35});
    else if(id === 'desc'){
      const d = wrap(st.desc.toUpperCase(), base, 600, availW, 3);
      push({t:'desc', lines:d.lines, f:base, w:600, ls:.01, h:d.lines.length*base*1.22});
      if(d.cut) issues.push({k:'desc', lvl:'warn',
        msg:`La descripción no cabe en ${W} × ${H} mm y se queda cortada. Acórtala, reduce el texto o sube de tamaño.`});
    }
    else if(id === 'meta'){
      const f = tiny();
      push({t:'meta', txt:metaTxt, f, w:400, ls:.02, h:f*1.5});
      if(textW(metaTxt,f,400) > availW) issues.push({k:'meta', lvl:'warn',
        msg:`La línea de unidades y lote necesita ${textW(metaTxt,f,400).toFixed(1)} mm y solo hay ${availW.toFixed(1)} mm de ancho útil.`});
    }
    else if(id === 'extra'){
      const e = wrap(st.extra, tiny(), 400, availW, 2);
      push({t:'extra', lines:e.lines, f:tiny(), w:400, ls:0, h:e.lines.length*tiny()*1.3});
    }
    else if(id === 'barcode') push({t:'barcode', h:0});
  }

  /* el código ocupa el hueco que sobra, esté donde esté en el orden */
  const used = blocks.reduce((a,b)=>a+b.h, 0) + blocks.length*gap;
  const bcBox = H - pad*2 - used;
  const bcBlock = blocks.find(b=>b.t==='barcode');
  if(bcBlock) bcBlock.h = Math.max(0, bcBox);

  if(base < 1.55) issues.push({k:'font', lvl:'warn',
    msg:`El texto queda a ${(base*2.83).toFixed(1)} pt. Por debajo de 4,5 pt no se lee a un brazo de distancia.`});

  if(bc){
    const total = bc.bits.length + bc.quiet*2;
    const X = bAvailW/total;
    const minX = SYMS[st.sym].minX;
    const need = Math.ceil(total*minX + Math.max(0.5, pad*0.4)*2);
    if(X < minX*0.9){
      issues.push({k:'bcw', lvl:'bad',
        msg:`Un ${SYMS[st.sym].nm} necesita ${need} mm de ancho para que lo lea la pistola. Esta etiqueta tiene ${W} mm.`});
    }else if(X < minX){
      issues.push({k:'bcw', lvl:'warn',
        msg:`El código queda a ${Math.round(X/minX*80)}% de ampliación (módulo ${X.toFixed(3)} mm). Justo en el límite: prueba a leerlo antes de tirar la serie.`});
    }
    const barsH = bcBox - hrH - base*0.3;
    if(barsH < 5) issues.push({k:'bch', lvl:'bad',
      msg:`No queda alto para las barras: harían falta 6 mm y solo hay ${Math.max(0,barsH).toFixed(1)} mm. Quita campos o sube de tamaño.`});
    else if(barsH < 8 && st.sym!=='code128') issues.push({k:'bch', lvl:'warn',
      msg:`Las barras quedan a ${barsH.toFixed(1)} mm de alto. Con menos de 8 mm el lector falla si la pistola no va recta.`});
  }
  return {S, W, H, pad, availW, bAvailW, blocks, bc, bcBox, hrH, base, gap, cw, issues,
          fits: !issues.some(i=>i.lvl==='bad' || i.k==='desc' || i.k==='meta')};
}

export function autoFit(st: Estado): number | null {
  for(const s of [1,.92,.84,.76,.68,.6]){
    if(compose(st, s).fits) return s;
  }
  return null;            // no hay escala que lo arregle: hay que cambiar de tamaño
}
