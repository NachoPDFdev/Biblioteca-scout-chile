# Biblioteca Scout Chilena Rescatada

Sitio estático para publicar el inventario de la carpeta `SCOUT` y descargar cada PDF desde una URL pública de R2.

## Estructura

- `index.html`: interfaz principal
- `styles.css`: estilos
- `app.js`: buscador, filtros y armado de links
- `config.js`: URL pública fija del storage
- `inventory.json`: inventario generado desde la carpeta local
- `generate_inventory.py`: regenera `inventory.json` desde una carpeta fuente

## Regenerar inventario

```bash
python3 generate_inventory.py "/mnt/c/Users/Usuario/Downloads/SCOUT" "./inventory.json"
```

## Configuracion previa

Edita `config.js` y cambia:

`https://REEMPLAZAR-CON-TU-URL-PUBLICA/SCOUT`

por la URL real publica de tu bucket o dominio R2.

Ejemplo:

`https://archivos.leviatanwow.com/SCOUT`

## Cómo publicarlo en Vercel

1. Sube los PDFs a un storage público.
2. Mantén la estructura de carpetas:
   - `DIRIGENTES/...`
   - `GUIAS/...`
   - `TROPA/...`
   - etc.
3. Edita `config.js` con tu URL pública real.
4. Sube esta carpeta a Vercel como proyecto estático.

## Flujo recomendado con Cloudflare R2 + Vercel

1. En R2, sube la carpeta `SCOUT` completa.
2. Verifica que el bucket o dominio público permita abrir archivos con URLs como:
   - `https://tu-dominio-r2/SCOUT/GUIAS/archivo.pdf`
3. Sube esta carpeta `scout-biblioteca` a GitHub.
4. En Vercel:
   - `Add New...`
   - `Project`
   - importa el repositorio
   - framework: `Other`
   - root directory: `.` si el repo contiene solo este proyecto
5. Haz deploy.
6. Abre la web desplegada y prueba que los botones `Descargar PDF` abran archivos reales.

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
