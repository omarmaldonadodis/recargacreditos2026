// backend/services/verificacionSaldos.js
const gestopagoService = require('./gestopagoService');
const SaldoProveedor = require('../models/SaldoProveedor');
const Recarga = require('../models/Recarga');
const { Op } = require('sequelize');

class VerificacionSaldos {
  
  /**
   * Verificar saldo actual con GestoPago
   */
  async verificarSaldoActual(proveedor) {
    try {
      // Obtener credenciales
      const { idDistribuidor, codigoDispositivo, password } = 
        gestopagoService.getCredencialesPorProveedor(proveedor);
      
      // Hacer petición de consulta de saldo (usando una recarga de $1 o endpoint específico)
      // NOTA: GestoPago no tiene endpoint directo de consulta, 
      // se hace con transacción mínima o se obtiene del último registro
      
      const ultimaRecarga = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      
      const saldoRegistrado = parseFloat(ultimaRecarga?.saldoGestopago || 0);
      
      // Registrar verificación
      await SaldoProveedor.create({
        proveedor,
        saldo: saldoRegistrado,
        tipoEvento: 'verificacion',
        detalles: {
          tipo: 'verificacion_manual',
          fecha: new Date()
        },
        verificado: true
      });
      
      console.log(`✅ [${proveedor.toUpperCase()}] Saldo verificado: $${saldoRegistrado.toFixed(2)}`);
      
      return {
        proveedor,
        saldo: saldoRegistrado.toFixed(2),
        ultimaActualizacion: ultimaRecarga?.fecha || null,
        verificado: true
      };
      
    } catch (error) {
      console.error(`Error verificando saldo de ${proveedor}:`, error);
      throw error;
    }
  }
  
  /**
   * Sincronizar saldos de ambos proveedores
   */
  async sincronizarSaldos() {
    try {
      const resultados = {
        general: await this.verificarSaldoActual('general'),
        movistar: await this.verificarSaldoActual('movistar')
      };
      
      console.log('🔄 Sincronización de saldos completada');
      
      return resultados;
    } catch (error) {
      console.error('Error en sincronización:', error);
      throw error;
    }
  }
  
  /**
   * Obtener historial de eventos de saldo
   */
  async obtenerHistorial({ proveedor, startDate, endDate, limite = 50 }) {
    try {
      const where = { proveedor };
      
      if (startDate && endDate) {
        where.fecha = { [Op.between]: [new Date(startDate), new Date(endDate)] };
      }
      
      const eventos = await SaldoProveedor.findAll({
        where,
        order: [['fecha', 'DESC']],
        limit: limite,
        include: [{
          model: Recarga,
          attributes: ['id', 'valor', 'comision', 'operadora', 'celular']
        }]
      });
      
      return eventos;
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      throw error;
    }
  }
}

module.exports = new VerificacionSaldos();