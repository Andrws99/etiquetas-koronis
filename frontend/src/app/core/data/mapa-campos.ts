/* Nombres de columna del ERP -> campos internos. Varios alias por campo:
   se coge el primero que venga informado.
   Los nombres en MAYÚSCULAS son los reales de la tabla ARTICULOS de Cosmos,
   confirmados en el diseñador de plantillas. */
export const MAPA_CAMPOS: Record<string, string[]> = {
  ref:   ['ref', 'codigo_art', 'referencia', 'codigo_articulo', 'cod_art', 'articulo'],
  desc:  ['desc', 'descrip_art', 'descripcion', 'nombre', 'denominacion'],
  code:  ['code', 'ean', 'ean13', 'codigo_barras', 'gtin'],
  sym:   ['sym', 'tipo_codigo', 'simbologia'],
  marca: ['marca', 'fabricante', 'brand'],
  // OJO: unidad_art podría ser la unidad de medida (UD, KG, M) y no las unidades
  // por caja. Confirmar antes de darlo por bueno; si es la unidad de medida, se
  // quita de aquí y se busca la columna real del PCB.
  uds:   ['uds', 'unidad_art', 'unidades_caja', 'pcb', 'uds_caja'],
  lote:  ['lote', 'lote_art', 'numero_lote'],
  extra: ['extra', 'texto_etiqueta', 'observaciones']
};
