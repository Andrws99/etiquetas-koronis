# Contexto del proyecto — refactor del prototipo a Angular

> Documento de continuidad. Si vuelves a empezar la sesión, lee esto primero:
> recoge el estado actual, las decisiones tomadas, lo verificado y lo que queda.

---

## 1. Objetivo

Dividir `index.html` (1752 líneas, monolítico) en componentes manteniendo que
**todo funcione igual**, usando **Angular + TypeScript** en la carpeta `frontend/`.

Reglas del encargo:

- `index.html` de la raíz **no se toca**: es la referencia de comportamiento.
- `backend/` **no se toca** (`route.ts` y `vistas-erp.sql`).
- El backend futuro será Spring Boot (el `route.ts` actual es un borrador Next.js).

---

## 2. Estado actual: TAREAS COMPLETADAS ✅

| Paso | Estado |
|---|---|
| Scaffold Angular 22.2 en `frontend/` (sin router, vitest, strict) | ✅ |
| Motor portable en `core/` (barcode, compose, svg, zpl, raster, data) | ✅ |
| `EtiquetaStore` (signals) + `CatalogoService` (RxJS debounce+switchMap) | ✅ |
| Componentes `alert`, `stepper` | ✅ |
| `step-datos` (+ `article-search`, `logo-upload`) | ✅ |
| `step-tamano`, `step-comprobar`, `step-imprimir` | ✅ |
| `preview` (ts/html/css) con drag & drop y Alt+flechas | ✅ |
| `conexion` (ts/html/css) | ✅ |
| `app.*`, `styles.css` global, `index.html` | ✅ |
| Errores de compilación (llaves ICU, rutas de import, tipos) | ✅ |
| Tests: **28/28 en verde** | ✅ |
| Paridad CSS: **197/197** reglas del prototipo presentes | ✅ |
| Tablas de barras contrastadas 1:1 con `index.html` | ✅ |
| README actualizado (`frontend/`, árbol, pendientes) | ✅ |

### Verificación ejecutada

```bash
cd frontend
npx ng build        # ✅ 223 kB, sin avisos de presupuesto
npx tsc --noEmit -p tsconfig.app.json   # ✅
npx ng test         # ✅ 3 archivos, 28 tests
```

- `src/app/app.spec.ts` (6): creación, cabecera, stepper, cambio de paso,
  bloqueo de paso 2, etiqueta en la vista previa.
- `src/app/core/barcode/encode.spec.ts` (12): goldens EAN-13, ITF-14, Code 39,
  Code 128, dígito GTIN, `normalize`, `checkOk`.
- `src/app/core/label/label.spec.ts` (10): `compose` (orden, giro, escala,
  avisos), `svgLabel`, `zpl`.
- Tablas (`EAN_L/G/R/P`, `ITF_P`, `C128`, `C39`) comparadas automáticamente
  contra `index.html`: idénticas.
- Paridad CSS: script propio que extrae los 197 selectores del `<style>` del
  prototipo y los busca en los `.css` del proyecto → **0 faltantes**
  (contando los renombrados `#labelBox→.labelBox`, `#hits→.hits`,
  `#dropline→.dropline`).
- `git status`: **solo `frontend/` es nuevo**; `index.html`, `backend/` y
  `README.md` intactos.

---

## 3. Decisiones tomadas (y por qué)

- **Angular última estable** (v22.2) instalado con
  `npx -y @angular/cli@latest new frontend --directory frontend --style=css
  --ssr=false --skip-git --defaults --package-manager=npm`.
- **App en `frontend/`** (hermana de `backend/`).
- **Estilos encapsulados por componente** (equivale a CSS Modules) +
  `src/styles.css` para tokens, modo oscuro y primitivas.
- **Convenciones Angular 22**: archivos **sin sufijo `.component`**
  (`app.ts/app.html/app.css`), `ng test` = **vitest + jsdom**, strict TS.
- **Sin router**: se borró `app.routes.ts`; el paso se cambia con `@switch` en
  `app.html`.
- **Motor portable** (`src/app/core/**`) sin imports de Angular:
  `compose(st, scale)`, `svgLabel(L, zoom, dither)`, `zpl(st)` reciben el estado
  como parámetro (el README pedía `compose()` portable).
- **Signals** en `EtiquetaStore` sustituyen a `st` + `render()`.
- **Búsqueda** con `debounceTime(220) + switchMap` (RxJS) en vez de
  `setTimeout` + `AbortController`.
- **Delegación global de eventos → handlers** por componente.
- **`textW`/canvas defensivos** (`mCanvasFallado`): jsdom no da contexto 2D,
  así que en tests el motor no revienta.
- **Elegir grupo** (`EtiquetaStore.elegirGrupo(id, sizes)`) selecciona la medida
  mayor del grupo si la actual no está en él (equivale a `data-act="grupo"`).
- **Presupuesto** `anyComponentStyle` en `angular.json`: 4kB warn / 8kB error;
  subirlo si un CSS de componente pasa de 8kB.

---

## 4. Reparto de CSS

- **Global (`src/styles.css`)**: tokens, dark mode, `.panel*`,
  `.field/.grid2/.hint`, `.alert*/.alerts/.fixes`, `.btn*/.nav`,
  `.summary`, `.routes`, `.route*`, `.codewrap/pre`, `.row-inline`,
  `input[type=range]`, `body.dragging-on`, `*` reduced-motion, y el
  `display:block` de los custom elements.
- **Componente**: bloques específicos — header, stepper, stage/hit,
  sizes/rollo, src/results, imgsec, conn, foot.

