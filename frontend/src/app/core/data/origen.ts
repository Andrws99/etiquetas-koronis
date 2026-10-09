/* ============================================================================
   ORIGEN DE DATOS — único punto que hay que tocar para conectar el ERP
   ----------------------------------------------------------------------------
   Para conectar: ORIGEN.modo = "api" y ORIGEN.base = la URL de tu backend.
   Nada más en toda la aplicación sabe de dónde salen los artículos.

   El backend (Spring Boot) tiene que responder a dos rutas:

     GET  {base}/articulos?q=<texto>&limit=8   -> lista de artículos
     GET  {base}/articulos/<referencia>        -> un artículo
   ============================================================================ */
export const ORIGEN = {
  modo: 'demo' as 'demo' | 'api',   // "demo" = lista local · "api" = tu backend
  base: '',                          // p.ej. "/api"  o  "https://etiquetas.tuservidor.com/api"
  token: ''                          // si la API pide Bearer, ponlo aquí
};
