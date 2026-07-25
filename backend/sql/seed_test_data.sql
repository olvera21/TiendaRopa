-- ================================================================
-- DATOS DE PRUEBA — Punto Family (solo departamento "ropa")
-- Llena la base con productos, tallas, clientes, ventas históricas,
-- promociones, gastos, una devolución y un corte de caja de ejemplo
-- (con flujo de efectivo) para poder probar el flujo completo:
-- POS, Inventario, Promociones, Crédito, Corte de caja, Reportes.
--
-- Seguro de re-ejecutar: si detecta que ya corriste este script
-- antes (existe el producto ROP-001), no vuelve a insertar nada.
-- Requiere que ya hayas corrido schema.sql y, si tu base es previa,
-- también:
--   backend/sql/updates/002_iva_merma_promo_talla.sql
--   backend/sql/updates/003_flujo_caja.sql
-- ================================================================
USE PuntoFamilyDB;
GO

IF EXISTS (SELECT 1 FROM productos WHERE sku = N'ROP-001')
BEGIN
    PRINT N'Los datos de prueba ya existen (se encontró ROP-001). No se insertó nada.';
END
ELSE
BEGIN
BEGIN TRY

DECLARE @AdminId INT = (SELECT TOP 1 id FROM usuarios WHERE rol = N'admin' ORDER BY id);

-- ================================================================
-- 1. CATEGORÍAS (todas del departamento "ropa")
-- ================================================================
DECLARE @CatPlayeras INT, @CatPants INT, @CatSudaderas INT, @CatShorts INT;

INSERT INTO categorias (nombre, tipo) VALUES (N'Playeras', N'ropa');
SET @CatPlayeras = SCOPE_IDENTITY();

INSERT INTO categorias (nombre, tipo) VALUES (N'Pants', N'ropa');
SET @CatPants = SCOPE_IDENTITY();

INSERT INTO categorias (nombre, tipo) VALUES (N'Sudaderas', N'ropa');
SET @CatSudaderas = SCOPE_IDENTITY();

INSERT INTO categorias (nombre, tipo) VALUES (N'Shorts', N'ropa');
SET @CatShorts = SCOPE_IDENTITY();

-- ================================================================
-- 2. PRODUCTOS + TALLAS
-- ================================================================
DECLARE @P1 INT, @P2 INT, @P3 INT, @P4 INT, @P5 INT, @P6 INT;
DECLARE @T1_CH INT, @T1_M INT, @T1_G INT, @T1_XG INT;
DECLARE @T2_CH INT, @T2_M INT, @T2_G INT;
DECLARE @T3_CH INT, @T3_M INT, @T3_G INT;
DECLARE @T4_CH INT, @T4_M INT, @T4_G INT, @T4_XG INT;
DECLARE @T5_CH INT, @T5_M INT, @T5_G INT;
DECLARE @T6_CH INT, @T6_M INT, @T6_G INT;

-- Producto 1: playera básica (con IVA activado, para probar ese bloque de Inventario)
INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, departamento, marca, modelo, color, material, costo_unitario, precio_publico, aplica_iva, iva_porcentaje, merma_porcentaje)
VALUES (N'ROP-001', N'7501234561001', N'Playera Básica Algodón', N'Playera lisa 100% algodón, corte regular.', @CatPlayeras, N'ropa', N'Punto Family', NULL, N'Blanco', N'Algodón', 90.00, 249.00, 1, 16, 3);
SET @P1 = SCOPE_IDENTITY();

INSERT INTO tallas (producto_id, talla, stock) VALUES (@P1, N'CH', 10); SET @T1_CH = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P1, N'M', 15);  SET @T1_M = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P1, N'G', 12);  SET @T1_G = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P1, N'XG', 5);  SET @T1_XG = SCOPE_IDENTITY();

-- Producto 2: pants
INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, departamento, marca, modelo, color, material, costo_unitario, precio_publico, aplica_iva, iva_porcentaje, merma_porcentaje)
VALUES (N'ROP-002', N'7501234561018', N'Pants Jogger Deportivo', N'Pants entallado con puño, bolsas laterales.', @CatPants, N'ropa', N'Punto Family', NULL, N'Gris jaspe', N'Algodón/poliéster', 180.00, 449.00, 1, 16, 2);
SET @P2 = SCOPE_IDENTITY();

