import { Component, computed, inject, signal } from '@angular/core';
import { ORIGEN } from '../../core/data/origen';
import { CatalogoService } from '../../state/catalogo.service';
import { EtiquetaStore } from '../../state/etiqueta.store';

type ClaveOrigen = 'modo' | 'base' | 'token';

@Component({
  selector: 'app-conexion',
  templateUrl: './conexion.html',
  styleUrls: ['./conexion.css'],
  standalone: true
})
export class Conexion {
  protected readonly origen = ORIGEN;
  private readonly store = inject(EtiquetaStore);
  private readonly catalogo = inject(CatalogoService);
  private readonly tick = signal(0);

  protected readonly estado = computed(() => {
    this.tick();
    const on = ORIGEN.modo === 'api' && !!ORIGEN.base;
    return {
      on,
      txt: ORIGEN.modo === 'demo' ? 'lista local' : on ? 'api configurada' : 'falta la url'
    };
  });

  protected set(clave: ClaveOrigen, e: Event): void {
    const valor = (e.target as HTMLInputElement | HTMLSelectElement).value.trim();
    if(clave === 'modo') ORIGEN.modo = valor as 'demo' | 'api';
    else if(clave === 'base') ORIGEN.base = valor;
    else ORIGEN.token = valor;
    this.tick.update(n => n + 1);
    const q = this.store.state().q.trim();
    if(q.length >= 2) this.catalogo.buscar(q);
  }
}
