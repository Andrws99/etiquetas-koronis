import type { Estado, Logo } from '../types';
import { compose } from './compose';
import { svgLabel } from './svg';
import { zpl } from './zpl';

function estado(over: Partial<Estado> = {}): Estado {
  return {
    step: 3,
    marca: 'newmop',
    ref: '500598',
    desc: 'PLUMERO AVESTRUZ MAXI EXTENSIBLE',
    uds: '72',
    lote: '1123B9110526',
    extra: '',
    code: '8436025811529',
    sym: 'ean13',
    copies: 1,
    sizeId: '60x80',
    landscape: false,
    fitScale: 1,
    route: null,
    q: '',
    resultados: [],
    buscando: false,
    errorBusqueda: null,
    articulo: null,
    locked: true,
    order: ['logo', 'marca', 'ref', 'desc', 'meta', 'extra', 'barcode'],
    logo: null,
    dither: true,
    ...over
  };
}

describe('compose', () => {
  it('compone la etiqueta sin incidencias con el estado inicial', () => {
    const L = compose(estado(), 1);
    expect(L.issues).toEqual([]);
    expect(L.fits).toBe(true);
    expect(L.bc?.bits.length).toBe(95);
    expect(L.W).toBe(60);
    expect(L.H).toBe(80);
  });

  it('respeta el orden de campos del estado', () => {
    const L = compose(estado(), 1);
    expect(L.blocks.map(b => b.t)).toEqual(['marca', 'ref', 'desc', 'meta', 'barcode']);
    const alReves = compose(estado({order: ['barcode', 'desc', 'ref', 'marca', 'meta', 'extra', 'logo']}), 1);
    expect(alReves.blocks.map(b => b.t)).toEqual(['barcode', 'desc', 'ref', 'marca', 'meta']);
  });

  it('gira el formato en apaisado', () => {
    const L = compose(estado({landscape: true}), 1);
    expect(L.W).toBe(80);
    expect(L.H).toBe(60);
  });

  it('escala el contenido con fitScale', () => {
    const normal = compose(estado(), 1);
    const ajustada = compose(estado({fitScale: 0.8}), 0.8);
    expect(ajustada.base).toBeLessThan(normal.base);
  });

  it('omite el código cuando no puede codificarlo', () => {
    const L = compose(estado({code: '', sym: 'ean13'}), 1);
    expect(L.bc).toBeNull();
    expect(L.blocks.some(b => b.t === 'barcode')).toBe(false);
  });

  it('avisa cuando la etiqueta es demasiado estrecha para el código', () => {
    const L = compose(estado({sizeId: '10x30'}), 1);
    expect(L.issues.some(i => i.k === 'bcw')).toBe(true);
    expect(L.fits).toBe(false);
  });
});

describe('svgLabel', () => {
  it('genera un SVG con los bloques y el código', () => {
    const svg = svgLabel(compose(estado(), 1), 1, false);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('PLUMERO AVESTRUZ MAXI EXTENSIBLE');
    expect(svg).toContain('rect');
  });

  it('en modo térmico dibuja el logo rasterizado si hay canvas', () => {
    const termico = svgLabel(compose(estado(), 1), 1, true);
    expect(termico).toContain('<svg');
    expect(termico).toContain('fill="#fff"');
  });

  it('sin canvas disponible conserva la fuente original del logo', () => {
    const logo: Logo = {src: 'logo.png', img: new Image(), mode: 'line'};
    expect(svgLabel(compose(estado({logo}), 1), 1, true)).toContain('href="logo.png"');
    expect(svgLabel(compose(estado({logo}), 1), 1, false)).toContain('href="logo.png"');
  });
});

describe('zpl', () => {
  it('genera un trabajo ZPL cerrado con el número de copias', () => {
    const out = zpl(estado());
    expect(out.startsWith('^XA')).toBe(true);
    expect(out.endsWith('^XZ')).toBe(true);
    expect(out).toContain('^PQ1');
    expect(out).toContain('^BEN,');                 // EAN-13 nativo de la impresora
    expect(out).toContain('PLUMERO AVESTRUZ MAXI EXTENSIBLE');
  });

  it('usa el comando de ITF cuando la simbología es itf14', () => {
    const out = zpl(estado({code: '13142762002053', sym: 'itf14'}));
    expect(out).toContain('^BIN,');
    expect(out).toContain('13142762002053');
  });

  it('refleja las copias elegidas', () => {
    expect(zpl(estado({copies: 3}))).toContain('^PQ3');
  });
});
