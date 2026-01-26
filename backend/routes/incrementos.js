// backend/routes/incrementos.js
const express = require('express');
const IncrementoSaldo = require('../models/IncrementoSaldo');
const Deposito = require('../models/Deposito');
const AsignacionDeposito = require('../models/AsignacionDeposito');
const ConfiguracionSistema = require('../models/ConfiguracionSistema');
const Usuario = require('../models/Usuario');
const authenticateToken = require('../middlewares/authenticateToken');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const router = express.Router();

const soloAdmin = (req, res, next) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
};

// ==== CONFIGURACIÓN ====





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

// ==== DEPÓSITOS ====

// Registrar un depósito
// backend/routes/incrementos.js

// ✅ ACTUALIZAR ESTE ENDPOINT CON VALIDACIÓN

// Registrar un nuevo depósito
router.post('/depositos', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { monto, usuarioId, proveedor, operadora, notas } = req.body;

    // Validaciones básicas
    if (!monto || !usuarioId || !proveedor) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: monto, usuarioId, proveedor' 
      });
    }

    // Validar que el monto sea positivo
    const montoNum = parseFloat(monto);
    if (montoNum <= 0) {
      return res.status(400).json({ 
        error: 'El monto debe ser mayor a 0' 
      });
    }

    // ✅ NUEVA VALIDACIÓN: Verificar que el monto no supere el incremento máximo disponible
    const incrementosPendientes = await IncrementoSaldo.findAll({
      where: {
        proveedor,
        estado: 'pendiente'
      },
      order: [['diferencia', 'DESC']],
      limit: 1
    });

    if (incrementosPendientes.length > 0) {
      const incrementoMaximo = parseFloat(incrementosPendientes[0].diferencia);
      
      if (montoNum > incrementoMaximo) {
        return res.status(400).json({ 
          error: `El monto ($${montoNum.toFixed(2)}) supera el incremento máximo disponible ($${incrementoMaximo.toFixed(2)}) para el proveedor ${proveedor}` 
        });
      }
    } else {
      // ⚠️ ADVERTENCIA: Si no hay incrementos pendientes
      console.warn(`⚠️ Registrando depósito sin incrementos pendientes para ${proveedor}`);
    }

    // Verificar que el usuario existe
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Crear el depósito
    const nuevoDeposito = await Deposito.create({
      monto: montoNum,
      UsuarioId: usuarioId,
      proveedor,
      operadora,
      notas,
      asignado: false,
      fecha: new Date()
    });

    console.log(`✅ Depósito registrado: $${montoNum.toFixed(2)} de ${usuario.nombres_apellidos || usuario.nombre_tienda} (${proveedor})`);

    res.status(201).json({
      mensaje: 'Depósito registrado exitosamente',
      deposito: nuevoDeposito
    });

  } catch (error) {
    console.error('❌ Error al registrar depósito:', error);
    res.status(500).json({ 
      error: 'Error al registrar depósito',
      detalles: error.message 
    });
  }
});

module.exports = router;

