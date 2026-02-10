const express = require('express');
const { Op } = require('sequelize');
const Tienda = require('../models/Tienda');
const Saldo = require('../models/Saldo');
const Recarga = require('../models/Recarga');
const TipoRecarga = require('../models/TipoRecarga');
const Usuario = require('../models/Usuario');
const authenticateToken = require('../middlewares/authenticateToken');
const jwt = require('jsonwebtoken');
const { parseDbDate } = require('../utils/dateUtils');
const { calcularPromedioSemanal } = require('../utils/weeklyAverage');

const router = express.Router();

// Obtener saldo disponible y los saldos acreditados desde el token del usuario
router.get('/solo-saldo', authenticateToken, async (req, res) => {
  try {
      // Obtener el id del usuario desde el token decodificado (req.user.id)
      const usuarioId = req.user.id;

      // Buscar la tienda asociada al usuario autenticado
      const tienda = await Tienda.findOne({
          where: { UsuarioId: usuarioId }
      });

      const saldo = tienda.saldo;
      // Incluir el cupo en la respuesta
      const cupo = tienda.cupo;

      // Devolver el saldo disponible, la lista de saldos acreditados, y el cupo
      res.json({ saldo_disponible: saldo, cupo: cupo });
  } catch (error) {
      // Manejar cualquier error que ocurra durante la operación
      res.status(500).json({ error: error.message });
  }
});

// Obtener saldo disponible y los saldos acreditados desde el token del usuario
router.get('/verificado', authenticateToken, async (req, res) => {
  try {
      // Obtener el id del usuario desde el token decodificado (req.user.id)
      const usuarioId = req.user.id;

      // Buscar la tienda asociada al usuario autenticado
      const usuario = await Usuario.findOne({
          where: { id: usuarioId }
      });

      const verificado = usuario.verificado;
      // Incluir el cupo en la respuesta

      // Devolver el saldo disponible, la lista de saldos acreditados, y el cupo
      res.json({ verificado: verificado});
  } catch (error) {
      // Manejar cualquier error que ocurra durante la operación
      res.status(500).json({ error: error.message });
  }
});
  

