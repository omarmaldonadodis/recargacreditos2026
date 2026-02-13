// backend/routes/incrementos.js - VERSIÓN COMPLETA
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// Modelos
const IncrementoSaldo = require('../models/IncrementoSaldo');
const Deposito = require('../models/Deposito');
const AsignacionDeposito = require('../models/AsignacionDeposito');
const ConfiguracionSistema = require('../models/ConfiguracionSistema');
const Usuario = require('../models/Usuario');
const Recarga = require('../models/Recarga');
const SaldoProveedor = require('../models/SaldoProveedor');
const AjusteSaldo = require('../models/AjusteSaldo');

// Servicios
const contabilidadService = require('../services/contabilidadService');
const verificacionSaldos = require('../services/verificacionSaldos');

// Middleware admin
const soloAdmin = (req, res, next) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
};

// ============= CONFIGURACIÓN =============

router.get('/configuracion/deteccion', authenticateToken, soloAdmin, async (req, res) => {
  try {
    let config = await ConfiguracionSistema.findOne({
      where: { clave: 'deteccion_incrementos_habilitada' }
    });
    
    if (!config) {
      config = await ConfiguracionSistema.create({
        clave: 'deteccion_incrementos_habilitada',
        valor: 'false',
        descripcion: 'Detección automática de incrementos de saldo'
      });
    }
    
    res.json({ habilitada: config.valor === 'true' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/configuracion/deteccion', authenticateToken, soloAdmin, async (req, res) => {
  const { habilitada } = req.body;
  
  try {
    const [config] = await ConfiguracionSistema.findOrCreate({
      where: { clave: 'deteccion_incrementos_habilitada' },
      defaults: {
        valor: habilitada ? 'true' : 'false',
        descripcion: 'Detección automática de incrementos de saldo'
      }
    });
    
    config.valor = habilitada ? 'true' : 'false';
    await config.save();
    
    res.json({ 
      mensaje: `Detección ${habilitada ? 'habilitada' : 'deshabilitada'}`,
      habilitada: config.valor === 'true'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= DEPÓSITOS =============

router.post('/depositos', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { monto, usuarioId, proveedor, operadora, tipoDeposito, referencia, notas } = req.body;

    if (!monto || !usuarioId || !proveedor) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: monto, usuarioId, proveedor' 
      });
    }

    const montoNum = parseFloat(monto);
    if (montoNum <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    // Validar que el monto no supere el incremento máximo
    const incrementosPendientes = await IncrementoSaldo.findAll({
      where: { proveedor, estado: 'pendiente' },
      order: [['diferencia', 'DESC']],
      limit: 1
    });

    if (incrementosPendientes.length > 0) {
      const incrementoMaximo = parseFloat(incrementosPendientes[0].diferencia);
      
      if (montoNum > incrementoMaximo) {
        return res.status(400).json({ 
          error: `El monto ($${montoNum.toFixed(2)}) supera el incremento máximo disponible ($${incrementoMaximo.toFixed(2)}) para ${proveedor}` 
        });
      }
    }

    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const nuevoDeposito = await Deposito.create({
      monto: montoNum,
      UsuarioId: usuarioId,
      proveedor,
      operadora,
      tipoDeposito: tipoDeposito || 'efectivo',
      referencia,
      notas,
      asignado: false,
      verificado: false,
      fecha: new Date()
    });

    console.log(`✅ Depósito registrado: $${montoNum.toFixed(2)} de ${usuario.nombres_apellidos || usuario.nombre_tienda} (${proveedor})`);

    res.status(201).json({
      mensaje: 'Depósito registrado exitosamente',
      deposito: nuevoDeposito
    });

  } catch (error) {
    console.error('❌ Error al registrar depósito:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/depositos', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor, asignado, verificado, startDate, endDate } = req.query;
    
    const where = {};
    if (proveedor) where.proveedor = proveedor;
    if (asignado !== undefined) where.asignado = asignado === 'true';
    if (verificado !== undefined) where.verificado = verificado === 'true';
    
    if (startDate && endDate) {
      where.fecha = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }
    
    const depositos = await Deposito.findAll({
      where,
      include: [{
        model: Usuario,
        attributes: ['id', 'nombres_apellidos', 'nombre_tienda', 'rol']
      }],
      order: [['fecha', 'DESC']]
    });
    
    res.json(depositos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/depositos/:id', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { monto, notas, verificado } = req.body;

  try {
    const deposito = await Deposito.findByPk(id);

    if (!deposito) {
      return res.status(404).json({ error: 'Depósito no encontrado' });
    }

    if (deposito.asignado && monto !== undefined) {
      return res.status(400).json({ 
        error: 'No se puede editar el monto de un depósito asignado' 
      });
    }

    if (monto !== undefined) {
      deposito.monto = parseFloat(monto);
    }
    if (notas !== undefined) {
      deposito.notas = notas;
    }
    if (verificado !== undefined) {
      deposito.verificado = verificado;
      deposito.verificadoPor = req.user.id;
      deposito.fechaVerificacion = new Date();
    }

    await deposito.save();

    res.json({ 
      mensaje: 'Depósito actualizado exitosamente',
      deposito
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/depositos/:id', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const deposito = await Deposito.findByPk(id);

    if (!deposito) {
      return res.status(404).json({ error: 'Depósito no encontrado' });
    }

    if (deposito.asignado) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un depósito asignado' 
      });
    }

    await deposito.destroy();

    res.json({ 
      mensaje: 'Depósito eliminado exitosamente',
      depositoId: id
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= INCREMENTOS =============

router.get('/incrementos', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { estado, proveedor, tipoIncremento, startDate, endDate } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (proveedor) where.proveedor = proveedor;
    if (tipoIncremento) where.tipoIncremento = tipoIncremento;
    
    if (startDate && endDate) {
      where.fecha = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }
    
    const incrementos = await IncrementoSaldo.findAll({
      where,
      order: [['fecha', 'DESC']],
      limit: 100,
      include: [{
        model: Recarga,
        attributes: ['id', 'folio', 'operadora', 'valor']
      }]
    });
    
    res.json(incrementos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/incrementos/:id', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id, {
      include: [
        {
          model: Deposito,
          as: 'depositos',
          through: { attributes: ['montoAsignado'] },
          include: [{
            model: Usuario,
            attributes: ['id', 'nombres_apellidos', 'nombre_tienda', 'rol']
          }]
        },
        {
          model: Recarga,
          attributes: ['id', 'folio', 'operadora', 'valor', 'comision']
        }
      ]
    });
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    let totalDepositado = 0;
    const depositosDetalle = [];
    
    if (incremento.depositos && incremento.depositos.length > 0) {
      for (const deposito of incremento.depositos) {
        const monto = parseFloat(deposito.AsignacionDeposito.montoAsignado);
        totalDepositado += monto;
        
        depositosDetalle.push({
          depositoId: deposito.id,
          monto: monto.toFixed(2),
          usuario: deposito.Usuario.nombres_apellidos || deposito.Usuario.nombre_tienda,
          rol: deposito.Usuario.rol
        });
      }
    }
    
    const diferenciaIncremento = parseFloat(incremento.diferencia);
    const ganancia = diferenciaIncremento - totalDepositado;
    const porcentajeGanancia = diferenciaIncremento > 0 
      ? ((ganancia / diferenciaIncremento) * 100).toFixed(2)
      : 0;
    
    res.json({
      id: incremento.id,
      saldoAnterior: parseFloat(incremento.saldoAnterior).toFixed(2),
      saldoNuevo: parseFloat(incremento.saldoNuevo).toFixed(2),
      diferencia: diferenciaIncremento.toFixed(2),
      tipoIncremento: incremento.tipoIncremento,
      proveedor: incremento.proveedor,
      operadora: incremento.operadora,
      estado: incremento.estado,
      fecha: incremento.fecha,
      notas: incremento.notas,
      
      // Comisiones (Movistar)
      comisionAcumulada: incremento.comisionAcumulada 
        ? parseFloat(incremento.comisionAcumulada).toFixed(2) 
        : null,
      cantidadRecargasComision: incremento.cantidadRecargasComision || null,
      
      // Depósitos asignados
      depositos: depositosDetalle,
      totalDepositado: totalDepositado.toFixed(2),
      ganancia: ganancia.toFixed(2),
      porcentajeGanancia: `${porcentajeGanancia}%`,
      
      // Recarga origen
      recarga: incremento.Recarga || null
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/notificaciones', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor } = req.query;

    const where = { estado: 'pendiente' };
    if (proveedor) where.proveedor = proveedor;

    const incrementos = await IncrementoSaldo.findAll({
      where,
      order: [['fecha', 'DESC']],
      include: [{
        model: Recarga,
        attributes: ['id', 'folio', 'operadora']
      }]
    });

    res.json({
      incrementos,
      conteo: incrementos.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/incrementos/:id/asignar', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { depositosIds, notas } = req.body;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id);
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    if (incremento.estado !== 'pendiente') {
      return res.status(400).json({ error: 'Este incremento ya fue procesado' });
    }
    
    const depositos = await Deposito.findAll({
      where: {
        id: { [Op.in]: depositosIds },
        asignado: false
      }
    });
    
    if (depositos.length !== depositosIds.length) {
      return res.status(400).json({ 
        error: 'Algunos depósitos no existen o ya están asignados' 
      });
    }
    
    const depositosIncorrectos = depositos.filter(d => d.proveedor !== incremento.proveedor);
    if (depositosIncorrectos.length > 0) {
      return res.status(400).json({ 
        error: `Los depósitos deben ser del mismo proveedor (${incremento.proveedor})` 
      });
    }
    
    const sumaDepositos = depositos.reduce((sum, d) => sum + parseFloat(d.monto), 0);
    const diferenciaIncremento = parseFloat(incremento.diferencia);
    
    if (sumaDepositos > diferenciaIncremento) {
      return res.status(400).json({ 
        error: `La suma de depósitos ($${sumaDepositos.toFixed(2)}) supera el incremento ($${diferenciaIncremento.toFixed(2)})` 
      });
    }
    
    const ganancia = diferenciaIncremento - sumaDepositos;
    const porcentajeGanancia = ((ganancia / diferenciaIncremento) * 100).toFixed(2);
    
    const transaction = await sequelize.transaction();
    
    try {
      for (const deposito of depositos) {
        await AsignacionDeposito.create({
          IncrementoSaldoId: incremento.id,
          DepositoId: deposito.id,
          montoAsignado: parseFloat(deposito.monto)
        }, { transaction });
        
        deposito.asignado = true;
        deposito.IncrementoSaldoId = incremento.id;
        await deposito.save({ transaction });
      }
      
      incremento.estado = 'asignado';
      if (notas) incremento.notas = notas;
      await incremento.save({ transaction });
      
      await transaction.commit();
      
      console.log(`✅ Incremento ${id} asignado | Ganancia: $${ganancia.toFixed(2)} (${porcentajeGanancia}%)`);
      
      res.json({ 
        mensaje: 'Depósitos asignados exitosamente',
        incremento,
        resumen: {
          incrementoTotal: diferenciaIncremento.toFixed(2),
          totalDepositado: sumaDepositos.toFixed(2),
          ganancia: ganancia.toFixed(2),
          porcentajeGanancia: `${porcentajeGanancia}%`
        }
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error asignando:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/incrementos/:id/desasignar', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id);
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    if (incremento.estado !== 'asignado') {
      return res.status(400).json({ error: 'Este incremento no está asignado' });
    }
    
    const transaction = await sequelize.transaction();
    
    try {
      const asignaciones = await AsignacionDeposito.findAll({
        where: { IncrementoSaldoId: incremento.id }
      });
      
      for (const asignacion of asignaciones) {
        const deposito = await Deposito.findByPk(asignacion.DepositoId);
        if (deposito) {
          deposito.asignado = false;
          deposito.IncrementoSaldoId = null;
          await deposito.save({ transaction });
        }
        await asignacion.destroy({ transaction });
      }
      
      incremento.estado = 'pendiente';
      await incremento.save({ transaction });
      
      await transaction.commit();
      
      res.json({ 
        mensaje: 'Incremento desasignado',
        incremento 
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/incrementos/:id/ignorar', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { notas } = req.body;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id);
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    incremento.estado = 'ignorado';
    if (notas) incremento.notas = notas;
    await incremento.save();
    
    res.json({ 
      mensaje: 'Incremento ignorado',
      incremento 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/incrementos/:id/verificar', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { notas } = req.body;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id);
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    incremento.estado = 'verificado';
    incremento.verificadoPor = req.user.id;
    incremento.fechaVerificacion = new Date();
    if (notas) incremento.notas = notas;
    await incremento.save();
    
    res.json({ 
      mensaje: 'Incremento verificado',
      incremento 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= REPORTES Y GANANCIAS =============

router.get('/reportes/ganancias', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate, proveedor } = req.query;
    
    const reportes = {};
    const proveedores = proveedor ? [proveedor] : ['general', 'movistar'];
    
    for (const prov of proveedores) {
      reportes[prov] = await contabilidadService.calcularGanancias({
        proveedor: prov,
        startDate,
        endDate
      });
    }
    
    // Totales combinados
    if (!proveedor) {
      const totales = {
        totalDepositado: (parseFloat(reportes.general.totalDepositado) + 
                         parseFloat(reportes.movistar.totalDepositado)).toFixed(2),
        gananciaTotal: (parseFloat(reportes.general.gananciaReal) + 
                       parseFloat(reportes.movistar.gananciaReal)).toFixed(2)
      };
      
      reportes.totales = totales;
    }
    
    res.json(reportes);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/dashboard', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const metricas = {};
    
    for (const proveedor of ['general', 'movistar']) {
      const ultimoSaldo = await Recarga.findOne({
        where: { proveedor, saldoGestopago: { [Op.ne]: null } },
        order: [['fecha', 'DESC']]
      });
      
      const depositosPendientes = await Deposito.sum('monto', {
        where: { proveedor, asignado: false, verificado: true }
      }) || 0;
      
      const incrementosPendientes = await IncrementoSaldo.count({
        where: { proveedor, estado: 'pendiente' }
      });
      
      let comisionesHoy = 0;
      if (proveedor === 'movistar') {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        comisionesHoy = await Recarga.sum('comision', {
          where: {
            proveedor: 'movistar',
            exitoso: true,
            fecha: { [Op.gte]: hoy }
          }
        }) || 0;
      }
      
      metricas[proveedor] = {
        saldoActual: ultimoSaldo ? parseFloat(ultimoSaldo.saldoGestopago).toFixed(2) : '0.00',
        ultimaActualizacion: ultimoSaldo?.fecha || null,
        depositosPendientes: depositosPendientes.toFixed(2),
        incrementosPendientes,
        ...(proveedor === 'movistar' && { comisionesHoy: comisionesHoy.toFixed(2) })
      };
    }
    
    res.json(metricas);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/saldos-proveedores', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const general = await Recarga.findOne({
      where: { proveedor: 'general', saldoGestopago: { [Op.ne]: null } },
      order: [['fecha', 'DESC']]
    });
    
    const movistar = await Recarga.findOne({
      where: { proveedor: 'movistar', saldoGestopago: { [Op.ne]: null } },
      order: [['fecha', 'DESC']]
    });
    
    res.json({
      general: {
        saldo: general ? parseFloat(general.saldoGestopago).toFixed(2) : '0.00',
        ultimaActualizacion: general?.fecha || null
      },
      movistar: {
        saldo: movistar ? parseFloat(movistar.saldoGestopago).toFixed(2) : '0.00',
        ultimaActualizacion: movistar?.fecha || null
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= VERIFICACIÓN Y AJUSTES =============

router.post('/verificar-saldo/:proveedor', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor } = req.params;
    
    const resultado = await verificacionSaldos.verificarSaldoActual(proveedor);
    
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/verificar-consistencia/:proveedor', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor } = req.params;
    
    const resultado = await contabilidadService.verificarConsistencia(proveedor);
    
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ajustes', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor, tipoAjuste, saldoNuevo, motivo, detalles } = req.body;
    
    const ajuste = await contabilidadService.crearAjuste({
      proveedor,
      tipoAjuste,
      saldoNuevo: parseFloat(saldoNuevo),
      motivo,
      detalles,
      usuarioId: req.user.id
    });
    
    res.status(201).json({
      mensaje: 'Ajuste creado exitosamente',
      ajuste
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/ajustes', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor, estado } = req.query;
    
    const where = {};
    if (proveedor) where.proveedor = proveedor;
    if (estado) where.estado = estado;
    
    const ajustes = await AjusteSaldo.findAll({
      where,
      order: [['fecha', 'DESC']],
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombres_apellidos', 'correo']
      }]
    });
    
    res.json(ajustes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/ajustes/:id/aprobar', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const ajuste = await AjusteSaldo.findByPk(id);
    if (!ajuste) {
      return res.status(404).json({ error: 'Ajuste no encontrado' });
    }
    
    ajuste.estado = 'aprobado';
    ajuste.aprobadoPor = req.user.id;
    await ajuste.save();
    
    // Registrar el ajuste en el sistema
    await contabilidadService.registrarEvento({
      proveedor: ajuste.proveedor,
      saldo: ajuste.saldoNuevo,
      tipoEvento: 'ajuste_manual',
      detalles: {
        ajusteId: ajuste.id,
        motivo: ajuste.motivo,
        diferencia: ajuste.diferencia
      }
    });
    
    res.json({
      mensaje: 'Ajuste aprobado',
      ajuste
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= HISTORIAL =============

router.get('/historial-eventos/:proveedor', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor } = req.params;
    const { startDate, endDate, limite } = req.query;
    
    const eventos = await verificacionSaldos.obtenerHistorial({
      proveedor,
      startDate,
      endDate,
      limite: parseInt(limite) || 50
    });
    
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AGREGAR ESTAS RUTAS en backend/routes/incrementos.js
// después de las rutas existentes de reportes

// ============= ANÁLISIS DE MOVISTAR =============

/**
 * GET /api/incrementos/movistar/porcentaje-real
 * Obtener porcentaje real de ganancia de Movistar
 * 
 * Query params:
 * - startDate: Fecha inicio (opcional)
 * - endDate: Fecha fin (opcional)
 * 
 * Respuesta:
 * {
 *   totalInvertido: "10000.00",
 *   totalComisiones: "720.45",
 *   porcentajeReal: "7.2045",
 *   cantidadRecargas: 150,
 *   promedioComision: "4.80",
 *   detallesPorOperadora: [...]
 * }
 */
router.get('/movistar/porcentaje-real', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const resultado = await contabilidadService.calcularMetricasRealesMovistar({
      startDate,
      endDate
    });
    
    res.json(resultado);
  } catch (error) {
    console.error('Error calculando porcentaje real:', error);
    res.status(500).json({ 
      error: error.message,
      detalle: 'Error al calcular el porcentaje real de ganancia'
    });
  }
});

/**
 * GET /api/incrementos/movistar/analisis-comisiones
 * Análisis detallado de comisiones de Movistar
 * 
 * Query params:
 * - startDate: Fecha inicio (opcional)
 * - endDate: Fecha fin (opcional)
 * 
 * Respuesta:
 * Análisis completo con gráficos de comisiones por operadora y periodo
 */
router.get('/movistar/analisis-comisiones', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {
      proveedor: 'movistar',
      exitoso: true,
      comision: { [Op.ne]: null }
    };
    
    if (startDate && endDate) {
      where.fecha = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Comisiones por operadora
    const comisionesPorOperadora = await Recarga.findAll({
      where,
      attributes: [
        'operadora',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
        [sequelize.fn('SUM', sequelize.col('comision')), 'totalComision'],
        [sequelize.fn('AVG', sequelize.col('comision')), 'promedioComision'],
        [sequelize.fn('MIN', sequelize.col('comision')), 'minimoComision'],
        [sequelize.fn('MAX', sequelize.col('comision')), 'maximoComision']
      ],
      group: ['operadora'],
      order: [[sequelize.fn('SUM', sequelize.col('comision')), 'DESC']],
      raw: true
    });
    
    // Comisiones por día (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const comisionesPorDia = await Recarga.findAll({
      where: {
        ...where,
        fecha: { [Op.gte]: hace30Dias }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('fecha')), 'dia'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
        [sequelize.fn('SUM', sequelize.col('comision')), 'totalComision']
      ],
      group: [sequelize.fn('DATE', sequelize.col('fecha'))],
      order: [[sequelize.fn('DATE', sequelize.col('fecha')), 'ASC']],
      raw: true
    });
    
    // Estadísticas generales
    const totalComisiones = await Recarga.sum('comision', where) || 0;
    const cantidadRecargas = await Recarga.count(where);
    const promedioComision = cantidadRecargas > 0 ? totalComisiones / cantidadRecargas : 0;
    
    res.json({
      resumen: {
        totalComisiones: totalComisiones.toFixed(2),
        cantidadRecargas,
        promedioComision: promedioComision.toFixed(2)
      },
      porOperadora: comisionesPorOperadora.map(op => ({
        operadora: op.operadora,
        cantidad: parseInt(op.cantidad),
        total: parseFloat(op.totalComision || 0).toFixed(2),
        promedio: parseFloat(op.promedioComision || 0).toFixed(2),
        minimo: parseFloat(op.minimoComision || 0).toFixed(2),
        maximo: parseFloat(op.maximoComision || 0).toFixed(2)
      })),
      porDia: comisionesPorDia.map(dia => ({
        fecha: dia.dia,
        cantidad: parseInt(dia.cantidad),
        total: parseFloat(dia.totalComision || 0).toFixed(2)
      })),
      periodo: {
        inicio: startDate || 'inicio',
        fin: endDate || 'ahora'
      }
    });
  } catch (error) {
    console.error('Error en análisis de comisiones:', error);
    res.status(500).json({ 
      error: error.message,
      detalle: 'Error al analizar comisiones'
    });
  }
});

/**
 * GET /api/incrementos/comparacion-proveedores
 * Comparación de rendimiento entre General y Movistar
 * 
 * Query params:
 * - startDate: Fecha inicio (opcional)
 * - endDate: Fecha fin (opcional)
 */
router.get('/comparacion-proveedores', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Obtener métricas de ambos proveedores
    const [gananciaGeneral, porcentajeMovistar] = await Promise.all([
      contabilidadService.calcularGanancias({
        proveedor: 'general',
        startDate,
        endDate
      }),
      contabilidadService.calcularPorcentajeRealMovistar({
        startDate,
        endDate
      })
    ]);
    
    res.json({
      general: {
        proveedor: 'general',
        modelo: 'Depósito + 2% instantáneo',
        totalDepositado: gananciaGeneral.totalDepositado,
        gananciaReal: gananciaGeneral.gananciaReal,
        porcentajeGanancia: gananciaGeneral.porcentajeGanancia
      },
      movistar: {
        proveedor: 'movistar',
        modelo: 'Comisiones variables por recarga',
        totalInvertido: porcentajeMovistar.totalInvertido,
        totalComisiones: porcentajeMovistar.totalComisiones,
        porcentajeReal: porcentajeMovistar.porcentajeReal,
        cantidadRecargas: porcentajeMovistar.cantidadRecargas
      },
      comparacion: {
        mejorProveedor: parseFloat(gananciaGeneral.porcentajeGanancia) > parseFloat(porcentajeMovistar.porcentajeReal)
          ? 'general'
          : 'movistar',
        diferenciaPorcentual: Math.abs(
          parseFloat(gananciaGeneral.porcentajeGanancia) - parseFloat(porcentajeMovistar.porcentajeReal)
        ).toFixed(2)
      },
      periodo: {
        inicio: startDate || 'inicio',
        fin: endDate || 'ahora'
      }
    });
  } catch (error) {
    console.error('Error comparando proveedores:', error);
    res.status(500).json({ 
      error: error.message,
      detalle: 'Error al comparar proveedores'
    });
  }
});


// ============================================================================
// NUEVOS ENDPOINTS PARA RENDIMIENTO CON REINVERSIÓN
// ============================================================================
// Agregar estos endpoints al archivo backend/routes/incrementos.js

/**
 * GET /api/incrementos/movistar/simulacion-rendimiento
 * 
 * Simula el rendimiento efectivo con reinversión continua
 * hasta agotar el capital
 * 
 * Query params:
 * - capitalInicial: Capital de inversión (requerido)
 * - promedioRecarga: Promedio de valor por recarga (default: 60)
 * - porcentajeComision: % de comisión (default: 7.2)
 * - minimoOperable: Saldo mínimo (default: 20)
 * 
 * Ejemplo:
 * GET /api/incrementos/movistar/simulacion-rendimiento?capitalInicial=10000&promedioRecarga=60
 * 
 * Respuesta:
 * {
 *   "capitalInicial": "10000.00",
 *   "numeroRecargas": 1086,
 *   "totalComisionesGanadas": "4700.00",
 *   "rendimientoEfectivo": "47.00%",
 *   "explicacion": "..."
 * }
 */
router.get('/movistar/simulacion-rendimiento', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const {
      capitalInicial,
      promedioRecarga = 60,
      porcentajeComision = 7.2,
      minimoOperable = 20
    } = req.query;

    if (!capitalInicial || isNaN(capitalInicial)) {
      return res.status(400).json({
        error: 'capitalInicial es requerido y debe ser un número'
      });
    }

    const resultado = contabilidadService.calcularRendimientoConReinversion({
      capitalInicial: parseFloat(capitalInicial),
      promedioRecarga: parseFloat(promedioRecarga),
      porcentajeComision: parseFloat(porcentajeComision),
      minimoOperable: parseFloat(minimoOperable)
    });

    res.json(resultado);

  } catch (error) {
    console.error('Error en simulación de rendimiento:', error);
    res.status(500).json({
      error: error.message,
      detalle: 'Error al simular rendimiento con reinversión'
    });
  }
});

/**
 * GET /api/incrementos/movistar/rendimiento-real
 * 
 * Calcula el rendimiento efectivo basado en datos históricos reales
 * 
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD) (requerido)
 * - endDate: Fecha fin (YYYY-MM-DD) (requerido)
 * 
 * Ejemplo:
 * GET /api/incrementos/movistar/rendimiento-real?startDate=2026-02-10&endDate=2026-02-12
 * 
 * Respuesta:
 * {
 *   "capitalInicial": "16876.62",
 *   "numeroRecargas": 15,
 *   "totalComisiones": "79.13",
 *   "rendimientoEfectivo": "0.47%",
 *   "explicacion": "..."
 * }
 */
router.get('/movistar/rendimiento-real', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate y endDate son requeridos (formato: YYYY-MM-DD)'
      });
    }

    const resultado = await contabilidadService.calcularRendimientoRealConReinversion({
      startDate,
      endDate
    });

    if (resultado.error) {
      return res.status(404).json(resultado);
    }

    res.json(resultado);

  } catch (error) {
    console.error('Error calculando rendimiento real:', error);
    res.status(500).json({
      error: error.message,
      detalle: 'Error al calcular rendimiento real'
    });
  }
});

/**
 * GET /api/incrementos/movistar/analisis-completo
 * 
 * Análisis completo que combina:
 * 1. Métricas reales del periodo
 * 2. Simulación de rendimiento con reinversión
 * 3. Comparación entre diferentes escenarios
 * 
 * Query params:
 * - startDate: Fecha inicio (YYYY-MM-DD)
 * - endDate: Fecha fin (YYYY-MM-DD)
 * 
 * Respuesta combinada con todos los análisis
 */
router.get('/movistar/analisis-completo', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate y endDate son requeridos'
      });
    }

    // 1. Obtener métricas reales
    const metricas = await contabilidadService.calcularMetricasRealesMovistar({
      startDate,
      endDate
    });

    if (metricas.error) {
      return res.status(404).json(metricas);
    }

    // 2. Calcular rendimiento real
    const rendimientoReal = await contabilidadService.calcularRendimientoRealConReinversion({
      startDate,
      endDate
    });

    // 3. Simular diferentes escenarios con el capital inicial real
    const capitalInicial = parseFloat(metricas.capitalInicial);
    const promedioRecarga = parseFloat(rendimientoReal.promedioRecarga);
    const porcentajeComision = parseFloat(metricas.porcentajePeriodo);

    const simulacion = contabilidadService.calcularRendimientoConReinversion({
      capitalInicial,
      promedioRecarga,
      porcentajeComision,
      minimoOperable: 20
    });

    // 4. Comparación
    const comparacion = {
      periodo: { inicio: startDate, fin: endDate },
      
      real: {
        titulo: 'Lo que pasó realmente',
        numeroRecargas: rendimientoReal.numeroRecargas,
        totalInvertido: rendimientoReal.totalInvertido,
        comisionesGanadas: rendimientoReal.totalComisiones,
        rendimiento: rendimientoReal.rendimientoEfectivo,
        saldoFinal: rendimientoReal.saldoFinal
      },
      
      simulacion: {
        titulo: 'Proyección hasta agotar capital',
        numeroRecargas: simulacion.numeroRecargas,
        totalInvertido: simulacion.totalInvertidoEnRecargas,
        comisionesGanadas: simulacion.totalComisionesGanadas,
        rendimiento: simulacion.rendimientoEfectivoRedondeado,
        saldoFinal: simulacion.capitalFinalDisponible
      },
      
      diferencias: {
        recargasPendientes: parseInt(simulacion.numeroRecargas) - parseInt(rendimientoReal.numeroRecargas),
        comisionesPotenciales: (parseFloat(simulacion.totalComisionesGanadas) - parseFloat(rendimientoReal.totalComisiones)).toFixed(2),
        rendimientoPotencial: (parseFloat(simulacion.rendimientoEfectivoRedondeado) - parseFloat(rendimientoReal.rendimientoEfectivo)).toFixed(2)
      },
      
      resumen: `
═══════════════════════════════════════════════════════════════════
🎯 ANÁLISIS COMPLETO - ${startDate} a ${endDate}
═══════════════════════════════════════════════════════════════════

📊 LO QUE PASÓ:
   • Capital: $${capitalInicial.toFixed(2)}
   • Recargas: ${rendimientoReal.numeroRecargas}
   • Comisiones: $${rendimientoReal.totalComisiones}
   • Rendimiento: ${rendimientoReal.rendimientoEfectivo}%

🔮 PROYECCIÓN (hasta agotar capital):
   • Recargas totales: ${simulacion.numeroRecargas}
   • Comisiones totales: $${simulacion.totalComisionesGanadas}
   • Rendimiento efectivo: ${simulacion.rendimientoEfectivoRedondeado}%

📈 POTENCIAL RESTANTE:
   • Recargas pendientes: ${parseInt(simulacion.numeroRecargas) - parseInt(rendimientoReal.numeroRecargas)}
   • Comisiones por ganar: $${(parseFloat(simulacion.totalComisionesGanadas) - parseFloat(rendimientoReal.totalComisiones)).toFixed(2)}
   • Rendimiento adicional: ${(parseFloat(simulacion.rendimientoEfectivoRedondeado) - parseFloat(rendimientoReal.rendimientoEfectivo)).toFixed(2)}%

═══════════════════════════════════════════════════════════════════
      `.trim()
    };

    res.json({
      metricas,
      rendimientoReal,
      simulacion,
      comparacion
    });

  } catch (error) {
    console.error('Error en análisis completo:', error);
    res.status(500).json({
      error: error.message,
      detalle: 'Error al generar análisis completo'
    });
  }
});

// ============================================================================
// EJEMPLO DE USO DESDE FRONTEND:
// ============================================================================

/*

// 1. SIMULACIÓN (para proyecciones):
fetch('/api/incrementos/movistar/simulacion-rendimiento?capitalInicial=10000&promedioRecarga=60')
  .then(res => res.json())
  .then(data => {
    console.log('Simulación:', data.explicacion);
    console.log('Rendimiento efectivo:', data.rendimientoEfectivoRedondeado);
    console.log('Comisiones totales:', data.totalComisionesGanadas);
  });

// 2. RENDIMIENTO REAL (histórico):
fetch('/api/incrementos/movistar/rendimiento-real?startDate=2026-02-10&endDate=2026-02-12')
  .then(res => res.json())
  .then(data => {
    console.log('Rendimiento real:', data.explicacion);
    console.log('Rendimiento efectivo:', data.rendimientoEfectivo);
  });

// 3. ANÁLISIS COMPLETO (combina todo):
fetch('/api/incrementos/movistar/analisis-completo?startDate=2026-02-10&endDate=2026-02-12')
  .then(res => res.json())
  .then(data => {
    console.log('Análisis completo:', data.comparacion.resumen);
    console.log('Real:', data.real);
    console.log('Simulación:', data.simulacion);
  });

*/


module.exports = router;