import { Component, computed, inject } from '@angular/core';
import { tamanyoDe } from '../../../core/label/sizes';
import { Alert } from '../../../shared/alert/alert';
import { EtiquetaStore } from '../../../state/etiqueta.store';

@Component({
  selector: 'app-step-comprobar',
  imports: [Alert],
  templateUrl: './step-comprobar.html',
  styleUrls: ['./step-comprobar.css']
})
export class StepComprobar {
  protected readonly store = inject(EtiquetaStore);
  protected readonly st = this.store.state;
  protected readonly etiqueta = this.store.etiqueta;
  protected readonly medidas = computed(() => tamanyoDe(this.st()));

  protected readonly canFit = computed(() => {
    const fit = this.store.autoAjuste();
    return this.st().fitScale === 1 && fit !== null && fit < 1;
  });

  protected get fitPercent(): number {
    return Math.round(this.st().fitScale * 100);
  }

  protected get medidaFinal(): string {
    const s = this.medidas();
    return `${s.w} × ${s.h} mm${this.st().landscape ? ' (girada)' : ''}`;
  }

  protected setCopies(e: Event): void {
    this.store.setCampo('copies', (e.target as HTMLInputElement).value);
  }
}