---

## 5. Errores que aparecieron y cómo se resolvieron (no volver a tropezar)

1. **NG5002 "Unexpected character EOF" / "Invalid ICU message"** en
   `conexion.html` → había `{` literales en los `<pre>` de rutas y JSON.
   Solución: `&#123;` / `&#125;` (Angular interpreta `{...}` como ICU).
2. **TS2307 Cannot find module** → profundidad de `..` mal contada por archivo:
   - `features/preview`, `features/conexion`, `shared/stepper` → 2 niveles (`../../`).
   - `features/pasos/<step>/` → 3 niveles (`../../../`).
   - `features/pasos/step-datos/<sub>/` → 4 niveles (`../../../../`).
3. **TS4111 `noPropertyAccessFromIndexSignature`** en `normaliza.ts` → acceso
   por índice (`a['ref']`).
4. **TS2322 en `conexion.ts`** → `ORIGEN.modo` es `'demo'|'api'`: asignar con
   rama (`if(clave==='modo') ORIGEN.modo = valor as 'demo'|'api'`), no con
   `ORIGEN[clave]`.
5. **`DomSanitizer` no está en `@angular/core`** en Angular 22 → importar de
   `@angular/platform-browser`.
6. **El `[innerHTML]` del SVG se sanearía** → usar
   `this.dom.bypassSecurityTrustHtml(svgLabel(...))` en `preview.ts` (nosotros
   generamos el SVG, ya escapamos el texto con `esc()`).
7. **Tests que dependen de canvas**: en jsdom `textW` devuelve 0, así que
   `wrap()` nunca corta → no testear el issue `desc`; usar el issue `bcw`
   (depende solo de mm) con `sizeId:'10x30'`.
8. **dither sin logo no cambia el SVG** → el test solo puede comprobar que sigue
   siendo SVG válido y que con logo sin canvas conserva el `href`.
9. **`copiar($event)`** llega como `PointerEvent`: firmar `copiar(e: Event)` y
   hacer `e.currentTarget as HTMLButtonElement`.

---

## 6. PENDIENTE (próximos pasos, en orden)

1. **Comprobación visual en navegador**: `cd frontend && npm start`
   → http://localhost:4200 y contrastar con `index.html` (abrir ambos):
   - 4 pasos, validación del paso 1, stepper bloqueado/desbloqueado.
   - Vista previa: zoom, zonas `.hit` arrastrables, línea de inserción,
     botón "Orden original" solo si se movió algo.
   - Dither on/off (solo visible con logo), panel conexión plegable con estado.
   - Dark mode (`prefers-color-scheme`), responsive a 560/620 px.
   - **Nota**: en el prototipo, al re-renderizar el paso 4 se perdía el foco del
     input de copias (bug original); con Angular eso **queda arreglado** —
     documentarlo si el cliente lo echa de menos.
2. **Smoke test en browser**: buscar artículo de `SEED_DEMO`, cambiar de
   plantilla, girar etiqueta, imprimir → ZPL en pantalla.
3. **Revisar el README** si se toca algo más (ya actualizado con `frontend/`).
4. **Commit** (solo si lo pide el usuario): añadir `frontend/` completo.
   Antes: `git status`, `git diff` para confirmar que `index.html`/`backend/`
   siguen intactos.
5. **Backend Spring Boot**: sustituir `backend/route.ts` borrador;
   rutas `GET {base}/articulos?q=&limit=8` y `GET {base}/articulos/{ref}`
   (documentadas también en `conexion.html`).

---

## 7. Mapa rápido de ficheros

```
frontend/src/app/
  app.ts|html|css            shell: header, stepper, @switch de pasos, previewCol, conexion
  core/types.ts              Estado, Articulo, Simbologia, CampoOrden, Issue, Logo, Tamanyo, Grupo
  core/barcode/symbols.ts    SYMS, C39_CHARS, SIMBOLOGIAS
  core/barcode/tables.ts     EAN_L/G/R/P, ITF_P, C128, C39   ← no cambiar sin verificar con pistola
  core/barcode/encode.ts     gtinCheck, normalize, checkOk, widthsToBits, ean13/itf/128/39, barcode
  core/data/origen.ts        ORIGEN  ← único sitio para conectar el ERP
  core/data/mapa-campos.ts   MAPA_CAMPOS (nombres Cosmos → campos)
  core/data/seed-demo.ts     SEED_DEMO
  core/data/normaliza.ts     normalizaArticulo
  core/data/erp.ts           ERP.buscar / ERP.porRef / pedir (fetch + Bearer)
  core/label/sizes.ts        SIZES, GRUPOS, STEPS, tamanyoDe, grupoDe
  core/label/compose.ts      compose(), autoFit(), wrap(), textW()  ← el motor
  core/label/raster.ts       rasterize() 1 bit Floyd–Steinberg, toGFA
  core/label/svg.ts          svgLabel()
  core/label/zpl.ts          zpl()
  core/label/nombres.ts      NOMBRE (nombre legible por bloque)
  state/etiqueta.store.ts    señales, ORDEN_INICIAL, step1Valid, pistaCodigo, etiqueta…
  state/catalogo.service.ts  búsqueda RxJS
  shared/alert/ shared/toast.ts shared/stepper/
  features/pasos/step-*      los 4 pasos
  features/preview/          vista previa + drag & drop
  features/conexion/         panel "Conexión con el ERP"
```

---

## 8. Comandos

```bash
cd frontend
npm start        # dev server (ng serve)
npm run build    # producción
npm test         # vitest — debe dar 28/28
```
