# Punto Family — React + Node.js + SQL Server

Migración de tu POS "Punto Family" (antes PHP/MySQL) a una arquitectura moderna:

- **frontend/** — React 18 + Vite + Tailwind (nuevo diseño, distinto al original)
- **backend/** — Node.js + Express + SQL Server (vía `mssql`), JWT en vez de sesiones PHP
- **backend/sql/schema.sql** — Esquema completo para SQL Server
- **backend/migration/** — Guía y script para migrar tus datos desde MySQL

## 1. Base de datos

1. Abre SSMS conectado a tu instancia local.
2. Ejecuta `backend/sql/schema.sql` (crea la base `PuntoFamilyDB` y todas las tablas) — **solo si es una instalación nueva**.
3. Si ya tenías la base creada de antes y solo quieres agregar el módulo de **Corte de Caja**, corre en su lugar:
   `backend/sql/updates/001_corte_caja.sql` (crea únicamente la tabla `cortes_caja`, sin tocar tus datos existentes).
4. Sigue `backend/migration/README.md` para pasar tus datos de MySQL a SQL Server
   (exportas cada tabla como CSV y corres `npm run migrate:import`).

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env con los datos de tu SQL Server local (usuario, password, etc.)
npm run migrate:import      # si ya tienes tus CSVs listos
npm run seed:admin -- "Tu Nombre" "tu-correo@ejemplo.com" "PasswordSegura123!"
npm run dev                 # corre en http://localhost:4000
```

## 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # corre en http://localhost:5173
```

El frontend usa un proxy de Vite hacia `http://localhost:4000` (configurado en
`vite.config.js`), así que no necesitas configurar CORS manualmente en desarrollo.

## 4. Iniciar sesión

Entra a `http://localhost:5173/login` con el usuario que creaste con
`npm run seed:admin` (o el que hayas migrado desde MySQL).

## Módulos incluidos

Dashboard, Punto de venta (POS), Inventario (productos + tallas + imágenes +
conversión USD→MXN de costos), Categorías (jerárquicas), Clientes, Crédito
(deudas, abonos e historial de abonos), Devoluciones, Gastos, Promociones,
Reportes, Corte de caja (por día/turno/semana/mes, con historial y PDF),
Inventario físico (conteo y ajustes), Historial de ventas, Usuarios (solo
admin) y Perfil. Solo hay dos roles: `admin` (acceso total) y `vendedor`
(todo excepto administrar usuarios).

## Notas técnicas

- Autenticación: JWT (`backend/src/middleware/auth.js`), permisos por rol en
  `backend/src/middleware/roles.js` (equivalente a `ROL_PERMISOS` de tu
  `config.php` original).
- Imágenes de producto se guardan en `backend/uploads/` y se sirven en
  `/uploads/<archivo>`.
- Ventas y abonos usan transacciones SQL (`sql.Transaction`) para mantener
  consistencia de stock y saldos.
- El diseño del frontend es nuevo (paleta tinta/pergamino/cobre), pensado para
  verse profesional en escritorio y tablet, con Tailwind + Recharts.
