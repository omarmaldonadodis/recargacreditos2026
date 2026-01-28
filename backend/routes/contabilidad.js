
// backend/routes/contabilidad.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const moment = require('moment-timezone');

// Modelos
const SaldoProveedor = require('../models/SaldoProveedor');
const IncrementoSaldo = require('../models/IncrementoSaldo');
const Deposito = require('../models/Deposito');
const Recarga = require('../models/Recarga');
const AsignacionDeposito = require('../models/AsignacionDeposito');

/**
 * GET /api/contabilidad/reporte-completo
 * 
 * Reporte completo con cálculos exactos, filtrado por fechas
 * y considerando zona horaria del cliente
 */
router.get('/reporte-completo', async (req, res) => {
  try {
    const { proveedor, fechaInicio, fechaFin, timezone = 'America/Guayaquil' } = req.query;

    if (!proveedor) {
      return res.status(400).json({ error: 'Proveedor requerido' });
    }

    // Convertir fechas del timezone del cliente a UTC para queries
    const fechaInicioUTC = moment.tz(`${fechaInicio} 00:00:00`, timezone).utc().format('YYYY-MM-DD HH:mm:ss');
    const fechaFinUTC = moment.tz(`${fechaFin} 23:59:59`, timezone).utc().format('YYYY-MM-DD HH:mm:ss');

    // ===== OBTENER SNAPSHOT INICIAL =====
    const [snapshotRows] = await sequelize.query(`
      SELECT saldo, fecha
      FROM SaldoProveedores
      WHERE proveedor = ?
        AND tipoEvento = 'snapshot_inicial'
      ORDER BY fecha DESC
      LIMIT 1
    `, {
      replacements: [proveedor],
      type: sequelize.QueryTypes.SELECT
    });

    if (!snapshotRows || snapshotRows.length === 0) {
      return res.status(404).json({ 
        error: 'No se encontró snapshot inicial. Ejecuta el script de inicialización.' 
      });
    }

    const snapshotInicial = snapshotRows;
    const saldoInicialSnapshot = parseFloat(snapshotInicial.saldo);
    const fechaSnapshot = moment.utc(snapshotInicial.fecha).tz(timezone).format('YYYY-MM-DD');

    // ===== OBTENER SALDO AL INICIO DEL PERIODO =====
    const [saldoInicioPeriodoRows] = await sequelize.query(`
      SELECT saldo
      FROM SaldoProveedores
      WHERE proveedor = ?
        AND fecha < ?
      ORDER BY fecha DESC
      LIMIT 1
    `, {
      replacements: [proveedor, fechaInicioUTC],
      type: sequelize.QueryTypes.SELECT
    });

    const saldoInicioPeriodo = saldoInicioPeriodoRows
      ? parseFloat(saldoInicioPeriodoRows.saldo)
      : saldoInicialSnapshot;

    // ===== OBTENER ÚLTIMO SALDO REGISTRADO (ACTUAL) =====
    const [ultimoSaldoRows] = await sequelize.query(`
      SELECT saldo, fecha
      FROM SaldoProveedores
      WHERE proveedor = ?
      ORDER BY fecha DESC
      LIMIT 1
    `, {
      replacements: [proveedor],
      type: sequelize.QueryTypes.SELECT
    });

    const saldoFinalReal = ultimoSaldoRows
      ? parseFloat(ultimoSaldoRows.saldo)
      : saldoInicialSnapshot;

    // ===== OBTENER INCREMENTOS DEL PERIODO =====
    const incrementos = await sequelize.query(`
      SELECT 
        id,
        fecha,
        tipoIncremento,
        diferencia,
        saldoAnterior,
        saldoNuevo,
        operadora,
        estado,
        notas
      FROM IncrementoSaldos
      WHERE proveedor = ?
        AND fecha >= ?
        AND fecha <= ?
        AND estado IN ('pendiente', 'asignado', 'verificado')
      ORDER BY fecha ASC
    `, {
      replacements: [proveedor, fechaInicioUTC, fechaFinUTC],
      type: sequelize.QueryTypes.SELECT
    });

    // ===== OBTENER DEPÓSITOS DEL PERIODO =====
    const depositos = await sequelize.query(`
      SELECT 
        d.id,
        d.fecha,
        d.monto,
        d.tipoDeposito as metodoPago,
        d.proveedor as operadora,
        d.asignado,
        d.verificado,
        d.notas,
        u.nombres_apellidos,
        u.nombre_tienda
      FROM Depositos d
      LEFT JOIN Usuarios u ON d.usuarioId = u.id
      WHERE d.proveedor = ?
        AND d.fecha >= ?
        AND d.fecha <= ?
      ORDER BY d.fecha ASC
    `, {
      replacements: [proveedor, fechaInicioUTC, fechaFinUTC],
      type: sequelize.QueryTypes.SELECT
    });

    // ===== OBTENER RECARGAS DEL PERIODO =====
    const recargas = await sequelize.query(`
      SELECT 
        id,
        fecha,
        celular as numeroRecarga,
        valor,
        comision,
        saldoGestopago as saldoNuevo,
        exitoso,
        operadora
      FROM Recargas
      WHERE proveedor = ?
        AND fecha >= ?
        AND fecha <= ?
      ORDER BY fecha ASC
    `, {
      replacements: [proveedor, fechaInicioUTC, fechaFinUTC],
      type: sequelize.QueryTypes.SELECT
    });

    // ===== CALCULAR TOTALES =====
    const totalIncrementos = incrementos.reduce((sum, inc) => sum + parseFloat(inc.diferencia), 0);
    
    const totalDepositosAsignados = depositos
      .filter(d => d.asignado)
      .reduce((sum, d) => sum + parseFloat(d.monto), 0);
    
    const totalDepositosVerificados = depositos
      .filter(d => d.verificado)
      .reduce((sum, d) => sum + parseFloat(d.monto), 0);
    
    const totalRecargas = recargas
      .filter(r => r.exitoso)
      .reduce((sum, r) => sum + parseFloat(r.valor), 0);
    
    const totalComisiones = recargas
      .filter(r => r.exitoso)
      .reduce((sum, r) => sum + parseFloat(r.comision), 0);

    // ===== CALCULAR GANANCIA REAL =====
    // Ganancia = Incrementos detectados - Depósitos asignados (inversión)
    const gananciaReal = totalIncrementos - totalDepositosAsignados;
    const porcentajeGanancia = totalDepositosAsignados > 0 
      ? (gananciaReal / totalDepositosAsignados) * 100 
      : 0;

    // ===== VERIFICAR CONSISTENCIA =====
    // IMPORTANTE: Solo verificamos desde el inicio del periodo, no hacia atrás
    // Saldo esperado = Saldo al inicio del periodo + Incrementos - Recargas
    const saldoEsperadoFinPeriodo = saldoInicioPeriodo + totalIncrementos - totalRecargas + totalComisiones;
    const diferencia = saldoFinalReal - saldoEsperadoFinPeriodo;
    const consistente = Math.abs(diferencia) < 0.01;

    // ===== PREPARAR DETALLES =====
    const detallesIncrementos = incrementos.map(inc => {
      // Obtener depósitos asociados a este incremento
      const depositosAsociadosIds = inc.notas ? 
        (inc.notas.match(/Depósito ID: (\d+)/g) || []).map(m => parseInt(m.match(/\d+/)[0])) : 
        [];
      
      const depositosAsociados = depositos
        .filter(d => depositosAsociadosIds.includes(d.id))
        .reduce((sum, d) => sum + parseFloat(d.monto), 0);

      const incrementoValor = parseFloat(inc.diferencia);
      const gananciaIncremento = incrementoValor - depositosAsociados;
      const porcentajeIncremento = depositosAsociados > 0 
        ? (gananciaIncremento / depositosAsociados) * 100 
        : 0;

      return {
        id: inc.id,
        fecha: moment.utc(inc.fecha).tz(timezone).format('YYYY-MM-DD HH:mm'),
        tipo: inc.tipoIncremento,
        incremento: incrementoValor,
        depositosAsociados,
        ganancia: gananciaIncremento,
        porcentaje: porcentajeIncremento,
        estado: inc.estado,
        operadora: inc.operadora,
        notas: inc.notas
      };
    });

    const detallesDepositos = depositos.map(d => ({
      id: d.id,
      fecha: moment.utc(d.fecha).tz(timezone).format('YYYY-MM-DD HH:mm'),
      monto: parseFloat(d.monto),
      metodoPago: d.metodoPago,
      operadora: d.operadora,
      usuario: d.nombres_apellidos || d.nombre_tienda || 'N/A',
      asignado: d.asignado,
      verificado: d.verificado,
      notas: d.notas
    }));

    const detallesRecargas = recargas.map(r => ({
      id: r.id,
      fecha: moment.utc(r.fecha).tz(timezone).format('YYYY-MM-DD HH:mm'),
      numeroRecarga: r.numeroRecarga,
      valor: parseFloat(r.valor),
      comision: parseFloat(r.comision),
      saldoNuevo: r.saldoNuevo ? parseFloat(r.saldoNuevo) : null,
      exitoso: r.exitoso,
      operadora: r.operadora
    }));

    // ===== RESPUESTA =====
    const response = {
      periodo: {
        fechaInicio: moment.utc(fechaInicioUTC).tz(timezone).format('YYYY-MM-DD HH:mm'),
        fechaFin: moment.utc(fechaFinUTC).tz(timezone).format('YYYY-MM-DD HH:mm'),
        diasTranscurridos: moment(fechaFinUTC).diff(moment(fechaInicioUTC), 'days') + 1,
        timezone
      },
      saldos: {
        inicial: saldoInicioPeriodo,
        finalEsperado: saldoEsperadoFinPeriodo,
        finalReal: saldoFinalReal,
        diferencia,
        consistente
      },
      totales: {
        incrementos: totalIncrementos,
        depositosAsignados: totalDepositosAsignados,
        depositosVerificados: totalDepositosVerificados,
        recargas: totalRecargas,
        comisiones: totalComisiones,
        gananciaReal,
        porcentajeGanancia
      },
      contadores: {
        incrementos: incrementos.length,
        depositos: depositos.length,
        recargas: recargas.length
      },
      detalles: {
        incrementos: detallesIncrementos,
        depositos: detallesDepositos,
        recargas: detallesRecargas
      },
      limitesCalendario: {
        fechaMinima: fechaSnapshot,
        fechaMaxima: moment().tz(timezone).format('YYYY-MM-DD')
      },
      metadata: {
        generadoEn: moment().tz(timezone).format('YYYY-MM-DD HH:mm:ss'),
        servidor: 'GestoPago API v2.0'
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error en reporte completo:', error);
    res.status(500).json({ 
      error: 'Error al generar reporte',
      detalle: error.message 
    });
  }
});

module.exports = router;