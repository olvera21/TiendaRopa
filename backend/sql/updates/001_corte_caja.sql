-- ================================================================
-- Actualización: Corte de caja
-- Ejecuta SOLO este archivo en tu base PuntoFamilyDB ya existente
-- (no vuelvas a correr schema.sql completo, ya tienes tus tablas).
-- ================================================================
USE PuntoFamilyDB;
GO

IF OBJECT_ID('cortes_caja', 'U') IS NOT NULL
BEGIN
    PRINT 'La tabla cortes_caja ya existe, no se hizo ningún cambio.';
END
ELSE
BEGIN
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
        usuario_id            INT NULL,
        notas                 NVARCHAR(500) NULL,
        created_at            DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT fk_corte_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
    );
    CREATE INDEX idx_cortes_fecha ON cortes_caja(fecha_inicio, fecha_fin);
    PRINT 'Tabla cortes_caja creada correctamente.';
END
GO
