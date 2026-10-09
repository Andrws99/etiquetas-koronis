import { Injectable, computed, signal } from '@angular/core';
import type { Articulo, CampoOrden, Estado, Logo, Simbologia } from '../core/types';
import { C39_CHARS, SYMS } from '../core/barcode/symbols';
import { checkOk, gtinCheck, normalize } from '../core/barcode/encode';
import { autoFit, compose } from '../core/label/compose';
import { limpiarCacheRaster } from '../core/label/raster';

export const ORDEN_INICIAL: CampoOrden[] = ['logo','marca','ref','desc','meta','extra','barcode'];

const ESTADO_INICIAL: Estado = {
  step: 0,
  marca: 'newmop',
  ref: '500598',
  desc: 'PLUMERO AVESTRUZ MAXI EXTENSIBLE',
  uds: '72',
  lote: '1123B9110526',
  extra: '',
  code: '8436025811529',
  sym: 'ean13',
  copies: 1,
  sizeId: '60x80',
  landscape: false,
  fitScale: 1,
  route: null,
  q: '',
  resultados: [],
  buscando: false,
  errorBusqueda: null,
  articulo: null,
  locked: true,
  order: ORDEN_INICIAL.slice(),
  logo: null,
  dither: true
};

@Injectable({providedIn: 'root'})
export class EtiquetaStore {
  private readonly _s = signal<Estado>({...ESTADO_INICIAL, order: ESTADO_INICIAL.order.slice()});
  readonly state = this._s.asReadonly();

  /** Fuerza el recálculo cuando las fuentes terminan de cargar. */
  private readonly _tick = signal(0);
  readonly tick = this._tick.asReadonly();

  /** El motor: la etiqueta compuesta en milímetros, derivada del estado. */
  readonly etiqueta = computed(() => {
    this._tick();
    const s = this._s();
    return compose(s, s.fitScale);
  });

  readonly step1Valid = computed(() => {
    const st = this._s();
    const c = normalize(st.code, st.sym);
    return !!st.desc.trim() && !!c && checkOk(c, st.sym);
  });

  readonly autoAjuste = computed(() => autoFit(this._s()));

  readonly pistaCodigo = computed(() => {
    const st = this._s();
    const code = normalize(st.code, st.sym);
    let cls = 'hint';
    let txt = SYMS[st.sym].help;
    if(st.code.trim()){
      if(!code){ cls = 'hint err'; txt = `Faltan dígitos para un ${SYMS[st.sym].nm}.`; }
      else if(st.sym === 'code39' && !checkOk(code, st.sym)){
        const malos = [...new Set(code.split('').filter(c=>!C39_CHARS.includes(c)))].join(' ');
        cls = 'hint err'; txt = `Code 39 no puede imprimir: ${malos}`;
      }
      else if(!checkOk(code, st.sym)){
        cls = 'hint err'; txt = `Dígito de control incorrecto: debería terminar en ${gtinCheck(code.slice(0,-1))}.`;
      }
      else if(code !== st.code.replace(/\D/g,'') && (st.sym === 'ean13' || st.sym === 'itf14')){
        cls = 'hint ok'; txt = `Dígito de control añadido → ${code}`;
      }
      else { cls = 'hint ok'; txt = `${SYMS[st.sym].nm} correcto.`; }
    }
    return {cls, txt};
  });

  patch(p: Partial<Estado>): void {
    this._s.update(s => ({...s, ...p}));
  }

  bump(): void {
    this._tick.update(n => n + 1);
  }

  /** Rellena un campo de texto con las reglas del prototipo (copias y uds). */
  setCampo(k: string, valor: string): void {
    if(k === 'copies') this.patch({copies: Math.max(1, Math.min(9999, parseInt(valor || '1', 10) || 1))});
    else if(k === 'uds') this.patch({uds: valor.replace(/\D/g, '')});
    else this.patch({[k]: valor} as Partial<Estado>);
  }

  irAPaso(n: number): boolean {
    if(n > 0 && !this.step1Valid()) return false;
    this.patch({step: n});
    if(typeof window !== 'undefined') window.scrollTo({top: 0, behavior: 'smooth'});
    return true;
  }

  elegirArticulo(a: Articulo | null): void {
    if(!a) return;
    this.patch({
      articulo: a,
      locked: true,
      q: '',
      resultados: [],
      buscando: false,
      errorBusqueda: null,
      marca: a.marca || '',
      ref: a.ref,
      desc: a.desc,
      uds: a.uds || '',
      code: a.code,
      sym: a.sym,
      extra: a.extra || '',
      lote: a.lote || '',       // si el ERP lo trae se precarga, pero queda editable
      fitScale: 1
    });
  }

  toggleLock(): void {
    this.patch({locked: !this._s().locked});
  }

  cambiarArticulo(): void {
    this.patch({articulo: null, locked: true, q: ''});
  }

  resetOrder(): void {
    this.patch({order: ORDEN_INICIAL.slice()});
  }

  setLogo(logo: Logo | null): void {
    limpiarCacheRaster();
    this.patch({logo});
  }

  setModoLogo(mode: 'line' | 'photo'): void {
    const logo = this._s().logo;
    if(!logo) return;
    limpiarCacheRaster();
    this.patch({logo: {...logo, mode}});
  }

  autofit(): void {
    this.patch({fitScale: this.autoAjuste() ?? 1});
  }

  resetFit(): void {
    this.patch({fitScale: 1});
  }

  girar(): void {
    this.patch({landscape: !this._s().landscape, fitScale: 1});
  }

  otraVez(): void {
    this.patch({step: 0, route: null});
    if(typeof window !== 'undefined') window.scrollTo({top: 0, behavior: 'smooth'});
  }

  elegirGrupo(id: string, sizes: string[]): void {
    const st = this._s();
    // al cambiar de plantilla se coge la medida mayor del grupo, que es la que más admite
    if(!sizes.includes(st.sizeId)) this.patch({sizeId: sizes[sizes.length-1], fitScale: 1});
  }

  elegirTamanyo(id: string): void {
    this.patch({sizeId: id, fitScale: 1});
  }

  /** insertAt = hueco donde se suelta (0…n), contado sobre la lista visible. */
  moverBloque(fromIdx: number, insertAt: number): boolean {
    const vis = this.etiqueta().blocks.map(b => b.t);
    if(insertAt < 0 || insertAt > vis.length) return false;
    if(insertAt === fromIdx || insertAt === fromIdx + 1) return false;   // no se mueve
    const movido = vis[fromIdx];
    const destino = insertAt >= vis.length ? null : vis[insertAt];
    const o = this._s().order.filter(x => x !== movido);
    const at = destino === null ? o.length : o.indexOf(destino);
    o.splice(at < 0 ? o.length : at, 0, movido);
    if(o.join() === this._s().order.join()) return false;
    this.patch({order: o});
    return true;
  }
}
