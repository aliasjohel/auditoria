# Control de Stock y Auditoría

Aplicación web para control de stock y auditorías físicas de inventario, pensada para trabajar desde celular o notebook.

## Funciones principales

- Login de acceso
- Carga manual de productos
- Importación de productos por CSV
- Escaneo por cámara
- Escaneo por pistola o ingreso manual de código
- Sonido y vibración al escanear
- Selección de pasillo y fila al momento del conteo
- Cambio rápido de fila
- Marcado de pasillos terminados
- Trabajo por equipos
- Exportación de conteos por equipo en JSON
- Central de control para importar varios equipos
- Comparación entre stock teórico y stock contado
- Resumen por producto, por equipo y por zona
- Buscador en la central
- Exportación de reporte en Excel
- Exportación de reporte en PDF

## Estructura del proyecto

- `index.html` → login
- `home.html` → panel principal
- `products.html` → carga e importación de productos
- `scan.html` → escaneo y conteo por zonas
- `history.html` → central de control
- `style.css` → estilos
- `app.js` → lógica general de la aplicación

## Cómo usar

### 1. Cargar productos
Desde la sección **Productos** se pueden:
- cargar manualmente
- importar desde CSV

Formato esperado del CSV:

```csv
codigo,nombre,stockTeorico
12345,Zapatilla Puma,10
67890,Remera Adidas,5