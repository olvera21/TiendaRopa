-- ================================================================
-- Punto Family — Esquema SQL Server (T-SQL)
-- Ejecutar en SQL Server Management Studio (SSMS), en una BD nueva.
-- ================================================================

IF DB_ID('PuntoFamilyDB') IS NULL
BEGIN
    CREATE DATABASE PuntoFamilyDB;
END
GO

USE PuntoFamilyDB;
GO

-- ----------------------------------------------------------------
-- USUARIOS
-- ----------------------------------------------------------------
CREATE TABLE usuarios (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    nombre         NVARCHAR(150)   NOT NULL,
    email          NVARCHAR(150)   NOT NULL UNIQUE,
    password       NVARCHAR(255)   NOT NULL,   -- hash bcrypt
    rol            NVARCHAR(20)    NOT NULL DEFAULT 'vendedor', -- admin | vendedor | almacen
    activo         BIT             NOT NULL DEFAULT 1,
    ultimo_acceso  DATETIME2       NULL,
    created_at     DATETIME2       NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ----------------------------------------------------------------
-- CATEGORIAS (jerárquicas: padre/hijo)
-- ----------------------------------------------------------------
CREATE TABLE categorias (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    parent_id      INT NULL,
    nombre         NVARCHAR(150) NOT NULL,
    descripcion    NVARCHAR(500) NULL,
    tipo           NVARCHAR(20)  NULL DEFAULT 'ropa', -- departamento raíz (por ahora solo "ropa")
    activo         BIT           NOT NULL DEFAULT 1,
    created_at     DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categorias(id) ON DELETE NO ACTION
);
CREATE INDEX idx_categorias_parent ON categorias(parent_id);
GO

-- ----------------------------------------------------------------
-- PRODUCTOS
-- ----------------------------------------------------------------
CREATE TABLE productos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    sku             NVARCHAR(50)  NOT NULL UNIQUE,
    codigo_barras   NVARCHAR(50)  NULL UNIQUE,
    nombre          NVARCHAR(200) NOT NULL,
    descripcion     NVARCHAR(1000) NULL,
    categoria_id    INT NULL,
    departamento    NVARCHAR(20)  NOT NULL DEFAULT 'ropa', -- por ahora solo "ropa"
    marca           NVARCHAR(100) NULL,
    modelo          NVARCHAR(100) NULL,
    color           NVARCHAR(80)  NULL,
    material        NVARCHAR(80)  NULL,
    costo_unitario  DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_publico  DECIMAL(10,2) NOT NULL DEFAULT 0,
    aplica_iva      BIT NOT NULL DEFAULT 0,
    iva_porcentaje  DECIMAL(5,2) NOT NULL DEFAULT 16,
    merma_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0,
    imagen          NVARCHAR(255) NULL,
    activo          BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_prod_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
);
CREATE INDEX idx_productos_departamento ON productos(departamento);
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
GO

-- ----------------------------------------------------------------
-- TALLAS (variantes/stock por producto)
-- ----------------------------------------------------------------
CREATE TABLE tallas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    producto_id     INT NOT NULL,
    talla           NVARCHAR(30) NOT NULL,
    stock           INT NOT NULL DEFAULT 0,
    stock_minimo    INT NOT NULL DEFAULT 2,
    CONSTRAINT fk_talla_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);
CREATE INDEX idx_tallas_producto ON tallas(producto_id);
GO

-- ----------------------------------------------------------------
-- INVENTARIO_MOVIMIENTOS
-- ----------------------------------------------------------------
CREATE TABLE inventario_movimientos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    producto_id     INT NOT NULL,
    talla_id        INT NULL,
    tipo            NVARCHAR(20) NOT NULL, -- entrada | salida | ajuste
    cantidad        INT NOT NULL DEFAULT 0,
    motivo          NVARCHAR(255) NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_mov_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    CONSTRAINT fk_mov_talla FOREIGN KEY (talla_id) REFERENCES tallas(id) ON DELETE NO ACTION
);
GO