INSERT INTO tallas (producto_id, talla, stock) VALUES (@P2, N'CH', 6); SET @T2_CH = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P2, N'M', 9);  SET @T2_M = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P2, N'G', 7);  SET @T2_G = SCOPE_IDENTITY();

-- Producto 3: playera estampada
INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, departamento, marca, modelo, color, material, costo_unitario, precio_publico, aplica_iva, iva_porcentaje, merma_porcentaje)
VALUES (N'ROP-003', N'7501234561025', N'Playera Estampada', N'Playera con estampado frontal, edición limitada.', @CatPlayeras, N'ropa', N'Punto Family', NULL, N'Negro', N'Algodón', 110.00, 299.00, 1, 16, 3);
SET @P3 = SCOPE_IDENTITY();

INSERT INTO tallas (producto_id, talla, stock) VALUES (@P3, N'CH', 3); SET @T3_CH = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P3, N'M', 5);  SET @T3_M = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P3, N'G', 4);  SET @T3_G = SCOPE_IDENTITY();

-- Producto 4: sudadera con gorro
INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, departamento, marca, modelo, color, material, costo_unitario, precio_publico, aplica_iva, iva_porcentaje, merma_porcentaje)
VALUES (N'ROP-004', N'7501234561032', N'Sudadera con Gorro', N'Sudadera afelpada con bolsa canguro y gorro ajustable.', @CatSudaderas, N'ropa', N'Punto Family', NULL, N'Azul marino', N'Algodón/poliéster', 220.00, 549.00, 1, 16, 2);
SET @P4 = SCOPE_IDENTITY();

INSERT INTO tallas (producto_id, talla, stock) VALUES (@P4, N'CH', 4); SET @T4_CH = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P4, N'M', 7);  SET @T4_M = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P4, N'G', 6);  SET @T4_G = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P4, N'XG', 2); SET @T4_XG = SCOPE_IDENTITY();

-- Producto 5: short deportivo (con talla en exceso de stock, ideal para promo por talla)
INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, departamento, marca, modelo, color, material, costo_unitario, precio_publico, aplica_iva, iva_porcentaje, merma_porcentaje)
VALUES (N'ROP-005', N'7501234561049', N'Short Deportivo', N'Short ligero de secado rápido, bolsillo con cierre.', @CatShorts, N'ropa', N'Punto Family', NULL, N'Negro', N'Poliéster', 95.00, 259.00, 1, 16, 1);
SET @P5 = SCOPE_IDENTITY();

INSERT INTO tallas (producto_id, talla, stock) VALUES (@P5, N'CH', 3); SET @T5_CH = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P5, N'M', 3);  SET @T5_M = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P5, N'G', 8);  SET @T5_G = SCOPE_IDENTITY(); -- talla con exceso de stock

-- Producto 6: playera polo
INSERT INTO productos (sku, codigo_barras, nombre, descripcion, categoria_id, departamento, marca, modelo, color, material, costo_unitario, precio_publico, aplica_iva, iva_porcentaje, merma_porcentaje)
VALUES (N'ROP-006', N'7501234561056', N'Playera Polo', N'Playera tipo polo, cuello y puños tejidos.', @CatPlayeras, N'ropa', N'Punto Family', NULL, N'Vino', N'Piqué', 140.00, 349.00, 1, 16, 2);
SET @P6 = SCOPE_IDENTITY();

INSERT INTO tallas (producto_id, talla, stock) VALUES (@P6, N'CH', 5); SET @T6_CH = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P6, N'M', 8);  SET @T6_M = SCOPE_IDENTITY();
INSERT INTO tallas (producto_id, talla, stock) VALUES (@P6, N'G', 5);  SET @T6_G = SCOPE_IDENTITY();

-- Movimientos de inventario (registro inicial, igual que hace la app al crear producto)
INSERT INTO inventario_movimientos (producto_id, talla_id, tipo, cantidad, motivo)
SELECT producto_id, id, N'entrada', stock, N'Registro inicial (datos de prueba)'
FROM tallas WHERE producto_id IN (@P1, @P2, @P3, @P4, @P5, @P6) AND stock > 0;

