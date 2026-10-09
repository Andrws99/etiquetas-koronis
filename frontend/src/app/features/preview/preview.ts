import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import { ORDEN_INICIAL, EtiquetaStore } from '../../state/etiqueta.store';
import { svgLabel } from '../../core/label/svg';
import { NOMBRE } from '../../core/label/nombres';

interface Zona {
  idx: number;
  id: string;
  top: number;
  height: number;
  nombre: string;
}

interface Arrastre {
  el: HTMLElement;
  from: number;
  to: number;
  y0: number;
  boxH: number;
  boxTop: number;
  rects: {top: number; h: number}[];
}

@Component({
  selector: 'app-preview',
  templateUrl: './preview.html',
  styleUrls: ['./preview.css']
})
export class Preview implements AfterViewInit {
  protected readonly store = inject(EtiquetaStore);
  protected readonly st = this.store.state;
  /* el SVG lo generamos nosotros: lo marcamos como seguro y no lo toca el sanitizer */
  private readonly dom = inject(DomSanitizer);

  @ViewChild('labelBox') private labelBox?: {nativeElement: HTMLElement};
  @ViewChild('dropline') private dropline?: {nativeElement: HTMLElement};

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly colW = signal(320);
  private drag: Arrastre | null = null;
  private rt: ReturnType<typeof setTimeout> | null = null;

  protected readonly vista = computed(() => {
    const st = this.st();
    const L = this.store.etiqueta();
    const maxW = Math.max(120, this.colW() - 30), maxH = 380;
    const zoom = Math.min(maxW / L.W, maxH / L.H, 7);
    const svg = this.dom.bypassSecurityTrustHtml(svgLabel(L, zoom, st.dither));
    const zonas: Zona[] = L.blocks.map((b, i) => ({
      idx: i,
      id: b.t,
      top: +(b._y! * zoom).toFixed(1),
      height: +(Math.max(10, b._h! * zoom)).toFixed(1),
      nombre: NOMBRE[b.t]
    }));
    return {L, zoom, svg, zonas, width: Math.round(L.W * zoom)};
  });

  protected get metaTam(): string {
    const L = this.vista().L;
    return `<b>${L.W} × ${L.H}</b> mm`;
  }

  protected get metaModulo(): string {
    const {L, zoom} = this.vista();
    const bcX = L.bc ? (L.bAvailW / (L.bc.bits.length + L.bc.quiet * 2)) : 0;
    return L.bc
      ? `módulo <b>${bcX.toFixed(3)}</b> mm`
      : `escala ${Math.round(zoom / 3.7795 * 100)}%`;
  }

  protected get ordenModificado(): boolean {
    return this.st().order.join() !== ORDEN_INICIAL.join();
  }

  protected setDither(e: Event): void {
    this.store.patch({dither: (e.target as HTMLInputElement).checked});
  }

  ngAfterViewInit(): void {
    this.medir();
  }

  @HostListener('window:resize')
  onResize(): void {
    if(this.rt) clearTimeout(this.rt);
    this.rt = setTimeout(() => this.medir(), 120);
  }

  private medir(): void {
    const col = this.host.nativeElement.closest('.previewCol') as HTMLElement | null;
    this.colW.set(col?.clientWidth || 320);
  }

  /* ---------- arrastrar para reordenar ---------- */

  @HostListener('pointerdown', ['$event'])
  onPointerDown(e: PointerEvent): void {
    const hit = (e.target as Element).closest?.('.hit') as HTMLElement | null;
    if(!hit) return;
    e.preventDefault();
    const box = this.labelBox?.nativeElement;
    if(!box) return;
    const hits = Array.from(this.host.nativeElement.querySelectorAll('.hit')) as HTMLElement[];
    this.drag = {
      el: hit,
      from: Number(hit.dataset['idx']),
      to: Number(hit.dataset['idx']),
      y0: e.clientY,
      boxH: box.clientHeight,
      boxTop: box.getBoundingClientRect().top,
      rects: hits.map(h => ({top: h.offsetTop, h: h.offsetHeight}))
    };
    hit.setPointerCapture(e.pointerId);
    hit.classList.add('dragging');
    document.body.classList.add('dragging-on');
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(e: PointerEvent): void {
    const drag = this.drag;
    if(!drag) return;
    const r = drag.rects[drag.from];
    // el bloque arrastrado no se sale de la etiqueta
    const dy = Math.max(-r.top - 6, Math.min(e.clientY - drag.y0, drag.boxH - r.top - r.h + 6));
    drag.el.style.transform = `translateY(${dy}px)`;
    const local = e.clientY - drag.boxTop;      // se inserta donde está el cursor
    let to = drag.rects.length;
    for(let i = 0; i < drag.rects.length; i++){
      if(local < drag.rects[i].top + drag.rects[i].h / 2){ to = i; break; }
    }
    drag.to = to;
    const dl = this.dropline?.nativeElement;
    if(dl){
      dl.hidden = false;
      dl.style.top = (to >= drag.rects.length
        ? drag.rects[drag.rects.length - 1].top + drag.rects[drag.rects.length - 1].h
        : drag.rects[to].top) + 'px';
    }
  }

  @HostListener('pointerup')
  onPointerUp(): void {
    const drag = this.drag;
    if(!drag) return;
    drag.el.classList.remove('dragging');
    drag.el.style.transform = '';
    document.body.classList.remove('dragging-on');
    this.drag = null;
    const dl = this.dropline?.nativeElement;
    if(dl) dl.hidden = true;
    this.store.moverBloque(drag.from, drag.to);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    const hit = (e.target as Element).closest?.('.hit') as HTMLElement | null;
    if(!hit || !e.altKey) return;
    const i = Number(hit.dataset['idx']);
    if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){
      e.preventDefault();
      const id = hit.dataset['id'];
      if(this.store.moverBloque(i, e.key === 'ArrowUp' ? i - 1 : i + 2)){
        setTimeout(() => {
          const otraVez = this.host.nativeElement.querySelector(`.hit[data-id="${id}"]`) as HTMLElement | null;
          otraVez?.focus();
        }, 0);
      }
    }
  }
}
