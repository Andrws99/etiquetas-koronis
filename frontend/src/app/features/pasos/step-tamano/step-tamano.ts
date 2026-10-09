import { Component, computed, inject } from '@angular/core';
import type { Grupo } from '../../../core/types';
import { GRUPOS, SIZES, grupoDe } from '../../../core/label/sizes';
import { EtiquetaStore } from '../../../state/etiqueta.store';

const MAX_D = 150, BOX = 56;

@Component({
  selector: 'app-step-tamano',
  templateUrl: './step-tamano.html',
  styleUrls: ['./step-tamano.css']
})
export class StepTamano {
  protected readonly store = inject(EtiquetaStore);
  protected readonly grupos = GRUPOS;
  protected readonly actual = computed(() => grupoDe(this.store.state().sizeId));

  protected forma(g: Grupo): {w: number; h: number} {
    const s = SIZES.find(x => x.id === g.sizes[g.sizes.length-1])!;
    return {w: Math.max(6, s.w/MAX_D*BOX), h: Math.max(6, s.h/MAX_D*BOX)};
  }

  protected medidas(g: Grupo): string {
    return g.sizes.map(id => { const z = SIZES.find(x => x.id === id)!; return z.w + '×' + z.h; }).join(' · ') + ' mm';
  }

  protected elegirGrupo(g: Grupo): void {
    this.store.elegirGrupo(g.id, g.sizes);
  }

  protected elegirTamanyo(id: string): void {
    this.store.elegirTamanyo(id);
  }
}
