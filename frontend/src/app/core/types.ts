export type Simbologia = 'ean13' | 'itf14' | 'code128' | 'code39';

export type CampoOrden = 'logo' | 'marca' | 'ref' | 'desc' | 'meta' | 'extra' | 'barcode';

export type NivelIssue = 'warn' | 'bad';

export interface Issue {
  k: string;
  lvl: NivelIssue;
  msg: string;
}

export interface Logo {
  src: string;
  img: HTMLImageElement;
  mode: 'line' | 'photo';
}

export interface Articulo {
  ref: string;
  desc: string;
  code: string;
  sym: Simbologia;
  marca?: string;
  uds?: string;
  lote?: string;
  extra?: string;
}

export interface Tamanyo {
  id: string;
  w: number;
  h: number;
}

export interface Grupo {
  id: string;
  nm: string;
  note: string;
  sizes: string[];
}

/** Todo lo que la aplicación sabe de una etiqueta en curso. */
export interface Estado {
  step: number;
  marca: string;
  ref: string;
  desc: string;
  uds: string;
  lote: string;
  extra: string;
  code: string;
  sym: Simbologia;
  copies: number;
  sizeId: string;
  landscape: boolean;
  fitScale: number;
  route: 'pdf' | 'zpl' | null;
  q: string;
  resultados: Articulo[];
  buscando: boolean;
  errorBusqueda: string | null;
  articulo: Articulo | null;
  locked: boolean;
  order: CampoOrden[];
  logo: Logo | null;
  dither: boolean;
}
