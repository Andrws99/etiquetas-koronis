import { Component, inject } from '@angular/core';
import { EtiquetaStore } from './state/etiqueta.store';
import { Stepper } from './shared/stepper/stepper';
import { Preview } from './features/preview/preview';
import { Conexion } from './features/conexion/conexion';
import { StepDatos } from './features/pasos/step-datos/step-datos';
import { StepTamano } from './features/pasos/step-tamano/step-tamano';
import { StepComprobar } from './features/pasos/step-comprobar/step-comprobar';
import { StepImprimir } from './features/pasos/step-imprimir/step-imprimir';

@Component({
  selector: 'app-root',
  imports: [Stepper, StepDatos, StepTamano, StepComprobar, StepImprimir, Preview, Conexion],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly store = inject(EtiquetaStore);

  constructor() {
    // con las fuentes cargadas cambian los anchos de texto: se vuelve a componer
    document.fonts?.ready.then(() => this.store.bump());
  }
}
