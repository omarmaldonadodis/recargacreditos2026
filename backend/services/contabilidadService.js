// backend/services/contabilidadService.js
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const SaldoProveedor = require('../models/SaldoProveedor');
const IncrementoSaldo = require('../models/IncrementoSaldo');
const Deposito = require('../models/Deposito');
const Recarga = require('../models/Recarga');
const AjusteSaldo = require('../models/AjusteSaldo');

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
  async calcularGanancias({ proveedor, startDate, endDate }) {
    try {
      const where = { proveedor };
      if (startDate && endDate) {
        where.fecha = { [Op.between]: [new Date(startDate), new Date(endDate)] };
      }
      
      // Total depositado
      const depositos = await Deposito.sum('monto', {
        where: { ...where, verificado: true }
      }) || 0;
      
      // Saldo actual
      const ultimaRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      const saldoActual = parseFloat(ultimaRecarga?.saldoGestopago || 0);
      
      // Saldo inicial del período
      let saldoInicial = 0;
      if (startDate) {
        const recargaInicial = await Recarga.findOne({
          where: {
            proveedor,
            saldoGestopago: { [Op.ne]: null },
            fecha: { [Op.lt]: new Date(startDate) }
          },
          order: [['fecha', 'DESC']]
        });
        saldoInicial = parseFloat(recargaInicial?.saldoGestopago || 0);
      }
      
      // Total recargado
      const totalRecargado = await Recarga.sum('valor', {
        where: { ...where, exitoso: true }
      }) || 0;
      
      // Total comisiones
      const totalComisiones = await Recarga.sum('comision', {
        where: { ...where, exitoso: true, comision: { [Op.ne]: null } }
      }) || 0;
      
      let gananciaReal = 0;
      let formula = '';
      
      if (proveedor === 'general') {
        // General: (Saldo actual + Total recargado) - (Saldo inicial + Total depositado)
        gananciaReal = (saldoActual + totalRecargado) - (saldoInicial + depositos);
        formula = '(SaldoActual + TotalRecargado) - (SaldoInicial + TotalDepositado)';
      } else {
        // Movistar: Suma de comisiones
        gananciaReal = totalComisiones;
        formula = 'Σ Comisiones de recargas';
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
        formula
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
  async verificarConsistencia(proveedor) {
    try {
      // Último saldo registrado
      const ultimaRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      
      const saldoRegistrado = parseFloat(ultimaRecarga?.saldoGestopago || 0);
      
      // Calcular saldo esperado desde el inicio
      const primeraRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'ASC']]
      });
      
      let saldoEsperado = parseFloat(primeraRecarga?.saldoGestopago || 0);
      
      // Sumar depósitos
      const depositos = await Deposito.sum('monto', {
        where: { proveedor, verificado: true }
      }) || 0;
      
      saldoEsperado += depositos;
      
      // Restar recargas
      const totalRecargado = await Recarga.sum('valor', {
        where: { proveedor, exitoso: true }
      }) || 0;
      
      saldoEsperado -= totalRecargado;
      
      // Sumar comisiones (si aplica)
      if (proveedor === 'movistar') {
        const totalComisiones = await Recarga.sum('comision', {
          where: { proveedor, exitoso: true, comision: { [Op.ne]: null } }
        }) || 0;
        
        saldoEsperado += totalComisiones;
      }
      
      const diferencia = saldoRegistrado - saldoEsperado;
      
      return {
        proveedor,
        saldoRegistrado: saldoRegistrado.toFixed(2),
        saldoEsperado: saldoEsperado.toFixed(2),
        diferencia: diferencia.toFixed(2),
        consistente: Math.abs(diferencia) < 10,
        detalles: {
          saldoInicial: parseFloat(primeraRecarga?.saldoGestopago || 0).toFixed(2),
          depositosTotales: depositos.toFixed(2),
          recargasTotales: totalRecargado.toFixed(2)
        }
      };
    } catch (error) {
      console.error('Error verificando consistencia:', error);
      throw error;
    }
  }
}

module.exports = new ContabilidadService();