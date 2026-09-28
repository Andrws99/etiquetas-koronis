# Plataforma de Etiquetas

Prototipo funcional de una plataforma web para generar e imprimir etiquetas de
producto en almacén. Independiente del ERP, pero preparada para conectarse a él.

**Estado: prototipo validado.** Toda la lógica de composición, codificación de
códigos de barras y generación de ZPL es real y funciona. Lo que falta es el
backend y la impresión efectiva.

---

## Cómo verlo

Abre `index.html` en el navegador. No hay que compilar ni instalar nada: es un
único fichero sin dependencias externas más allá de las fuentes de Google.

---

## Qué hace

Flujo de 4 pasos pensado para un operario de almacén con tablet o PC:

1. **Rellenar datos** — busca el artículo en el catálogo (o escanea su código con
   pistola) y los campos llegan rellenos y bloqueados. También se puede rellenar
   a mano.
2. **Elegir plantilla** — tres en vez de seis medidas: Pequeña (10×30, 20×30,
   30×30), Estándar (30×40) y Caja (60×80, 100×150). La misma plantilla se
   recompone sola al rollo que haya cargado.
3. **Previsualizar** — comprueba que el contenido cabe y avisa de lo que no.
4. **Imprimir** — PDF para cualquier impresora, o ZPL directo a térmica.

### Lo que está resuelto de verdad

- **Códigos de barras reales**, codificados a mano y escaneables: EAN-13
  (con tabla de paridad), ITF-14 (intercalado 2 de 5), Code 128 (subconjuntos
  B y C con dígito de control) y Code 39 (ratio 2:1, con asteriscos de inicio
  y fin).
- **Dígito de control** GTIN calculado y validado al teclear.
- **Motor de composición en milímetros**: márgenes, saltos de línea, tamaños de
  fuente y ancho de módulo se calculan sobre medidas físicas, no píxeles. Lo que
  se ve en pantalla es lo que sale por la impresora.
- **Validación de encaje** con reglas de la norma: un EAN-13 necesita unos 30 mm
  de ancho para que lo lea una pistola, las barras no bajan de 8 mm de alto, el
  texto no baja de 4,5 pt. Si no cabe, lo dice y ofrece cómo arreglarlo.
- **Logo de marca tramado a 1 bit** (Floyd–Steinberg) porque una térmica no
  imprime grises, con vista previa de cómo quedará realmente.
- **Reordenar campos arrastrando** sobre la previsualización, con soporte táctil
  y de teclado (Alt + flechas).
- **Generación de ZPL** a 203 dpi, incluidas las imágenes como comandos `^GFA`.

---

## Estructura

```
index.html                  La aplicación entera
backend/route.ts            Endpoint Next.js de artículos (pendiente de conectar)
backend/vistas-erp.sql      Vista, índices y usuario de solo lectura para el ERP
```

### Puntos del código que importan

Dentro de `index.html`, por orden de aparición:

| Zona | Qué hace |
|---|---|
| `ORIGEN` | **El único sitio que hay que tocar para conectar el ERP.** |
| `MAPA_CAMPOS` | Traduce nombres de columna del ERP a campos internos. |
| `SEED_DEMO` | Lista local de relleno. Se borra al conectar el backend. |
| `ERP` | La aplicación solo pide artículos aquí. Nada más sabe de dónde salen. |
| `GRUPOS` | Las tres plantillas y las medidas que cubre cada una. |
| `rasterize()` | Convierte el logo a 1 bit con tramado. |
| `compose()` | El motor. Calcula toda la etiqueta en milímetros. |
| `svgLabel()` | Dibuja. |
| `zpl()` | Genera el comando para la impresora térmica. |

---

## Conectar el ERP

La plataforma habla con un solo objeto. Para conectarla:

```js
const ORIGEN = {
  modo: "api",
  base: "https://etiquetas.tuservidor.com/api",
  token: ""
};
```

El backend tiene que servir dos rutas:

```
GET  {base}/articulos?q=<texto>&limit=8   → [ {...}, {...} ]
GET  {base}/articulos/<referencia>        → { ... }
```

Devolviendo artículos con esta forma:

```json
{
  "ref":   "500600",
  "desc":  "PLUMERO EXTENSIBLE PREMIUM",
  "code":  "8436025811529",
  "sym":   "ean13",
  "marca": "newmop",
  "uds":   "12",
  "extra": "(INCLUYE ASA DE CUERDA)"
}
```

Solo `ref`, `desc` y `code` son obligatorios. Si el ERP no manda `sym`, se deduce
por la longitud del código. Si las columnas se llaman de otra forma, se añaden
los nombres reales a `MAPA_CAMPOS` y no hay que tocar nada más.

En la propia aplicación, el desplegable **"Conexión con el ERP"** del final
permite cambiar el origen y probar sin recompilar.

### Reglas de la conexión

- **El ERP es de solo lectura.** Nunca se le escribe.
- **La plataforma no ataca las tablas**, solo una vista (`backend/vistas-erp.sql`).
- **Los artículos se cachean.** Si se cae la VPN, el almacén tiene que poder
  seguir imprimiendo.

### Qué dato vive dónde

| Dato | Dueño |
|---|---|
| Referencia, descripción, EAN, marca, unidades por caja | ERP (solo lectura) |
| Plantilla, orden de campos, tamaño, logo, imagen | Plataforma |
| Lote, copias, texto puntual | Cada impresión |

---

## Pendiente

- [ ] Motor y credenciales del ERP → ajustar `backend/vistas-erp.sql` y el driver
      de `backend/route.ts`.
- [ ] Pasar el prototipo a Next.js manteniendo `compose()` tal cual: es la pieza
      con más trabajo dentro y es portable sin cambios.
- [ ] Generación real del PDF (`@react-pdf/renderer` o `pdf-lib`).
- [ ] Envío a impresora térmica. **Ojo:** una app desplegada en Vercel no puede
      hablar con una impresora USB ni con una IP de la red local. Hace falta un
      agente local (QZ Tray, Zebra Browser Print) o desplegar en la red del
      cliente.
- [ ] Guardar plantillas por artículo.
- [ ] Usuarios y roles: administrador configura, operario solo imprime.
- [ ] Impresión por pedido o albarán completo, no etiqueta a etiqueta.
- [ ] Historial y reimpresión.

## Decisiones tomadas

- **Next.js** en vez de Java + Jaspersoft: mucho menos peso para un caso de uso
  simple.
- **Reordenar campos, no posicionarlos libremente.** La posición libre obliga a
  guías de alineación, control de solapamientos y redimensionado, y rompe el
  ajuste automático. Se deja para una fase 2 si el cliente la pide.
- **Los tamaños se leen como ancho × alto.** Hay un botón para girar la etiqueta.
  PENDIENTE DE CONFIRMAR con la lista de formatos del cliente: podrían venir
  escritos como alto × ancho.
- **Solo logo de marca, sin imagen de producto.** Se quitó por simplificar.

## Avisos para quien siga esto

- Los códigos de barras en pantalla son **escaneables de verdad**. Si cambias el
  cálculo del ancho de módulo, compruébalo con una pistola antes de dar por buena
  una serie.
- En térmica, una foto sin tramar sale como una mancha. El tramado no es
  decorativo.
- Un EAN-13 en una etiqueta de menos de 30 mm de ancho no se lee. La aplicación
  avisa, pero conviene saberlo antes de prometer tamaños al cliente.
