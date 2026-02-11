// backend/services/contabilidadService.js - VERSIÓN CORREGIDA
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const SaldoProveedor = require('../models/SaldoProveedor');
const IncrementoSaldo = require('../models/IncrementoSaldo');
const Deposito = require('../models/Deposito');
const Recarga = require('../models/Recarga');
const AjusteSaldo = require('../models/AjusteSaldo');
const ConfiguracionSistema = require('../models/ConfiguracionSistema');

class ContabilidadService {
  
  /**
   * Registrar evento de saldo
   */
  async registrarEvento({ proveedor, saldo, tipoEvento, detalles = {}, RecargaId = null, IncrementoSaldoId = null }) {
    try {
      // Obtener último saldo
      const ultimoEvento = await SaldoProveedor.findOne({
        where: { proveedor },
        order: [['fecha', 'DESC']]
      });
      
      const saldoAnterior = ultimoEvento ? parseFloat(ultimoEvento.saldo) : null;
      const diferencia = saldoAnterior ? parseFloat(saldo) - saldoAnterior : 0;
      
      const evento = await SaldoProveedor.create({
        proveedor,
        saldoAnterior,
        saldo: parseFloat(saldo),
        diferencia,
        tipoEvento,
        detalles,
        RecargaId,
        IncrementoSaldoId,
        fecha: new Date()
      });
      
      console.log(`📊 [${proveedor.toUpperCase()}] Evento registrado: ${tipoEvento} | Saldo: $${saldo}`);
      
      return evento;
    } catch (error) {
      console.error('Error registrando evento de saldo:', error);
      throw error;
    }
  }
  
  /**
   * Detectar incremento GENERAL (depósito instantáneo)
   */
  async detectarIncrementoGeneral({ saldoAnterior, saldoNuevo, valor, comision, RecargaId, operadora }) {
    try {
      const saldoEsperado = saldoAnterior - valor;
      const diferencia = saldoNuevo - saldoEsperado;
      
      console.log(`🔍 [GENERAL] Esperado=$${saldoEsperado.toFixed(2)}, Real=$${saldoNuevo.toFixed(2)}, Diferencia=$${diferencia.toFixed(2)}`);
      
      // Umbral para detectar depósito: > $50
      if (diferencia > 50) {
        
        // ⚠️ VERIFICAR SI YA EXISTE UN INCREMENTO SIMILAR (evitar duplicados)
        const hace5Minutos = new Date(Date.now() - 5 * 60 * 1000);
        
        const incrementoExistente = await IncrementoSaldo.findOne({
          where: {
            proveedor: 'general',
            saldoAnterior: saldoAnterior,
            saldoNuevo: saldoNuevo,
            diferencia: diferencia,
            createdAt: { [Op.gte]: hace5Minutos }
          }
        });
        
        if (incrementoExistente) {
          console.log(`⚠️ [GENERAL] Incremento duplicado detectado, ignorando (ID existente: ${incrementoExistente.id})`);
          return null;
        }
        
        const incremento = await IncrementoSaldo.create({
          saldoAnterior,
          saldoNuevo,
          diferencia,
          tipoIncremento: 'deposito_inicial',
          proveedor: 'general',
          operadora,
          RecargaId,
          fecha: new Date(),
          estado: 'pendiente',
          notas: `Depósito detectado automáticamente. Ganancia aparente: $${diferencia.toFixed(2)}`
        });
        
        // Registrar evento
        await this.registrarEvento({
          proveedor: 'general',
          saldo: saldoNuevo,
          tipoEvento: 'deposito_detectado',
          detalles: {
            diferencia: diferencia.toFixed(2),
            incrementoId: incremento.id,
            saldoEsperado: saldoEsperado.toFixed(2),
            porcentajeGanancia: ((diferencia / valor) * 100).toFixed(2) + '%'
          },
          RecargaId,
          IncrementoSaldoId: incremento.id
        });
        
        console.log(`🎉 [GENERAL] Depósito detectado: $${diferencia.toFixed(2)} | ID: ${incremento.id}`);
        
        return incremento;
      }
      
      return null;
    } catch (error) {
      console.error('Error detectando incremento General:', error);
      throw error;
    }
  }
  
