import type { Estado, Grupo, Tamanyo } from '../types';

/* Medidas físicas del rollo, en milímetros (ancho × alto). */
export const SIZES: Tamanyo[] = [
  {id:'10x30',   w:10,  h:30 },
  {id:'20x30',   w:20,  h:30 },
  {id:'30x30',   w:30,  h:30 },
  {id:'30x40',   w:30,  h:40 },
  {id:'60x80',   w:60,  h:80 },
  {id:'100x150', w:100, h:150}
];

/* Plantillas. El operario elige entre estas tres, no entre seis medidas.
   Una misma plantilla sirve para varios rollos: el motor la recompone sola. */
export const GRUPOS: Grupo[] = [
  {id:'pequena',  nm:'Pequeña',  note:'Unidad pequeña. Descripción corta y código.',
   sizes:['10x30','20x30','30x30']},
  {id:'estandar', nm:'Estándar', note:'La de uso diario en unidad.',
   sizes:['30x40']},
  {id:'caja',     nm:'Caja',     note:'Agrupación: unidades por caja e ITF-14.',
   sizes:['60x80','100x150']}
];

export const grupoDe = (id: string): Grupo => GRUPOS.find(g => g.sizes.includes(id)) || GRUPOS[0];

export const STEPS = ['Rellenar datos', 'Elegir tamaño', 'Previsualizar', 'Imprimir'];

export function tamanyoDe(st: Pick<Estado, 'sizeId' | 'landscape'>): Tamanyo {
  const s = SIZES.find(x=>x.id===st.sizeId)!;
  return st.landscape ? {...s, w:s.h, h:s.w} : s;
}
