import { Injectable, inject } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs';
import { ERP } from '../core/data/erp';
import type { Articulo } from '../core/types';
import { EtiquetaStore } from './etiqueta.store';

type Respuesta = {q: string; articulos: Articulo[]};

/**
 * Búsqueda en el catálogo: 220 ms de espera, y una pulsación nueva cancela
 * la petición en vuelo (antes: setTimeout + AbortController a mano).
 */
@Injectable({providedIn: 'root'})
export class CatalogoService {
  private readonly store = inject(EtiquetaStore);
  private readonly queries = new Subject<string>();
  private ac: AbortController | null = null;

  constructor() {
    this.queries.pipe(
      debounceTime(220),
      switchMap(q => {
        if(q.length < 2) return of(null);
        return new Observable<Respuesta>(sub => {
          const ac = new AbortController();
          this.ac = ac;
          ERP.buscar(q, ac.signal).then(articulos => {
            if(sub.closed) return;
            sub.next({q, articulos});
            sub.complete();
          }).catch((err: Error) => {
            if(!sub.closed && err.name !== 'AbortError') sub.error(err);
          });
          return () => {
            if(this.ac === ac) this.ac = null;
            ac.abort();
          };
        });
      })
    ).subscribe({
      next: res => {
        if(!res) return;
        this.store.patch({buscando: false, resultados: res.articulos});
        // una pistola teclea el código entero: si hay una coincidencia exacta, se elige sola
        const exacto = res.articulos.find(a => a.code === res.q.replace(/\s/g, ''));
        if(exacto) this.store.elegirArticulo(exacto);
      },
      error: (err: Error) => {
        this.store.patch({
          buscando: false,
          errorBusqueda: err.message || 'No se pudo consultar el catálogo.'
        });
      }
    });
  }

  buscar(entrada: string): void {
    this.ac?.abort();
    this.ac = null;
    const q = entrada.trim();
    if(q.length < 2){
      this.store.patch({resultados: [], buscando: false, errorBusqueda: null});
      this.queries.next(q);
      return;
    }
    this.store.patch({buscando: true, errorBusqueda: null});
    this.queries.next(q);
  }
}
