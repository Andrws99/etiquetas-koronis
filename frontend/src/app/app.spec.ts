import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { EtiquetaStore } from './state/etiqueta.store';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [App]}).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renderiza la cabecera y el indicador de prototipo', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Generador de Etiquetas');
    expect(el.querySelector('.demo-flag')?.textContent).toContain('Prototipo');
  });

  it('muestra los cuatro pasos en el stepper y arranca en el primero', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.stepper button').length).toBe(4);
    expect(el.querySelector('.stepper button')?.textContent).toContain('1');
    expect(el.querySelector('main app-step-datos')).toBeTruthy();
    expect(el.querySelector('app-preview')).toBeTruthy();
    expect(el.querySelector('app-conexion')).toBeTruthy();
  });

  it('cambia de paso cuando cambia el estado', async () => {
    const store = TestBed.inject(EtiquetaStore);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(store.irAPaso(3)).toBe(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('main app-step-imprimir')).toBeTruthy();
    expect(el.querySelector('main app-step-datos')).toBeFalsy();
    expect(el.querySelectorAll('.stepper button')[3]?.getAttribute('aria-current')).toBe('true');
  });

  it('bloquea el paso 2 mientras la etiqueta no sea válida', async () => {
    const store = TestBed.inject(EtiquetaStore);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    store.setCampo('desc', '');
    fixture.detectChanges();
    expect(store.step1Valid()).toBe(false);
    expect(store.irAPaso(1)).toBe(false);
  });

  it('pinta la etiqueta en la vista previa', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.labelBox svg')).toBeTruthy();
    expect(el.querySelectorAll('.hit').length).toBeGreaterThan(0);
    expect(el.querySelector('.stage-meta')?.textContent).toContain('60');
  });
});
