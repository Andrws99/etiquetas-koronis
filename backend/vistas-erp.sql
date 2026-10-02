-- ============================================================================
--  Acceso de la plataforma de etiquetas al ERP (Cosmos / DSPGES)
--
--  Nombres confirmados a partir del diseñador de plantillas:
--    Origen ODBC : puentesql32   (atención: DSN de 32 bits, ver nota al final)
--    Tabla       : ARTICULOS
--    Columnas    : codigo_art, descrip_art, EAN, lote_art, unidad_art, pvp_art
--
--  Regla: la plataforma NUNCA toca las tablas del ERP directamente.
--  Solo ve esta vista. Si mañana cambia el esquema de Cosmos,
--  se arregla la vista y la plataforma ni se entera.
--
--  Sintaxis SQL Server. Si Cosmos corre sobre otro motor cambian los
--  CREATE USER y algunas funciones, pero la idea es idéntica.
-- ============================================================================


-- 1. LA VISTA -----------------------------------------------------------------
--    Traduce los nombres de Cosmos a los que espera el backend.
--    Este es el único punto de traducción del lado de la base de datos.

CREATE OR ALTER VIEW dbo.v_etiquetas_articulos AS
SELECT
    a.codigo_art                AS referencia,
    a.descrip_art               AS descripcion,
    a.EAN                       AS ean,
    a.lote_art                  AS lote,
    a.unidad_art                AS unidades_caja,   -- PENDIENTE: confirmar que es
                                                    -- el PCB y no la unidad de
                                                    -- medida (UD, KG, M). Si es la
                                                    -- unidad de medida, hay que
                                                    -- buscar la columna real.
    CAST(NULL AS VARCHAR(60))   AS marca,           -- no localizada en ARTICULOS;
                                                    -- si existe tabla de marcas,
                                                    -- se añade aquí con un JOIN
    CAST(NULL AS VARCHAR(120))  AS texto_etiqueta   -- idem, si hay observaciones
FROM        dbo.ARTICULOS AS a
WHERE       a.EAN IS NOT NULL                       -- sin código no hay etiqueta
  AND       LEN(LTRIM(RTRIM(a.EAN))) > 0;
GO


-- 2. ÍNDICES ------------------------------------------------------------------
--    El operario busca mientras teclea y escanea con pistola, así que esto se
--    consulta mucho. Sin índice en el EAN, el escaneo va lento.

CREATE NONCLUSTERED INDEX IX_articulos_ean
    ON dbo.ARTICULOS (EAN)
    INCLUDE (codigo_art, descrip_art);
GO

CREATE NONCLUSTERED INDEX IX_articulos_codigo
    ON dbo.ARTICULOS (codigo_art)
    INCLUDE (descrip_art, EAN);
GO


-- 3. EL USUARIO ---------------------------------------------------------------
--    Solo lectura, y solo sobre la vista. No sobre las tablas.
--    Aunque alguien reviente el servidor web, no puede escribir en el ERP
--    ni leer clientes, precios o facturación.

CREATE LOGIN etiquetas_ro
    WITH PASSWORD = 'CAMBIA-ESTA-CLAVE';
GO

USE cosmos;   -- ajustar al nombre real de la base de datos
GO

CREATE USER etiquetas_ro FOR LOGIN etiquetas_ro;
GO

-- Nada de db_datareader: eso daría acceso a TODAS las tablas.
GRANT SELECT ON dbo.v_etiquetas_articulos TO etiquetas_ro;
GO

DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO etiquetas_ro;
GO

-- Importante: pvp_art (el precio) queda deliberadamente FUERA de la vista.
-- La etiqueta no lo necesita y no hay razón para exponer precios a la web.


-- 4. COMPROBACIÓN -------------------------------------------------------------
--    Ejecutar conectado COMO etiquetas_ro antes de dar por bueno el montaje.

--   Debe devolver filas:
SELECT TOP 5 * FROM dbo.v_etiquetas_articulos;

--   Debe fallar con permiso denegado:
--   SELECT TOP 5 * FROM dbo.ARTICULOS;
--   UPDATE dbo.ARTICULOS SET descrip_art = 'x' WHERE 1 = 0;


-- 5. CONTROL DE CALIDAD DE LOS DATOS ------------------------------------------
--    Merece la pena pasar esto ANTES de conectar nada: son los artículos que
--    van a dar problemas al etiquetar. En un maestro con años encima, estas
--    cuatro consultas suelen dar sorpresas.

--   Códigos con longitud rara (ni EAN-13 ni GTIN-14):
SELECT referencia, descripcion, ean, LEN(ean) AS largo
FROM   dbo.v_etiquetas_articulos
WHERE  LEN(ean) NOT IN (13, 14)
ORDER  BY largo DESC;

--   Códigos con letras o espacios, que no se pueden imprimir como EAN:
SELECT referencia, descripcion, ean
FROM   dbo.v_etiquetas_articulos
WHERE  ean LIKE '%[^0-9]%';

--   Códigos repetidos en varios artículos: la pistola no sabrá cuál elegir.
SELECT ean, COUNT(*) AS cuantos
FROM   dbo.v_etiquetas_articulos
GROUP  BY ean
HAVING COUNT(*) > 1
ORDER  BY cuantos DESC;

--   Descripciones largas: por encima de unos 40 caracteres no caben en las
--   etiquetas pequeñas y habrá que recortarlas o abreviarlas.
SELECT referencia, LEN(descripcion) AS largo, descripcion
FROM   dbo.v_etiquetas_articulos
WHERE  LEN(descripcion) > 40
ORDER  BY largo DESC;


-- ============================================================================
--  NOTA SOBRE EL ODBC DE 32 BITS
--
--  El origen que usa Crystal Reports es "puentesql32", un DSN de 32 bits.
--  Un proceso de 64 bits NO puede abrir un DSN de 32 bits: son dos registros
--  de orígenes distintos en Windows. Como Node corre en 64 bits, hay que
--  resolver esto antes de programar el backend. Tres salidas:
--
--    a) Crear un DSN de 64 bits con el mismo driver, si el fabricante lo
--       distribuye en 64 bits. Es lo más limpio.
--    b) Conectar directamente al motor (SQL Server, Oracle…) saltándose el
--       puente ODBC, si el puente solo es una capa de compatibilidad.
--    c) Dejar un pequeño servicio de 32 bits que haga de intermediario.
--
--  Antes de nada conviene preguntar qué es exactamente "puentesql32": si es
--  una capa propia de Cosmos sobre un motor estándar, la opción (b) ahorra
--  todo el problema.
-- ============================================================================