-- ================================================================
-- 3. PROMOCIONES (para probar el buscador por talla y el POS)
-- ================================================================
-- Vigente: 15% en toda la categoría Sudaderas
INSERT INTO promociones (nombre, codigo, tipo, valor, categoria_id, fecha_inicio, fecha_fin, activo)
VALUES (N'Sudaderas de temporada', N'SUDA15', N'porcentaje', 15, @CatSudaderas, DATEADD(DAY, -10, CAST(GETDATE() AS DATE)), DATEADD(DAY, 20, CAST(GETDATE() AS DATE)), 1);

-- Vigente: $60 de descuento SOLO en la talla G del Short Deportivo (para probar promo por talla específica)
INSERT INTO promociones (nombre, codigo, tipo, valor, producto_id, talla_id, activo)
VALUES (N'Liquidación Short talla G', N'SHORTG', N'monto', 60, @P5, @T5_G, 1);

-- Vigente: 10% en toda la categoría Playeras, sin fecha límite
INSERT INTO promociones (nombre, codigo, tipo, valor, categoria_id, activo)
VALUES (N'Playeras todo el año', N'PLAYERA10', N'porcentaje', 10, @CatPlayeras, 1);

-- Vencida a propósito, para confirmar que el POS NO la aplica
INSERT INTO promociones (nombre, codigo, tipo, valor, categoria_id, fecha_inicio, fecha_fin, activo)
VALUES (N'Promo vencida (prueba)', N'VENCIDA20', N'porcentaje', 20, @CatPants, DATEADD(DAY, -60, CAST(GETDATE() AS DATE)), DATEADD(DAY, -30, CAST(GETDATE() AS DATE)), 1);

-- Inactiva a propósito, para confirmar que el POS tampoco la aplica
INSERT INTO promociones (nombre, codigo, tipo, valor, producto_id, activo)
VALUES (N'Promo desactivada (prueba)', N'INACTIVA', N'porcentaje', 50, @P4, 0);

-- ================================================================
-- 4. CLIENTES
-- ================================================================
DECLARE @ClienteMaria INT, @ClienteCarlos INT, @ClienteSofia INT;

INSERT INTO clientes (nombre, apellido, telefono, ciudad, limite_credito)
VALUES (N'María Fernanda', N'López Ortiz', N'4421234567', N'Querétaro', 3000);
SET @ClienteMaria = SCOPE_IDENTITY();

INSERT INTO clientes (nombre, apellido, telefono, ciudad, limite_credito)
VALUES (N'Carlos', N'Hernández Ruiz', N'4429876543', N'Querétaro', 2500);
SET @ClienteCarlos = SCOPE_IDENTITY();

INSERT INTO clientes (nombre, apellido, telefono, ciudad, limite_credito)
VALUES (N'Sofía', N'Ramírez Vega', N'4425551234', N'Querétaro', 0);
SET @ClienteSofia = SCOPE_IDENTITY();

-- ================================================================
-- 5. VENTAS HISTÓRICAS (repartidas en varios días para probar
--    Corte de caja por día/semana/mes y Reportes)
-- ================================================================
DECLARE @V1 INT, @V2 INT, @V3 INT, @V4 INT, @V5 INT, @V6 INT, @V7 INT;

-- Venta 1: HOY, contado, efectivo, sin cliente, 2 sudaderas talla M (con promo 15% aplicada)
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0001', NULL, N'contado', N'efectivo', 1098.00, 164.70, 933.30, 933.30, 0, N'pagada', @AdminId, DATEADD(HOUR, -2, SYSDATETIME()));
SET @V1 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V1, @P4, @T4_M, 2, 549.00, 220.00, 1098.00);
UPDATE tallas SET stock = stock - 2 WHERE id = @T4_M;

