import type { Articulo } from '../types';

/* Lista de relleno para poder probar sin backend.
   Al conectar el ERP se pone ORIGEN.modo = "api" y esta constante se borra. */
export const SEED_DEMO: Articulo[] = [
  {ref:'500598', marca:'newmop', desc:'PLUMERO AVESTRUZ MAXI EXTENSIBLE',  uds:'72', code:'8436025811529',  sym:'ean13'},
  {ref:'200205', marca:'KERKOM', desc:'PLUMERO AVESTRUZ MANGO LARGO',      uds:'12', code:'13142762002053', sym:'itf14'},
  {ref:'310420', marca:'ACAN',   desc:'NEVERA 21,8 LITROS',                uds:'6',  code:'8410621527572',  sym:'ean13', extra:'(INCLUYE ASA DE CUERDA)'},
  {ref:'441880', marca:'',       desc:'SALVAMANTEL ENEA MPRO 30 CM',       uds:'96', code:'18414892818282', sym:'itf14'}
];
