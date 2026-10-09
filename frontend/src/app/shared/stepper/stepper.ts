import { Component, inject } from '@angular/core';
import { STEPS } from '../../core/label/sizes';
import { EtiquetaStore } from '../../state/etiqueta.store';

@Component({
  selector: 'app-stepper',
  templateUrl: './stepper.html',
  styleUrls: ['./stepper.css'],
  standalone: true
})
export class Stepper {
  protected readonly store = inject(EtiquetaStore);
  protected readonly pasos = STEPS;

  ir(n: number): void {
    this.store.irAPaso(n);
  }
}