-- Venta 2: HOY, contado, tarjeta, cliente Sofía, 1 playera estampada (con promo 10%) + 1 pants
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0002', @ClienteSofia, N'contado', N'tarjeta', 748.00, 29.90, 718.10, 718.10, 0, N'pagada', @AdminId, DATEADD(HOUR, -1, SYSDATETIME()));
SET @V2 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V2, @P3, @T3_M, 1, 299.00, 110.00, 299.00);
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V2, @P2, @T2_M, 1, 449.00, 180.00, 449.00);
UPDATE tallas SET stock = stock - 1 WHERE id = @T3_M;
UPDATE tallas SET stock = stock - 1 WHERE id = @T2_M;

-- Venta 3: AYER, contado, efectivo, sin cliente, 1 playera polo talla M
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0003', NULL, N'contado', N'efectivo', 349.00, 0, 349.00, 349.00, 0, N'pagada', @AdminId, DATEADD(DAY, -1, SYSDATETIME()));
SET @V3 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V3, @P6, @T6_M, 1, 349.00, 140.00, 349.00);
UPDATE tallas SET stock = stock - 1 WHERE id = @T6_M;

-- Venta 4: AYER, CRÉDITO, cliente Carlos, 1 playera básica + 1 pants (con anticipo parcial en efectivo)
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0004', @ClienteCarlos, N'credito', N'efectivo', 698.00, 0, 698.00, 200.00, 498.00, N'credito', @AdminId, DATEADD(DAY, -1, SYSDATETIME()));
SET @V4 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V4, @P1, @T1_G, 1, 249.00, 90.00, 249.00);
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V4, @P2, @T2_G, 1, 449.00, 180.00, 449.00);
UPDATE tallas SET stock = stock - 1 WHERE id = @T1_G;
UPDATE tallas SET stock = stock - 1 WHERE id = @T2_G;
UPDATE clientes SET saldo_deuda = saldo_deuda + 498.00 WHERE id = @ClienteCarlos;
-- abono parcial (enganche) registrado a esa venta a crédito, igual que hace la app
INSERT INTO pagos (venta_id, cliente_id, monto, forma_pago, referencia, created_at)
VALUES (@V4, @ClienteCarlos, 200.00, N'efectivo', N'Anticipo al momento de la venta', DATEADD(DAY, -1, SYSDATETIME()));

-- Venta 5: hace 3 días, contado, transferencia, cliente María, short deportivo talla G (con promo de $60)
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0005', @ClienteMaria, N'contado', N'transferencia', 259.00, 60.00, 199.00, 199.00, 0, N'pagada', @AdminId, DATEADD(DAY, -3, SYSDATETIME()));
SET @V5 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V5, @P5, @T5_G, 1, 259.00, 95.00, 259.00);
UPDATE tallas SET stock = stock - 1 WHERE id = @T5_G;

-- Venta 6: hace 5 días, contado, efectivo (para llenar la semana)
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0006', NULL, N'contado', N'efectivo', 548.00, 0, 548.00, 548.00, 0, N'pagada', @AdminId, DATEADD(DAY, -5, SYSDATETIME()));
SET @V6 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V6, @P3, @T3_CH, 1, 299.00, 110.00, 299.00);
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V6, @P1, @T1_CH, 1, 249.00, 90.00, 249.00);
UPDATE tallas SET stock = stock - 1 WHERE id = @T3_CH;
UPDATE tallas SET stock = stock - 1 WHERE id = @T1_CH;

-- Venta 7: hace 20 días, contado, tarjeta, cliente María, sudadera talla CH
INSERT INTO ventas (folio, cliente_id, tipo_venta, forma_pago, subtotal, descuento_monto, total, monto_pagado, saldo_pendiente, estado, usuario_id, created_at)
VALUES (N'V-TEST-0007', @ClienteMaria, N'contado', N'tarjeta', 549.00, 0, 549.00, 549.00, 0, N'pagada', @AdminId, DATEADD(DAY, -20, SYSDATETIME()));
SET @V7 = SCOPE_IDENTITY();
INSERT INTO ventas_detalle (venta_id, producto_id, talla_id, cantidad, precio_unitario, costo_unitario, subtotal)
VALUES (@V7, @P4, @T4_CH, 1, 549.00, 220.00, 549.00);
UPDATE tallas SET stock = stock - 1 WHERE id = @T4_CH;

