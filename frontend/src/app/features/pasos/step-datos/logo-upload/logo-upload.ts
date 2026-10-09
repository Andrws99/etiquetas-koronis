import { Component, inject } from '@angular/core';
import { EtiquetaStore } from '../../../../state/etiqueta.store';
import { alertInline } from '../../../../shared/toast';

@Component({
  selector: 'app-logo-upload',
  templateUrl: './logo-upload.html',
  styleUrls: ['./logo-upload.css'],
  standalone: true
})
export class LogoUpload {
  private readonly store = inject(EtiquetaStore);

  protected onFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    const f = input.files && input.files[0];
    if(!f) return;
    if(f.size > 4*1024*1024){ alertInline('La imagen pasa de 4 MB. Reduce el fichero antes de subirlo.'); return; }
    const fr = new FileReader();
    fr.onload = () => this.cargarLogo(String(fr.result));
    fr.onerror = () => alertInline('No se ha podido leer el fichero.');
    fr.readAsDataURL(f);
    input.value = '';
  }

  private cargarLogo(src: string): void {
    const img = new Image();
    img.onload = () => this.store.setLogo({src, img, mode: 'line'});
    img.onerror = () => {
      this.store.setLogo(null);
      alertInline('No se ha podido leer esa imagen. Prueba con un PNG, JPG o SVG.');
    };
    img.src = src;
  }

  protected onMode(e: Event): void {
    this.store.setModoLogo((e.target as HTMLSelectElement).value as 'line' | 'photo');
  }
}
