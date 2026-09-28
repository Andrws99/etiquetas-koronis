-- ============================================================================
--  Acceso de la plataforma de etiquetas al ERP
--  Sintaxis SQL Server. Para PostgreSQL u Oracle cambian los CREATE USER,
--  pero la idea es la misma: una vista y un usuario que solo puede leerla.
--
--  Regla: la plataforma NUNCA toca las tablas del ERP directamente.
--  Solo ve esta vista. Así, si mañana cambia el esquema de DSPGES,
--  se arregla la vista y la plataforma ni se entera.
-- ============================================================================


-- 1. LA VISTA -----------------------------------------------------------------
--    Renombra aquí las columnas reales de DSPGES a los nombres que espera
--    el backend. Este es el punto de traducción.

CREATE OR ALTER VIEW dbo.v_etiquetas_articulos AS
SELECT
    a.codigo_articulo           AS referencia,
    a.descripcion               AS descripcion,
    a.cod_barras                AS ean,
    m.nombre                    AS marca,
    a.uds_por_caja              AS unidades_caja,
    a.obs_etiqueta              AS texto_etiqueta
FROM        dbo.articulos AS a
LEFT JOIN   dbo.marcas    AS m ON m.id = a.id_marca
WHERE       a.activo = 1                -- fuera los dados de baja
  AND       a.cod_barras IS NOT NULL    -- sin código no hay etiqueta
  AND       LEN(LTRIM(RTRIM(a.cod_barras))) > 0;
GO


-- 2. ÍNDICES ------------------------------------------------------------------
--    El operario busca mientras teclea, así que esto se consulta mucho.
--    Sin índice en el código de barras, el escaneo con pistola va lento.

CREATE NONCLUSTERED INDEX IX_articulos_cod_barras
    ON dbo.articulos (cod_barras)
    INCLUDE (codigo_articulo, descripcion);
GO

CREATE NONCLUSTERED INDEX IX_articulos_codigo
    ON dbo.articulos (codigo_articulo)
    INCLUDE (descripcion, cod_barras);
GO


-- 3. EL USUARIO ---------------------------------------------------------------
--    Solo lectura, y solo sobre la vista. No sobre las tablas.
--    Aunque alguien reviente el servidor web, no puede escribir en el ERP
--    ni leer clientes, precios o facturación.

CREATE LOGIN etiquetas_ro
    WITH PASSWORD = 'CAMBIA-ESTA-CLAVE';
GO

USE dspges;
GO

CREATE USER etiquetas_ro FOR LOGIN etiquetas_ro;
GO

-- Nada de db_datareader: eso daría acceso a TODAS las tablas.
GRANT SELECT ON dbo.v_etiquetas_articulos TO etiquetas_ro;
GO

DENY INSERT, UPDATE, DELETE ON SCHEMA::dbo TO etiquetas_ro;
GO


-- 4. COMPROBACIÓN -------------------------------------------------------------
--    Ejecuta esto conectado COMO etiquetas_ro antes de dar por bueno el montaje.

--   Debe devolver filas:
SELECT TOP 5 * FROM dbo.v_etiquetas_articulos;

--   Debe fallar con permiso denegado:
--   SELECT TOP 5 * FROM dbo.articulos;
--   UPDATE dbo.articulos SET descripcion = 'x' WHERE 1 = 0;


-- 5. CONTROL DE CALIDAD DE LOS DATOS ------------------------------------------
--    Merece la pena pasar esto antes de conectar: son los artículos que
--    van a dar problemas al etiquetar.

--   Códigos de barras con longitud rara (ni EAN-13 ni GTIN-14):
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

--   Descripciones largas: por encima de unos 40 caracteres no caben
--   en las etiquetas pequeñas y habrá que recortarlas.
SELECT referencia, LEN(descripcion) AS largo, descripcion
FROM   dbo.v_etiquetas_articulos
WHERE  LEN(descripcion) > 40
ORDER  BY largo DESC;