  /**
   * Detectar incremento MOVISTAR (comisiones acumuladas)
   */
  async detectarIncrementoMovistar({ saldoAnterior, saldoNuevo, valor, comision, RecargaId, operadora }) {
    try {
      const saldoEsperado = saldoAnterior - valor + comision;
      const diferencia = saldoNuevo - saldoEsperado;
      
      console.log(`🔍 [MOVISTAR] Esperado=$${saldoEsperado.toFixed(2)}, Real=$${saldoNuevo.toFixed(2)}, Diferencia=$${diferencia.toFixed(2)}`);
      
      // Si hay depósito grande (> $100)
      if (diferencia > 100) {
        
        // Evitar duplicados
        const hace5Minutos = new Date(Date.now() - 5 * 60 * 1000);
        const incrementoExistente = await IncrementoSaldo.findOne({
          where: {
            proveedor: 'movistar',
            saldoAnterior: saldoAnterior,
            saldoNuevo: saldoNuevo,
            diferencia: diferencia,
            createdAt: { [Op.gte]: hace5Minutos }
          }
        });
        
        if (incrementoExistente) {
          console.log(`⚠️ [MOVISTAR] Incremento duplicado detectado, ignorando`);
          return null;
        }
        
        const incremento = await IncrementoSaldo.create({
          saldoAnterior,
          saldoNuevo,
          diferencia,
          tipoIncremento: 'deposito_inicial',
          proveedor: 'movistar',
          operadora,
          RecargaId,
          fecha: new Date(),
          estado: 'pendiente',
          notas: `Depósito grande detectado: $${diferencia.toFixed(2)}`
        });
        
        console.log(`🎉 [MOVISTAR] Depósito detectado: $${diferencia.toFixed(2)}`);
        return incremento;
      }
      
      // Verificar comisiones acumuladas (últimas 24h)
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const comisionesRecientes = await Recarga.sum('comision', {
        where: {
          proveedor: 'movistar',
          comision: { [Op.ne]: null },
          exitoso: true,
          createdAt: { [Op.gte]: hace24h }
        }
      }) || 0;
      
      // Si la diferencia coincide con comisiones (margen ±$10)
      if (Math.abs(diferencia - comisionesRecientes) < 10 && diferencia > 20) {
        
        // Evitar duplicados
        const hace5Minutos = new Date(Date.now() - 5 * 60 * 1000);
        const incrementoExistente = await IncrementoSaldo.findOne({
          where: {
            proveedor: 'movistar',
            tipoIncremento: 'comisiones_acumuladas',
            diferencia: { [Op.between]: [diferencia - 5, diferencia + 5] },
            createdAt: { [Op.gte]: hace5Minutos }
          }
        });
        
        if (incrementoExistente) {
          console.log(`⚠️ [MOVISTAR] Comisiones ya registradas, ignorando`);
          return null;
        }
        
        const recargasComision = await Recarga.findAll({
          where: {
            proveedor: 'movistar',
            comision: { [Op.ne]: null },
            exitoso: true,
            createdAt: { [Op.gte]: hace24h }
          },
          order: [['fecha', 'ASC']]
        });
        
        const fechaInicio = recargasComision[0]?.fecha || hace24h;
        
        const incremento = await IncrementoSaldo.create({
          saldoAnterior,
          saldoNuevo,
          diferencia,
          tipoIncremento: 'comisiones_acumuladas',
          proveedor: 'movistar',
          operadora,
          RecargaId,
          comisionAcumulada: comisionesRecientes,
          cantidadRecargasComision: recargasComision.length,
          fechaInicioAcumulacion: fechaInicio,
          fechaFinAcumulacion: new Date(),
          fecha: new Date(),
          estado: 'pendiente',
          notas: `Comisiones acumuladas: $${comisionesRecientes.toFixed(2)} de ${recargasComision.length} recargas`
        });
        
        await this.registrarEvento({
          proveedor: 'movistar',
          saldo: saldoNuevo,
          tipoEvento: 'comision_acumulada',
          detalles: {
            diferencia: diferencia.toFixed(2),
            comisionTotal: comisionesRecientes.toFixed(2),
            cantidadRecargas: recargasComision.length,
            incrementoId: incremento.id
          },
          RecargaId,
          IncrementoSaldoId: incremento.id
        });
        
        console.log(`💰 [MOVISTAR] Comisiones acumuladas: $${diferencia.toFixed(2)} | ${recargasComision.length} recargas`);
        
        return incremento;
      }
      
      // Si hay diferencia pequeña no clasificada
      if (Math.abs(diferencia) > 5) {
        console.warn(`⚠️ [MOVISTAR] Diferencia no clasificada: $${diferencia.toFixed(2)}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error detectando incremento Movistar:', error);
      throw error;
    }
  }
  
  /**
   * Calcular ganancias reales por proveedor (SIMPLIFICADO)
   */
  async calcularGanancias({ proveedor, startDate, endDate }) {
    try {
      // Obtener snapshot inicial (punto de partida)
      const snapshotInicial = await SaldoProveedor.findOne({
        where: {
          proveedor,
          tipoEvento: 'snapshot_inicial'
        },
        order: [['fecha', 'ASC']]
      });
      
      let fechaInicioPeriodo, saldoInicial;
      
      if (snapshotInicial) {
        // Usar snapshot como punto de partida
        fechaInicioPeriodo = startDate 
          ? new Date(startDate)
          : new Date(snapshotInicial.fecha);
        
        saldoInicial = parseFloat(snapshotInicial.saldo);
        
      } else {
        // Si no hay snapshot, usar primera recarga (modo antiguo)
        const primeraRecarga = await Recarga.findOne({
          where: { proveedor, saldoGestopago: { [Op.ne]: null } },
          order: [['fecha', 'ASC']]
        });
        
        fechaInicioPeriodo = startDate
          ? new Date(startDate)
          : (primeraRecarga ? new Date(primeraRecarga.fecha) : new Date());
        
        saldoInicial = primeraRecarga ? parseFloat(primeraRecarga.saldoGestopago) : 0;
      }
      
      const fechaFinPeriodo = endDate ? new Date(endDate) : new Date();
      
      // Saldo actual
      const ultimaRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      const saldoActual = parseFloat(ultimaRecarga?.saldoGestopago || 0);
      
      // Total depositado en el período
      const depositos = await Deposito.sum('monto', {
        where: { 
          proveedor, 
          verificado: true,
          fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
        }
      }) || 0;
      
      // Total recargado en el período
      const totalRecargado = await Recarga.sum('valor', {
        where: {
          proveedor,
          exitoso: true,
          fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
        }
      }) || 0;
      
      // Total comisiones en el período (Movistar)
      const totalComisiones = await Recarga.sum('comision', {
        where: {
          proveedor,
          exitoso: true,
          comision: { [Op.ne]: null },
          fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
        }
      }) || 0;
      
      let gananciaReal = 0;
      let formula = '';
      
      if (proveedor === 'general') {
        // General: (Saldo actual + Total recargado) - (Saldo inicial + Total depositado)
        gananciaReal = (saldoActual + totalRecargado) - (saldoInicial + depositos);
        formula = '(SaldoActual + Recargado) - (SaldoInicial + Depositado)';
      } else {
        // Movistar: Suma de comisiones
        gananciaReal = totalComisiones;
        formula = 'Σ Comisiones';
      }
      
      const porcentajeGanancia = depositos > 0
        ? ((gananciaReal / depositos) * 100).toFixed(2)
        : '0.00';
      
      return {
        proveedor,
        saldoInicial: saldoInicial.toFixed(2),
        totalDepositado: depositos.toFixed(2),
        totalRecargado: totalRecargado.toFixed(2),
        saldoActual: saldoActual.toFixed(2),
        totalComisiones: totalComisiones.toFixed(2),
        gananciaReal: gananciaReal.toFixed(2),
        porcentajeGanancia: `${porcentajeGanancia}%`,
        formula,
        fechaInicioPeriodo: fechaInicioPeriodo.toISOString().split('T')[0],
        fechaFinPeriodo: fechaFinPeriodo.toISOString().split('T')[0],
        tieneSnapshot: !!snapshotInicial
      };
    } catch (error) {
      console.error('Error calculando ganancias:', error);
      throw error;
    }
  }
  
  /**
   * Crear ajuste manual de saldo
   */
  async crearAjuste({ proveedor, tipoAjuste, saldoNuevo, motivo, detalles, usuarioId }) {
    try {
      const ultimaRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      
      const saldoAnterior = parseFloat(ultimaRecarga?.saldoGestopago || 0);
      const diferencia = saldoNuevo - saldoAnterior;
      
      const ajuste = await AjusteSaldo.create({
        proveedor,
        tipoAjuste,
        saldoAnterior,
        saldoNuevo,
        diferencia,
        motivo,
        detalles,
        usuarioId,
        estado: 'pendiente',
        fecha: new Date()
      });
      
      console.log(`🔧 [${proveedor.toUpperCase()}] Ajuste creado: $${diferencia.toFixed(2)}`);
      
      return ajuste;
    } catch (error) {
      console.error('Error creando ajuste:', error);
      throw error;
    }
  }
  
  /**
   * Verificar consistencia de saldos (SIMPLIFICADO)
   */
  // backend/services/contabilidadService.js
// REEMPLAZAR EL MÉTODO: verificarConsistencia

/**
 * 
 * EJEMPLO:
 * Saldo Inicial:     $46,153.50
 * + Incremento:       $2,166.00  ← Incluye depósito ($2,000) + ganancia ($166)
 * - Recargas:         $1,420.00
 * = Saldo Esperado:  $46,899.50  ✅
 */
async verificarConsistencia(proveedor) {
  try {
    // 1. Obtener saldo registrado actual
    const ultimaRecarga = await Recarga.findOne({
      where: { proveedor, saldoGestopago: { [Op.ne]: null } },
      order: [['fecha', 'DESC']]
    });
    
    const saldoRegistrado = parseFloat(ultimaRecarga?.saldoGestopago || 0);
    
    // 2. Obtener snapshot inicial
    const snapshot = await SaldoProveedor.findOne({
      where: {
        proveedor,
        tipoEvento: 'snapshot_inicial'
      },
      order: [['fecha', 'ASC']]
    });
    
    if (!snapshot) {
      return {
        proveedor,
        saldoRegistrado: saldoRegistrado.toFixed(2),
        saldoEsperado: 'N/A',
        diferencia: '0.00',
        consistente: true,
        detalles: {
          mensaje: 'Ejecuta el script inicializar-contabilidad-v2.js para establecer punto de partida'
        }
      };
    }
    
    let saldoEsperado = parseFloat(snapshot.saldo);
    const fechaSnapshot = new Date(snapshot.fecha);
    
    console.log(`[VERIFICACIÓN ${proveedor}] Saldo inicial (snapshot): $${saldoEsperado.toFixed(2)}`);
    
    // ⚠️ CORRECCIÓN CRÍTICA: Sumar INCREMENTOS COMPLETOS (no depósitos)
    // Un incremento de $2,166 incluye: depósito ($2,000) + ganancia ($166)
    const incrementosAsignados = await IncrementoSaldo.sum('diferencia', {
      where: {
        proveedor,
        estado: 'asignado',
        fecha: { [Op.gt]: fechaSnapshot }
      }
    }) || 0;
    
    console.log(`[VERIFICACIÓN ${proveedor}] Incrementos asignados: $${incrementosAsignados.toFixed(2)}`);
    
    saldoEsperado += incrementosAsignados;
    
    // Restar recargas
    const recargasPost = await Recarga.sum('valor', {
      where: {
        proveedor,
        exitoso: true,
        fecha: { [Op.gt]: fechaSnapshot }
      }
    }) || 0;
    
    console.log(`[VERIFICACIÓN ${proveedor}] Recargas: $${recargasPost.toFixed(2)}`);
    
    saldoEsperado -= recargasPost;
    
    // Sumar comisiones (solo Movistar)
    let comisionesPost = 0;
    if (proveedor === 'movistar') {
      comisionesPost = await Recarga.sum('comision', {
        where: {
          proveedor,
          exitoso: true,
          comision: { [Op.ne]: null },
          fecha: { [Op.gt]: fechaSnapshot }
        }
      }) || 0;
      
      saldoEsperado += comisionesPost;
      console.log(`[VERIFICACIÓN ${proveedor}] Comisiones: $${comisionesPost.toFixed(2)}`);
    }
    
    console.log(`[VERIFICACIÓN ${proveedor}] Saldo esperado final: $${saldoEsperado.toFixed(2)}`);
    console.log(`[VERIFICACIÓN ${proveedor}] Saldo registrado: $${saldoRegistrado.toFixed(2)}`);
    
    const diferencia = saldoEsperado - saldoRegistrado;
    
    console.log(`[VERIFICACIÓN ${proveedor}] Diferencia: $${diferencia.toFixed(2)}`);
    
    // Verificar pendientes
    const incrementosPendientes = await IncrementoSaldo.count({
      where: {
        proveedor,
        estado: 'pendiente',
        fecha: { [Op.gt]: fechaSnapshot }
      }
    });
    
    const depositosPendientes = await Deposito.count({
      where: {
        proveedor,
        verificado: true,
        asignado: false,
        fecha: { [Op.gt]: fechaSnapshot }
      }
    });
    
    // Obtener info de depósitos para mostrar en detalles
    const depositosAsignados = await Deposito.sum('monto', {
      where: {
        proveedor,
        verificado: true,
        asignado: true,
        fecha: { [Op.gt]: fechaSnapshot }
      }
    }) || 0;
    
    // Calcular ganancia real
    const gananciaReal = incrementosAsignados - depositosAsignados;
    
    const hayPendientes = incrementosPendientes > 0 || depositosPendientes > 0;
    
    return {
      proveedor,
      saldoRegistrado: saldoRegistrado.toFixed(2),
      saldoEsperado: saldoEsperado.toFixed(2),
      diferencia: diferencia.toFixed(2),
      consistente: Math.abs(diferencia) < 10,
      incrementosPendientes,
      depositosPendientes,
      detalles: {
        saldoInicial: parseFloat(snapshot.saldo).toFixed(2),
        incrementosAsignados: incrementosAsignados.toFixed(2),
        depositosAsignados: depositosAsignados.toFixed(2),
        gananciaReal: gananciaReal.toFixed(2),
        recargasTotales: recargasPost.toFixed(2),
        comisionesTotales: comisionesPost.toFixed(2),
        fechaSnapshot: fechaSnapshot.toLocaleDateString(),
        formula: proveedor === 'general' 
          ? 'Esperado = Inicial + Incrementos - Recargas'
          : 'Esperado = Inicial + Incrementos - Recargas + Comisiones',
        nota: hayPendientes 
          ? `⚠️ Hay ${incrementosPendientes} incremento(s) y ${depositosPendientes} depósito(s) pendientes de asignar.`
          : '✅ Todos los incrementos y depósitos están asignados.',
        explicacion: `El cálculo usa incrementos completos ($${incrementosAsignados.toFixed(2)}) que incluyen depósitos ($${depositosAsignados.toFixed(2)}) + ganancia ($${gananciaReal.toFixed(2)})`
      }
    };
    
  } catch (error) {
    console.error('Error verificando consistencia:', error);
    throw error;
  }
}

// ==================== MÉTODO COMPLETO Y CORREGIDO ====================
// backend/services/contabilidadService.js
//
// REEMPLAZAR el método calcularPorcentajeRealMovistar() existente con este:

/**
 * Calcular métricas REALES de Movistar
 * 
 * Incluye:
 * - Cálculo de comisiones faltantes (usando cambio de saldo)
 * - ROI real considerando reinversión automática
 * - Desglose por operadora FILTRADO por periodo
 * 
 * @param {Object} params
 * @param {string} params.startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} params.endDate - Fecha fin (YYYY-MM-DD)
 * 
 * @returns {Object} Métricas completas
 */
async calcularMetricasRealesMovistar({ startDate, endDate }) {
  try {
    // ===== 1. FILTRO POR PERIODO =====
    const where = {
      proveedor: 'movistar',
      exitoso: true
    };
    
    if (startDate && endDate) {
      where.fecha = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // ===== 2. OBTENER RECARGAS (ordenadas cronológicamente) =====
    const recargas = await Recarga.findAll({
      where,
      order: [['fecha', 'ASC']],
      attributes: [
        'id',
        'fecha',
        'operadora',
        'valor',
        'comision',
        'saldoGestopago'
      ]
    });
    
    if (recargas.length === 0) {
      return {
        error: 'No hay recargas en el periodo seleccionado',
        periodo: { inicio: startDate, fin: endDate },
        totalInvertido: '0.00',
        totalComisionesReales: '0.00',
        cantidadRecargas: 0
      };
    }
    
    // ===== 3. OBTENER SALDO INICIAL (última recarga ANTES del periodo) =====
    const recargaAnterior = await Recarga.findOne({
      where: {
        proveedor: 'movistar',
        exitoso: true,
        fecha: { [Op.lt]: new Date(startDate) }
      },
      order: [['fecha', 'DESC']],
      attributes: ['saldoGestopago']
    });
    
    const saldoInicial = recargaAnterior ? parseFloat(recargaAnterior.saldoGestopago) : 0;
    
    // ===== 4. OBTENER INCREMENTOS DEL PERIODO =====
const incrementoResult = await IncrementoSaldo.findOne({
  where: {
    proveedor: 'movistar',
    fecha: {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    },
    // estado: 'completado' // si aplica
  },
  attributes: [[sequelize.fn('SUM', sequelize.col('diferencia')), 'total']],
  raw: true
});

const totalIncrementos = Number(incrementoResult?.total || 500);



    
    
    // ===== 5. CALCULAR COMISIONES REALES (registradas + calculadas) =====
    let totalInvertido = 0;
    let totalComisionesRegistradas = 0;
    let totalComisionesCalculadas = 0;
    let cantidadSinComision = 0;
    let saldoAnterior = saldoInicial;
    
    const recargasConComisionReal = recargas.map((recarga) => {
      const valor = parseFloat(recarga.valor) || 0;
      const comisionRegistrada = parseFloat(recarga.comision) || null;
      const saldoActual = parseFloat(recarga.saldoGestopago) || 0;
      
      totalInvertido += valor;
      
      let comisionReal = comisionRegistrada;
      let esCalculada = false;
      
      // Si no hay comisión registrada, calcularla por diferencia de saldo
      if (comisionRegistrada === null || comisionRegistrada === 0) {
        // Fórmula: Comisión = Saldo Actual - (Saldo Anterior - Valor)
        const saldoEsperadoSinComision = saldoAnterior - valor;
        comisionReal = saldoActual - saldoEsperadoSinComision;
        
        // Validar que sea razonable (entre 5% y 10%)
        const porcentajeCalculado = (comisionReal / valor) * 100;
        
        // Si está fuera del rango, usar promedio 7.2%
        if (porcentajeCalculado < 5 || porcentajeCalculado > 10) {
          comisionReal = valor * 0.072;
        }
        
        esCalculada = true;
        cantidadSinComision++;
        totalComisionesCalculadas += comisionReal;
      } else {
        totalComisionesRegistradas += comisionRegistrada;
      }
      
      // Actualizar saldo para la siguiente iteración
      saldoAnterior = saldoActual;
      
      return {
        id: recarga.id,
        fecha: recarga.fecha,
        operadora: recarga.operadora,
        valor: valor.toFixed(2),
        comisionReal: comisionReal.toFixed(2),
        esCalculada,
        saldoGestopago: saldoActual.toFixed(2)
      };
    });
    
    // ===== 6. TOTALES =====
    const totalComisionesReales = totalComisionesRegistradas + totalComisionesCalculadas;
    const saldoFinal = parseFloat(recargas[recargas.length - 1].saldoGestopago);
    const capitalInicial = saldoInicial + totalIncrementos;
    
    // ===== 7. PORCENTAJE DEL PERIODO (comisión promedio) =====
    const porcentajePeriodo = totalInvertido > 0 
      ? (totalComisionesReales / totalInvertido) * 100 
      : 0;
    
    // ===== 8. ROI REAL (considerando reinversión) =====
    // Fórmula: ((Saldo Final) - (Saldo Inicial + Incrementos)) / (Saldo Inicial + Incrementos) × 100
    const gananciaRealNeta = saldoFinal - capitalInicial;
    const roiReal = capitalInicial > 0 
      ? (gananciaRealNeta / capitalInicial) * 100 
      : 0;
    
    // ===== 9. DESGLOSE POR OPERADORA (DEL PERIODO) =====
    const detallesPorOperadora = {};
    
    recargasConComisionReal.forEach(recarga => {
      const op = recarga.operadora;
      if (!detallesPorOperadora[op]) {
        detallesPorOperadora[op] = {
          operadora: op,
          cantidad: 0,
          totalValor: 0,
          totalComision: 0,
          cantidadSinComision: 0
        };
      }
      
      detallesPorOperadora[op].cantidad++;
      detallesPorOperadora[op].totalValor += parseFloat(recarga.valor);
      detallesPorOperadora[op].totalComision += parseFloat(recarga.comisionReal);
      
      if (recarga.esCalculada) {
        detallesPorOperadora[op].cantidadSinComision++;
      }
    });
    
    const detallesArray = Object.values(detallesPorOperadora).map(op => ({
      operadora: op.operadora,
      cantidad: op.cantidad,
      totalValor: op.totalValor.toFixed(2),
      totalComision: op.totalComision.toFixed(2),
      promedioComision: (op.totalComision / op.cantidad).toFixed(2),
      porcentaje: ((op.totalComision / op.totalValor) * 100).toFixed(4),
      cantidadSinComision: op.cantidadSinComision
    }));
    
    // ===== 10. LOGS =====
    console.log(`\n📊 [MOVISTAR - MÉTRICAS REALES] ${startDate} a ${endDate}`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`💰 Saldo Inicial:       $${saldoInicial.toFixed(2)}`);
    console.log(`➕ Incrementos:         $${totalIncrementos.toFixed(2)}`);
    console.log(`📥 Capital Inicial:     $${capitalInicial.toFixed(2)}`);
    console.log(`───────────────────────────────────────────────────────`);
    console.log(`📤 Total Invertido:     $${totalInvertido.toFixed(2)}`);
    console.log(`✅ Comisiones Reales:   $${totalComisionesReales.toFixed(2)}`);
    console.log(`   - Registradas:       $${totalComisionesRegistradas.toFixed(2)}`);
    console.log(`   - Calculadas:        $${totalComisionesCalculadas.toFixed(2)}`);
    console.log(`───────────────────────────────────────────────────────`);
    console.log(`📤 Saldo Final:         $${saldoFinal.toFixed(2)}`);
    console.log(`💎 Ganancia Real Neta:  $${gananciaRealNeta.toFixed(2)}`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`📈 Porcentaje Periodo:  ${porcentajePeriodo.toFixed(4)}%`);
    console.log(`🎯 ROI REAL:            ${roiReal.toFixed(4)}%`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`📊 Recargas: ${recargas.length} | Sin comisión: ${cantidadSinComision}\n`);
    
    // ===== 11. RETORNAR RESULTADO COMPLETO =====
    return {
      // SALDOS
      saldoInicial: saldoInicial.toFixed(2),
      totalIncrementos: totalIncrementos.toFixed(2),
      capitalInicial: capitalInicial.toFixed(2),
      saldoFinal: saldoFinal.toFixed(2),
      
      // INVERSIÓN Y COMISIONES
      totalInvertido: totalInvertido.toFixed(2),
      totalComisionesReales: totalComisionesReales.toFixed(2),
      comisionesRegistradas: totalComisionesRegistradas.toFixed(2),
      comisionesCalculadas: totalComisionesCalculadas.toFixed(2),
      
      // PORCENTAJES
      porcentajePeriodo: porcentajePeriodo.toFixed(4),
      porcentajePeriodoRedondeado: porcentajePeriodo.toFixed(2),
      
      // ROI REAL
      gananciaRealNeta: gananciaRealNeta.toFixed(2),
      roiReal: roiReal.toFixed(4),
      roiRealRedondeado: roiReal.toFixed(2),
      
      // ESTADÍSTICAS
      cantidadRecargas: recargas.length,
      cantidadSinComision,
      porcentajeSinComision: ((cantidadSinComision / recargas.length) * 100).toFixed(2),
      promedioComision: (totalComisionesReales / recargas.length).toFixed(2),
      
      // DETALLES POR OPERADORA (DEL PERIODO)
      detallesPorOperadora: detallesArray,
      
      // INFORMACIÓN
      periodo: {
        inicio: startDate,
        fin: endDate
      },
      
      formulas: {
        porcentajePeriodo: 'Porcentaje = (Comisiones / Invertido) × 100',
        roiReal: 'ROI = ((Saldo Final) - (Saldo Inicial + Incrementos)) / (Saldo Inicial + Incrementos) × 100',
        comisionCalculada: 'Comisión = Saldo Actual - (Saldo Anterior - Valor Recarga)'
      },
      
      explicacion: `En el periodo ${startDate} a ${endDate}:
• Iniciaste con: $${saldoInicial.toFixed(2)}
• Inyectaste: $${totalIncrementos.toFixed(2)}
• Capital total: $${capitalInicial.toFixed(2)}
• Invertiste en recargas: $${totalInvertido.toFixed(2)}
• Ganaste en comisiones: $${totalComisionesReales.toFixed(2)} (${porcentajePeriodo.toFixed(2)}%)
• Saldo final: $${saldoFinal.toFixed(2)}
• Ganancia/Pérdida neta: $${gananciaRealNeta.toFixed(2)}
• ROI REAL: ${roiReal.toFixed(2)}% (considerando reinversión automática)${cantidadSinComision > 0 ? `
• Se calcularon ${cantidadSinComision} comisiones faltantes usando cambio de saldo` : ''}`
    };
    
  } catch (error) {
    console.error('❌ Error calculando métricas reales Movistar:', error);
    throw error;
  }
}

// ===== NOTAS DE IMPLEMENTACIÓN =====
/*
CAMBIOS CLAVE vs versión anterior:

1. ✅ Calcula comisiones faltantes usando: Saldo Actual - (Saldo Anterior - Valor)
2. ✅ Calcula ROI REAL considerando:
   - Saldo inicial
   - Incrementos inyectados
   - Saldo final
   - Efecto compuesto de reinversión
3. ✅ Desglose por operadora filtra por periodo (startDate, endDate)
4. ✅ Retorna AMBAS métricas:
   - Porcentaje del Periodo: 7.20% (comisión promedio)
   - ROI Real: +X% o -X% (ganancia/pérdida neta)

IMPORTANTE:
- Este método REEMPLAZA completamente el anterior calcularPorcentajeRealMovistar()
- También necesitas actualizar el endpoint (ver archivo siguiente)
- El frontend necesita actualizarse para mostrar ROI Real
*/

/**
 * Calcular porcentaje acumulado con múltiples reinversiones
 * Formula: (1 + r)^n - 1, donde r = porcentaje/100, n = reinversiones
 * 
 * Ejemplo: 
 * - Porcentaje: 7.19%
 * - Reinversiones: 10
 * - Resultado: 7.52% acumulado
 */
calcularPorcentajeAcumulado(porcentajePeriodo, numReinversiones = 10) {
  const r = porcentajePeriodo / 100;
  const factorAcumulado = Math.pow(1 + r, numReinversiones);
  const porcentajeAcumulado = (factorAcumulado - 1) * 100;
  return porcentajeAcumulado;
}}

module.exports = new ContabilidadService();