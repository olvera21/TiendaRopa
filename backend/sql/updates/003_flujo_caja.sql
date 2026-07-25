-- ================================================================
-- Actualización: Flujo de efectivo en el corte de caja
-- (fondo inicial, efectivo esperado, conteo físico, diferencia,
--  cuánto se deja en caja y cuánto se retira)
-- Ejecuta SOLO este archivo sobre tu base PuntoFamilyDB ya existente.
-- ================================================================
USE PuntoFamilyDB;
GO

IF COL_LENGTH('cortes_caja', 'fondo_inicial') IS NULL
BEGIN
    ALTER TABLE cortes_caja ADD
        fondo_inicial          DECIMAL(10,2) NOT NULL DEFAULT 0,
        gastos_efectivo        DECIMAL(10,2) NOT NULL DEFAULT 0,
        devoluciones_efectivo  DECIMAL(10,2) NOT NULL DEFAULT 0,
        abonos_efectivo        DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_credito          DECIMAL(10,2) NOT NULL DEFAULT 0,
        efectivo_esperado      DECIMAL(10,2) NOT NULL DEFAULT 0,
        efectivo_contado       DECIMAL(10,2) NOT NULL DEFAULT 0,
        diferencia_caja        DECIMAL(10,2) NOT NULL DEFAULT 0,
        efectivo_deja_caja     DECIMAL(10,2) NOT NULL DEFAULT 0,
        efectivo_retira        DECIMAL(10,2) NOT NULL DEFAULT 0;
    PRINT 'Columnas de flujo de efectivo agregadas a cortes_caja.';
END
GO
