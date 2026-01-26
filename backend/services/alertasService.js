// backend/services/alertasService.js
const { Op } = require('sequelize');
const IncrementoSaldo = require('../models/IncrementoSaldo');
const Deposito = require('../models/Deposito');
const Recarga = require('../models/Recarga');
const AjusteSaldo = require('../models/AjusteSaldo');
const ConfiguracionSistema = require('../models/ConfiguracionSistema');

class AlertasService {
  
  /**
   * Obtener todas las alertas activas
   */
  async obtenerAlertasActivas() {
    try {
      const alertas = [];
      
      // 1. Incrementos pendientes
      const incrementosPendientes = await this.verificarIncrementosPendientes();
      alertas.push(...incrementosPendientes);
      
      // 2. Depósitos sin asignar
      const depositosSinAsignar = await this.verificarDepositosSinAsignar();
      alertas.push(...depositosSinAsignar);
      
      // 3. Ajustes pendientes de aprobación
      const ajustesPendientes = await this.verificarAjustesPendientes();
      alertas.push(...ajustesPendientes);
      
      // 4. Inconsistencias de saldo
      const inconsistencias = await this.verificarInconsistencias();
      alertas.push(...inconsistencias);
      
      // Ordenar por prioridad
      return alertas.sort((a, b) => b.prioridad - a.prioridad);
      
    } catch (error) {
      console.error('Error obteniendo alertas:', error);
      return [];
    }
  }
  
  /**
   * Verificar incrementos pendientes
   */
  async verificarIncrementosPendientes() {
    const incrementos = await IncrementoSaldo.findAll({
      where: { estado: 'pendiente' },
      include: [{
        model: Recarga,
        attributes: ['id', 'folio', 'operadora', 'fecha']
      }],
      order: [['fecha', 'DESC']]
    });
    
    return incrementos.map(inc => {
      const horasTranscurridas = this.calcularHorasTranscurridas(inc.fecha);
      
      return {
        tipo: 'incremento_pendiente',
        prioridad: horasTranscurridas > 24 ? 3 : horasTranscurridas > 12 ? 2 : 1,
        urgencia: horasTranscurridas > 24 ? 'alta' : horasTranscurridas > 12 ? 'media' : 'baja',
        titulo: `Incremento ${inc.proveedor} pendiente`,
        mensaje: `$${parseFloat(inc.diferencia).toFixed(2)} detectado hace ${horasTranscurridas}h`,
        monto: parseFloat(inc.diferencia).toFixed(2),
        proveedor: inc.proveedor,
        tipoIncremento: inc.tipoIncremento,
        fecha: inc.fecha,
        horasTranscurridas,
        id: inc.id,
        enlace: `/incrementos/${inc.id}`
      };
    });
  }
  
  /**
   * Verificar depósitos sin asignar
   */
  async verificarDepositosSinAsignar() {
    const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    const depositos = await Deposito.findAll({
      where: {
        asignado: false,
        verificado: true,
        fecha: { [Op.gte]: hace48h }
      },
      order: [['fecha', 'DESC']]
    });
    
    return depositos.map(dep => {
      const horasTranscurridas = this.calcularHorasTranscurridas(dep.fecha);
      
      return {
        tipo: 'deposito_sin_asignar',
        prioridad: horasTranscurridas > 48 ? 2 : 1,
        urgencia: horasTranscurridas > 48 ? 'media' : 'baja',
        titulo: `Depósito ${dep.proveedor} sin asignar`,
        mensaje: `$${parseFloat(dep.monto).toFixed(2)} esperando asignación`,
        monto: parseFloat(dep.monto).toFixed(2),
        proveedor: dep.proveedor,
        fecha: dep.fecha,
        horasTranscurridas,
        id: dep.id,
        enlace: `/depositos/${dep.id}`
      };
    });
  }
  
  /**
   * Verificar ajustes pendientes
   */
  async verificarAjustesPendientes() {
    const ajustes = await AjusteSaldo.findAll({
      where: { estado: 'pendiente' },
      order: [['fecha', 'DESC']]
    });
    
    return ajustes.map(ajuste => {
      const horasTranscurridas = this.calcularHorasTranscurridas(ajuste.fecha);
      
      return {
        tipo: 'ajuste_pendiente',
        prioridad: 2,
        urgencia: 'media',
        titulo: `Ajuste ${ajuste.proveedor} pendiente aprobación`,
        mensaje: `${ajuste.tipoAjuste}: $${parseFloat(ajuste.diferencia).toFixed(2)}`,
        monto: parseFloat(Math.abs(ajuste.diferencia)).toFixed(2),
        proveedor: ajuste.proveedor,
        fecha: ajuste.fecha,
        horasTranscurridas,
        id: ajuste.id,
        enlace: `/ajustes/${ajuste.id}`
      };
    });
  }
  
  /**
   * Verificar inconsistencias de saldo
   */
  async verificarInconsistencias() {
    const contabilidadService = require('./contabilidadService');
    const alertas = [];
    
    for (const proveedor of ['general', 'movistar']) {
      try {
        const consistencia = await contabilidadService.verificarConsistencia(proveedor);
        
        if (!consistencia.consistente) {
          alertas.push({
            tipo: 'inconsistencia_saldo',
            prioridad: 3,
            urgencia: 'alta',
            titulo: `⚠️ Inconsistencia en ${proveedor}`,
            mensaje: `Diferencia de $${consistencia.diferencia}`,
            monto: Math.abs(parseFloat(consistencia.diferencia)).toFixed(2),
            proveedor,
            fecha: new Date(),
            horasTranscurridas: 0,
            detalles: consistencia,
            enlace: `/verificacion/${proveedor}`
          });
        }
      } catch (error) {
        console.error(`Error verificando ${proveedor}:`, error);
      }
    }
    
    return alertas;
  }
  
  /**
   * Calcular horas transcurridas
   */
  calcularHorasTranscurridas(fecha) {
    const ahora = new Date();
    const fechaEvento = new Date(fecha);
    const diffMs = ahora - fechaEvento;
    return Math.floor(diffMs / (1000 * 60 * 60));
  }
  
  /**
   * Obtener estadísticas de alertas
   */
  async obtenerEstadisticas() {
    const alertas = await this.obtenerAlertasActivas();
    
    return {
      total: alertas.length,
      porTipo: {
        incrementos: alertas.filter(a => a.tipo === 'incremento_pendiente').length,
        depositos: alertas.filter(a => a.tipo === 'deposito_sin_asignar').length,
        ajustes: alertas.filter(a => a.tipo === 'ajuste_pendiente').length,
        inconsistencias: alertas.filter(a => a.tipo === 'inconsistencia_saldo').length
      },
      porUrgencia: {
        alta: alertas.filter(a => a.urgencia === 'alta').length,
        media: alertas.filter(a => a.urgencia === 'media').length,
        baja: alertas.filter(a => a.urgencia === 'baja').length
      },
      porProveedor: {
        general: alertas.filter(a => a.proveedor === 'general').length,
        movistar: alertas.filter(a => a.proveedor === 'movistar').length
      }
    };
  }
  
  /**
   * Marcar alerta como vista
   */
  async marcarComoVista(tipo, id) {
    // Implementar lógica según el tipo
    // Por ahora solo retornamos success
    return { success: true };
  }
}

module.exports = new AlertasService();