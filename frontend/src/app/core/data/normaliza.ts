import type { Articulo, Simbologia } from '../types';
import { MAPA_CAMPOS } from './mapa-campos';

/* Normaliza lo que venga del ERP a la forma que usa la aplicación. */
export function normalizaArticulo(raw: Record<string, unknown>): Articulo | null {
  const coge = (alias: string[]): string => {
    for(const k of alias){
      const hit = Object.keys(raw).find(x => x.toLowerCase() === k);
      if(hit != null && raw[hit] != null && String(raw[hit]).trim() !== '') return String(raw[hit]).trim();
    }
    return '';
  };
  const a: Record<string, string> = {};
  for(const campo in MAPA_CAMPOS) a[campo] = coge(MAPA_CAMPOS[campo]);
  if(!a['ref'] || !a['desc'] || !a['code']) return null;         // sin esto no hay etiqueta
  if(!['ean13','itf14','code128','code39'].includes(a['sym'])){  // si el ERP no lo dice, se deduce
    const d = a['code'].replace(/\D/g,'');
    a['sym'] = d.length === a['code'].length
      ? (d.length === 13 ? 'ean13' : d.length === 14 ? 'itf14' : 'code128')
      : 'code128';
  }
  return {
    ref: a['ref'],
    desc: a['desc'],
    code: a['code'],
    sym: a['sym'] as Simbologia,
    marca: a['marca'],
    uds: a['uds'],
    lote: a['lote'],
    extra: a['extra']
  };
}