-- ================================================================
-- 6. DEVOLUCIÓN de prueba (sobre la venta 3, ayer)
-- ================================================================
DECLARE @Dev1 INT;
INSERT INTO devoluciones (venta_id, motivo, tipo_devolucion, monto_total, notas, usuario_id, estado, created_at)
VALUES (@V3, N'Talla incorrecta', N'reembolso', 349.00, N'Cliente solicitó reembolso, producto en buen estado.', @AdminId, N'procesada', DATEADD(DAY, -1, SYSDATETIME()));
SET @Dev1 = SCOPE_IDENTITY();
INSERT INTO devoluciones_detalle (devolucion_id, producto_id, talla_id, cantidad, precio_unitario)
VALUES (@Dev1, @P6, @T6_M, 1, 349.00);
-- regresa la prenda a inventario y marca la venta como devuelta, igual que hace la app
UPDATE tallas SET stock = stock + 1 WHERE id = @T6_M;
UPDATE ventas SET estado = N'devuelta' WHERE id = @V3;

-- ================================================================
-- 7. GASTOS de prueba
-- ================================================================
INSERT INTO gastos (concepto, monto, categoria, forma_pago, fecha, proveedor, usuario_id)
VALUES (N'Pago de luz del local', 850.00, N'servicios', N'transferencia', CAST(GETDATE() AS DATE), N'CFE', @AdminId);

INSERT INTO gastos (concepto, monto, categoria, forma_pago, fecha, proveedor, usuario_id)
VALUES (N'Bolsas y etiquetas', 320.00, N'insumos', N'efectivo', CAST(DATEADD(DAY, -2, GETDATE()) AS DATE), N'Papelería Ruiz', @AdminId);

-- ================================================================
-- 8. CORTE DE CAJA de ejemplo (con flujo de efectivo) — periodo AYER,
--    que junta la venta 3 (efectivo), la venta 4 (crédito, enganche en
--    efectivo) y la devolución. Sirve para ver de inmediato el
--    historial y el PDF con la sección de flujo de efectivo.
-- ================================================================
DECLARE @AyerInicio DATETIME2 = CAST(DATEADD(DAY, -1, CAST(GETDATE() AS DATE)) AS DATETIME2);
DECLARE @AyerFin DATETIME2 = DATEADD(SECOND, -1, CAST(CAST(GETDATE() AS DATE) AS DATETIME2));

-- Ventas del periodo: V3 ($349 efectivo) + V4 ($698 a crédito, con $200 de enganche en efectivo)
-- Costo: playera polo (140) + playera básica (90) + pants (180) = 410
-- Devolución del periodo: $349 (reembolso en efectivo)
-- Fondo con el que se abrió: $500 · Faltante simulado de $5 al cierre
INSERT INTO cortes_caja (
  tipo, fecha_inicio, fecha_fin, num_ventas, total_ventas, total_efectivo, total_tarjeta, total_transferencia,
  total_descuentos, total_gastos, total_devoluciones, costo_ventas, utilidad_neta,
  fondo_inicial, gastos_efectivo, devoluciones_efectivo, abonos_efectivo, total_credito,
  efectivo_esperado, efectivo_contado, diferencia_caja, efectivo_deja_caja, efectivo_retira,
  usuario_id, notas, created_at
) VALUES (
  N'dia', @AyerInicio, @AyerFin, 2, 1047.00, 349.00, 0, 0,
  0, 0, 349.00, 410.00, 288.00,
  500.00, 0, 349.00, 200.00, 698.00,
  700.00, 695.00, -5.00, 500.00, 195.00,
  @AdminId, N'Faltaron $5, posible error al dar cambio. Se deja el mismo fondo de $500 para mañana.', DATEADD(DAY, -1, SYSDATETIME())
);

PRINT N'Datos de prueba insertados correctamente: 6 productos (solo ropa), 4 categorías, 5 promociones, 3 clientes, 7 ventas, 1 devolución, 2 gastos y 1 corte de caja de ejemplo.';

END TRY
BEGIN CATCH
    PRINT N'Ocurrió un error al insertar los datos de prueba:';
    PRINT ERROR_MESSAGE();
    THROW;
END CATCH
END -- fin del ELSE
GO
