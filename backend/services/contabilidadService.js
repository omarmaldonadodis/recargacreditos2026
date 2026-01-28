// backend/services/contabilidadService.js
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
      const saldoEsperado = saldoAnterior - valor + comision;
      const diferencia = saldoNuevo - saldoEsperado;
      
      console.log(`🔍 [GENERAL] Esperado=$${saldoEsperado.toFixed(2)}, Real=$${saldoNuevo.toFixed(2)}, Diferencia=$${diferencia.toFixed(2)}`);
      
      // Umbral para detectar depósito: > $50
      if (diferencia > 50) {
        const incremento = await IncrementoSaldo.create({
          saldoAnterior,
          saldoNuevo,
          diferencia,
          tipoIncremento: 'deposito_inicial',
          proveedor: 'general',
          operadora,
          RecargaId,
          fecha: new Date(),
          estado: 'pendiente'
        });
        
        // Registrar evento
        await this.registrarEvento({
          proveedor: 'general',
          saldo: saldoNuevo,
          tipoEvento: 'deposito_detectado',
          detalles: {
            diferencia: diferencia.toFixed(2),
            incrementoId: incremento.id,
            saldoEsperado: saldoEsperado.toFixed(2)
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
        const incremento = await IncrementoSaldo.create({
          saldoAnterior,
          saldoNuevo,
          diferencia,
          tipoIncremento: 'deposito_inicial',
          proveedor: 'movistar',
          operadora,
          RecargaId,
          fecha: new Date(),
          estado: 'pendiente'
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
          estado: 'pendiente'
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
   * Calcular ganancias reales por proveedor
   */
  // backend/services/contabilidadService.js

async calcularGanancias({ proveedor, startDate, endDate }) {
  try {
    // Obtener fecha de inicio del sistema
    const configFechaInicio = await ConfiguracionSistema.findOne({
      where: { clave: 'fecha_inicio_contabilidad' }
    });
    
    const fechaInicioSistema = configFechaInicio 
      ? new Date(configFechaInicio.valor)
      : null;
    
    // Si no hay startDate, usar la fecha de inicio del sistema
    const fechaInicioPeriodo = startDate 
      ? new Date(startDate) 
      : (fechaInicioSistema || new Date('2000-01-01'));
    
    const fechaFinPeriodo = endDate ? new Date(endDate) : new Date();
    
    const where = { 
      proveedor,
      fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
    };
    
    // Total depositado (solo depósitos verificados en el período)
    const depositos = await Deposito.sum('monto', {
      where: { 
        proveedor, 
        verificado: true,
        fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
      }
    }) || 0;
    
    // Saldo actual
    const ultimaRecarga = await Recarga.findOne({
      where: { proveedor, saldoGestopago: { [Op.ne]: null } },
      order: [['fecha', 'DESC']]
    });
    const saldoActual = parseFloat(ultimaRecarga?.saldoGestopago || 0);
    
    // Saldo inicial del período
    let saldoInicial = 0;
    
    if (fechaInicioSistema && fechaInicioPeriodo <= fechaInicioSistema) {
      // Si el período incluye el inicio del sistema, usar saldo inicial configurado
      const configSaldoInicial = await ConfiguracionSistema.findOne({
        where: { clave: `saldo_inicial_${proveedor}` }
      });
      
      saldoInicial = configSaldoInicial ? parseFloat(configSaldoInicial.valor) : 0;
      
    } else {
      // Obtener saldo al inicio del período
      const recargaInicial = await Recarga.findOne({
        where: {
          proveedor,
          saldoGestopago: { [Op.ne]: null },
          fecha: { [Op.lt]: fechaInicioPeriodo }
        },
        order: [['fecha', 'DESC']]
      });
      
      saldoInicial = parseFloat(recargaInicial?.saldoGestopago || 0);
    }
    
    // Total recargado SOLO en el período
    const totalRecargado = await Recarga.sum('valor', {
      where: {
        proveedor,
        exitoso: true,
        fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
      }
    }) || 0;
    
    // Total comisiones SOLO en el período
    const totalComisiones = await Recarga.sum('comision', {
      where: {
        proveedor,
        exitoso: true,
        comision: { [Op.ne]: null },
        fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
      }
    }) || 0;
    
    // Incluir incrementos iniciales del sistema en el período
    const incrementosIniciales = await IncrementoSaldo.sum('diferencia', {
      where: {
        proveedor,
        tipoIncremento: 'deposito_inicial',
        estado: 'verificado',
        fecha: { [Op.between]: [fechaInicioPeriodo, fechaFinPeriodo] }
      }
    }) || 0;
    
    let gananciaReal = 0;
    let formula = '';
    
    if (proveedor === 'general') {
      // General: (Saldo actual + Total recargado) - (Saldo inicial + Total depositado) + Incrementos iniciales
      gananciaReal = (saldoActual + totalRecargado) - (saldoInicial + depositos) + incrementosIniciales;
      formula = '(SaldoActual + Recargado) - (SaldoInicial + Depositado) + IncremInicial';
    } else {
      // Movistar: Suma de comisiones + Incrementos iniciales
      gananciaReal = totalComisiones + incrementosIniciales;
      formula = 'Σ Comisiones + IncrementosIniciales';
    }
    
    const porcentajeGanancia = (depositos + incrementosIniciales) > 0
      ? ((gananciaReal / (depositos + incrementosIniciales)) * 100).toFixed(2)
      : '0.00';
    
    return {
      proveedor,
      saldoInicial: saldoInicial.toFixed(2),
      totalDepositado: depositos.toFixed(2),
      incrementosIniciales: incrementosIniciales.toFixed(2),
      totalRecargado: totalRecargado.toFixed(2),
      saldoActual: saldoActual.toFixed(2),
      totalComisiones: totalComisiones.toFixed(2),
      gananciaReal: gananciaReal.toFixed(2),
      porcentajeGanancia: `${porcentajeGanancia}%`,
      formula,
      fechaInicioPeriodo: fechaInicioPeriodo.toISOString().split('T')[0],
      fechaFinPeriodo: fechaFinPeriodo.toISOString().split('T')[0]
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
      // Obtener saldo actual
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
   * Verificar consistencia de saldos
   */
  // backend/services/contabilidadService.js
// REEMPLAZAR SOLO ESTE MÉTODO

async verificarConsistencia(proveedor) {
  try {
    // 1. Verificar si existe incremento inicial (depósito inicial del sistema)
    const incrementoInicial = await IncrementoSaldo.findOne({
      where: {
        proveedor,
        tipoIncremento: 'deposito_inicial',
        estado: { [Op.in]: ['pendiente', 'asignado', 'verificado'] }
      },
      order: [['fecha', 'ASC']] // El primero cronológicamente
    });
    
    let saldoRegistrado;
    let fechaInicio;
    
    if (incrementoInicial) {
      // ===== HAY INCREMENTO INICIAL - USAR COMO SALDO BASE =====
      console.log(`📸 Usando incremento inicial #${incrementoInicial.id} como base`);
      
      saldoRegistrado = parseFloat(incrementoInicial.saldoNuevo);
      fechaInicio = new Date(incrementoInicial.fecha);
      
    } else {
      // ===== NO HAY INCREMENTO INICIAL - USAR ÚLTIMA RECARGA =====
      console.log(`📊 No hay incremento inicial, usando última recarga`);
      
      const ultimaRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      
      saldoRegistrado = parseFloat(ultimaRecarga?.saldoGestopago || 0);
      fechaInicio = null;
    }
    
    // 2. Calcular saldo esperado
    let saldoEsperado = saldoRegistrado;
    let detalles;
    
    if (fechaInicio) {
      // ===== CÁLCULO DESDE INCREMENTO INICIAL =====
      
      // Sumar depósitos DESPUÉS del incremento inicial
      const depositosPost = await Deposito.sum('monto', {
        where: {
          proveedor,
          verificado: true,
          fecha: { [Op.gt]: fechaInicio }
        }
      }) || 0;
      
      saldoEsperado += depositosPost;
      
      // Restar recargas DESPUÉS del incremento inicial
      const recargasPost = await Recarga.sum('valor', {
        where: {
          proveedor,
          exitoso: true,
          fecha: { [Op.gt]: fechaInicio }
        }
      }) || 0;
      
      saldoEsperado -= recargasPost;
      
      // Sumar comisiones DESPUÉS del incremento inicial (Movistar)
      let comisionesPost = 0;
      if (proveedor === 'movistar') {
        comisionesPost = await Recarga.sum('comision', {
          where: {
            proveedor,
            exitoso: true,
            comision: { [Op.ne]: null },
            fecha: { [Op.gt]: fechaInicio }
          }
        }) || 0;
        
        saldoEsperado += comisionesPost;
      }
      
      detalles = {
        incrementoInicial: true,
        incrementoId: incrementoInicial.id,
        saldoBase: parseFloat(incrementoInicial.saldoNuevo).toFixed(2),
        fechaInicio: fechaInicio.toLocaleDateString(),
        depositosDesdeInicio: depositosPost.toFixed(2),
        recargasDesdeInicio: recargasPost.toFixed(2),
        comisionesDesdeInicio: comisionesPost.toFixed(2),
        calculoDesde: 'incremento_inicial',
        estado: incrementoInicial.estado
      };
      
    } else {
      // ===== CÁLCULO SIN INCREMENTO INICIAL (TRADICIONAL) =====
      
      const primeraRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'ASC']]
      });
      
      saldoEsperado = parseFloat(primeraRecarga?.saldoGestopago || 0);
      
      const depositos = await Deposito.sum('monto', {
        where: { proveedor, verificado: true }
      }) || 0;
      
      saldoEsperado += depositos;
      
      const totalRecargado = await Recarga.sum('valor', {
        where: { proveedor, exitoso: true }
      }) || 0;
      
      saldoEsperado -= totalRecargado;
      
      if (proveedor === 'movistar') {
        const totalComisiones = await Recarga.sum('comision', {
          where: { proveedor, exitoso: true, comision: { [Op.ne]: null } }
        }) || 0;
        
        saldoEsperado += totalComisiones;
      }
      
      detalles = {
        incrementoInicial: false,
        saldoInicial: parseFloat(primeraRecarga?.saldoGestopago || 0).toFixed(2),
        depositosTotales: depositos.toFixed(2),
        recargasTotales: totalRecargado.toFixed(2),
        calculoDesde: 'sin_incremento_inicial',
        nota: 'Ejecuta el script registrar-saldo-inicial.js para establecer punto de partida'
      };
    }
    
    const diferencia = saldoEsperado - saldoRegistrado;
    
    return {
      proveedor,
      saldoRegistrado: saldoRegistrado.toFixed(2),
      saldoEsperado: saldoEsperado.toFixed(2),
      diferencia: diferencia.toFixed(2),
      consistente: Math.abs(diferencia) < 10,
      detalles,
      tieneIncrementoInicial: incrementoInicial !== null
    };
    
  } catch (error) {
    console.error('Error verificando consistencia:', error);
    throw error;
  }
}
}

module.exports = new ContabilidadService();