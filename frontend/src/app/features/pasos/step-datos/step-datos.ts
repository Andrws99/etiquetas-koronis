import { Component, inject } from '@angular/core';
import { SYMS, SIMBOLOGIAS } from '../../../core/barcode/symbols';
import { EtiquetaStore } from '../../../state/etiqueta.store';
import { ArticleSearch } from './article-search/article-search';
import { LogoUpload } from './logo-upload/logo-upload';

@Component({
  selector: 'app-step-datos',
  imports: [ArticleSearch, LogoUpload],
  templateUrl: './step-datos.html',
  styleUrls: ['./step-datos.css']
})
export class StepDatos {
  protected readonly store = inject(EtiquetaStore);
  protected readonly simbologias = SIMBOLOGIAS;
  protected readonly syms = SYMS;

  protected ro(): boolean {
    const st = this.store.state();
    return !!(st.articulo && st.locked);
  }

  protected set(campo: string, e: Event): void {
    this.store.setCampo(campo, (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value);
  }
}
