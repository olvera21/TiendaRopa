# Migración de datos: MySQL → SQL Server

Tu base actual (`tienda_db` en MySQL) se migra a `PuntoFamilyDB` en SQL Server
en dos pasos: **exportar** desde MySQL/phpMyAdmin y **cargar** con el script
de este backend. No se necesita conexión en vivo a tu MySQL.

## Paso 0 — Crear el esquema en SQL Server

Abre SSMS, conéctate a tu instancia local, y ejecuta el archivo:

```
backend/sql/schema.sql
```

Esto crea la base `PuntoFamilyDB` y todas las tablas vacías.

## Paso 1 — Exportar cada tabla de MySQL a CSV

Con phpMyAdmin (o MySQL Workbench):

1. Entra a tu base `tienda_db`.
2. Por cada tabla, ve a la pestaña **Exportar**.
3. Formato: **CSV**.
4. Marca la opción para incluir los **nombres de columna en la primera fila**.
5. En "Reemplazar NULL por", déjalo en blanco (vacío), NO escribas la palabra NULL.
6. Guarda el archivo con el **nombre exacto de la tabla**, por ejemplo:
   `usuarios.csv`, `categorias.csv`, `productos.csv`, `tallas.csv`,
   `clientes.csv`, `ventas.csv`, `ventas_detalle.csv`, `pagos.csv`,
   `gastos.csv`, `devoluciones.csv`, `devoluciones_detalle.csv`,
   `promociones.csv`, `inventario_movimientos.csv`.
7. Copia todos esos archivos a la carpeta:

```
backend/migration/csv/
```

> Tip: si tu tabla `categorias` en MySQL todavía tiene la columna `tipo`
> como único dato de departamento (sin `parent_id`), exporta igual — el
> esquema nuevo ya tiene ambas columnas (`tipo` y `parent_id`), así que no
> se pierde nada; simplemente tus categorías existentes quedarán como
> categorías "raíz" y podrás organizarías en subcategorías después desde
> el módulo de Categorías.

## Paso 2 — Configurar la conexión

En `backend/.env` (copia `.env.example`), define los datos de tu SQL Server
local (los mismos que usas para entrar por SSMS):

```
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=PuntoFamilyDB
DB_USER=sa
DB_PASSWORD=TuPasswordAqui
```

Si te conectas con autenticación de Windows en vez de usuario `sa`, avísame
y ajustamos la configuración de `mssql` para usar `msnodesqlv8`.

## Paso 3 — Ejecutar la importación

```bash
cd backend
npm install
npm run migrate:import
```

El script:

- Lee cada CSV de `backend/migration/csv/`.
- Inserta las filas **respetando el orden de dependencias** (usuarios →
  categorías → productos → tallas → clientes → ventas → detalle → pagos →
  gastos → devoluciones → promociones → movimientos de inventario).
- Activa `IDENTITY_INSERT` para conservar los mismos IDs que tenías en
  MySQL, así ninguna relación (categoria_id, cliente_id, venta_id, etc.)
  se rompe.
- Si una tabla no tiene su CSV, simplemente se omite (no truena el script).
- Al final imprime cuántas filas se importaron por tabla y cualquier error
  fila por fila (por ejemplo, si hay un `codigo_barras` duplicado).

## Paso 4 — Crear tu usuario administrador

Si no migraste la tabla `usuarios` (o quieres un acceso nuevo), crea uno:

```bash
npm run seed:admin -- "Tu Nombre" "tu-correo@ejemplo.com" "UnaPasswordSegura123!"
```

## Notas sobre tipos de datos

| MySQL                          | SQL Server                     | Nota |
|---------------------------------|----------------------------------|------|
| `AUTO_INCREMENT`                | `IDENTITY(1,1)`                  | Ya está en `schema.sql` |
| `TINYINT(1)` (booleanos)        | `BIT`                            | El CSV debe traer `0`/`1` |
| `ENUM(...)`                     | `NVARCHAR`                       | Se valida en el backend, no en la BD |
| `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `DATETIME2 DEFAULT SYSDATETIME()` | Ya está en `schema.sql` |
| `DATE`                          | `DATE`                           | Sin cambios |

Si tu export de MySQL usa `1`/`0` para las columnas `activo`, no necesitas
tocar nada. Si en cambio exportó `NULL` para algún booleano, el script lo
interpretará como `0`.