router.get('/saldo2', authenticateToken, async (req, res) => {
  try {
    // Obtenemos el id del usuario desde el token
    const usuarioId = req.user.id;

    // Buscamos la tienda asociada al usuario
    const tienda = await Tienda.findOne({
      where: { UsuarioId: usuarioId }
    });

    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada para este usuario.' });
    }

    // Extraemos los parámetros de la query
    const { startDate: startDateQuery, endDate: endDateQuery, timezone, limit } = req.query;

    // Construimos el where para la búsqueda en Saldo
    const whereClause = { TiendaId: tienda.id };

    let start, end;
    // Si se envía al menos una fecha, aplicamos el filtro
    if (startDateQuery || endDateQuery) {
      // Se toma el timezone enviado o se asigna un valor por defecto
      const clientTimeZone = timezone || 'America/Mexico_City';

      if (startDateQuery && !endDateQuery) {
        start = parseDbDate(startDateQuery, true, clientTimeZone);
        end = parseDbDate(startDateQuery, false, clientTimeZone);
      } else if (!startDateQuery && endDateQuery) {
        start = parseDbDate(endDateQuery, true, clientTimeZone);
        end = parseDbDate(endDateQuery, false, clientTimeZone);
      } else if (startDateQuery && endDateQuery) {
        start = parseDbDate(startDateQuery, true, clientTimeZone);
        end = parseDbDate(endDateQuery, false, clientTimeZone);
      }
      // Se agrega el filtro sobre el campo "fecha"
      whereClause.fecha = { [Op.between]: [start, end] };
    }

    // Construimos las opciones para la consulta:
    // Se ordena por fecha de forma descendente.
    // Si no se especifica filtro de fechas se limita la cantidad (por defecto a 50 o según parámetro "limit")
    const queryOptions = {
      where: whereClause,
      order: [['fecha', 'DESC']]
    };

    if (!startDateQuery && !endDateQuery) {
      queryOptions.limit = limit ? parseInt(limit) : 50;
    }

    // Se obtienen los saldos según los parámetros indicados
    const saldos = await Saldo.findAll(queryOptions);

    // Se obtienen el saldo disponible y crédito desde la tienda
    const saldoDisponible = tienda.saldo;
    const credito = tienda.credito;

    // Devolvemos la información
    res.json({
      saldo_disponible: saldoDisponible,
      saldos_acreditados: saldos,
      credito: credito
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Obtener saldo disponible y los saldos acreditados desde el token del usuario
router.get('/saldo', authenticateToken, async (req, res) => {
  try {
      // Obtener el id del usuario desde el token decodificado (req.user.id)
      const usuarioId = req.user.id;

      // Buscar la tienda asociada al usuario autenticado
      const tienda = await Tienda.findOne({
          where: { UsuarioId: usuarioId }
      });

      // Si no se encuentra la tienda, devolver un error 404
      if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada para este usuario.' });

      // Buscar todos los saldos asociados a la tienda encontrada
      const saldos = await Saldo.findAll({
          where: { TiendaId: tienda.id }
      });



      const saldo = tienda.saldo;
      // Incluir el cupo en la respuesta
      const credito = tienda.credito;

      // Devolver el saldo disponible, la lista de saldos acreditados, y el cupo
      res.json({ saldo_disponible: saldo, saldos_acreditados: saldos, credito: credito });
  } catch (error) {
      // Manejar cualquier error que ocurra durante la operación
      res.status(500).json({ error: error.message });
  }
});

// Obtener saldo disponible y los saldos acreditados desde el token del usuario
router.get('/solo-credito-antiguop', authenticateToken, async (req, res) => {
  try {
      // Obtener el id del usuario desde el token decodificado (req.user.id)
      const usuarioId = req.user.id;

      // Buscar la tienda asociada al usuario autenticado
      const tienda = await Tienda.findOne({
          where: { UsuarioId: usuarioId }
      });

      const credito = tienda.credito;


      // Devolver el saldo disponible, la lista de saldos acreditados, y el cupo
      res.json({ credito: credito });
  } catch (error) {
      // Manejar cualquier error que ocurra durante la operación
      res.status(500).json({ error: error.message });
  }
});


router.get('/solo-credito', authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;

    // Buscar la tienda asociada al usuario autenticado
    const tienda = await Tienda.findOne({
      where: { UsuarioId: usuarioId }
    });

    if (!tienda) {
      return res.status(404).json({ message: 'No se encontró tienda para el usuario' });
    }

    const credito = tienda.credito;

    const fechaActual = new Date();
    const fechaCreacion = new Date(tienda.createdAt);
    const ochoSemanasEnMs = 8 * 7 * 24 * 60 * 60 * 1000;
    let fechaInicioPeriodo;

    // Si la tienda tiene menos de 8 semanas, tomar su fecha de creación como inicio
    if (fechaActual - fechaCreacion < ochoSemanasEnMs) {
      fechaInicioPeriodo = fechaCreacion;
    } else {
      fechaInicioPeriodo = new Date(fechaActual - ochoSemanasEnMs);
    }

    const recargas = await Recarga.findAll({
      where: {
        TiendaId: tienda.id,
        fecha: {
          [Op.between]: [fechaInicioPeriodo, fechaActual],
        },
        exitoso: true,
      },
    });

    // Calcular promedio semanal usando la misma función que en el otro endpoint
    const promedioSemanal = calcularPromedioSemanal(recargas);

    res.json({
      credito,
      promedioSemanal,
      recargas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/solo-credito-resp', authenticateToken, async (req, res) => {
  try {
    // Obtener el id del usuario desde el token decodificado (req.user.id)
    const usuarioId = req.user.id;

    // Buscar la tienda asociada al usuario autenticado
    const tienda = await Tienda.findOne({
      where: { UsuarioId: usuarioId }
    });

    const credito = tienda.credito;

    // Obtener la fecha actual y la fecha de hace 8 semanas
    const fechaActual = new Date();
    const fechaInicio = new Date(fechaActual);
    fechaInicio.setDate(fechaActual.getDate() - 8 * 7); // 8 semanas atrás

    // Consultar todas las recargas de las últimas 8 semanas (o menos si no hay suficiente información)
    const recargas = await Recarga.findAll({
      where: {
        TiendaId: tienda.id,
        fecha: {
          [Op.between]: [fechaInicio, fechaActual],
        },
      },
    });

    // Agrupar las recargas por semana
    const semanas = {};
    recargas.forEach((recarga) => {
      const semana = getWeekOfYear(recarga.fecha);
      if (!semanas[semana]) {
        semanas[semana] = [];
      }
      semanas[semana].push(recarga);
    });

    // Calcular el promedio por semana
    const semanasTotales = Object.keys(semanas).length;
    const promedioSemanal = semanasTotales > 0
      ? recargas.reduce((total, recarga) => total + recarga.valor, 0) / semanasTotales
      : 0;

    // Devolver el saldo disponible, la lista de saldos acreditados, el cupo y el promedio semanal
    res.json({ credito: credito, promedioSemanal: promedioSemanal });

  } catch (error) {
    // Manejar cualquier error que ocurra durante la operación
    res.status(500).json({ error: error.message });
  }
});

// Función auxiliar para obtener el número de la semana en el año
function getWeekOfYear(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

  
router.get('/recargas', authenticateToken, async (req, res) => {
  try {
    // Obtener el id del usuario desde el token decodificado (req.user.id)
    const usuarioId = req.user.id;

    // Buscar la tienda asociada al usuario autenticado
    const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
    if (!tienda)
      return res.status(404).json({ error: 'Tienda no encontrada para este usuario.' });

    // Leer los parámetros de fecha, zona horaria y límite de los query params
    const { startDate: startDateQuery, endDate: endDateQuery, timeZone, limit } = req.query;

    // Declarar la variable donde se almacenarán las recargas filtradas
    let recargasExitosas = [];
    let recargasHistorial = [];


    // Si se envían ambos parámetros de fecha, filtrar las recargas en ese rango
    if (startDateQuery && endDateQuery) {
      const tz = timeZone || 'America/Mexico_City';
      // Asumiendo que tienes la función parseDbDate definida (vea el ejemplo anterior)
      const startUTC = parseDbDate(startDateQuery, true, tz);
      const endUTC = parseDbDate(endDateQuery, false, tz);

      recargasHistorial = await Recarga.findAll({
        where: {
          TiendaId: tienda.id,
          fecha: { [Op.between]: [startUTC, endUTC] }
        },
        order: [['fecha', 'DESC']],
        // Si se desea limitar la cantidad cuando se usan fechas
        ...(limit ? { limit: parseInt(limit) } : {})
      });

      recargasExitosas = await Recarga.findAll({
        where: {
          TiendaId: tienda.id,
          fecha: { [Op.between]: [startUTC, endUTC] },
          exitoso: true
        },
        order: [['fecha', 'DESC']],
        // Si se desea limitar la cantidad cuando se usan fechas
        ...(limit ? { limit: parseInt(limit) } : {})
      });
    } else {
      // Si no se envían fechas, se obtienen todas las recargas de la tienda
      recargasHistorial = await Recarga.findAll({
        where: { TiendaId: tienda.id },
        order: [['fecha', 'DESC']]
      });

      recargasExitosas = await Recarga.findAll({
        where: { TiendaId: tienda.id, exitoso: true },
        order: [['fecha', 'DESC']]
      });
    }

    // Calcular la sumatoria total de las recargas obtenidas
    const totalRecargas = recargasExitosas.reduce((total, recarga) => total + recarga.valor, 0);

    // Calcular el promedio semanal
    // Si se recibieron fechas desde el query, puede tener sentido calcularlo con los datos filtrados.
    // En este ejemplo se usa la función calcularPromedioSemanal sobre el conjunto recargas filtrado.
    const promedioSemanal = parseFloat(calcularPromedioSemanal(recargasExitosas).toFixed(2));

    // Se obtiene el saldo de la tienda
    const saldoDisponible = tienda.saldo;

    // Devolver los datos calculados y el arreglo de recargas
    res.json({
      saldo_disponible: saldoDisponible,
      total_recargas: totalRecargas,
      promedio_semanal: promedioSemanal,
      recargas: recargasHistorial,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const gestopagoService = require('../services/gestopagoService');

router.post('/recargas2', authenticateToken, async (req, res) => {
  const { latitud, longitud, operadora, tipo, valor, celular, idServicio, idProducto } = req.body;

  try {
    const usuarioId = req.user.id;
    const usuario = await Usuario.findByPk(usuarioId);
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado.',
        tipo: 'backend'
      });
    }

    let nuevoToken = null;

    // Verificación primera vez
    if (!usuario.verificado) {
      if (!latitud || !longitud) {
        return res.status(400).json({ 
          success: false,
          error: 'Debe proporcionar latitud y longitud para verificar la tienda',
          tipo: 'backend'
        });
      }

      const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
      if (!tienda) {
        return res.status(404).json({ 
          success: false,
          error: 'Tienda no encontrada para este usuario.',
          tipo: 'backend'
        });
      }

      usuario.verificado = true;
      tienda.latitud = latitud;
      tienda.longitud = longitud;
      await usuario.save();
      await tienda.save();

      const tokenPayload = {
        id: usuario.id,
        correo: usuario.correo || "",
        nombre_tienda: usuario.nombre_tienda,
        rol: usuario.rol,
        verificado: usuario.verificado,
        nombres_apellidos: usuario.nombres_apellidos || "",
        celular: usuario.celular || ""
      };
      nuevoToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    }

    if (!usuario.verificado) {
      return res.status(403).json({ 
        success: false,
        error: 'El usuario no está verificado',
        tipo: 'backend'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({ 
        success: false,
        error: 'El usuario no está activo',
        tipo: 'backend'
      });
    }

    const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
    if (!tienda) {
      return res.status(404).json({ 
        success: false,
        error: 'Tienda no encontrada para este usuario.',
        tipo: 'backend'
      });
    }

    const saldoDisponible = tienda.saldo;
    const cupoDisponible = tienda.cupo;

    if (saldoDisponible + cupoDisponible < valor) {
      return res.status(400).json({ 
        success: false,
        error: 'Saldo insuficiente y el valor supera el cupo disponible para realizar la recarga',
        tipo: 'backend'
      });
    }

    // ==== OBTENER PROVEEDOR Y ÚLTIMO SALDO ====
    const gestopagoService = require('../services/gestopagoService');
    const proveedor = gestopagoService.getProveedor(operadora);
    
    console.log(`📱 Recarga de ${operadora} → Proveedor: ${proveedor}`);

    // Obtener último saldo del mismo proveedor
    const Recarga = require('../models/Recarga');
    const ultimaRecarga = await Recarga.findOne({
      where: {
        proveedor: proveedor,
        saldoGestopago: { [Op.ne]: null }
      },
      order: [['fecha', 'DESC']]
    });

    const saldoAnteriorGestopago = ultimaRecarga ? ultimaRecarga.saldoGestopago : null;
    
    console.log(`💰 Último saldo de ${proveedor}: $${saldoAnteriorGestopago || 'N/A'}`);

    // ==== LLAMAR A GESTOPAGO ====
    try {
      const respuestaGestopago = await gestopagoService.realizarRecarga({
        usuarioId,
        operadora,
        telefono: celular,
        idServicio,
        idProducto,
        valor
      });

      if (respuestaGestopago.exitoso) {
        console.log('=== GUARDANDO RECARGA ===');
        console.log('Saldo GestoPago:', respuestaGestopago.saldo);
        console.log('Comisión:', respuestaGestopago.comision);
        console.log('========================');
        
        tienda.saldo -= valor;

        if (usuario.rol === 'vendedor') {
          const maxIncremento = tienda.credito - (usuario.valor_recargas || 0);
          
          if (valor > maxIncremento) {
            usuario.valor_recargas = (usuario.valor_recargas || 0) + maxIncremento;
          } else {
            usuario.valor_recargas = (usuario.valor_recargas || 0) + valor;
          }
          
          usuario.valor_recargas = Math.min(usuario.valor_recargas, tienda.credito);
        }

        await tienda.save();
        await usuario.save();

        // Registrar recarga exitosa
        const nuevaRecarga = await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: respuestaGestopago.folio,
          exitoso: true,
          codigoError: null,
          mensajeError: null,
          proveedor: proveedor,
          saldoGestopago: respuestaGestopago.saldo,
          comision: respuestaGestopago.comision
        });

        console.log(`✅ Nuevo saldo de ${proveedor}: $${respuestaGestopago.saldo}`);

        // ===== REGISTRAR EVENTO DE SALDO =====
        const contabilidadService = require('../services/contabilidadService');

        await contabilidadService.registrarEvento({
          proveedor: proveedor,
          saldo: respuestaGestopago.saldo,
          tipoEvento: 'recarga',
          detalles: {
            recargaId: nuevaRecarga.id,
            valor: valor,
            comision: respuestaGestopago.comision,
            operadora: operadora
          },
          RecargaId: nuevaRecarga.id
        });

        // ===== DETECTAR INCREMENTOS =====
        const ConfiguracionSistema = require('../models/ConfiguracionSistema');
        const deteccionConfig = await ConfiguracionSistema.findOne({
          where: { clave: 'deteccion_incrementos_habilitada' }
        });

        const deteccionHabilitada = deteccionConfig && deteccionConfig.valor === 'true';

        if (deteccionHabilitada && saldoAnteriorGestopago && respuestaGestopago.saldo) {
          if (proveedor === 'general') {
            await contabilidadService.detectarIncrementoGeneral({
              saldoAnterior: saldoAnteriorGestopago,
              saldoNuevo: respuestaGestopago.saldo,
              valor: valor,
              comision: respuestaGestopago.comision,
              RecargaId: nuevaRecarga.id,
              operadora: operadora
            });
          } else if (proveedor === 'movistar') {
            await contabilidadService.detectarIncrementoMovistar({
              saldoAnterior: saldoAnteriorGestopago,
              saldoNuevo: respuestaGestopago.saldo,
              valor: valor,
              comision: respuestaGestopago.comision,
              RecargaId: nuevaRecarga.id,
              operadora: operadora
            });
          }
        }

        const response = {
          success: true,
          mensaje: 'Recarga exitosa',
          folio: respuestaGestopago.folio,
          saldo_restante: tienda.saldo,
          cupo_disponible: tienda.cupo
        };

        if (nuevoToken) {
          response.token = nuevoToken;
        }

        return res.json(response);

      } else {
        // Recarga fallida
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: null,
          exitoso: false,
          codigoError: respuestaGestopago.codigo,
          mensajeError: respuestaGestopago.mensaje,
          proveedor: proveedor,
          saldoGestopago: respuestaGestopago.saldo,
          comision: respuestaGestopago.comision
        });

        return res.status(400).json({
          success: false,
          error: respuestaGestopago.mensaje,
          codigo: respuestaGestopago.codigo,
          tipo: 'gestopago'
        });
      }

    } catch (errorGestopago) {
      // ===== ERROR: DUPLICADO =====
      if (errorGestopago.codigo === 'DUPLICADO') {
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: null,
          exitoso: false,
          codigoError: null,
          proveedor: proveedor,
          mensajeError: 'Transacción duplicada',
          saldoGestopago: null,
          comision: null
        });

        return res.status(409).json({
          success: false,
          error: 'Ya existe una transacción en proceso para este número',
          tipo: 'backend'
        });
      }

      // ===== ERROR: TIMEOUT =====
      if (errorGestopago.codigo === 'TIMEOUT') {
        const mensajeTimeout = 'Tiempo de espera agotado - Verificación pendiente';
        
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: null,
          exitoso: false,
          proveedor: proveedor,
          codigoError: null,
          mensajeError: mensajeTimeout,
          saldoGestopago: null,
          comision: null
        });

        // Guardar datos para verificación posterior
        const datosVerificacion = {
          usuarioId,
          operadora,
          celular,
          idServicio,
          idProducto,
          valor,
          tipo,
          tiendaId: tienda.id,
          usuarioRol: usuario.rol,
          credito: tienda.credito,
          valorRecargasActual: usuario.valor_recargas || 0,
          nuevoToken,
          proveedor,
          saldoAnteriorGestopago
        };

        // Programar verificación automática en 30 segundos
        setTimeout(async () => {
          try {
            console.log(`[AUTO-VERIFICACIÓN] Verificando recarga ${datosVerificacion.celular}`);
            
            const resultadoConfirmacion = await gestopagoService.confirmarTransaccion({
              operadora: datosVerificacion.operadora,
              telefono: datosVerificacion.celular,
              idServicio: datosVerificacion.idServicio,
              idProducto: datosVerificacion.idProducto
            });

            if (resultadoConfirmacion.exitoso) {
              console.log(`✅ Verificación exitosa. Folio: ${resultadoConfirmacion.folio}`);
              
              // Recargar datos actualizados de la BD
              const usuarioActualizado = await Usuario.findByPk(datosVerificacion.usuarioId);
              const tiendaActualizada = await Tienda.findOne({ 
                where: { UsuarioId: datosVerificacion.usuarioId } 
              });

              // Aplicar lógica de descuento
              tiendaActualizada.saldo -= datosVerificacion.valor;

              // Aplicar lógica de vendedor
              if (datosVerificacion.usuarioRol === 'vendedor') {
                const maxIncremento = datosVerificacion.credito - datosVerificacion.valorRecargasActual;
                
                if (datosVerificacion.valor > maxIncremento) {
                  usuarioActualizado.valor_recargas = datosVerificacion.valorRecargasActual + maxIncremento;
                } else {
                  usuarioActualizado.valor_recargas = datosVerificacion.valorRecargasActual + datosVerificacion.valor;
                }
                
                usuarioActualizado.valor_recargas = Math.min(
                  usuarioActualizado.valor_recargas, 
                  datosVerificacion.credito
                );
              }

              await tiendaActualizada.save();
              await usuarioActualizado.save();

              // Buscar y actualizar la recarga fallida
              const recargaActualizada = await Recarga.findOne({
                where: {
                  TiendaId: datosVerificacion.tiendaId,
                  celular: datosVerificacion.celular,
                  valor: datosVerificacion.valor,
                  exitoso: false,
                  mensajeError: mensajeTimeout
                },
                order: [['createdAt', 'DESC']]
              });

              if (recargaActualizada) {
                await recargaActualizada.update({
                  exitoso: true,
                  folio: resultadoConfirmacion.folio,
                  saldoGestopago: resultadoConfirmacion.saldo,
                  comision: resultadoConfirmacion.comision,
                  mensajeError: null,
                  codigoError: null
                });

                // Registrar evento de saldo
                const contabilidadService = require('../services/contabilidadService');

                await contabilidadService.registrarEvento({
                  proveedor: datosVerificacion.proveedor,
                  saldo: resultadoConfirmacion.saldo,
                  tipoEvento: 'recarga',
                  detalles: {
                    recargaId: recargaActualizada.id,
                    valor: datosVerificacion.valor,
                    comision: resultadoConfirmacion.comision,
                    operadora: datosVerificacion.operadora
                  },
                  RecargaId: recargaActualizada.id
                });

                // Detectar incrementos
                const ConfiguracionSistema = require('../models/ConfiguracionSistema');
                const deteccionConfig = await ConfiguracionSistema.findOne({
                  where: { clave: 'deteccion_incrementos_habilitada' }
                });

                const deteccionHabilitada = deteccionConfig && deteccionConfig.valor === 'true';

                if (deteccionHabilitada && datosVerificacion.saldoAnteriorGestopago && resultadoConfirmacion.saldo) {
                  if (datosVerificacion.proveedor === 'general') {
                    await contabilidadService.detectarIncrementoGeneral({
                      saldoAnterior: datosVerificacion.saldoAnteriorGestopago,
                      saldoNuevo: resultadoConfirmacion.saldo,
                      valor: datosVerificacion.valor,
                      comision: resultadoConfirmacion.comision,
                      RecargaId: recargaActualizada.id,
                      operadora: datosVerificacion.operadora
                    });
                  } else if (datosVerificacion.proveedor === 'movistar') {
                    await contabilidadService.detectarIncrementoMovistar({
                      saldoAnterior: datosVerificacion.saldoAnteriorGestopago,
                      saldoNuevo: resultadoConfirmacion.saldo,
                      valor: datosVerificacion.valor,
                      comision: resultadoConfirmacion.comision,
                      RecargaId: recargaActualizada.id,
                      operadora: datosVerificacion.operadora
                    });
                  }
                }

                console.log(`✅ Recarga actualizada exitosamente en BD`);
              } else {
                console.error('❌ No se encontró la recarga para actualizar');
              }

            } else {
              // Verificación fallida
              console.log(`✗ Verificación fallida: ${resultadoConfirmacion.mensaje}`);
              
              await Recarga.update(
                {
                  mensajeError: `Verificación fallida: ${resultadoConfirmacion.mensaje}`,
                  codigoError: resultadoConfirmacion.codigo
                },
                {
                  where: {
                    TiendaId: datosVerificacion.tiendaId,
                    celular: datosVerificacion.celular,
                    valor: datosVerificacion.valor,
                    exitoso: false,
                    mensajeError: mensajeTimeout
                  },
                  order: [['createdAt', 'DESC']],
                  limit: 1
                }
              );
            }

          } catch (err) {
            console.error('❌ Error en verificación automática:', err);
          }
        }, 30000);

        return res.status(504).json({
          success: false,
          error: 'Tiempo de espera agotado. La recarga está siendo verificada.',
          tipo: 'timeout'
        });
      }

      // ===== OTROS ERRORES DE RED =====
      await Recarga.create({
        TiendaId: tienda.id,
        operadora,
        tipo,
        valor,
        celular,
        folio: null,
        exitoso: false,
        codigoError: null,
        proveedor: proveedor,
        saldoGestopago: null,
        comision: null,
        mensajeError: errorGestopago.mensaje || 'Error de conexión con el servicio de recargas'
      });

      return res.status(500).json({
        success: false,
        error: errorGestopago.mensaje || 'Error de conexión con el servicio de recargas',
        tipo: 'red'
      });
    }

  } catch (error) {
    console.error('Error general en recarga:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      tipo: 'backend'
    });
  }
});

router.post('/recargas2-resp2026', authenticateToken, async (req, res) => {
  const { latitud, longitud, operadora, tipo, valor, celular, idServicio, idProducto } = req.body;

  try {
    const usuarioId = req.user.id;

    // ===== BUSCAR USUARIO =====
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: 'Usuario no encontrado.',
        tipo: 'backend'
      });
    }

    let nuevoToken = null;

    // ===== VERIFICACIÓN PRIMERA VEZ (TODOS LOS ROLES) =====
    if (!usuario.verificado) {
      if (!latitud || !longitud) {
        return res.status(400).json({ 
          success: false,
          error: 'Debe proporcionar latitud y longitud para verificar la tienda',
          tipo: 'backend'
        });
      }

      const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
      if (!tienda) {
        return res.status(404).json({ 
          success: false,
          error: 'Tienda no encontrada para este usuario.',
          tipo: 'backend'
        });
      }

      // Verificar usuario (sin importar si es tienda o vendedor)
      usuario.verificado = true;
      tienda.latitud = latitud;
      tienda.longitud = longitud;
      await usuario.save();
      await tienda.save();

      // Generar nuevo token con verificado = true
      const tokenPayload = {
        id: usuario.id,
        correo: usuario.correo || "",
        nombre_tienda: usuario.nombre_tienda,
        rol: usuario.rol,
        verificado: usuario.verificado,
        nombres_apellidos: usuario.nombres_apellidos || "",
        celular: usuario.celular || ""
      };
      nuevoToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);
    }

    // ===== VALIDACIÓN POST-VERIFICACIÓN =====
    if (!usuario.verificado) {
      return res.status(403).json({ 
        success: false,
        error: 'El usuario no está verificado',
        tipo: 'backend'
      });
    }

    // ===== VALIDACIÓN USUARIO ACTIVO =====
    if (!usuario.activo) {
      return res.status(403).json({ 
        success: false,
        error: 'El usuario no está activo',
        tipo: 'backend'
      });
    }

    // ===== BUSCAR TIENDA =====
    const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
    if (!tienda) {
      return res.status(404).json({ 
        success: false,
        error: 'Tienda no encontrada para este usuario.',
        tipo: 'backend'
      });
    }

    // ===== VERIFICAR SALDO Y CUPO =====
    const saldoDisponible = tienda.saldo;
    const cupoDisponible = tienda.cupo;

    if (saldoDisponible + cupoDisponible < valor) {
      return res.status(400).json({ 
        success: false,
        error: 'Saldo insuficiente y el valor supera el cupo disponible para realizar la recarga',
        tipo: 'backend'
      });
    }

    // ===== LLAMAR A GESTOPAGO DESDE EL BACKEND =====
    try {
      const respuestaGestopago = await gestopagoService.realizarRecarga({
        usuarioId,
        operadora,
        telefono: celular,
        idServicio,
        idProducto,
        valor
      });

      // ===== SI GESTOPAGO RESPONDE EXITOSAMENTE =====
      if (respuestaGestopago.exitoso) {
        // Descontar saldo DESPUÉS de confirmar con GestoPago
        tienda.saldo -= valor;

        // Lógica de vendedor (cuando hace recarga como tienda)
        if (usuario.rol === 'vendedor') {
          const maxIncremento = tienda.credito - (usuario.valor_recargas || 0);
          
          if (valor > maxIncremento) {
            usuario.valor_recargas = (usuario.valor_recargas || 0) + maxIncremento;
          } else {
            usuario.valor_recargas = (usuario.valor_recargas || 0) + valor;
          }
          
          usuario.valor_recargas = Math.min(usuario.valor_recargas, tienda.credito);
        }

        await tienda.save();
        await usuario.save();

        // Registrar recarga exitosa
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: respuestaGestopago.folio,
          exitoso: true,
          codigoError: null,
          mensajeError: null
        });

        // Respuesta exitosa
        const response = {
          success: true,
          mensaje: 'Recarga exitosa',
          folio: respuestaGestopago.folio,
          saldo_restante: tienda.saldo,
          cupo_disponible: tienda.cupo
        };

        if (nuevoToken) {
          response.token = nuevoToken;
        }

        return res.json(response);

      } else {
        // ===== ERROR DE GESTOPAGO - GUARDAR RECARGA FALLIDA =====
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: null,
          exitoso: false,
          codigoError: respuestaGestopago.codigo,
          mensajeError: respuestaGestopago.mensaje
        });

        // Retornar el error de GestoPago al cliente
        return res.status(400).json({
          success: false,
          error: respuestaGestopago.mensaje,
          codigo: respuestaGestopago.codigo,
          tipo: 'gestopago'
        });
      }

    } catch (errorGestopago) {
      // ===== MANEJO DE ERROR DUPLICADO =====
      if (errorGestopago.codigo === 'DUPLICADO') {
        // Guardar recarga fallida por duplicado
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: null,
          exitoso: false,
          codigoError: null,
          mensajeError: 'Transacción duplicada - Ya existe una transacción en proceso para este número'
        });

        return res.status(409).json({
          success: false,
          error: 'Ya existe una transacción en proceso para este número. Por favor espera 15 minutos.',
          tipo: 'backend'
        });
      }

      // ===== MANEJO DE TIMEOUT CON VERIFICACIÓN AUTOMÁTICA =====
      if (errorGestopago.codigo === 'TIMEOUT') {
        // Guardar recarga fallida por timeout
        await Recarga.create({
          TiendaId: tienda.id,
          operadora,
          tipo,
          valor,
          celular,
          folio: null,
          exitoso: false,
          codigoError: null,
          mensajeError: 'Tiempo de espera agotado - Verificación pendiente'
        });

        // Guardar datos para verificación posterior
        const datosVerificacion = {
          usuarioId,
          operadora,
          celular,
          idServicio,
          idProducto,
          valor,
          tipo,
          tienda,
          usuario,
          nuevoToken
        };

        // Programar verificación automática en 30 segundos
        setTimeout(async () => {
          try {
            console.log(`[AUTO-VERIFICACIÓN] Verificando recarga ${celular}`);
            
            const resultadoConfirmacion = await gestopagoService.confirmarTransaccion({
              operadora: datosVerificacion.operadora,
              telefono: datosVerificacion.celular,
              idServicio: datosVerificacion.idServicio,
              idProducto: datosVerificacion.idProducto
            });

            if (resultadoConfirmacion.exitoso) {
              // Recargar datos actualizados de la BD
              const usuarioActualizado = await Usuario.findByPk(datosVerificacion.usuarioId);
              const tiendaActualizada = await Tienda.findOne({ 
                where: { UsuarioId: datosVerificacion.usuarioId } 
              });

              // Aplicar lógica de descuento
              tiendaActualizada.saldo -= datosVerificacion.valor;

              // Aplicar lógica de vendedor
              if (usuarioActualizado.rol === 'vendedor') {
                const maxIncremento = tiendaActualizada.credito - (usuarioActualizado.valor_recargas || 0);
                
                if (datosVerificacion.valor > maxIncremento) {
                  usuarioActualizado.valor_recargas = (usuarioActualizado.valor_recargas || 0) + maxIncremento;
                } else {
                  usuarioActualizado.valor_recargas = (usuarioActualizado.valor_recargas || 0) + datosVerificacion.valor;
                }
                
                usuarioActualizado.valor_recargas = Math.min(
                  usuarioActualizado.valor_recargas, 
                  tiendaActualizada.credito
                );
              }

              await tiendaActualizada.save();
              await usuarioActualizado.save();

              // Actualizar recarga fallida a exitosa
              await Recarga.update(
                {
                  exitoso: true,
                  folio: resultadoConfirmacion.folio,
                  mensajeError: null,
                  codigoError: null
                },
                {
                  where: {
                    TiendaId: tiendaActualizada.id,
                    celular: datosVerificacion.celular,
                    valor: datosVerificacion.valor,
                    exitoso: false,
                    mensajeError: 'Tiempo de espera agotado - Verificación pendiente'
                  },
                  order: [['createdAt', 'DESC']],
                  limit: 1
                }
              );

              console.log(`✓ Recarga ${celular} completada automáticamente - Folio: ${resultadoConfirmacion.folio}`);
            } else {
              // Actualizar mensaje de error en la recarga fallida
              await Recarga.update(
                {
                  mensajeError: `Verificación fallida: ${resultadoConfirmacion.mensaje}`,
                  codigoError: resultadoConfirmacion.codigo
                },
                {
                  where: {
                    TiendaId: tienda.id,
                    celular: datosVerificacion.celular,
                    valor: datosVerificacion.valor,
                    exitoso: false,
                    mensajeError: 'Tiempo de espera agotado - Verificación pendiente'
                  },
                  order: [['createdAt', 'DESC']],
                  limit: 1
                }
              );

              console.log(`✗ Verificación fallida: ${resultadoConfirmacion.mensaje}`);
            }

          } catch (err) {
            console.error('Error en verificación automática:', err);
          }
        }, 30000);

        return res.status(504).json({
          success: false,
          error: 'Tiempo de espera agotado. La recarga está siendo verificada automáticamente. Consulta tu historial en unos momentos.',
          timeout: true,
          tipo: 'timeout'
        });
      }

      // ===== OTROS ERRORES DE RED - GUARDAR COMO FALLIDA =====
      await Recarga.create({
        TiendaId: tienda.id,
        operadora,
        tipo,
        valor,
        celular,
        folio: null,
        exitoso: false,
        codigoError: null,
        mensajeError: errorGestopago.mensaje || 'Error de conexión con el servicio de recargas'
      });

      return res.status(500).json({
        success: false,
        error: errorGestopago.mensaje || 'Error de conexión con el servicio de recargas',
        tipo: 'red'
      });
    }

  } catch (error) {
    console.error('Error general en recarga:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      tipo: 'backend'
    });
  }
});

