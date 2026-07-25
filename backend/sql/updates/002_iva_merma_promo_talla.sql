-- ================================================================
-- Actualización: IVA + Merma en productos, y Promociones por talla
-- Ejecuta SOLO este archivo en tu base PuntoFamilyDB ya existente
-- (no vuelvas a correr schema.sql completo, ya tienes tus tablas).
-- ================================================================
USE PuntoFamilyDB;
GO

-- ---------- productos: IVA ----------
IF COL_LENGTH('productos', 'aplica_iva') IS NULL
BEGIN
    ALTER TABLE productos ADD aplica_iva BIT NOT NULL DEFAULT 0;
    PRINT 'Columna aplica_iva agregada a productos.';
END
GO

IF COL_LENGTH('productos', 'iva_porcentaje') IS NULL
BEGIN
    ALTER TABLE productos ADD iva_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 16;
    PRINT 'Columna iva_porcentaje agregada a productos.';
END
GO

-- ---------- productos: Merma ----------
IF COL_LENGTH('productos', 'merma_porcentaje') IS NULL
BEGIN
    ALTER TABLE productos ADD merma_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0;
    PRINT 'Columna merma_porcentaje agregada a productos.';
END
GO

-- ---------- promociones: talla específica ----------
IF COL_LENGTH('promociones', 'talla_id') IS NULL
BEGIN
    ALTER TABLE promociones ADD talla_id INT NULL;
    ALTER TABLE promociones ADD CONSTRAINT fk_promo_talla FOREIGN KEY (talla_id) REFERENCES tallas(id) ON DELETE NO ACTION;
    PRINT 'Columna talla_id agregada a promociones.';
END
GO
