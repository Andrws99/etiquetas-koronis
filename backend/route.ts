// app/api/articulos/route.ts
//
// Backend de artículos para la plataforma de etiquetas.
// Lee del ERP en SOLO LECTURA y devuelve exactamente la forma que espera el frontend.
//
// ATENCIÓN antes de programar: el origen que usa Crystal Reports es
// "puentesql32", un DSN ODBC de 32 bits, y un proceso de 64 bits como Node NO
// puede abrirlo. Hay que crear un DSN de 64 bits, conectar directamente al
// motor saltándose el puente, o dejar un servicio de 32 bits intermedio.
// Ver la nota final de vistas-erp.sql.
//
// Instalación según el motor de Cosmos (descomenta el que toque):
//   SQL Server : npm i mssql
//   PostgreSQL : npm i pg
//   Oracle     : npm i oracledb
//   MySQL      : npm i mysql2
//
// Variables en .env.local:
//   ERP_HOST=192.168.1.50
//   ERP_PORT=1433
//   ERP_DB=cosmos
//   ERP_USER=etiquetas_ro          <- usuario de SOLO LECTURA, ver vistas-erp.sql
//   ERP_PASS=...
//   API_TOKEN=un-token-largo-y-aleatorio

import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- forma que consume el frontend ---------- */
export type Articulo = {
  ref: string;
  desc: string;
  code: string;
  sym: "ean13" | "itf14" | "code128";
  marca?: string;
  uds?: string;
  lote?: string;
  extra?: string;
};

/* ---------- pool reutilizado entre peticiones ---------- */
let pool: sql.ConnectionPool | null = null;

async function getPool() {
  if (pool?.connected) return pool;
  pool = await new sql.ConnectionPool({
    server: process.env.ERP_HOST!,
    port: Number(process.env.ERP_PORT ?? 1433),
    database: process.env.ERP_DB!,
    user: process.env.ERP_USER!,
    password: process.env.ERP_PASS!,
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 8000,
    connectionTimeout: 8000,
  }).connect();
  return pool;
}

/* ---------- traducción: columnas del ERP -> campos de la etiqueta ----------
   Este es el ÚNICO sitio que hay que tocar cuando se sepan los nombres reales
   de las columnas en DSPGES. El resto del fichero no cambia.                 */
function aArticulo(row: Record<string, unknown>): Articulo | null {
  const s = (v: unknown) => (v == null ? "" : String(v).trim());

  // La vista v_etiquetas_articulos ya traduce de Cosmos:
  //   codigo_art -> referencia · descrip_art -> descripcion · EAN -> ean
  //   lote_art -> lote · unidad_art -> unidades_caja
  const ref = s(row.referencia);
  const desc = s(row.descripcion);
  const code = s(row.ean);
  if (!ref || !desc || !code) return null; // sin esto no se puede etiquetar

  const digitos = code.replace(/\D/g, "");
  const sym: Articulo["sym"] =
    digitos.length !== code.length ? "code128"
    : digitos.length === 13 ? "ean13"
    : digitos.length === 14 ? "itf14"
    : "code128";

  return {
    ref,
    desc,
    code,
    sym,
    marca: s(row.marca) || undefined,
    uds: s(row.unidades_caja) || undefined,
    lote: s(row.lote) || undefined,
    extra: s(row.texto_etiqueta) || undefined,
  };
}

/* ---------- autenticación ---------- */
function autorizado(req: NextRequest) {
  const esperado = process.env.API_TOKEN;
  if (!esperado) return true; // sin token configurado, se deja pasar en desarrollo
  return req.headers.get("authorization") === `Bearer ${esperado}`;
}

/* ---------- GET /api/articulos?q=texto&limit=8 ---------- */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 8) || 8, 50);

  if (q.length < 2) return NextResponse.json([]);

  try {
    const db = await getPool();

    // Parametrizado siempre: nunca concatenes q dentro del SQL.
    const res = await db
      .request()
      .input("q", sql.NVarChar(120), `%${q}%`)
      .input("exacto", sql.NVarChar(20), q)
      .input("limit", sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
               referencia, descripcion, ean, lote, marca, unidades_caja, texto_etiqueta
        FROM   dbo.v_etiquetas_articulos
        WHERE  ean = @exacto                 -- primero la lectura de pistola
           OR  referencia LIKE @q
           OR  descripcion LIKE @q
           OR  marca LIKE @q
        ORDER BY CASE WHEN ean = @exacto THEN 0
                      WHEN referencia = @exacto THEN 1
                      ELSE 2 END,
                 referencia
      `);

    const articulos = res.recordset.map(aArticulo).filter(Boolean) as Articulo[];

    return NextResponse.json(articulos, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    console.error("[articulos] fallo consultando el ERP:", err);
    // El frontend enseña este mensaje tal cual al operario.
    return NextResponse.json(
      { error: "No se pudo consultar el catálogo del ERP." },
      { status: 502 }
    );
  }
}
