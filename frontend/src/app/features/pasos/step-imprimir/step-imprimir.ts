import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { SYMS } from '../../../core/barcode/symbols';
import { normalize } from '../../../core/barcode/encode';
import { tamanyoDe } from '../../../core/label/sizes';
import { zpl } from '../../../core/label/zpl';
import { Alert } from '../../../shared/alert/alert';
import { EtiquetaStore } from '../../../state/etiqueta.store';

@Component({
  selector: 'app-step-imprimir',
  imports: [Alert],
  templateUrl: './step-imprimir.html',
  styleUrls: ['./step-imprimir.css']
})
export class StepImprimir {
  protected readonly store = inject(EtiquetaStore);
  protected readonly st = this.store.state;
  protected readonly medidas = computed(() => tamanyoDe(this.st()));
  protected readonly codigo = computed(() => normalize(this.st().code, this.st().sym));
  protected readonly simbologia = computed(() => SYMS[this.st().sym].nm);
  protected readonly textoZpl = computed(() => zpl(this.st()));
  protected readonly etiquetaZpl = signal('Copiar');

  @ViewChild('zplOut') private zplOut?: {nativeElement: HTMLPreElement};

  protected get filas(): [string, string | number][] {
    const st = this.st();
    return [
      ['Descripción', st.desc || '—'],
      ['Código', `${this.codigo()} · ${this.simbologia()}`],
      ['Tamaño', `${this.medidas().w} × ${this.medidas().h} mm`],
      ['Lote', st.lote || '—'],
      ['Copias', st.copies]
    ];
  }

  protected ruta(r: 'pdf' | 'zpl'): void {
    this.store.patch({route: r});
  }

  protected copiar(e: Event): void {
    const b = e.currentTarget as HTMLButtonElement;
    const txt = this.textoZpl();
    const hecho = () => {
      b.textContent = 'Copiado';
      setTimeout(() => b.textContent = 'Copiar', 1600);
    };
    try{
      navigator.clipboard.writeText(txt).then(hecho).catch(() => {
        this.seleccionar();
        b.textContent = 'Selecciona y copia';
      });
    }catch(_){
      this.seleccionar();
      b.textContent = 'Selecciona y copia';
    }
  }

  private seleccionar(): void {
    const pre = this.zplOut?.nativeElement;
    if(!pre) return;
    const r = document.createRange();
    r.selectNodeContents(pre);
    const s = getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }
}
