import type { Simbologia } from '../types';

export interface SimbologiaInfo {
  nm: string;
  minX: number;
  digits: [number, number] | null;
  help: string;
}

export const SYMS: Record<Simbologia, SimbologiaInfo> = {
  ean13:  {nm:'EAN-13',   minX:0.264, digits:[12,13], help:'12 o 13 dígitos. Si pones 12, calculo el dígito de control.'},
  itf14:  {nm:'ITF-14',   minX:0.330, digits:[13,14], help:'13 o 14 dígitos. Es el código de la caja o agrupación.'},
  code128:{nm:'Code 128', minX:0.190, digits:null,    help:'Texto libre: letras, números y guiones.'},
  code39: {nm:'Code 39',  minX:0.190, digits:null,    help:'Mayúsculas, números y - . $ / + % y espacio. Ocupa bastante más que Code 128.'}
};

export const C39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';

export const SIMBOLOGIAS: Simbologia[] = ['ean13', 'itf14', 'code128', 'code39'];
