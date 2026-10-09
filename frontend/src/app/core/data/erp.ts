import type { Articulo } from '../types';
import { ORIGEN } from './origen';
import { SEED_DEMO } from './seed-demo';
import { normalizaArticulo } from './normaliza';

/* La aplicación solo habla con este objeto. */
export const ERP = {
  async buscar(q: string, signal?: AbortSignal): Promise<Articulo[]> {
    if(ORIGEN.modo === 'demo'){
      const s = q.toLowerCase();
      return SEED_DEMO.filter(a =>
        a.ref.toLowerCase().includes(s) || a.desc.toLowerCase().includes(s) ||
        a.code.includes(s) || (a.marca||'').toLowerCase().includes(s)).slice(0,8);
    }
    return pedir(`/articulos?q=${encodeURIComponent(q)}&limit=8`, signal, true);
  },
  async porRef(ref: string, signal?: AbortSignal): Promise<Articulo | null> {
    if(ORIGEN.modo === 'demo') return SEED_DEMO.find(a=>a.ref===ref) || null;
    return pedir(`/articulos/${encodeURIComponent(ref)}`, signal, false);
  }
};

async function pedir(ruta: string, signal: AbortSignal | undefined, lista: boolean): Promise<never> {
  if(!ORIGEN.base) throw new Error('Falta la URL del backend en ORIGEN.base.');
  let r: Response;
  try{
    const headers: Record<string, string> = {Accept: 'application/json'};
    if(ORIGEN.token) headers['Authorization'] = 'Bearer ' + ORIGEN.token;
    r = await fetch(ORIGEN.base.replace(/\/$/,'') + ruta, {signal, headers});
  }catch(err){
    if((err as Error).name === 'AbortError') throw err;
    throw new Error('No se llega al servidor. Comprueba la URL, la VPN y el CORS.');
  }
  if(r.status === 401 || r.status === 403) throw new Error('El servidor rechaza las credenciales (' + r.status + ').');
  if(!r.ok) throw new Error('El servidor respondió ' + r.status + '.');
  let data: any;
  try{ data = await r.json(); }
  catch(_){ throw new Error('La respuesta no es JSON válido.'); }
  if(!lista){
    const a = normalizaArticulo(data.articulo || data);
    if(!a) throw new Error('Al artículo le falta referencia, descripción o código.');
    return a as never;
  }
  const arr = Array.isArray(data) ? data : (data.articulos || data.items || data.data || []);
  return arr.map(normalizaArticulo).filter(Boolean) as never;
}
