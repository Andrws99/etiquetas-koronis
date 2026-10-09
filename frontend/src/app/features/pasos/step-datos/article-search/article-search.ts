import { Component, inject } from '@angular/core';
import { EtiquetaStore } from '../../../../state/etiqueta.store';
import { CatalogoService } from '../../../../state/catalogo.service';

@Component({
  selector: 'app-article-search',
  templateUrl: './article-search.html',
  styleUrls: ['./article-search.css'],
  standalone: true
})
export class ArticleSearch {
  protected readonly store = inject(EtiquetaStore);
  private readonly catalogo = inject(CatalogoService);

  protected onQ(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    this.store.patch({q: v});
    this.catalogo.buscar(v);
  }

  protected elegir(i: number): void {
    this.store.elegirArticulo(this.store.state().resultados[i]);
  }
}
