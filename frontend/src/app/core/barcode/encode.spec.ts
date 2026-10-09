import {
  barcode, checkOk, code128Bits, code39Bits, ean13Bits, gtinCheck, itfBits, normalize, widthsToBits
} from './encode';

/* Goldens: cadenas de bits calculadas con el estándar EAN/ITF/Code39 y contrastadas
   con las tablas del prototipo original. Si cambian, la etiqueta deja de leerse. */
const EAN13_GOLDEN =
  '10101000110100001010111101001110011011011000101010100100011001101100110100111011011001110100101';
const ITF14_GOLDEN =
  '1010110010010101101101010010110010110101001100101100110101001010110011001010110100100110110010011010101101';
const C39_GOLDEN = '100101101101011010100101101101001010110100101101101';
const C128_DIGITOS_GOLDEN = '110100111001011001110010001011000100100111101100011101011';
const C128_TEXTO_GOLDEN  = '110100100001010001100010001011000111101011101100011101011';

describe('gtinCheck / checkOk / normalize', () => {
  it('calcula el dígito de control GTIN', () => {
    expect(gtinCheck('843602581152')).toBe(9);
    expect(gtinCheck('1314276200205')).toBe(3);
  });

  it('acepta el código de ejemplo y rechaza uno manipulado', () => {
    expect(checkOk('8436025811529', 'ean13')).toBe(true);
    expect(checkOk('8436025811528', 'ean13')).toBe(false);
    expect(checkOk('13142762002053', 'itf14')).toBe(true);
    expect(checkOk('13142762002054', 'itf14')).toBe(false);
  });

  it('completa el dígito de control y normaliza', () => {
    expect(normalize('843602581152', 'ean13')).toBe('8436025811529');
    expect(normalize('8436025811529', 'ean13')).toBe('8436025811529');
    expect(normalize('1314276200205', 'itf14')).toBe('13142762002053');
    expect(normalize('abc-1', 'code39')).toBe('ABC-1');
    expect(normalize('12 34', 'code128')).toBe('12 34');
  });

  it('devuelve null cuando la simbología no puede codificar', () => {
    expect(normalize('123', 'ean13')).toBeNull();
    expect(normalize(undefined, 'code128')).toBeNull();
  });
});

describe('codificación de códigos de barras', () => {
  it('EAN-13 → 95 módulos con guardas y centro', () => {
    const bits = ean13Bits('8436025811529');
    expect(bits.length).toBe(95);
    expect(bits.slice(0, 3)).toBe('101');
    expect(bits.slice(45, 50)).toBe('01010');
    expect(bits.slice(-3)).toBe('101');
    expect(bits).toBe(EAN13_GOLDEN);
  });

  it('ITF-14 → guarda inicial 1010 y final 1101', () => {
    const bits = itfBits('13142762002053');
    expect(bits.slice(0, 4)).toBe('1010');
    expect(bits.slice(-4)).toBe('1101');
    expect(bits).toBe(ITF14_GOLDEN);
  });

  it('Code 39 → asteriscos de inicio/fin', () => {
    expect(code39Bits('A1')).toBe(C39_GOLDEN);
    expect(code39Bits('A1').length).toBe(51);
  });

  it('Code 128 → paridad B para texto y paridad C para dígitos', () => {
    expect(code128Bits('AB')).toBe(C128_TEXTO_GOLDEN);
    expect(code128Bits('1234')).toBe(C128_DIGITOS_GOLDEN);
    expect(code128Bits('AB')).toBe(code128Bits('AB'));
    expect(code128Bits('AB')).not.toBe(code128Bits('BA'));
  });

  it('widthsToBits alterna barra/espacio empezando por barra', () => {
    expect(widthsToBits('12')).toBe('100');
    expect(widthsToBits('3')).toBe('111');
  });

  it('barcode devuelve el módulo de silencio y el texto legible', () => {
    const ean = barcode('8436025811529', 'ean13');
    expect(ean?.quiet).toBe(9);
    expect(ean?.txt).toBe('8436025811529');
    const c39 = barcode('AB', 'code39');
    expect(c39?.txt).toBe('*AB*');
    expect(barcode(null, 'ean13')).toBeNull();
  });
});
