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

module.exports = router;