# Biblioteca Scout Chilena Rescatada

Sitio para publicar la carpeta `SCOUT` desde Cloudflare R2, separando documentos PDF y material gráfico como insignias, logos e imágenes.

## Estructura

- `index.html`: interfaz principal
- `styles.css`: estilos
- `app.js`: buscador, filtros, secciones y tarjetas visuales
- `config.js`: URL pública fija del storage
- `api/inventory.js`: lista R2 en tiempo real desde Vercel
- `inventory.json`: fallback estático si la API no responde
- `generate_inventory.py`: regenera `inventory.json` desde una carpeta fuente
- `archives/boyscouts-cl/`: espejo estático local de `https://boyscouts.cl/c22/`

## Respaldo de boyscouts.cl

El espejo local quedó integrado al proyecto:

- acceso resumido: `./archives/boyscouts-cl/index.html`
- portada espejada: `./archives/boyscouts-cl/boyscouts.cl/c22/index.html`

Comando usado para capturarlo:

```bash
wget --mirror \
  --page-requisites \
  --convert-links \
  --adjust-extension \
  --no-parent \
  --directory-prefix ./archives/boyscouts-cl \
  https://boyscouts.cl/c22/
```

Notas:

- `wget` también trae endpoints auxiliares de WordPress como `feed`, `rest_route` y `xmlrpc`.
- El sitio original contiene al menos un link mal formado, por lo que puede aparecer alguna ruta con nombre extraño dentro del espejo.
- Para refrescar el respaldo, vuelve a ejecutar el comando dentro de esta carpeta.

## Despliegue recomendado

La web ahora intenta cargar primero `./api/inventory`. Si la API de Vercel tiene credenciales R2 válidas:

- los archivos nuevos en R2 aparecen sin regenerar `inventory.json`
- `Documentos` y `Material gráfico` se separan automáticamente
- las imágenes muestran vista previa

Si la API falla, la web usa `inventory.json` como respaldo.

## Variables de entorno en Vercel

Configura estas variables en el proyecto:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PREFIX`

Ejemplo:

- `R2_BUCKET_NAME=biblioteca-scout-chile`
- `R2_PREFIX=SCOUT`

## URL pública de lectura

`config.js` debe apuntar a la base pública del bucket bajo la carpeta `SCOUT`.

Ejemplo:

`https://pub-15f0e572a1844899ade258a6cac7e7b9.r2.dev/SCOUT`

## Regenerar inventario manualmente

```bash
python3 generate_inventory.py "/mnt/c/Users/Usuario/Downloads/SCOUT" "./inventory.json"
```

El script ahora incluye:

- PDFs
- PNG
- JPG / JPEG
- WEBP
- SVG
- GIF
- AVIF

## Estructura sugerida en R2

- `SCOUT/DIRIGENTES/...pdf`
- `SCOUT/GUIAS/...pdf`
- `SCOUT/TROPA/...pdf`
- `SCOUT/MATERIAL GRAFICO/INSIGNIAS/...png`
- `SCOUT/MATERIAL GRAFICO/LOGOS/...png`

## Si el repo contiene más cosas

En Vercel, cambia `Root Directory` a la carpeta del proyecto:

`scout-biblioteca`

## URL base esperada

Si tu bucket público expone:

`https://archivos.ejemplo.com/SCOUT/DIRIGENTES/archivo.pdf`

entonces en la web debes ingresar:

`https://archivos.ejemplo.com/SCOUT`

## Recomendación de almacenamiento

- Producción: Cloudflare R2
- Alternativa: Vercel Blob
- Backup: Drive/OneDrive y copia offline