-- ----------------------------------------------------------------
-- CLIENTES
-- ----------------------------------------------------------------
CREATE TABLE clientes (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(100) NOT NULL,
    apellido        NVARCHAR(100) NULL,
    telefono        NVARCHAR(30)  NULL,
    email           NVARCHAR(150) NULL,
    calle           NVARCHAR(200) NULL,
    colonia         NVARCHAR(150) NULL,
    ciudad          NVARCHAR(100) NULL,
    estado          NVARCHAR(100) NULL,
    cp              NVARCHAR(15)  NULL,
    rfc             NVARCHAR(20)  NULL,
    saldo_deuda     DECIMAL(10,2) NOT NULL DEFAULT 0,
    limite_credito  DECIMAL(10,2) NOT NULL DEFAULT 0,
    notas           NVARCHAR(1000) NULL,
    activo          BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ----------------------------------------------------------------
-- VENTAS (incluye ya los campos de pago a meses)
-- ----------------------------------------------------------------
CREATE TABLE ventas (
    id                     INT IDENTITY(1,1) PRIMARY KEY,
    folio                  NVARCHAR(30)  NOT NULL UNIQUE,
    cliente_id             INT NULL,
    tipo_venta             NVARCHAR(20)  NOT NULL DEFAULT 'contado', -- contado | credito | a_meses
    forma_pago             NVARCHAR(20)  NOT NULL DEFAULT 'efectivo',
    subtotal               DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento_monto        DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento_porcentaje   DECIMAL(5,2)  NOT NULL DEFAULT 0,
    total                  DECIMAL(10,2) NOT NULL DEFAULT 0,
    monto_pagado           DECIMAL(10,2) NOT NULL DEFAULT 0,
    saldo_pendiente        DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado                 NVARCHAR(20)  NOT NULL DEFAULT 'pagada', -- pagada|pendiente|credito|a_meses|cancelada|devuelta
    notas                  NVARCHAR(500) NULL,
    usuario_id             INT NULL,
    num_meses              INT NOT NULL DEFAULT 0,
    tasa_interes           DECIMAL(5,2)  NOT NULL DEFAULT 0,
    enganche               DECIMAL(10,2) NOT NULL DEFAULT 0,
    cuota_mensual          DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at             DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_venta_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE NO ACTION,
    CONSTRAINT fk_venta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE NO ACTION
);
CREATE INDEX idx_ventas_tipo ON ventas(tipo_venta);
CREATE INDEX idx_ventas_meses ON ventas(num_meses);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas(created_at);
GO

-- ----------------------------------------------------------------
-- VENTAS_DETALLE
-- ----------------------------------------------------------------
CREATE TABLE ventas_detalle (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    venta_id        INT NOT NULL,
    producto_id     INT NULL,
    talla_id        INT NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    costo_unitario  DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_vd_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT fk_vd_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE NO ACTION,
    CONSTRAINT fk_vd_talla FOREIGN KEY (talla_id) REFERENCES tallas(id) ON DELETE NO ACTION
);
CREATE INDEX idx_vd_venta ON ventas_detalle(venta_id);
GO

-- ----------------------------------------------------------------
-- PAGOS (abonos a crédito)
-- ----------------------------------------------------------------
CREATE TABLE pagos (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    venta_id        INT NOT NULL,
    cliente_id      INT NULL,
    monto           DECIMAL(10,2) NOT NULL DEFAULT 0,
    forma_pago      NVARCHAR(20)  NOT NULL DEFAULT 'efectivo',
    referencia      NVARCHAR(100) NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_pago_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT fk_pago_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE NO ACTION
);
GO

-- ----------------------------------------------------------------
-- GASTOS
-- ----------------------------------------------------------------
CREATE TABLE gastos (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    concepto    NVARCHAR(255) NOT NULL,
    monto       DECIMAL(10,2) NOT NULL DEFAULT 0,
    categoria   NVARCHAR(80)  NOT NULL DEFAULT 'general',
    forma_pago  NVARCHAR(40)  NOT NULL DEFAULT 'efectivo',
    fecha       DATE          NOT NULL,
    notas       NVARCHAR(1000) NULL,
    proveedor   NVARCHAR(150) NULL,
    usuario_id  INT NULL,
    created_at  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_gasto_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX idx_gastos_fecha ON gastos(fecha);
CREATE INDEX idx_gastos_cat ON gastos(categoria);
GO

-- ----------------------------------------------------------------
-- DEVOLUCIONES / DEVOLUCIONES_DETALLE
-- ----------------------------------------------------------------
CREATE TABLE devoluciones (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    venta_id         INT NOT NULL,
    motivo           NVARCHAR(255) NULL,
    tipo_devolucion  NVARCHAR(20) NOT NULL DEFAULT 'reembolso', -- reembolso|cambio|nota_credito
    monto_total      DECIMAL(10,2) NOT NULL DEFAULT 0,
    notas            NVARCHAR(1000) NULL,
    usuario_id       INT NULL,
    estado           NVARCHAR(20) NOT NULL DEFAULT 'pendiente', -- pendiente|aprobada|rechazada
    created_at       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_dev_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT fk_dev_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE devoluciones_detalle (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    devolucion_id   INT NOT NULL,
    producto_id     INT NULL,
    talla_id        INT NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_devd_dev FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id) ON DELETE CASCADE
);
GO

-- ----------------------------------------------------------------
-- PROMOCIONES
-- ----------------------------------------------------------------
CREATE TABLE promociones (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    nombre          NVARCHAR(150) NOT NULL,
    codigo          NVARCHAR(40)  NULL UNIQUE,
    tipo            NVARCHAR(20)  NOT NULL DEFAULT 'porcentaje', -- porcentaje | monto
    valor           DECIMAL(10,2) NOT NULL DEFAULT 0,
    departamento    NVARCHAR(20)  NULL,
    categoria_id    INT NULL,
    producto_id     INT NULL,
    talla_id        INT NULL,
    fecha_inicio    DATE NULL,
    fecha_fin       DATE NULL,
    activo          BIT NOT NULL DEFAULT 1,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_promo_cat FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE NO ACTION,
    CONSTRAINT fk_promo_prod FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE NO ACTION,
    CONSTRAINT fk_promo_talla FOREIGN KEY (talla_id) REFERENCES tallas(id) ON DELETE NO ACTION
);
GO

-- ----------------------------------------------------------------
-- CORTES DE CAJA
-- ----------------------------------------------------------------
CREATE TABLE cortes_caja (
    id                    INT IDENTITY(1,1) PRIMARY KEY,
    tipo                  NVARCHAR(20)  NOT NULL, -- dia | turno | semana | mes
    fecha_inicio          DATETIME2     NOT NULL,
    fecha_fin             DATETIME2     NOT NULL,
    num_ventas            INT           NOT NULL DEFAULT 0,
    total_ventas          DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_efectivo        DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_tarjeta         DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_transferencia   DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_descuentos      DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_gastos          DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_devoluciones    DECIMAL(10,2) NOT NULL DEFAULT 0,
    costo_ventas          DECIMAL(10,2) NOT NULL DEFAULT 0,
    utilidad_neta         DECIMAL(10,2) NOT NULL DEFAULT 0,
    fondo_inicial         DECIMAL(10,2) NOT NULL DEFAULT 0,
    gastos_efectivo       DECIMAL(10,2) NOT NULL DEFAULT 0,
    devoluciones_efectivo DECIMAL(10,2) NOT NULL DEFAULT 0,
    abonos_efectivo       DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_credito         DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_esperado     DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_contado      DECIMAL(10,2) NOT NULL DEFAULT 0,
    diferencia_caja       DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_deja_caja    DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_retira       DECIMAL(10,2) NOT NULL DEFAULT 0,
    usuario_id            INT NULL,
    notas                 NVARCHAR(500) NULL,
    created_at            DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_corte_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX idx_cortes_fecha ON cortes_caja(fecha_inicio, fecha_fin);
GO

-- ----------------------------------------------------------------
-- Usuario admin por defecto (password: Admin123!  -> cámbialo luego)
-- Hash generado con bcrypt, 10 rounds
-- ----------------------------------------------------------------
-- INSERT INTO usuarios (nombre, email, password, rol, activo)
-- VALUES ('Administrador', 'admin@tienda.com', '$2b$10$REEMPLAZA_ESTE_HASH', 'admin', 1);

PRINT 'Esquema PuntoFamilyDB creado correctamente.';
GO