// Listar depósitos
router.get('/depositos', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor, operadora, asignado, startDate, endDate } = req.query;
    
    const where = {};
    
    if (proveedor) where.proveedor = proveedor;
    if (operadora) where.operadora = operadora;
    if (asignado !== undefined) where.asignado = asignado === 'true';
    
    if (startDate && endDate) {
      where.fecha = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
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



// ==== INCREMENTOS ====

// Listar incrementos
router.get('/incrementos', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { estado, proveedor, operadora, startDate, endDate } = req.query;
    
    const where = {};
    
    if (estado) where.estado = estado;
    if (proveedor) where.proveedor = proveedor;
    if (operadora) where.operadora = operadora;
    
    if (startDate && endDate) {
      where.fecha = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const incrementos = await IncrementoSaldo.findAll({
      where,
      order: [['fecha', 'DESC']],
      limit: 100
    });
    
    res.json(incrementos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener notificaciones pendientes
router.get('/notificaciones', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { proveedor } = req.query; // ✅ Recibe 'general' o 'movistar'

    const where = {
      estado: 'pendiente'
    };

    // ✅ Filtrar por proveedor si se especifica
    if (proveedor) {
      where.proveedor = proveedor;
    }

    const incrementos = await IncrementoSaldo.findAll({
      where,
      order: [['fecha', 'DESC']]
    });

    res.json({
      incrementos,
      conteo: incrementos.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Asignar depósitos a un incremento
// backend/routes/incrementos.js

// Asignar depósitos a un incremento
// backend/routes/incrementos.js

// ✅ CORREGIR ESTE ENDPOINT - Asignar depósitos a un incremento
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
    
    // Obtener los depósitos
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
    
    // VALIDAR QUE TODOS LOS DEPÓSITOS SEAN DEL MISMO PROVEEDOR
    const depositosIncorrectos = depositos.filter(d => d.proveedor !== incremento.proveedor);
    if (depositosIncorrectos.length > 0) {
      return res.status(400).json({ 
        error: `Los depósitos deben ser del mismo proveedor (${incremento.proveedor})` 
      });
    }
    
    // ✅ FIX: Calcular suma de depósitos - parseFloat para los montos
    const sumaDepositos = depositos.reduce((sum, d) => sum + parseFloat(d.monto), 0);
    
    // ✅ FIX: Convertir diferencia a número antes de comparar
    const diferenciaIncremento = parseFloat(incremento.diferencia);
    
    // VALIDACIÓN: Los depósitos NO deben SUPERAR el incremento
    if (sumaDepositos > diferenciaIncremento) {
      return res.status(400).json({ 
        error: `La suma de depósitos ($${sumaDepositos.toFixed(2)}) supera el incremento detectado ($${diferenciaIncremento.toFixed(2)}). Revisa los montos.` 
      });
    }
    
    // ✅ PERMITIR que los depósitos sean menores (la diferencia es ganancia)
    const ganancia = diferenciaIncremento - sumaDepositos;
    const porcentajeGanancia = ((ganancia / diferenciaIncremento) * 100).toFixed(2);
    
    console.log(`
╔════════════════════════════════════════════╗
║  ASIGNACIÓN DE INCREMENTO                  ║
╠════════════════════════════════════════════╣
║  Incremento detectado:  $${diferenciaIncremento.toFixed(2).padStart(10)}  ║
║  Total depositado:      $${sumaDepositos.toFixed(2).padStart(10)}  ║
║  ─────────────────────────────────────────  ║
║  GANANCIA:              $${ganancia.toFixed(2).padStart(10)}  ║
║  Porcentaje:            ${porcentajeGanancia.padStart(9)}%  ║
╚════════════════════════════════════════════╝
    `);
    
    const transaction = await sequelize.transaction();
    
    try {
      // Crear asignaciones
      for (const deposito of depositos) {
        await AsignacionDeposito.create({
          IncrementoSaldoId: incremento.id,
          DepositoId: deposito.id,
          montoAsignado: parseFloat(deposito.monto) // ✅ FIX: parseFloat aquí también
        }, { transaction });
        
        deposito.asignado = true;
        await deposito.save({ transaction });
      }
      
      // Actualizar incremento
      incremento.estado = 'asignado';
      if (notas) incremento.notas = notas;
      await incremento.save({ transaction });
      
      await transaction.commit();
      
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
    console.error('❌ Error al asignar depósitos:', error);
    res.status(500).json({ 
      error: error.message || 'Error al asignar depósitos'
    });
  }
});

module.exports = router;

// Desasignar un incremento
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
      // Obtener todas las asignaciones
      const asignaciones = await AsignacionDeposito.findAll({
        where: { IncrementoSaldoId: incremento.id }
      });
      
      // Marcar depósitos como no asignados
      for (const asignacion of asignaciones) {
        const deposito = await Deposito.findByPk(asignacion.DepositoId);
        if (deposito) {
          deposito.asignado = false;
          await deposito.save({ transaction });
        }
      }
      
      // Eliminar asignaciones
      await AsignacionDeposito.destroy({
        where: { IncrementoSaldoId: incremento.id },
        transaction
      });
      
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

// Ignorar un incremento
router.post('/incrementos/:id/ignorar', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { notas } = req.body;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id);
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    incremento.estado = 'ignorado';
    incremento.notas = notas || 'Ignorado por el administrador';
    await incremento.save();
    
    res.json({ 
      mensaje: 'Incremento ignorado',
      incremento 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detalle de un incremento
router.get('/incrementos/:id', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const incremento = await IncrementoSaldo.findByPk(id, {
      include: [{
        model: Deposito,
        as: 'depositos',
        through: {
          attributes: ['montoAsignado']
        },
        include: [{
          model: Usuario,
          attributes: ['id', 'nombres_apellidos', 'nombre_tienda', 'rol']
        }]
      }]
    });
    
    if (!incremento) {
      return res.status(404).json({ error: 'Incremento no encontrado' });
    }
    
    // Calcular totales y ganancia
    let totalDepositado = 0;
    const depositosDetalle = [];
    
    if (incremento.depositos && incremento.depositos.length > 0) {
      for (const deposito of incremento.depositos) {
        const monto = deposito.AsignacionDeposito.montoAsignado;
        totalDepositado += monto;
        
        depositosDetalle.push({
          depositoId: deposito.id,
          monto: monto.toFixed(2),
          usuario: deposito.Usuario.nombres_apellidos || deposito.Usuario.nombre_tienda,
          rol: deposito.Usuario.rol
        });
      }
    }
    
    const ganancia = incremento.diferencia - totalDepositado;
    const porcentajeGanancia = incremento.diferencia > 0 
      ? ((ganancia / incremento.diferencia) * 100).toFixed(2)
      : 0;
    
    res.json({
      id: incremento.id,
      saldoAnterior: incremento.saldoAnterior.toFixed(2),
      saldoNuevo: incremento.saldoNuevo.toFixed(2),
      diferencia: incremento.diferencia.toFixed(2),
      proveedor: incremento.proveedor,
      operadora: incremento.operadora,
      estado: incremento.estado,
      fecha: incremento.fecha,
      notas: incremento.notas,
      
      // Desglose financiero
      depositos: depositosDetalle,
      totalDepositado: totalDepositado.toFixed(2),
      ganancia: ganancia.toFixed(2),
      porcentajeGanancia: `${porcentajeGanancia}%`,
      
      // Análisis
      analisis: {
        incrementoDetectado: incremento.diferencia.toFixed(2),
        depositosRegistrados: depositosDetalle.length,
        sumaDepositos: totalDepositado.toFixed(2),
        gananciaReal: ganancia.toFixed(2),
        porcentajeGanancia: porcentajeGanancia
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==== REPORTES ====

// Resumen de ganancias
// backend/routes/incrementos.js

// Resumen de ganancias por proveedor
router.get('/reportes/ganancias', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { startDate, endDate, proveedor } = req.query;
    
    const where = { estado: 'asignado' };
    
    if (proveedor) where.proveedor = proveedor;
    
    if (startDate && endDate) {
      where.fecha = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const incrementos = await IncrementoSaldo.findAll({
      where,
      include: [{
        model: Deposito,
        as: 'depositos',
        through: { attributes: ['montoAsignado'] },
        include: [{
          model: Usuario,
          attributes: ['id', 'nombres_apellidos', 'nombre_tienda', 'rol']
        }]
      }]
    });
    
    const reportePorProveedor = {
      general: {
        totalIncrementos: 0,
        totalDepositado: 0,
        gananciaTotal: 0,
        cantidadIncrementos: 0,
        depositosPorUsuario: {}
      },
      movistar: {
        totalIncrementos: 0,
        totalDepositado: 0,
        gananciaTotal: 0,
        cantidadIncrementos: 0,
        depositosPorUsuario: {}
      }
    };
    
    for (const incremento of incrementos) {
      const prov = incremento.proveedor;
      // ✅ FIX: parseFloat
      const diferenciaNum = parseFloat(incremento.diferencia);
      reportePorProveedor[prov].totalIncrementos += diferenciaNum;
      reportePorProveedor[prov].cantidadIncrementos++;
      
      if (incremento.depositos && incremento.depositos.length > 0) {
        for (const deposito of incremento.depositos) {
          const monto = parseFloat(deposito.AsignacionDeposito.montoAsignado);
          reportePorProveedor[prov].totalDepositado += monto;
          
          const usuarioKey = deposito.Usuario.nombres_apellidos || 
                             deposito.Usuario.nombre_tienda || 
                             `Usuario ${deposito.UsuarioId}`;
          
          if (!reportePorProveedor[prov].depositosPorUsuario[usuarioKey]) {
            reportePorProveedor[prov].depositosPorUsuario[usuarioKey] = {
              usuario: deposito.Usuario,
              total: 0
            };
          }
          
          reportePorProveedor[prov].depositosPorUsuario[usuarioKey].total += monto;
        }
      }
    }
    
    for (const prov of ['general', 'movistar']) {
      reportePorProveedor[prov].gananciaTotal = 
        reportePorProveedor[prov].totalIncrementos - reportePorProveedor[prov].totalDepositado;
      
      reportePorProveedor[prov].porcentajeGanancia = 
        reportePorProveedor[prov].totalIncrementos > 0 
          ? ((reportePorProveedor[prov].gananciaTotal / reportePorProveedor[prov].totalIncrementos) * 100).toFixed(2)
          : 0;
      
      reportePorProveedor[prov].depositosPorUsuario = Object.entries(reportePorProveedor[prov].depositosPorUsuario)
        .map(([nombre, data]) => ({
          usuario: nombre,
          rol: data.usuario.rol,
          total: data.total.toFixed(2)
        }));
      
      reportePorProveedor[prov].totalIncrementos = reportePorProveedor[prov].totalIncrementos.toFixed(2);
      reportePorProveedor[prov].totalDepositado = reportePorProveedor[prov].totalDepositado.toFixed(2);
      reportePorProveedor[prov].gananciaTotal = reportePorProveedor[prov].gananciaTotal.toFixed(2);
    }
    
    const totalesGenerales = {
      totalIncrementos: parseFloat(reportePorProveedor.general.totalIncrementos) + 
                        parseFloat(reportePorProveedor.movistar.totalIncrementos),
      totalDepositado: parseFloat(reportePorProveedor.general.totalDepositado) + 
                       parseFloat(reportePorProveedor.movistar.totalDepositado),
      gananciaTotal: parseFloat(reportePorProveedor.general.gananciaTotal) + 
                     parseFloat(reportePorProveedor.movistar.gananciaTotal),
      cantidadIncrementos: reportePorProveedor.general.cantidadIncrementos + 
                           reportePorProveedor.movistar.cantidadIncrementos
    };
    
    totalesGenerales.porcentajeGanancia = totalesGenerales.totalIncrementos > 0
      ? ((totalesGenerales.gananciaTotal / totalesGenerales.totalIncrementos) * 100).toFixed(2)
      : 0;
    
    totalesGenerales.totalIncrementos = totalesGenerales.totalIncrementos.toFixed(2);
    totalesGenerales.totalDepositado = totalesGenerales.totalDepositado.toFixed(2);
    totalesGenerales.gananciaTotal = totalesGenerales.gananciaTotal.toFixed(2);
    
    res.json({
      porProveedor: reportePorProveedor,
      totales: totalesGenerales
    });
    
  } catch (error) {
    console.error('❌ Error en reportes:', error);
    res.status(500).json({ error: error.message });
  }
});



// Obtener saldos actuales de ambos proveedores
router.get('/saldos-proveedores', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const Recarga = require('../models/Recarga');
    
    const saldoGeneral = await Recarga.findOne({
      where: {
        proveedor: 'general',
        saldoGestopago: { [Op.ne]: null }
      },
      order: [['fecha', 'DESC']],
      attributes: ['saldoGestopago', 'fecha']
    });
    
    const saldoMovistar = await Recarga.findOne({
      where: {
        proveedor: 'movistar',
        saldoGestopago: { [Op.ne]: null }
      },
      order: [['fecha', 'DESC']],
      attributes: ['saldoGestopago', 'fecha']
    });
    
    res.json({
      general: {
        saldo: saldoGeneral ? saldoGeneral.saldoGestopago : null,
        ultimaActualizacion: saldoGeneral ? saldoGeneral.fecha : null
      },
      movistar: {
        saldo: saldoMovistar ? saldoMovistar.saldoGestopago : null,
        ultimaActualizacion: saldoMovistar ? saldoMovistar.fecha : null
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// backend/routes/incrementos.js

// ✅ AGREGAR ESTE ENDPOINT

// Eliminar un depósito (solo si no está asignado)
router.delete('/depositos/:id', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const deposito = await Deposito.findByPk(id);

    if (!deposito) {
      return res.status(404).json({ error: 'Depósito no encontrado' });
    }

    // ✅ VALIDACIÓN: Solo se puede eliminar si NO está asignado
    if (deposito.asignado) {
      return res.status(400).json({ 
        error: 'No se puede eliminar un depósito que ya fue asignado. Primero desasigna el incremento correspondiente.' 
      });
    }

    // Eliminar el depósito
    await deposito.destroy();

    console.log(`✅ Depósito ${id} eliminado exitosamente`);

    res.json({ 
      mensaje: 'Depósito eliminado exitosamente',
      depositoId: id
    });

  } catch (error) {
    console.error('❌ Error al eliminar depósito:', error);
    res.status(500).json({ 
      error: 'Error al eliminar depósito',
      detalles: error.message 
    });
  }
});

// ✅ OPCIONAL: Editar un depósito (solo si no está asignado)
router.put('/depositos/:id', authenticateToken, soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { monto, notas } = req.body;

  try {
    const deposito = await Deposito.findByPk(id);

    if (!deposito) {
      return res.status(404).json({ error: 'Depósito no encontrado' });
    }

    // ✅ VALIDACIÓN: Solo se puede editar si NO está asignado
    if (deposito.asignado) {
      return res.status(400).json({ 
        error: 'No se puede editar un depósito que ya fue asignado. Primero desasigna el incremento correspondiente.' 
      });
    }

    // Actualizar campos
    if (monto !== undefined) {
      deposito.monto = parseFloat(monto);
    }
    if (notas !== undefined) {
      deposito.notas = notas;
    }

    await deposito.save();

    console.log(`✅ Depósito ${id} actualizado exitosamente`);

    res.json({ 
      mensaje: 'Depósito actualizado exitosamente',
      deposito
    });

  } catch (error) {
    console.error('❌ Error al actualizar depósito:', error);
    res.status(500).json({ 
      error: 'Error al actualizar depósito',
      detalles: error.message 
    });
  }
});


module.exports = router;