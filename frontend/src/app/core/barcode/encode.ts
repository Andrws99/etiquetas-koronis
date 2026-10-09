import type { Simbologia } from '../types';
import { C39, C128, EAN_L, EAN_G, EAN_R, EAN_P, ITF_P } from './tables';
import { C39_CHARS } from './symbols';

/** Code 39: 9 elementos por carácter, ratio ancho/estrecho 2:1, con asteriscos
    de inicio y fin y separador estrecho entre caracteres. */
export function code39Bits(t: string): string {
  const txt = '*' + t.toUpperCase() + '*';
  let bits = '';
  for(let i=0;i<txt.length;i++){
    const p = C39[txt[i]];
    if(!p) continue;
    for(let k=0;k<9;k++){
      bits += (k%2===0 ? '1' : '0').repeat(p[k]==='1' ? 2 : 1);
    }
    if(i < txt.length-1) bits += '0';
  }
  return bits;
}

/** Dígito de control EAN/GTIN. */
export function gtinCheck(body: string): number {
  let s=0, w = body.length%2===0 ? 1 : 3;   // el peso 3 empieza por la derecha
  for(const ch of body){ s += (+ch)*w; w = w===3?1:3; }
  return (10 - (s%10))%10;
}

export function normalize(raw: string | undefined, sym: Simbologia): string | null {
  const d = (raw||'').replace(/\D/g,'');
  if(sym==='ean13'){
    if(d.length===12) return d + gtinCheck(d);
    if(d.length===13) return d;
    return null;
  }
  if(sym==='itf14'){
    if(d.length===13) return d + gtinCheck(d);
    if(d.length===14) return d;
    return null;
  }
  if(sym==='code39') return (raw||'').toUpperCase().trim() || null;
  return (raw||'').trim() || null;
}

export function checkOk(code: string | null, sym: Simbologia): boolean {
  if(sym==='ean13' && code && code.length===13) return +code[12] === gtinCheck(code.slice(0,12));
  if(sym==='itf14' && code && code.length===14) return +code[13] === gtinCheck(code.slice(0,13));
  if(sym==='code39' && code) return code.split('').every(c => C39_CHARS.includes(c));
  return true;
}

export function widthsToBits(w: string): string {
  let s='', bar=true;
  for(const c of w){ s += (bar?'1':'0').repeat(+c); bar=!bar; }
  return s;
}

export function ean13Bits(c: string): string {
  const d=c.split('').map(Number);
  let b='101', p=EAN_P[d[0]];
  for(let i=0;i<6;i++) b += (p[i]==='L'?EAN_L:EAN_G)[d[i+1]];
  b += '01010';
  for(let i=7;i<13;i++) b += EAN_R[d[i]];
  return b + '101';
}

export function itfBits(c: string): string {
  let b = '1010';                                  // start NNNN
  for(let i=0;i<c.length;i+=2){
    const a=ITF_P[+c[i]], z=ITF_P[+c[i+1]];
    for(let k=0;k<5;k++){
      b += '1'.repeat(a[k]==='W'?2:1);
      b += '0'.repeat(z[k]==='W'?2:1);
    }
  }
  return b + '1101';                               // stop WNN
}

export function code128Bits(t: string): string {
  const digitsOnly = /^\d+$/.test(t) && t.length>=4 && t.length%2===0;
  const vals:number[] = [];
  let start: number;
  if(digitsOnly){
    start=105;
    for(let i=0;i<t.length;i+=2) vals.push(+t.slice(i,i+2));
  }else{
    start=104;
    for(const ch of t){
      const v=ch.charCodeAt(0)-32;
      vals.push(v>=0 && v<=94 ? v : 0);
    }
  }
  let sum=start;
  vals.forEach((v,i)=> sum += v*(i+1));
  const seq=[start,...vals,sum%103,106];
  return seq.map(i=>widthsToBits(C128[i])).join('');
}

export interface CodigoBarras {
  bits: string;
  quiet: number;
  txt: string;
}

export function barcode(code: string | null, sym: Simbologia): CodigoBarras | null {
  if(!code) return null;
  if(sym==='ean13')   return {bits:ean13Bits(code),   quiet:9,  txt:code};
  if(sym==='itf14')   return {bits:itfBits(code),     quiet:10, txt:code};
  if(sym==='code39')  return {bits:code39Bits(code),  quiet:10, txt:'*'+code+'*'};
  return {bits:code128Bits(code), quiet:10, txt:code};
}