router.post('/recargas', authenticateToken, async (req, res) => {
  const { latitud, longitud, operadora, tipo, valor, celular,folio } = req.body;

  try {
    const usuarioId = req.user.id;

    // Buscar al usuario autenticado
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    let nuevoToken = null;

    if (!usuario.verificado) {
      if (!latitud || !longitud) {
        return res.status(400).json({ error: 'Debe proporcionar latitud y longitud para verificar la tienda' });
      }

      const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
      if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada para este usuario.' });


        usuario.verificado = true;
        tienda.latitud=latitud;
        tienda.longitud=longitud;
        await usuario.save();
        await tienda.save();


        // Generar nuevo token si el usuario fue verificado
        const tokenPayload = {
          id: usuario.id,
          correo: usuario.correo || "",
          nombre_tienda: usuario.nombre_tienda,
          rol: usuario.rol,
          verificado: usuario.verificado,
          nombres_apellidos: usuario.nombres_apellidos || "",
          celular: usuario.celular || ""
        };
        nuevoToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);

    }

    if (!usuario.verificado) {
      return res.status(403).json({ error: 'El usuario no está verificado' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'El usuario no está activo' });
    }

    const tienda = await Tienda.findOne({ where: { UsuarioId: usuarioId } });
    if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada para este usuario.' });

    // Verificar saldo y cupo
    const saldoDisponible = tienda.saldo;
    const cupoDisponible = tienda.cupo;

    if (saldoDisponible + cupoDisponible < valor) {
      return res.status(400).json({ error: 'Saldo insuficiente y el valor supera el cupo disponible para realizar la recarga' });
    }

    // Disminuir el saldo de la tienda, permitiendo saldo negativo hasta el valor del cupo
    tienda.saldo -= valor;

// Si el usuario es de tipo vendedor, se ajusta el valor de recargas
if (usuario.rol === 'vendedor') {
  // Calcula cuánto se puede incrementar en valor_recargas sin exceder el crédito
  const maxIncremento = tienda.credito - (usuario.valor_recargas || 0);

  // Si el valor excede el crédito disponible, ajusta el valor_recarga solo hasta el crédito
  if (valor > maxIncremento) {
    usuario.valor_recargas = (usuario.valor_recargas || 0) + maxIncremento;
  } else {
    usuario.valor_recargas = (usuario.valor_recargas || 0) + valor;
  }

  // Evita que el valor_recargas exceda el crédito
  usuario.valor_recargas = Math.min(usuario.valor_recargas, tienda.credito);
}


    await tienda.save();
    await usuario.save();

    // Registrar la recarga en la base de datos
    const nuevaRecarga = await Recarga.create({
      TiendaId: tienda.id,
      operadora,
      tipo,
      valor,
      celular,
      folio
    });


    // Respuesta de éxito
     // Respuesta de éxito
     const response = {
      mensaje: 'Recarga exitosa',
      saldo_restante: tienda.saldo,
      cupo_disponible: tienda.cupo
    };

    // Si el usuario fue verificado, agregar el nuevo token a la respuesta
    if (nuevoToken) {
      response.token = nuevoToken;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

  

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance; // Distancia en metros
}

module.exports = router;
