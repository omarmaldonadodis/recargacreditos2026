const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const Tienda = require('../models/Tienda');
const Session = require('../models/Session');
const crypto = require('crypto');

const TipoRecarga = require('../models/TipoRecarga');
const Saldo = require('../models/Saldo');
const Recarga = require('../models/Recarga');
const PagVendedor = require('../models/PagVendedor');
const authenticateToken = require('../middlewares/authenticateToken');
const { Op } = require('sequelize');
const sequelize = require('../config/database'); // Asegúrate de importar sequelize desde la configuración correcta

const router = express.Router();

const dateFnsTz = require("date-fns-tz");
const dbTimeZone = "America/Mexico_City";
const { parseDbDate } = require('../utils/dateUtils');
const { calcularPromedioSemanal } = require('../utils/weeklyAverage');


// Crear usuario tienda
router.post('/crear-tienda', authenticateToken, async (req, res) => {
  const { correo, contrasenia, latitud, longitud } = req.body;

  if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const hashedPassword = await bcrypt.hash(contrasenia, 10);
    const usuarioTienda = await Usuario.create({ correo, contrasenia: hashedPassword, rol: 'tienda' });
    const tienda = await Tienda.create({ latitud, longitud, UsuarioId: usuarioTienda.id });

    res.status(201).json({ usuarioTienda, tienda });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//Obtener vendedores
router.get('/vendedores', async (req, res) => {
  try {
    // Consulta para obtener usuarios con rol "vendedor"
    const vendedores = await Usuario.findAll({
      where: { rol: {
        [Op.or]: ['vendedor', 'administrador'] // Filtra por los roles "vendedor" o "administrador"
      },
      
                  eliminado: false
      }, // Filtra por el rol "vendedor"
      attributes: ['id','nombres_apellidos', 'correo'], // Solo selecciona los campos necesarios
    });

    // Enviar la lista de vendedores como respuesta
    res.json(vendedores);
  } catch (error) {
    console.error('Error al obtener los vendedores:', error);
    res.status(500).json({ error: 'Error al obtener los vendedores' });
  }
});

router.get('/adeudado', authenticateToken, async (req, res) => {
  try {
    // Obtener el id del usuario desde el token decodificado (req.user.id)
    const usuarioId = req.user.id;
    console.log("llegue a adeudadoi");

    // Buscar la tienda asociada al usuario autenticado
    const usuario = await Usuario.findByPk(usuarioId);

    const adeudado = usuario.valor_depositar;

    

    // Devolver el saldo disponible, la lista de saldos acreditados, el cupo y el promedio semanal
    res.json({ adeudado: adeudado });

  } catch (error) {
    // Manejar cualquier error que ocurra durante la operación
    res.status(500).json({ error: error.message });
  }
});

// Ruta para reasignar la tienda a otro vendedor
router.patch('/reasignar/:tiendaId', async (req, res) => {
  const { tiendaId } = req.params;
  const { nuevoVendedorId } = req.body; // ID del nuevo vendedor al que se reasignará la tienda

  try {


    // Verificar si el nuevo vendedor existe y tiene el rol correcto
    const nuevoVendedor = await Usuario.findOne({
      where: { id: nuevoVendedorId},
    });

    if (!nuevoVendedor) {
      return res.status(404).json({ error: 'El vendedor no existe o no tiene el rol adecuado' });
    }

    // Buscar la tienda por ID
    const tienda = await Tienda.findByPk(tiendaId);

    if (!tienda) {
      return res.status(404).json({ error: 'La tienda no fue encontrada' });
    }

        // Obtener las tiendas restantes para reorganizarlas
        const tiendasNuevoVendedor = await Tienda.findAll({
          where: {
            createdBy: nuevoVendedorId,
          },
          include: [
            {
              model: Usuario,
              as: 'usuario',
              where: { eliminado: false }, // Solo tiendas cuyo usuario tenga eliminado = true
              required: true, // Asegura que solo se devuelvan tiendas con usuarios eliminados
            },
          ],
        });
    const ordenEliminado = tienda.orden;
        // Verificar si 'ordenEliminado' es válido
        if (ordenEliminado === undefined || ordenEliminado === null) {
          throw new Error('El campo orden de la tienda es inválido');
        }
    

    // Obtener las tiendas restantes para reorganizarlas
    const tiendasRestantes = await Tienda.findAll({
      where: {
        createdBy: tienda.createdBy,
        orden: {
          [Op.gt]: ordenEliminado // Solo las tiendas con orden mayor al eliminado
        }
      },
      order: [['orden', 'ASC']] // Ordenarlas por su campo 'orden' ascendente
    });

    // Reorganizar el orden de las tiendas restantes
    for (let i = 0; i < tiendasRestantes.length; i++) {
      await tiendasRestantes[i].update({ orden: ordenEliminado + i }); // Asignar nuevo orden consecutivo
    }

    // Actualizar el campo createdBy para reasignar la tienda al nuevo vendedor
    tienda.createdBy = nuevoVendedorId;
    tienda.orden= tiendasNuevoVendedor.length+1;
    tienda,
    await tienda.save();

    res.json({ message: 'La tienda ha sido reasignada exitosamente', tienda });
  } catch (error) {
    console.error('Error al reasignar la tienda:', error);
    res.status(500).json({ error: 'Error al reasignar la tienda' });
  }
});

// Ruta para obtener tiendas creadas por un usuario específico y calcular el promedio de ventas semanal
router.get('/obtener-tiendas/usuario', authenticateToken, async (req, res) => {
  try {
    // Verifica si el usuario es administrador o vendedor
    if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Buscar todas las tiendas creadas por el usuario autenticado e incluir detalles del usuario asociado
    const tiendas = await Tienda.findAll({
      where: {
        createdBy: req.user.id  // Filtra por el usuario que creó la tienda
      },
      attributes: { exclude: ['createdBy'] },  // Excluir el campo 'createdBy'
      include: [{
        model: Usuario,
        as: 'usuario',  // Alias definido en la asociación
        where: {
          eliminado: false, // Filtra usuarios cuyo campo eliminado es false
        },
        attributes: { exclude: ['contrasenia'] }  // Excluir el campo 'contrasenia'
      }],
      order: [['orden', 'ASC']]
    });

    // Si no se encuentran tiendas, devolver un mensaje adecuado
    if (tiendas.length === 0) {
      return res.status(404).json({ message: 'No se encontraron tiendas para este usuario' });
    }

    // Iterar sobre cada tienda para calcular el promedio de ventas semanal
    for (const tienda of tiendas) {
      const fechaActual = new Date();
      const fechaCreacion = new Date(tienda.createdAt);
      const ochoSemanasEnMs = 8 * 7 * 24 * 60 * 60 * 1000; // 8 semanas en milisegundos
      let fechaInicioPeriodo;

      // Si han pasado menos de 8 semanas desde la creación, se usa la fecha de creación
      if (fechaActual - fechaCreacion < ochoSemanasEnMs) {
        fechaInicioPeriodo = fechaCreacion;
      } else {
        // Si ya han pasado 8 semanas o más, se toman los últimos 56 días
        fechaInicioPeriodo = new Date(fechaActual - ochoSemanasEnMs);
      }

      // Consultar todas las recargas en el período determinado para la tienda actual
      const recargas = await Recarga.findAll({
        where: {
          TiendaId: tienda.id,
          fecha: {
            [Op.between]: [fechaInicioPeriodo, fechaActual]
          },
        },
      });

      // Sumar el total de ventas (valor de recargas) en el período
      const totalVentas = recargas.reduce((total, recarga) => total + recarga.valor, 0);

      // Calcular la cantidad de semanas transcurridas en el período
      const diffMs = fechaActual - fechaInicioPeriodo;
      const semanasTranscurridas = diffMs / (7 * 24 * 60 * 60 * 1000);

      
      const promedioSemanal = calcularPromedioSemanal(recargas); // Esta función agrupa por semanas (lunes a domingo) y promedia

      // Agregar el promedio al objeto tienda
      tienda.dataValues.promedioSemanal = promedioSemanal;
    }

    // Responder con los datos encontrados, incluyendo el promedio semanal
    res.status(200).json(tiendas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Función auxiliar para obtener el número de la semana del año
function getWeekOfYear(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

router.get('/obtener-tienda/:id', authenticateToken, async (req, res) => {
  try {
    const tiendaId = req.params.id;

    // Verifica si el usuario es administrador o vendedor
    if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Buscar la tienda específica creada por el usuario autenticado y los detalles del usuario asociado
    const tienda = await Tienda.findOne({
      where: {
        id: tiendaId,
      },
      attributes: { exclude: ['createdBy'] },  // Excluir el campo 'createdBy'
      include: [{
        model: Usuario,
        as: 'usuario',  // Alias definido en la asociación
        attributes: { exclude: ['contrasenia'] }  // Excluir el campo 'contrasenia' del usuario
      }]
    });

    // Si no se encuentra la tienda, devolver un mensaje adecuado
    if (!tienda) {
      return res.status(404).json({ message: 'No se encontró la tienda para este usuario' });
    }

    // Calcular el promedio de ventas de las últimas 8 semanas para la tienda
    const fechaActual = new Date();
    const fechaInicio = new Date(fechaActual);
    fechaInicio.setDate(fechaActual.getDate() - 8 * 7); // 8 semanas atrás

    // Consultar todas las recargas de las últimas 8 semanas para la tienda
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
    // Obtener el valor máximo de 'orden' de todas las tiendas creadas por el mismo usuario (createdBy)
    const createdBy = req.user.id;

    const maxOrden = await Tienda.max('orden', {
      where: {
        createdBy: createdBy
      }
    });

    // Añadir el promedio semanal al objeto de la tienda
    tienda.dataValues.promedioSemanal = promedioSemanal;
    tienda.dataValues.maxOrden = maxOrden;
    // Responder con los datos encontrados, incluyendo el promedio semanal
    res.status(200).json(tienda);
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

// Ruta para alternar la selección de una tienda
router.put('/seleccionar-tienda/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; // ID de la tienda a seleccionar/deseleccionar

  try {
    // Verificar si el usuario es vendedor
    if (req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Buscar la tienda que se quiere seleccionar/deseleccionar
    const tienda = await Tienda.findOne({
      where: { id, createdBy: req.user.id }  // La tienda debe pertenecer al usuario que la creó
    });

    // Si la tienda no existe o no pertenece al usuario, devolver un error
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada o no pertenece al usuario' });
    }

    // Iniciar una transacción para asegurar la atomicidad de la operación
    await sequelize.transaction(async (t) => {
      if (tienda.seleccionado) {
        // Si la tienda ya está seleccionada, desmarcarla
        tienda.seleccionado = false;
        await tienda.save({ transaction: t });
        res.status(200).json({ message: 'Tienda deseleccionada exitosamente' });
      } else {
        // Desmarcar todas las tiendas del usuario como no seleccionadas
        await Tienda.update(
          { seleccionado: false },
          { where: { createdBy: req.user.id }, transaction: t }
        );

        // Marcar la tienda actual como seleccionada
        tienda.seleccionado = true;
        await tienda.save({ transaction: t });
        res.status(200).json({ message: 'Tienda seleccionada exitosamente' });
      }
    });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});


// Ruta para obtener tiendas creadas por un usuario específico
router.get('/obtener-tiendas/usuario-anterior', authenticateToken, async (req, res) => {
  try {
    // Verifica si el usuario es administrador o vendedor
    if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Buscar todas las tiendas creadas por el usuario autenticado y los detalles del usuario asociado
    const tiendas = await Tienda.findAll({
      where: {
        createdBy: req.user.id  // Filtra por el usuario que creó la tienda
      },
      attributes: { exclude: ['createdBy'] },  // Excluir el campo 'createdBy'
      include: [{
        model: Usuario,
        as: 'usuario',  // Alias definido en la asociación
        attributes: { exclude: ['contrasenia'] }  // Excluir el campo 'contrasenia' del usuario
      }]
    });

    // Si no se encuentran tiendas, devolver un mensaje adecuado
    if (tiendas.length === 0) {
      return res.status(404).json({ message: 'No se encontraron tiendas para este usuario' });
    }

    // Responder con los datos encontrados
    res.status(200).json(tiendas);
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.post('/crear-por-tienda', authenticateToken, async (req, res) => {
  // Desestructuramos correctamente el valor de 'contrasenia' desde el req.body
  const { nombre_tienda, latitud, longitud, celular, contrasenia } = req.body;

  if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    // Verificar si el nombre_tienda ya existe
    const tiendaExistente = await Usuario.findOne({ where: { nombre_tienda } });
    if (tiendaExistente) {
      return res.status(400).json({ error: 'El nombre de tienda ya está en uso' });
    }

    // Usar el número de teléfono como contraseña inicial
    // Aquí NO se debe reasignar la variable 'contrasenia'
    const hashedPassword = await bcrypt.hash(contrasenia, 10); // Usa directamente la variable contrasenia que viene del req.body

    // Crear el usuario tienda
    const usuarioTienda = await Usuario.create({ 
      nombre_tienda,
      celular,
      contrasenia: hashedPassword, // Guardamos la contraseña encriptada
      rol: 'tienda',
      verificado: false,
    });

    // Crear la tienda vinculada al usuario
    const tienda = await Tienda.create({ 
      latitud, 
      longitud, 
      UsuarioId: usuarioTienda.id, 
      createdBy: req.user.id
    });

    // Responder con éxito
    res.status(201).json({ 
      mensaje: 'Tienda creada exitosamente',
      tienda: {
        id: usuarioTienda.id,
        nombre_tienda: usuarioTienda.nombre_tienda,
        celular: usuarioTienda.celular,
        latitud: tienda.latitud,
        longitud: tienda.longitud
      }
    });
  } catch (error) {
    // Manejar errores específicos de validación de Sequelize
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El número de Whatsapp ya está en uso' });
    }
    res.status(400).json({ error: error.message });
  }
});




router.post('/crear-por-tienda2', authenticateToken, async (req, res) => {
  const { correo, contrasenia, latitud, longitud, celular } = req.body;  // Asegúrate de extraer 'celular' de req.body

  // Verifica si el rol del usuario es 'administrador' o 'vendedor'
  if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    // Encriptar la contraseña proporcionada
    const hashedPassword = await bcrypt.hash(contrasenia, 10);

    // Crear un nuevo usuario con el rol 'tienda'
    const usuarioTienda = await Usuario.create({ 
      correo, 
      contrasenia: hashedPassword, 
      celular,  // Asegúrate de pasar 'celular' al crear el usuario
      rol: 'tienda' ,
      verificado: false,
    });

    // Crear una nueva tienda asociada al usuario recién creado
    const tienda = await Tienda.create({ 
      latitud, 
      longitud, 
      UsuarioId: usuarioTienda.id, 
      createdBy: req.user.id  // Guarda el ID del usuario que creó la tienda
    });

    // Responder con el usuario y la tienda creados
    res.status(201).json({ usuarioTienda, tienda });
  } catch (error) {
    // Manejo de errores
    res.status(400).json({ error: error.message });
  }
});


// Ruta para contar el número de tiendas creadas por un usuario
router.get('/tiendas-creadas/:id', authenticateToken, async (req, res) => {
  const { id } = req.params; // Extraer el ID del usuario de los parámetros

  try {
    // Verifica si el rol del usuario es 'administrador' o 'vendedor'
    if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    // Contar cuántas tiendas han sido creadas por el usuario con el ID proporcionado
    const tiendasCreadas = await Tienda.count({
      where: { createdBy: id } // Filtrar por el campo createdBy
    });

    // Responder con el número de tiendas creadas
    res.status(200).json({ tiendasCreadas });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.post('/crear-vendedor', authenticateToken, async (req, res) => {
  const { correo, contrasenia, celular, nombres_apellidos } = req.body;

  // Verifica si el rol del usuario es 'administrador'
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    // Verificar si el correo ya está en uso
    const existingUserByEmail = await Usuario.findOne({ where: { correo } });
    if (existingUserByEmail) {
      return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
    }

    // Verificar si el número de celular ya está en uso
    const existingUserByNombre = await Usuario.findOne({ where: { nombres_apellidos } });
    if (existingUserByNombre) {
      return res.status(400).json({ error: 'El nombre del vendedor ya está en uso' });
    }

      // Verificar si el número de celular ya está en uso
      const existingUserByCelular = await Usuario.findOne({ where: { celular } });
      if (existingUserByCelular) {
        return res.status(400).json({ error: 'El número de celular ya está en uso' });
      }
  

    // Encriptar la contraseña proporcionada
    const hashedPassword = await bcrypt.hash(contrasenia, 10);

    // Extraer la parte local del correo (antes del @)
    const correoLocalParte = correo.split('@')[0];

    // Eliminar caracteres especiales, dejando solo letras y números
    const correoSinEspeciales = correoLocalParte.replace(/[^a-zA-Z0-9]/g, '');

    // Concatenar "vendedor" con el correo limpio
    const nombreTienda = `vendedor${correoSinEspeciales}`;

    // Crear un nuevo usuario con el rol 'vendedor' y 'nombre_tienda'
    const usuarioVendedor = await Usuario.create({ 
      correo, 
      contrasenia: hashedPassword, 
      celular,
      rol: 'vendedor',
      verificado: true,
      nombres_apellidos,
      nombre_tienda: nombreTienda,
    });

    // Crear una nueva tienda asociada al usuario recién creado
    const tienda = await Tienda.create({ 
      UsuarioId: usuarioVendedor.id, 
      latitud: req.body.latitud,
      longitud: req.body.longitud,
      porcentaje: 6,
      createdBy: req.user.id
    });

    // Responder con el usuario y la tienda creados
    res.status(201).json({ usuarioVendedor, tienda });
  } catch (error) {
    // Manejo de errores
    res.status(400).json({ error: error.message });
  }
});



router.get('/obtener-tiendas_anti2', async (req, res) => {
  try {
    // Buscar todas las tiendas y los detalles del usuario asociado, excluyendo el campo 'id'
    const tiendas = await Tienda.findAll({
      attributes: { exclude: ['id', 'UsuarioId', 'createdBy'] },  // Excluir los campos 'id', 'UsuarioId', 'createdBy'
      include: [{
        model: Usuario,
        as: 'usuario',  // Alias definido en la asociación
        attributes: { exclude: ['id', 'contrasenia'] }  // Excluir el campo 'id' y 'contrasenia' del usuario
      }]
    });

    // Responder con los datos encontrados
    res.status(200).json(tiendas);
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.put('/editar-tienda2/:id', async (req, res) => {
  const { id } = req.params;
  const { latitud, longitud, nombres_apellidos, dni, celular, verificado, activo, contrasenia, cupo } = req.body;

  try {
    // Buscar el usuario por su ID
    const usuario = await Usuario.findByPk(id); // Buscar el usuario directamente por su ID

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar la tienda asociada al usuario
    const tienda = await Tienda.findOne({ where: { UsuarioId: usuario.id } });

    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Actualizar los datos de la tienda
    await tienda.update({
      latitud,
      longitud,
      cupo
    });

    // Preparar el objeto de actualización del usuario
    const updatedUserData = {
      nombres_apellidos,
      dni,
      celular,
      verificado,
      activo,
    };

    // Si se proporciona una nueva contraseña, encriptarla antes de actualizar
    if (contrasenia) {
      const salt = await bcrypt.genSalt(10);
      updatedUserData.contrasenia = await bcrypt.hash(contrasenia, salt);
    }

    // Actualizar los datos del usuario
    await usuario.update(updatedUserData);

    // Responder con la tienda y el usuario actualizados
    res.status(200).json({ tienda, usuario });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.put('/editar-tienda/:id', async (req, res) => {
  const { id } = req.params;
  const { latitud, longitud, correo, nombres_apellidos, dni, celular, verificado, activo, cupo } = req.body;

  try {
    // Buscar la tienda por su ID
    const tienda = await Tienda.findByPk(id);

    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Actualizar los datos de la tienda
    await tienda.update({
      latitud,
      longitud
    });

    // Buscar el usuario asociado a la tienda
    const usuario = await Usuario.findByPk(tienda.UsuarioId);

    if (usuario) {
      // Actualizar los datos del usuario
      await usuario.update({
        correo,
        nombres_apellidos,
        dni,
        celular,
        verificado,
        activo,
        cupo
      });
    }

    // Responder con la tienda y el usuario actualizados
    res.status(200).json({ tienda, usuario });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});





// Eliminar vendedor y reasignar usuarios tienda
router.delete('/eliminar-vendedor/:id', authenticateToken, async (req, res) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const vendedor = await Usuario.findByPk(req.params.id);
    if (!vendedor || vendedor.rol !== 'vendedor') return res.status(404).json({ error: 'Vendedor no encontrado' });

    // Reasignar usuarios tienda al administrador
    const usuariosTienda = await Usuario.findAll({ where: { rol: 'tienda', vendedorId: vendedor.id } });
    for (let usuario of usuariosTienda) {
      usuario.vendedorId = null;
      await usuario.save();
    }
    await Session.destroy({
      where: {
        userId: vendedor.id
      }
    });
    await vendedor.destroy();
     // Eliminar todas las sesiones del usuario
  
    res.json({ mensaje: 'Vendedor eliminado y usuarios tienda reasignados al administrador' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CRUD de tipos de recargas
router.post('/tipos-recarga', authenticateToken, async (req, res) => {
  if (req.user.rol !== 'administrador') return res.status(403).json({ error: 'No autorizado' });

  const { operadora, tipo, valor, token } = req.body;
  try {
    const tipoRecarga = await TipoRecarga.create({ operadora, tipo, valor, token });
    res.status(201).json(tipoRecarga);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/tipos-recarga', authenticateToken, async (req, res) => {
  if (req.user.rol !== 'administrador') return res.status(403).json({ error: 'No autorizado' });

  try {
    const tiposRecarga = await TipoRecarga.findAll();
    res.json(tiposRecarga);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/tipos-recarga/:id', authenticateToken, async (req, res) => {
  if (req.user.rol !== 'administrador') return res.status(403).json({ error: 'No autorizado' });

  try {
    const tipoRecarga = await TipoRecarga.findByPk(req.params.id);
    if (!tipoRecarga) return res.status(404).json({ error: 'Tipo de recarga no encontrado' });
    await tipoRecarga.destroy();
    res.json({ mensaje: 'Tipo de recarga eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/acreditar-saldo2/:id', authenticateToken, async (req, res) => {
  const { valor, credito } = req.body;

  // Verificar que el usuario sea administrador o vendedor
  if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    // Buscar el usuario por ID
    const usuario = await Usuario.findByPk(req.params.id); // Usamos el id en lugar del correo
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar la tienda asociada al usuario
    const tienda = await Tienda.findOne({ where: { UsuarioId: usuario.id } });
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Obtener el valor de tienda.contado
    const contado = tienda.contado;
    
    const vendedor = await Usuario.findByPk(tienda.createdBy);

    //const vendedor = await Usuario.findByPk(req.user.id);

    // Variables para almacenar los resultados
    let valorConPorcentaje = null;
    let valorAdeudadoActualizado = null;
    let saldosCreados = [];

    // Caso 1: tienda.contado es true y credito es false
    if (contado && !credito) {
      // **Proceso como si credito fuera false**
      valorConPorcentaje = valor + (valor * (tienda.porcentaje / 100));

      // Verificar si el valor es negativo y saldo suficiente
      if (valor < 0) {
        if ((tienda.saldo + valorConPorcentaje) < 0) {
          return res.status(400).json({ error: 'Saldo insuficiente para realizar esta operación' });
        }
      }

      // Actualizar saldo y crédito de la tienda
      tienda.saldo += valorConPorcentaje;
      tienda.credito += valor;

      // Actualizar valor_adeudado del vendedor
      //modifique para que el administrador igual asigne los valores al vendedor
      //if (req.user.rol === 'vendedor') {
        vendedor.valor_adeudado += valor;
        valorAdeudadoActualizado = vendedor.valor_adeudado;
     // }

      // Crear registro de saldo (credito false)
      const saldoContado = await Saldo.create({
        valor,
        valor_con_porcentaje: valorConPorcentaje,
        valor_pagado: valor,
        valor_restante: valor - valorConPorcentaje,
        porcentaje: tienda.porcentaje,
        TiendaId: tienda.id,
        acreditadorId: req.user.id,
        credito: false,
      });
      saldosCreados.push(saldoContado);

      // **Proceso como si credito fuera true**
      // Restar el valor del crédito de la tienda
      tienda.credito -= valor;

      // Actualizar valor_adeudado y valor_depositar del vendedor
            //modifique para que el administrador igual asigne los valores al vendedor

     // if (req.user.rol === 'vendedor') {
        vendedor.valor_adeudado -= valor;
        vendedor.valor_depositar += valor;
        valorAdeudadoActualizado = vendedor.valor_adeudado;
    //  }

      // Verificar si el crédito es suficiente
      if (tienda.credito < 0) {
        return res.status(400).json({ error: 'Saldo de crédito insuficiente' });
      }

      // Crear registro de saldo (credito true)
      const saldoCredito = await Saldo.create({
        valor,
        valor_con_porcentaje: null,
        valor_pagado: 0,
        valor_restante: 0,
        porcentaje: tienda.porcentaje,
        TiendaId: tienda.id,
        acreditadorId: req.user.id,
        credito: true,
      });
      saldosCreados.push(saldoCredito);

    } else if (contado && credito) {
      // **Proceso cuando credito es true**
      // Restar el valor del crédito de la tienda
      tienda.credito -= valor;

      // Actualizar valor_adeudado y valor_depositar del vendedor
      if (req.user.rol === 'vendedor') {
        vendedor.valor_adeudado -= valor;
        vendedor.valor_depositar += valor;
        valorAdeudadoActualizado = vendedor.valor_adeudado;
      }

      // Verificar si el crédito es suficiente
      if (tienda.credito < 0) {
        return res.status(400).json({ error: 'Saldo de crédito insuficiente' });
      }

      // Crear registro de saldo
      const saldo = await Saldo.create({
        valor,
        valor_con_porcentaje: null,
        valor_pagado: 0,
        valor_restante: 0,
        porcentaje: tienda.porcentaje,
        TiendaId: tienda.id,
        acreditadorId: req.user.id,
        credito: true,
      });
      saldosCreados.push(saldo);

    } else {
      // **Proceso estándar cuando tienda.contado es false**
      if (!credito) {
        // **Proceso cuando credito es false**
        valorConPorcentaje = valor + (valor * (tienda.porcentaje / 100));

        // Verificar si el valor es negativo y saldo suficiente
        if (valor < 0) {
          if ((tienda.saldo + valorConPorcentaje) < 0) {
            return res.status(400).json({ error: 'Saldo insuficiente para realizar esta operación' });
          } else if ((tienda.credito + valor) < 0) {
            return res.status(400).json({ error: 'Crédito insuficiente para realizar esta operación' });
          }
        }

        // Actualizar saldo y crédito de la tienda
        tienda.saldo += valorConPorcentaje;
        tienda.credito += valor;

        // Actualizar valor_adeudado del vendedor
              //modifique para que el administrador igual asigne los valores al vendedor

        //if (req.user.rol === 'vendedor') {
          vendedor.valor_adeudado += valor;
          valorAdeudadoActualizado = vendedor.valor_adeudado;
       // }

        // Crear registro de saldo
        const saldo = await Saldo.create({
          valor,
          valor_con_porcentaje: valorConPorcentaje,
          valor_pagado: valor,
          valor_restante: valor - valorConPorcentaje,
          porcentaje: tienda.porcentaje,
          TiendaId: tienda.id,
          acreditadorId: req.user.id,
          credito: false,
        });
        saldosCreados.push(saldo);

      } else {
        // **Proceso cuando credito es true**
        // Restar el valor del crédito de la tienda
        tienda.credito -= valor;

        // Actualizar valor_adeudado y valor_depositar del vendedor
              //modifique para que el administrador igual asigne los valores al vendedor

       // if (req.user.rol === 'vendedor') {
          vendedor.valor_adeudado -= valor;
          vendedor.valor_depositar += valor;
          valorAdeudadoActualizado = vendedor.valor_adeudado;
       // }

        // Verificar si el crédito es suficiente
        if (tienda.credito < 0) {
          return res.status(400).json({ error: 'Saldo de crédito insuficiente' });
        }

        // Crear registro de saldo
        const saldo = await Saldo.create({
          valor,
          valor_con_porcentaje: null,
          valor_pagado: 0,
          valor_restante: 0,
          porcentaje: tienda.porcentaje,
          TiendaId: tienda.id,
          acreditadorId: req.user.id,
          credito: true,
        });
        saldosCreados.push(saldo);
      }
    }

    // Guardar cambios en la tienda y el vendedor
    await tienda.save();
    await vendedor.save();

    res.status(201).json({
      mensaje: 'Saldo acreditado exitosamente',
      saldoTotal: valorConPorcentaje,
      tiendaSaldoActual: tienda.saldo,
      saldos: saldosCreados,
      valorAdeudado: tienda.credito,
      valorAdeudadoVendedor: valorAdeudadoActualizado
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/acreditar-saldo3/:id', authenticateToken, async (req, res) => {
  const { valor, credito } = req.body;

  // Verificar que el usuario sea administrador o vendedor
  if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    // Buscar el usuario por ID
    const usuario = await Usuario.findByPk(req.params.id); // Usamos el id en lugar del correo
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Buscar la tienda asociada al usuario
    const tienda = await Tienda.findOne({ where: { UsuarioId: usuario.id } });
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Calcular el valor con porcentaje
    const valorConPorcentaje = valor + (valor * (tienda.porcentaje / 100));

    let valorAdeudadoActualizado = null;

    const vendedor = await Usuario.findByPk(req.user.id);

    // Si el crédito es falso (acreditación positiva)
    if (!credito) {
      // Verificar si el valor es negativo
      if (valor < 0) {
        // Verificar que tienda.saldo no quede en negativo
        if ((tienda.saldo + valorConPorcentaje) < 0) {
          return res.status(400).json({ error: 'Saldo insuficiente para realizar esta operación' });
        } else {
          if ((tienda.credito + valor) < 0) {
            return res.status(400).json({ error: 'Crédito insuficiente para realizar esta operación' });
          }
        }
      }

      // Aumentar el saldo disponible de la tienda con el valor completo (incluyendo el porcentaje)
      tienda.saldo += valorConPorcentaje;
      tienda.credito += valor; // Aumenta el crédito en la tienda

      // Modificar el valor_adeudado del vendedor que acreditó el saldo
      if (req.user.rol === 'vendedor') {
        // Buscar el vendedor actual por su ID
        vendedor.valor_adeudado += valor;  // Aumentar el valor adeudado del vendedor
        valorAdeudadoActualizado = vendedor.valor_adeudado;
      }

      
    

    } else {
      // Si el crédito es true, restar el valor del crédito de la tienda
      tienda.credito -= valor; // Restar del crédito de la tienda

      // Modificar el valor_adeudado del vendedor que acreditó el saldo
      if (req.user.rol === 'vendedor') {
        vendedor.valor_adeudado -= valor;  // Restar el valor adeudado del vendedor
        vendedor.valor_depositar += valor;
        valorAdeudadoActualizado = vendedor.valor_adeudado;
      }

      // Verificar si el crédito es suficiente
      if (tienda.credito < 0) {
        return res.status(400).json({ error: 'Saldo de crédito insuficiente' });
      }
    }

    // Crear un registro de saldo acreditado
    const saldo = await Saldo.create({
      valor,
      valor_con_porcentaje: credito ? null : valorConPorcentaje,
      valor_pagado: credito ? 0 : valor,
      valor_restante: credito ? 0 : (valor - valorConPorcentaje),
      porcentaje: tienda.porcentaje,
      TiendaId: tienda.id,
      acreditadorId: req.user.id,
      credito: credito,
    });

    await tienda.save();
    await vendedor.save();

    res.status(201).json({ 
      mensaje: 'Saldo acreditado exitosamente', 
      saldoTotal: valorConPorcentaje, 
      tiendaSaldoActual: tienda.saldo, 
      saldo,
      valorAdeudado: tienda.credito,
      valorAdeudadoVendedor: valorAdeudadoActualizado  
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Endpoint para realizar un pago de tipo Deposito o Recarga
router.post('/pago-vendedor/:correo', authenticateToken, async (req, res) => {
  const { valor, tipo } = req.body;

  // Verificar que el usuario sea administrador o vendedor
  if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    // Buscar el vendedor por su correo
    const vendedor = await Usuario.findOne({ where: { correo: req.params.correo } });
    if (!vendedor) {
      return res.status(404).json({ error: 'Usuario vendedor no encontrado' });
    }

    // Obtener el ID del acreditador desde el token
    const acreditadorId = req.user.id;

    if (tipo === 'Deposito') {
      // Verificar si el valor no supera el valor_depositar del vendedor
      if (valor > vendedor.valor_depositar) {
        return res.status(400).json({ error: 'El valor a depositar excede el valor permitido' });
      }

      // Descontar el valor de valor_depositar del vendedor
      vendedor.valor_depositar -= valor;

      // Crear el registro de pago
      try {
        console.log("Leego a el try de ");
        const pago = await PagVendedor.create({
          valor,
          tipo,
          vendedorId: vendedor.id,
          acreditadorId,
        });
        console.log("Leego a el try de ");

        // Guardar los cambios en el vendedor
        await vendedor.save();

        return res.status(201).json({ 
          mensaje: 'Depósito realizado con éxito', 
          pago, 
          vendedorSaldoActualizado: vendedor.valor_depositar 
        });
      } catch (pagoError) {
        console.error('Error al crear el pago:', pagoError);
        return res.status(500).json({ error: 'Error al crear el pago de depósito' });
      }

    } else if (tipo === 'Recarga') {
      console.log("Llega acá");

      // Verificar si el valor no supera el valor_recargas del vendedor
      if (valor > vendedor.valor_recargas) {
        return res.status(400).json({ error: 'El valor de recarga excede el saldo disponible' });
      }

      // Descontar el valor de valor_recargas del vendedor
      vendedor.valor_recargas -= valor;

      // Crear el registro de pago
      try {
        const pago = await PagVendedor.create({
          valor,
          tipo,
          vendedorId: vendedor.id,
          acreditadorId,
        });

        // Guardar los cambios en el vendedor
        await vendedor.save();

        return res.status(201).json({ 
          mensaje: 'Recarga realizada con éxito', 
          pago, 
          vendedorSaldoActualizado: vendedor.valor_recargas 
        });
      } catch (pagoError) {
        console.error('Error al crear el pago:', pagoError);
        return res.status(500).json({ error: 'Error al crear el pago de recarga' });
      }

    } else {
      return res.status(400).json({ error: 'Tipo de pago no válido' });
    }

  } catch (error) {
    console.error('Error al procesar el pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
});



router.delete('/eliminar-tienda/:id', authenticateToken, async (req, res) => {
  // Verificar que el usuario sea administrador
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No autorizado. Solo los administradores pueden realizar esta acción.' });
  }

  try {
    // Buscar la tienda por su ID
    const tienda = await Tienda.findByPk(req.params.id);
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Buscar el usuario asociado a la tienda
    const usuario = await Usuario.findByPk(tienda.UsuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario asociado no encontrado' });
    }

    // Eliminar las recargas asociadas a la tienda
    await Recarga.destroy({ where: { TiendaId: tienda.id } });

    // Eliminar los saldos asociados a la tienda
    await Saldo.destroy({ where: { TiendaId: tienda.id } });

    // Cerrar sesiones activas del usuario asociado
    await Session.destroy({
      where: {
        userId: tienda.UsuarioId
      }
    });

    // Guardar el valor de 'createdBy' y el 'orden' antes de eliminar la tienda
    const createdBy = tienda.createdBy;
    const ordenEliminado = tienda.orden;

    // Verificar si 'ordenEliminado' es válido
    if (ordenEliminado === undefined || ordenEliminado === null) {
      throw new Error('El campo orden de la tienda es inválido');
    }

    // Eliminar la tienda
    await tienda.destroy();

    // Agregar un mensaje de depuración
    console.log(`Eliminada tienda con orden ${ordenEliminado}`);

    // Obtener las tiendas restantes para reorganizarlas
    const tiendasRestantes = await Tienda.findAll({
      where: {
        createdBy: createdBy,
        orden: {
          [Op.gt]: ordenEliminado // Solo las tiendas con orden mayor al eliminado
        }
      },
      order: [['orden', 'ASC']] // Ordenarlas por su campo 'orden' ascendente
    });

    // Revisar si se obtienen correctamente las tiendas restantes
    console.log(`Número de tiendas restantes: ${tiendasRestantes.length}`);

    // Reorganizar el orden de las tiendas restantes
    for (let i = 0; i < tiendasRestantes.length; i++) {
      console.log(`Reorganizando tienda: ${tiendasRestantes[i].id}, nuevo orden: ${ordenEliminado + i}`);
      await tiendasRestantes[i].update({ orden: ordenEliminado + i }); // Asignar nuevo orden consecutivo
    }

    // Eliminar el usuario asociado a la tienda
    await usuario.destroy();

    res.status(200).json({ message: 'Tienda, usuario y entidades relacionadas eliminadas correctamente, y el orden ajustado.' });
  } catch (error) {
    console.error('Error al eliminar tienda y sus relaciones:', error);
    res.status(500).json({ error: 'Error al eliminar tienda y sus relaciones' });
  }
});



  router.post('/acreditar-saldo_angtiguo/:correo', authenticateToken, async (req, res) => {
    const { valor, credito } = req.body;
  
    // Verificar que el usuario sea administrador o vendedor
    if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }
  
    try {
      // Buscar el usuario por correo
      const usuario = await Usuario.findOne({ where: { correo: req.params.correo } });
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
  
      // Buscar la tienda asociada al usuario
      const tienda = await Tienda.findOne({ where: { UsuarioId: usuario.id } });
      if (!tienda) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
  
      // Calcular el valor con porcentaje
      const valorConPorcentaje = valor + (valor * (tienda.porcentaje / 100));
  
      // Determinar el valor pagado basado en si es crédito o efectivo
      const valorPagado = credito ? 0 : valor;
  
      // Crear un registro de saldo acreditado
      const saldo = await Saldo.create({
        valor,
        valor_con_porcentaje: valorConPorcentaje,
        valor_pagado: valorPagado,
        valor_restante: valor - valorPagado,
        porcentaje: tienda.porcentaje,
        TiendaId: tienda.id,
        acreditadorId: req.user.id,  // El administrador o vendedor que acredita el saldo
        credito
      });
  
      // Aumentar el saldo disponible de la tienda con el valor completo (incluyendo el porcentaje)
      tienda.saldo += valorConPorcentaje;
      if(credito==1){
        tienda.credito+= valor;
      }
      await tienda.save();

      let valorAdeudadoActualizado = null;

    // Modificar el valor_adeudado del vendedor que acreditó el saldo
    if (req.user.rol === 'vendedor') {
      const vendedor = await Usuario.findByPk(req.user.id);  // Buscar el vendedor actual por su ID
      vendedor.valor_adeudado += valor;  // Aumentar el valor adeudado del vendedor
      await vendedor.save();
      
      // Obtener el valor adeudado actualizado del vendedor
      valorAdeudadoActualizado = vendedor.valor_adeudado;
    }
  
      res.status(201).json({ 
        mensaje: 'Saldo acreditado exitosamente', 
        saldoTotal: valorConPorcentaje, 
        tiendaSaldoActual: tienda.saldo, 
        saldo,
        valorAdeudado: valorAdeudadoActualizado 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.post('/abonar-saldo-vendedor/:correo', authenticateToken, async (req, res) => {
    const { valor } = req.body;
  
    // Verificar que el usuario sea administrador o vendedor
    if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }
  
    try {
      // Buscar el usuario tipo vendedor por correo
      const vendedor = await Usuario.findOne({ where: { correo: req.params.correo, rol: 'vendedor' } });
      if (!vendedor) {
        return res.status(404).json({ error: 'Vendedor no encontrado' });
      }
  
      // Verificar que el valor sea numérico
      if (isNaN(valor)) {
        return res.status(400).json({ error: 'El valor debe ser numérico' });
      }
  
      // Registrar el pago del vendedor
      const pago = await PagosVendedor.create({
        valor,
        usuarioId: vendedor.id,
        fecha: new Date()
      });
  
      // Actualizar el valor_adeudado del vendedor según el valor del abono
      if (valor < 0) {
        // Si el valor es negativo, se suma al valor adeudado
        vendedor.valor_adeudado += Math.abs(valor);
      } else if (valor > 0) {
        // Si el valor es positivo, se resta del valor adeudado
        vendedor.valor_adeudado -= valor;
      }
  
      // Guardar los cambios en la base de datos
      await vendedor.save();
  
      res.status(201).json({
        mensaje: 'Abono registrado exitosamente',
        valorAbonado: valor,
        valorAdeudadoActualizado: vendedor.valor_adeudado,
        pago
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  router.post('/acreditar-saldo3/:correo', authenticateToken, async (req, res) => {
    const { valor, porcentaje } = req.body;
  
    // Verificar que el usuario sea administrador
    if (req.user.rol !== 'administrador'&& req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }
  
    try {
      // Buscar el usuario por correo
      const usuario = await Usuario.findOne({ where: { correo: req.params.correo } });
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
  
      // Buscar la tienda asociada al usuario
      const tienda = await Tienda.findOne({ where: { UsuarioId: usuario.id } });
      if (!tienda) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }
  
      // Calcular el saldo total acreditado
      const saldoTotal = valor + (valor * (porcentaje / 100));
  
      // Crear un registro de saldo acreditado
      const saldo = await Saldo.create({
        valor,
        porcentaje,
        TiendaId: tienda.id,
        acreditadorId: req.user.id,  // El administrador que acredita el saldo
      });
  
      // Aumentar el saldo de la tienda
      tienda.saldo += saldoTotal;
      await tienda.save();
  
      res.status(201).json({ mensaje: 'Saldo acreditado exitosamente', saldoTotal, tiendaSaldoActual: tienda.saldo });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/saldos-acreditados', authenticateToken, async (req, res) => {
    try {
      // Verificar que el usuario sea administrador o vendedor
      if (req.user.rol !== 'administrador' && req.user.rol !== 'vendedor') {
        return res.status(403).json({ error: 'No autorizado' });
      }
  
      // Obtener todos los saldos acreditados por el usuario actual
      const saldos = await Saldo.findAll({
        where: { acreditadorId: req.user.id },
        include: [
          {
            model: Tienda,
            as: 'tienda', // Aquí usas el alias definido en la relación
            attributes: ['saldo'], // Puedes incluir cualquier atributo de la tienda que desees
          }
        ]
      });
  
      res.status(200).json({ saldos });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  
  router.get('/obtener-tiendas_anti', async (req, res) => {
    try {
      // Buscar todos los usuarios con el rol 'tienda', excluyendo el campo 'id'
      const tiendas = await Usuario.findAll({
        where: { rol: 'tienda' },
        attributes: { exclude: ['id'] },
        include: [{
          model: Tienda,
          as: 'tiendas',
          attributes: { exclude: ['id', 'UsuarioId', 'createdBy'] }
        }]
      });
  
      // Responder con los datos encontrados
      res.status(200).json(tiendas);
    } catch (error) {
      // Manejo de errores
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/obtener-tiendas', authenticateToken, async (req, res) => {
    try {
      // Buscar todas las tiendas con su usuario asociado y el usuario creador
      const tiendas = await Tienda.findAll({
        include: [
          {
            model: Usuario,
            as: 'usuario',
            attributes: ['id','nombre_tienda', 'nombres_apellidos', 'celular', 'rol', 'activo', 'verificado', 'eliminado'], // Campos del usuario asociado a la tienda
            where: {
              rol: 'tienda', // Filtrar solo usuarios con rol 'tienda'
              eliminado: false, // Filtra usuarios cuyo campo eliminado es false

            },
          },
          {
            model: Usuario,
            as: 'creador', // Relación para obtener el creador (createdBy)
            attributes: ['correo'], // Obteniendo el correo del creador
          },
        ],
      });
  
      // Iterar sobre cada tienda para calcular el promedio de ventas semanal
    for (const tienda of tiendas) {
      const fechaActual = new Date();
      const fechaCreacion = new Date(tienda.createdAt);
      const ochoSemanasEnMs = 8 * 7 * 24 * 60 * 60 * 1000; // 8 semanas en milisegundos
      let fechaInicioPeriodo;

      // Si han pasado menos de 8 semanas desde la creación, se usa la fecha de creación
      if (fechaActual - fechaCreacion < ochoSemanasEnMs) {
        fechaInicioPeriodo = fechaCreacion;
      } else {
        // Si ya han pasado 8 semanas o más, se toman los últimos 56 días
        fechaInicioPeriodo = new Date(fechaActual - ochoSemanasEnMs);
      }

      // Consultar todas las recargas en el período determinado para la tienda actual
      const recargas = await Recarga.findAll({
        where: {
          TiendaId: tienda.id,
          fecha: {
            [Op.between]: [fechaInicioPeriodo, fechaActual]
          },
        },
      });

      // Sumar el total de ventas (valor de recargas) en el período
      const totalVentas = recargas.reduce((total, recarga) => total + recarga.valor, 0);

      // Calcular la cantidad de semanas transcurridas en el período
      const diffMs = fechaActual - fechaInicioPeriodo;
      const semanasTranscurridas = diffMs / (7 * 24 * 60 * 60 * 1000);

      // Calcular el promedio semanal:
      // - Si la tienda tiene menos de 8 semanas, se divide por las semanas transcurridas
      // - Si tiene 8 semanas o más, se divide el total de ventas entre 8
      const promedioSemanal = calcularPromedioSemanal(recargas); // Esta función agrupa por semanas (lunes a domingo) y promedia

      // Agregar el promedio al objeto tienda
      tienda.dataValues.promedioSemanal = promedioSemanal;
    }

      // Responder con las tiendas encontradas, incluyendo el correo del creador
      res.status(200).json(tiendas);
    } catch (error) {
      // Manejo de errores
      res.status(500).json({ error: error.message });
    }
  });
  
  

// Endpoint para obtener vendedores con el conteo de tiendas asociadas
router.get('/obtener-vendedor', authenticateToken, async (req, res) => {
  try {
    // Buscar todas las tiendas cuyos usuarios tengan el rol de vendedor
    const tiendas = await Tienda.findAll({
      include: [{
        model: Usuario,
        as: 'usuario',
        where: { rol: 'vendedor', 
                  eliminado: false  },
        attributes: ['id', 'correo', 'nombres_apellidos', 'celular', 'rol', 'activo', 'dni','valor_depositar', 'valor_recargas', 'porcentaje' ]
      }]
    });

    // Obtener una lista de todos los IDs de los vendedores
    const vendedoresIds = tiendas.map(tienda => tienda.usuario.id);

    const totalTiendasPorVendedor = {};
    for (const vendedorId of vendedoresIds) {
      const total_tiendas = await Tienda.count({
        where: { createdBy: vendedorId }, 
        include: [{
          model: Usuario,
          as: 'usuario',
          where: { eliminado: false }, // Solo contar usuarios no eliminados
        }],
        
      });
      totalTiendasPorVendedor[vendedorId] = total_tiendas;
    }

    // Agregar el total de tiendas al objeto de cada vendedor en la respuesta
    const tiendasConTotal = tiendas.map((tienda) => {
      const vendedorId = tienda.usuario.id;
      const deudaRecarga = (tienda.credito*((tienda.porcentaje/100)+1)-(tienda.saldo));
      const total_tiendas = totalTiendasPorVendedor[vendedorId] || 0;

      return {
        ...tienda.toJSON(),
        usuario: {
          ...tienda.usuario.toJSON(),
          total_tiendas,
          deudaRecarga,
        }
      };
    });

    // Responder con las tiendas encontradas y sus totales de tiendas asociadas
    res.status(200).json(tiendasConTotal);
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});




  

  router.get('/obtener-vendedor-funcional', authenticateToken, async (req, res) => {
    const { rol } = req.params;
  
    try {
      // Buscar todas las tiendas cuyos usuarios tengan el rol especificado
      const tiendas = await Tienda.findAll({
        include: [{
          model: Usuario,
          as: 'usuario',
          where: { rol: 'vendedor'  },  // Filtrar por el rol recibido en los parámetros
          attributes: ['correo', 'nombres_apellidos', 'celular', 'rol', 'activo','dni', 'valor_recargas'] // Campos que quieres incluir del usuario
          
        }]
      });
  
      // Responder con las tiendas encontradas
      res.status(200).json(tiendas);
    } catch (error) {
      // Manejo de errores
      res.status(500).json({ error: error.message });
    }
  });
  router.get('/recargas/:correo', authenticateToken, async (req, res) => {
    try {
      // Obtener el correo desde los parámetros de la URL
      const id = req.params.correo;
  
      // Buscar el usuario por correo
      const usuario = await Usuario.findOne({ where: { id } });
      if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
  
      // Buscar la tienda asociada al usuario
      const tienda = await Tienda.findOne({ where: { UsuarioId: usuario.id } });
      if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada para este usuario.' });
  
      // Leer parámetros de fecha y límite
      const { startDate, endDate, timeZone, limit } = req.query;
      let whereClause = { TiendaId: tienda.id };
      let queryOptions = {
        where: whereClause,
        order: [['fecha', 'DESC']],
      };
  
      if (startDate && endDate) {
        // Convertir las fechas a UTC usando la zona horaria enviada o la predeterminada
        const tz = timeZone || 'America/Mexico_City';
        const startUTC = parseDbDate(startDate, true, tz);
        const endUTC = parseDbDate(endDate, false, tz);
        whereClause.fecha = { [Op.between]: [startUTC, endUTC] };
      } else {
        // Si no se envían fechas, se limita la consulta a 100 (o a lo que se indique en limit)
        queryOptions.limit = limit ? parseInt(limit) : 100;
      }
  
      const recargas = await Recarga.findAll(queryOptions);
      const promedioSemanal = calcularPromedioSemanal(recargas).toFixed(2); // Esta función agrupa por semanas (lunes a domingo) y promedia
      const saldoDisponible = tienda.saldo;
      const nombre_tienda = usuario.nombre_tienda;
  
      res.json({ 
        saldo_disponible: saldoDisponible, 
        nombre_tienda, 
        recargas,
        promedioSemanal 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });  
// Ruta para obtener la comisión del vendedor y la cantidad de tiendas creadas
router.get('/comision-semanal', authenticateToken, async (req, res) => {
  const vendedorId = req.user.id; // Obtener el id del vendedor desde el token de autenticación

  try {
    // Obtener las fechas de inicio y fin opcionales desde la query
    const { fechaInicio, fechaFin } = req.query;

    let startDate, endDate;

    // Definir las fechas según los parámetros proporcionados
    if (fechaInicio && fechaFin) {
      // Si ambas fechas son proporcionadas
      startDate = new Date(fechaInicio);
      endDate = new Date(fechaFin);
    } else if (fechaInicio) {
      // Si solo se proporciona la fecha de inicio
      startDate = new Date(fechaInicio);
      endDate = new Date(); // Hasta hoy
    } else if (fechaFin) {
      // Si solo se proporciona la fecha de fin
      startDate = new Date(0); // Desde el inicio de los tiempos
      endDate = new Date(fechaFin);
    } else {
      // Si no se proporcionan fechas, calcular la última semana
      const today = new Date();
      startDate = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Lunes de la semana actual
      endDate = new Date(today.setDate(startDate.getDate() + 6)); // Domingo de la semana actual
    }

    // Validar que las fechas sean válidas
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ error: 'Fechas inválidas proporcionadas' });
    }

    // Buscar todas las tiendas asociadas al vendedor
    const tiendas = await Tienda.findAll({
      where: {
        createdBy: vendedorId, // Tiendas creadas por el vendedor
      },
    });

    // Extraer los IDs de las tiendas
    const tiendaIds = tiendas.map((tienda) => tienda.id);

    if (tiendaIds.length === 0) {
      return res.status(200).json({ comision: 0, cantidadTiendas: 0, message: 'El vendedor no tiene tiendas asociadas' });
    }

    // Buscar todas las recargas hechas por esas tiendas dentro del rango de fechas
    const recargas = await Recarga.findAll({
      where: {
        TiendaId: {
          [Op.in]: tiendaIds, // Solo las recargas de las tiendas del vendedor
        },
        fecha: {
          [Op.between]: [startDate, endDate], // Rango de fechas
        },
      },
      attributes: ['valor'], // Solo necesitamos el valor de las recargas
    });

    // Calcular la suma total de las recargas
    const totalRecargas = recargas.reduce((sum, recarga) => sum + recarga.valor, 0);

    // Obtener el porcentaje del vendedor
    const vendedor = await Usuario.findByPk(vendedorId);

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor no encontrado' });
    }

    const porcentajeComision = vendedor.porcentaje; // Porcentaje de comisión del vendedor

    // Calcular la comisión total
    const comision = totalRecargas * (porcentajeComision / 100);

    // Obtener la cantidad de tiendas creadas dentro del rango de fechas

    const cantidadTiendas = await Tienda.count({
      where: {
        createdBy: vendedorId,
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        where: { eliminado: false }, // Solo contar usuarios no eliminados
      }],
    });

    // Obtener valores adicionales del vendedor y las tiendas
    const valor_adeudado = vendedor.valor_depositar || 0;
    const vendedortienda = await Tienda.findOne({ where: { UsuarioId: vendedorId } });
    const valor_recarga = vendedortienda?.credito || 0;

    // Responder con la comisión calculada y la cantidad de tiendas
    res.status(200).json({ comision, totalRecargas, cantidadTiendas, valor_recarga, valor_adeudado });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.get('/historial/:option', authenticateToken, async (req, res) => {
  const { option } = req.params;
  const userId = req.user.id;

  try {
    // Verificar si el usuario es vendedor
    if (req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let result;
    switch (option) {
      case 'aperturas':
        // Obtener tiendas aperturadas y eliminadas
        result = await Tienda.findAll({
          where: { createdBy: userId },
          attributes: ['id', 'createdAt', 'updatedAt', 'latitud', 'longitud'],
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['activo', 'correo', 'nombre_tienda', 'celular', 'eliminado'],
              where: {
                activo: true,
              },
            },
          ],
        });

        // Calcular el promedio de ventas semanal
        for (const tienda of result) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt); // Desde que se abrió la tienda
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7); // Últimas 8 semanas

          // Si la tienda se abrió hace menos de 8 semanas, usar la fecha de creación
          const fechaInicioReal = fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;

          // Verificar si existe un `TiendaId`
          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue; // Pasar a la siguiente tienda si no tiene un ID válido
          }

          // Obtener las recargas de la tienda (manejando el caso donde no haya recargas)
          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: {
                [Op.between]: [fechaInicioReal, fechaActual],
              },
            },
          });

          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0; // No hay recargas, promedio es 0
            continue;
          }

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
          const promedioSemanal = calcularPromedioSemanal(recargas).toFixed(2); // Esta función agrupa por semanas (lunes a domingo) y promedia


          // Añadir el promedio semanal al objeto de la tienda
          tienda.dataValues.promedioSemanal = promedioSemanal;
        }

        break;

      case 'saldos':
        // Obtener el historial de saldos acreditados y retirados por el vendedor
        result = await Saldo.findAll({
          where: { acreditadorId: userId, credito: false },
          attributes: ['valor', 'fecha' , 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda'], // Incluir el campo correo del usuario asociado
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
        });
        break;

        case 'depositos':
          // Obtener depósitos del vendedor
          const pagVendedorResult = await PagVendedor.findAll({
            where: { vendedorId: userId, tipo: 'Deposito' },
            attributes: ['fecha', 'valor', 'tipo'],
            order: [['fecha', 'DESC']],
          });
  
          // Obtener los saldos acreditados (credito: true)
          const saldoResult = await Saldo.findAll({
            where: { acreditadorId: userId, credito: true },
            attributes: ['valor', 'fecha', 'credito'],
            include: [
              {
                model: Tienda,
                as: 'tienda',
                attributes: ['UsuarioId'],
                include: [
                  {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['correo', 'nombre_tienda'],
                  },
                ],
              },
            ],
            order: [['fecha', 'DESC']],
          });
  
          // Combinar ambos resultados en una sola lista y ordenarlos por fecha
          result = [...pagVendedorResult, ...saldoResult].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          break;

          case 'ventas':
            // Obtener recargas de todas las tiendas gestionadas por el vendedor
            result = await Recarga.findAll({
              include: [
                {
                  model: Tienda,
                  attributes: ['UsuarioId'],
                  where: {
                    createdBy: userId, // Asegurar que la tienda fue creada por el vendedor actual
                  },
                  include: [
                    {
                      model: Usuario,
                      as: 'usuario',
                      attributes: ['nombre_tienda'], // Incluir el campo correo del usuario asociado
                    },
                  ],
                },
              ],
              attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', 'folio'], // Campos de la recarga
              order: [['fecha', 'DESC']],

            });
            break;

            case 'recargas':
              // Obtener el historial de recargas, movimientos financieros y pagos del vendedor (que también es tienda)
              
              // Primer paso: obtener la tienda asociada al vendedor
              const tienda = await Tienda.findOne({
                where: { UsuarioId: userId }, // Encontrar la tienda asociada al vendedor
              });
            
              if (!tienda) {
                return res.status(404).json({ error: 'No se encontró una tienda asociada al vendedor.' });
              }
            
              // Obtener las recargas de la tienda (vendedor)
              const recargas = await Recarga.findAll({
                where: { TiendaId: tienda.id },
                attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', "folio"],
                order: [['fecha', 'DESC']],

              });
            
              // Obtener los saldos donde crédito es true
              const saldos = await Saldo.findAll({
                where: { TiendaId: tienda.id},
                attributes: ['fecha', 'valor', 'valor_con_porcentaje', 'porcentaje', 'verificado', 'credito'],
                order: [['fecha', 'DESC']],
              });
            
              // Obtener el historial de pagos del vendedor (PagVendedor)
              const pagos = await PagVendedor.findAll({
                where: { vendedorId: userId, tipo: 'Recarga' }, // Ajustar según sea necesario
                attributes: ['fecha', 'valor', 'tipo'],
                order: [['fecha', 'DESC']],

              });
            
              // Combinamos recargas, saldos y pagos en una sola lista
              const movimientos = [
                ...recargas.map(recarga => ({
                  tipoMovimiento: 'Recarga',
                  fecha: recarga.fecha,
                  valor: recarga.valor,
                  operadora: recarga.operadora,
                  tipoRecarga: recarga.tipo,
                  celular: recarga.celular, 
		  folio: recarga.folio,

                })),
                ...saldos.map(saldo => ({
                  tipoMovimiento: saldo.credito ? 'Pago' : 'Saldo', 
                  fecha: saldo.fecha,
                  valor: saldo.valor,
                  valorConPorcentaje: saldo.valor_con_porcentaje,
                  porcentaje: saldo.porcentaje,
                  verificado: saldo.verificado,
		  credito: saldo.credito,
                })),
                ...pagos.map(pago => ({
                  tipoMovimiento: 'Abono',
                  fecha: pago.fecha,
                  valor: pago.valor,
                  tipo: pago.tipo
                }))
              ];
            
              // Ordenamos por fecha en orden cronológico (más reciente primero)
              movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            
              // Limitar a 50 movimientos en total si es necesario
              result = movimientos;
            
              break;
            

      default:
        return res.status(400).json({ error: 'Opción inválida' });
    }

    // Devolver los resultados basados en la opción seleccionada
    res.status(200).json(result);
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.get('/historialp/:option', authenticateToken, async (req, res) => {
  const { option } = req.params;
  const userId = req.user.id;  
  // Extraer parámetros de fecha (formato "YYYY-MM-DD") de la query string
  const { startDate: startDateQuery, endDate: endDateQuery } = req.query;
  let start, end;
  if (startDateQuery || endDateQuery) {
    if (startDateQuery && !endDateQuery) {
      start = parseDbDate(startDateQuery, true);
      end = parseDbDate(startDateQuery, false);
    } else if (!startDateQuery && endDateQuery) {
      start = parseDbDate(endDateQuery, true);
      end = parseDbDate(endDateQuery, false);
    } else if (startDateQuery && endDateQuery) {
      start = parseDbDate(startDateQuery, true);
      end = parseDbDate(endDateQuery, false);
    }
  }
  
  // Definir filtros de fecha
  const dateFilterCreatedAt = start && end ? { createdAt: { [Op.between]: [start, end] } } : {};
  const dateFilterFecha = start && end ? { fecha: { [Op.between]: [start, end] } } : {};
  
  // Para las opciones que no sean "aperturas", si no se envía fecha, se limita a 50 registros
  const limitIfNoDate = start && end ? undefined : 50;
  
  try {
    if (req.user.rol !== 'vendedor') {
      return res.status(403).json({ error: 'No autorizado' });
    }
  
    let result;
    switch (option) {
      case 'aperturas': {
        // Si se especifica fecha se usa el filtro, sino se muestran los movimientos desde el lunes
        let whereAperturas = { createdBy: userId };
        if (start && end) {
          whereAperturas = { ...whereAperturas, ...dateFilterCreatedAt };
        } else {
          // Calcular el lunes de la semana en curso
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, etc.
          const daysSinceMonday = (dayOfWeek + 6) % 7; // convierte domingo a 6, lunes a 0, etc.
          const monday = new Date(now);
          monday.setDate(now.getDate() - daysSinceMonday);
          monday.setHours(0, 0, 0, 0);
          whereAperturas = { ...whereAperturas, createdAt: { [Op.gte]: monday } };
        }
  
        result = await Tienda.findAll({
          where: whereAperturas,
          attributes: ['id', 'createdAt', 'updatedAt', 'latitud', 'longitud'],
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['activo', 'correo', 'nombre_tienda', 'celular', 'eliminado'],
              where: { activo: true },
            },
          ],
        });
  
        // Calcular el promedio de ventas semanal para cada tienda
        for (const tienda of result) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt);
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);
          const fechaInicioReal = fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;
  
          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }
  
          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: { [Op.between]: [fechaInicioReal, fechaActual] },
            },
          });
  
          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }
  
          const semanas = {};
          recargas.forEach((recarga) => {
            const semana = getWeekOfYear(recarga.fecha);
            if (!semanas[semana]) {
              semanas[semana] = [];
            }
            semanas[semana].push(recarga);
          });
  
          const semanasTotales = Object.keys(semanas).length;
          const promedioSemanal = parseFloat(calcularPromedioSemanal(recargas).toFixed(2));
  
          tienda.dataValues.promedioSemanal = promedioSemanal;
        }
        break;
      }
  
      case 'saldos': {
        result = await Saldo.findAll({
          where: { acreditadorId: { [Op.in]: [userId, 1] }, credito: false, ...dateFilterFecha },
          attributes: ['valor', 'fecha', 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              where: { createdBy: userId }, // Filtrar tiendas creadas por el userId
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda'],
                },
              ],

            },
          ],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
        break;
      }
  
      case 'depositos': {
        const pagVendedorResult = await PagVendedor.findAll({
          where: { vendedorId: userId, tipo: 'Deposito', ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'tipo'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const saldoResult = await Saldo.findAll({
          where: { acreditadorId: userId, credito: true, ...dateFilterFecha },
          attributes: ['valor', 'fecha', 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda'],
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        result = [...pagVendedorResult, ...saldoResult].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        break;
      }
  
      case 'ventas': {
        result = await Recarga.findAll({
          where: { ...dateFilterFecha },
          include: [
            {
              model: Tienda,
              attributes: ['UsuarioId'],
              where: { createdBy: userId },
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['nombre_tienda'],
                },
              ],
            },
          ],
          attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', 'folio'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
        break;
      }
  
      case 'recargas': {
        const tienda = await Tienda.findOne({
          where: { UsuarioId: userId },
        });
  
        if (!tienda) {
          return res.status(404).json({ error: 'No se encontró una tienda asociada al usuario.' });
        }
  
        const recargas = await Recarga.findAll({
          where: { TiendaId: tienda.id, ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', 'folio'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const saldos = await Saldo.findAll({
          where: { TiendaId: tienda.id, ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'valor_con_porcentaje', 'porcentaje', 'verificado'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const pagos = await PagVendedor.findAll({
          where: { vendedorId: userId, tipo: 'Recarga', ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'tipo'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const movimientos = [
          ...recargas.map(recarga => ({
            tipoMovimiento: 'Recarga',
            fecha: recarga.fecha,
            valor: recarga.valor,
            operadora: recarga.operadora,
            tipoRecarga: recarga.tipo,
            celular: recarga.celular,
            folio: recarga.folio,
          })),
          ...saldos.map(saldo => ({
            tipoMovimiento: saldo.credito ? 'Pago' : 'Saldo',
            fecha: saldo.fecha,
            valor: saldo.valor,
            valorConPorcentaje: saldo.valor_con_porcentaje,
            porcentaje: saldo.porcentaje,
            verificado: saldo.verificado,
          })),
          ...pagos.map(pago => ({
            tipoMovimiento: 'Abono',
            fecha: pago.fecha,
            valor: pago.valor,
            tipo: pago.tipo,
          })),
        ];
  
        movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        result = movimientos;
        break;
      }
  
      default:
        return res.status(400).json({ error: 'Opción inválida' });
    }
  
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/historial2/:userId/:option', authenticateToken, async (req, res) => {
  const { userId, option } = req.params;
  
  // Extraer parámetros de fecha (formato "YYYY-MM-DD") de la query string
  const { startDate: startDateQuery, endDate: endDateQuery } = req.query;
  let start, end;
  if (startDateQuery || endDateQuery) {
    if (startDateQuery && !endDateQuery) {
      start = parseDbDate(startDateQuery, true);
      end = parseDbDate(startDateQuery, false);
    } else if (!startDateQuery && endDateQuery) {
      start = parseDbDate(endDateQuery, true);
      end = parseDbDate(endDateQuery, false);
    } else if (startDateQuery && endDateQuery) {
      start = parseDbDate(startDateQuery, true);
      end = parseDbDate(endDateQuery, false);
    }
  }
  
  // Definir filtros de fecha
  const dateFilterCreatedAt = start && end ? { createdAt: { [Op.between]: [start, end] } } : {};
  const dateFilterFecha = start && end ? { fecha: { [Op.between]: [start, end] } } : {};
  
  // Para las opciones que no sean "aperturas", si no se envía fecha, se limita a 50 registros
  const limitIfNoDate = start && end ? undefined : 100;
  
  try {
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ error: 'No autorizado' });
    }
  
    let result;
    switch (option) {
      
      //Editado empieza aquí

      case 'general': {
  const tiendaUsuario = await Tienda.findOne({ where: { UsuarioId: userId } });

  const [
    aperturas,
    saldos,
    depositos,
    ventas,
    recargas,
    saldosRecargas,
    pagosRecargas,
  ] = await Promise.all([
    // Aperturas
    Tienda.findAll({
      where: {
        createdBy: userId,
        ...(start && end
          ? dateFilterCreatedAt
          : {
              createdAt: {
                [Op.gte]: (() => {
                  const now = new Date();
                  const monday = new Date(now);
                  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
                  monday.setHours(0, 0, 0, 0);
                  return monday;
                })(),
              },
            }),
      },
      attributes: ['createdAt'],
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['nombre_tienda'],
          where: { activo: true },
        },
      ],
    }),

    // Saldos
    Saldo.findAll({
      where: { acreditadorId: userId, credito: false, ...dateFilterFecha },
      include: [
        {
          model: Tienda,
          as: 'tienda',
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['nombre_tienda'],
            },
          ],
        },
      ],
      attributes: ['valor', 'fecha'],
      limit: limitIfNoDate,
    }),

    // Depósitos (PagVendedor tipo Deposito)
    PagVendedor.findAll({
      where: { vendedorId: userId, tipo: 'Deposito', ...dateFilterFecha },
      attributes: ['fecha', 'valor', 'tipo'],
      limit: limitIfNoDate,
    }),

    // Ventas
    Recarga.findAll({
      where: { ...dateFilterFecha },
      include: [
        {
          model: Tienda,
          where: { createdBy: userId },
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['nombre_tienda'],
            },
          ],
        },
      ],
      attributes: ['fecha', 'valor'],
      limit: limitIfNoDate,
    }),

    // Recargas (desde la tienda del usuario)
    tiendaUsuario
      ? Recarga.findAll({
          where: { TiendaId: tiendaUsuario.id, ...dateFilterFecha },
          attributes: ['fecha', 'valor'],
          limit: limitIfNoDate,
        })
      : [],

    // Saldos (desde la tienda del usuario)
    tiendaUsuario
      ? Saldo.findAll({
          where: { TiendaId: tiendaUsuario.id, ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'credito'],
          limit: limitIfNoDate,
        })
      : [],

    // Pagos tipo Recarga desde PagVendedor
    PagVendedor.findAll({
      where: { vendedorId: userId, tipo: 'Recarga', ...dateFilterFecha },
      attributes: ['fecha', 'valor', 'tipo'],
      limit: limitIfNoDate,
    }),
  ]);

  const movimientos = [
    ...aperturas.map((a) => ({
      tipoMovimiento: 'Apertura',
      fecha: a.createdAt,
      nombre_tienda: a.usuario?.nombre_tienda || null,
      valor: 0,
    })),
    ...saldos.map((s) => ({
      tipoMovimiento: 'Saldo',
      fecha: s.fecha,
      nombre_tienda: s.tienda?.usuario?.nombre_tienda || null,
      valor: s.valor,
    })),
    ...depositos.map((d) => ({
      tipoMovimiento: 'Deposito',
      fecha: d.fecha,
      nombre_tienda: null,
      valor: d.valor,
    })),
    ...ventas.map((v) => ({
      tipoMovimiento: 'Venta',
      fecha: v.fecha,
      nombre_tienda: v.tienda?.usuario?.nombre_tienda || null,
      valor: v.valor,
    })),
    ...recargas.map((r) => ({
      tipoMovimiento: 'Recarga',
      fecha: r.fecha,
      nombre_tienda: null,
      valor: r.valor,
    })),
    ...saldosRecargas.map((s) => ({
      tipoMovimiento: s.credito ? 'Pago' : 'Saldo',
      fecha: s.fecha,
      nombre_tienda: null,
      valor: s.valor,
    })),
    ...pagosRecargas.map((p) => ({
      tipoMovimiento: 'Abono',
      fecha: p.fecha,
      nombre_tienda: null,
      valor: p.valor,
    })),
  ];

  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  result = movimientos;

            if (!startDateQuery && !endDateQuery) {
            result = result.slice(0, 100);
          }
  break;
}

      //Termina aquó

      case 'aperturas': {
        // Si se especifica fecha se usa el filtro, sino se muestran los movimientos desde el lunes
        let whereAperturas = { createdBy: userId };
        if (start && end) {
          whereAperturas = { ...whereAperturas, ...dateFilterCreatedAt };
        } else {
          // Calcular el lunes de la semana en curso
          const now = new Date();
          const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, etc.
          const daysSinceMonday = (dayOfWeek + 6) % 7; // convierte domingo a 6, lunes a 0, etc.
          const monday = new Date(now);
          monday.setDate(now.getDate() - daysSinceMonday);
          monday.setHours(0, 0, 0, 0);
          whereAperturas = { ...whereAperturas, createdAt: { [Op.gte]: monday } };
        }
  
        result = await Tienda.findAll({
          where: whereAperturas,
          attributes: ['id', 'createdAt', 'updatedAt', 'latitud', 'longitud'],
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['activo', 'correo', 'nombre_tienda', 'celular', 'eliminado'],
              where: { activo: true },
            },
          ],
        });
  
        // Calcular el promedio de ventas semanal para cada tienda
        for (const tienda of result) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt);
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);
          const fechaInicioReal = fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;
  
          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }
  
          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: { [Op.between]: [fechaInicioReal, fechaActual] },
            },
          });
  
          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }
  
          const semanas = {};
          recargas.forEach((recarga) => {
            const semana = getWeekOfYear(recarga.fecha);
            if (!semanas[semana]) {
              semanas[semana] = [];
            }
            semanas[semana].push(recarga);
          });
  
          const semanasTotales = Object.keys(semanas).length;
          const promedioSemanal = parseFloat(calcularPromedioSemanal(recargas).toFixed(2));

          tienda.dataValues.promedioSemanal = promedioSemanal;
        }
        break;
      }
  
      case 'saldos': {
        result = await Saldo.findAll({
          where: { acreditadorId: userId, credito: false, ...dateFilterFecha },
          attributes: ['valor', 'fecha', 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda'],
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
        break;
      }
  
      case 'depositos': {
        const pagVendedorResult = await PagVendedor.findAll({
          where: { vendedorId: userId, tipo: 'Deposito', ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'tipo'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const saldoResult = await Saldo.findAll({
          where: { acreditadorId: userId, credito: true, ...dateFilterFecha },
          attributes: ['valor', 'fecha', 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda'],
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        result = [...pagVendedorResult, ...saldoResult].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        break;
      }
  
      case 'ventas': {
        result = await Recarga.findAll({
          where: { ...dateFilterFecha },
          include: [
            {
              model: Tienda,
              attributes: ['UsuarioId'],
              where: { createdBy: userId },
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['nombre_tienda'],
                },
              ],
            },
          ],
          attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', 'folio'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
        break;
      }
  
      case 'recargas': {
        const tienda = await Tienda.findOne({
          where: { UsuarioId: userId },
        });
  
        if (!tienda) {
          return res.status(404).json({ error: 'No se encontró una tienda asociada al usuario.' });
        }
  
        const recargas = await Recarga.findAll({
          where: { TiendaId: tienda.id, ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', 'folio'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const saldos = await Saldo.findAll({
          where: { TiendaId: tienda.id, ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'valor_con_porcentaje', 'porcentaje', 'verificado'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const pagos = await PagVendedor.findAll({
          where: { vendedorId: userId, tipo: 'Recarga', ...dateFilterFecha },
          attributes: ['fecha', 'valor', 'tipo'],
          order: [['fecha', 'DESC']],
          limit: limitIfNoDate,
        });
  
        const movimientos = [
          ...recargas.map(recarga => ({
            tipoMovimiento: 'Recarga',
            fecha: recarga.fecha,
            valor: recarga.valor,
            operadora: recarga.operadora,
            tipoRecarga: recarga.tipo,
            celular: recarga.celular,
            folio: recarga.folio,
          })),
          ...saldos.map(saldo => ({
            tipoMovimiento: saldo.credito ? 'Pago' : 'Saldo',
            fecha: saldo.fecha,
            valor: saldo.valor,
            valorConPorcentaje: saldo.valor_con_porcentaje,
            porcentaje: saldo.porcentaje,
            verificado: saldo.verificado,
          })),
          ...pagos.map(pago => ({
            tipoMovimiento: 'Abono',
            fecha: pago.fecha,
            valor: pago.valor,
            tipo: pago.tipo,
          })),
        ];
  
        movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
result = (!start && !end)
  ? movimientos.slice(0, 100)
  : movimientos;
  
  break;
      }
  
      default:
        return res.status(400).json({ error: 'Opción inválida' });
    }
  
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener la comisión del vendedor y la cantidad de tiendas creadas en la semana
router.get('/comision-semanal/:vendedorId/', authenticateToken, async (req, res) => {
  const vendedorId = req.params.vendedorId;  // Obtener el id del vendedor desde los parámetros de la URL

  try {
    // Verificar si el usuario autenticado tiene permisos para consultar esta información
    // Por ejemplo, solo los administradores pueden acceder
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ error: 'No autorizado' });
    }

  // Obtener las fechas de inicio y fin opcionales desde la query
  const { fechaInicio, fechaFin } = req.query;

  let startDate, endDate;

  // Definir las fechas según los parámetros proporcionados
  if (fechaInicio && fechaFin) {
    // Si ambas fechas son proporcionadas
    startDate = new Date(fechaInicio);
    endDate = new Date(fechaFin);
  } else if (fechaInicio) {
    // Si solo se proporciona la fecha de inicio
    startDate = new Date(fechaInicio);
    endDate = new Date(); // Hasta hoy
  } else if (fechaFin) {
    // Si solo se proporciona la fecha de fin
    startDate = new Date(0); // Desde el inicio de los tiempos
    endDate = new Date(fechaFin);
  } else {
    // Si no se proporcionan fechas, calcular la última semana
    const today = new Date();
    startDate = new Date(today.setDate(today.getDate() - today.getDay() + 1)); // Lunes de la semana actual
    endDate = new Date(today.setDate(startDate.getDate() + 6)); // Domingo de la semana actual
  }

  // Validar que las fechas sean válidas
  if (isNaN(startDate) || isNaN(endDate)) {
    return res.status(400).json({ error: 'Fechas inválidas proporcionadas' });
  }
    // Buscar todas las tiendas asociadas al vendedor
    const tiendas = await Tienda.findAll({
      where: {
        createdBy: vendedorId  // Buscar las tiendas creadas por el vendedor especificado
      }
    });

    // Extraer los IDs de las tiendas
    const tiendaIds = tiendas.map(tienda => tienda.id);

    if (tiendaIds.length === 0) {
      return res.status(200).json({ comision: 0, cantidadTiendas: 0, message: 'El vendedor no tiene tiendas asociadas' });
    }

    // Buscar todas las recargas hechas por esas tiendas en la última semana
    const recargas = await Recarga.findAll({
      where: {
        TiendaId: {
          [Op.in]: tiendaIds  // Solo las recargas de las tiendas del vendedor
        },
        fecha: {
          [Op.between]: [startDate, endDate]  // Recargas de la última semana (lunes a domingo)
        }
      },
      attributes: ['valor']  // Solo necesitamos el valor de las recargas
    });

    // Calcular la suma total de las recargas
    const totalRecargas = recargas.reduce((sum, recarga) => sum + recarga.valor, 0);

    // Obtener el porcentaje del vendedor
    const vendedor = await Usuario.findByPk(vendedorId);

    if (!vendedor) {
      return res.status(404).json({ error: 'Vendedor no encontrado' });
    }

    const porcentajeComision = vendedor.porcentaje;  // Porcentaje de comisión del vendedor

    // Calcular la comisión total
    const comision = totalRecargas * (porcentajeComision / 100);

    // Obtener la cantidad de tiendas creadas en la última semana
    const cantidadTiendas = await Tienda.count({
      where: {
        createdBy: vendedorId,
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        where: { eliminado: false }, // Solo contar usuarios no eliminados
      }],
    });



    const valor_adeudado = vendedor.valor_adeudado;
    const vendedortienda = await Tienda.findOne({ where: { UsuarioId: vendedorId } });
    const valor_recarga = vendedortienda?.credito || 0;

    // Responder con la comisión calculada y la cantidad de tiendas
    res.status(200).json({ comision, totalRecargas, cantidadTiendas, valor_recarga, valor_adeudado });
  } catch (error) {
    // Manejo de errores
    res.status(500).json({ error: error.message });
  }
});

router.get('/historial3/:option', authenticateToken, async (req, res) => {
  const { option } = req.params;

  try {
    // Verificar si el usuario autenticado tiene permisos para consultar la información
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ error: 'No autorizado' });
    }

    let result;
    switch (option) {
      case 'aperturas':
        // Obtener tiendas aperturadas y eliminadas por todos los usuarios
        result = await Tienda.findAll({
          attributes: ['id', 'createdAt', 'updatedAt', 'latitud', 'longitud'],
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['activo', 'correo', 'nombre_tienda', 'celular', 'eliminado','nombres_apellidos'],
              where: {
                activo: true,
              },
            },
            {
              model: Usuario,
              as: 'creador',
              attributes: ['nombres_apellidos', 'correo'],
              where: {
                activo: true,
              },
            },
          ],
          order: [['createdAt', 'DESC']],
        });
        
        // Calcular el promedio de ventas semanal (similar al método anterior)
        for (const tienda of result) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt);
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);

          const fechaInicioReal = fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;

          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: {
                [Op.between]: [fechaInicioReal, fechaActual],
              },
            },
          });

          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const semanas = {};
          recargas.forEach((recarga) => {
            const semana = getWeekOfYear(recarga.fecha);
            if (!semanas[semana]) {
              semanas[semana] = [];
            }
            semanas[semana].push(recarga);
          });

          const semanasTotales = Object.keys(semanas).length;
          const promedioSemanal = semanasTotales > 0
            ? recargas.reduce((total, recarga) => total + recarga.valor, 0) / semanasTotales
            : 0;

          tienda.dataValues.promedioSemanal = promedioSemanal;
        }

        break;

      case 'saldos':
        // Obtener el historial de saldos acreditados y retirados por todos los usuarios
        result = await Saldo.findAll({
          where: { credito: false },
          attributes: ['valor', 'fecha', 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda','nombres_apellidos'],
                },
                {
                  model: Usuario,
                  as: 'creador',
                  attributes: ['nombres_apellidos', 'correo'],
                  where: {
                    activo: true,
                  },
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
        });
        break;

      case 'depositos':
        // Obtener todos los depósitos y saldos acreditados de todos los usuarios
        const pagVendedorResult = await PagVendedor.findAll({
          where: { tipo: 'Deposito' },
          attributes: ['fecha', 'valor', 'tipo'],
       
              include: [
                {
                  model: Usuario,
                  as: 'vendedor',
                  attributes: ['correo', 'nombres_apellidos'],
                },
          
          ],
          order: [['fecha', 'DESC']],
        });

        const saldoResult = await Saldo.findAll({
          where: { credito: true },
          attributes: ['valor', 'fecha', 'credito'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda', 'nombres_apellidos'],
                },
                {
                  model: Usuario,
                  as: 'creador',
                  attributes: ['nombres_apellidos', 'correo'],
                  where: {
                    activo: true,
                  },
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
        });

        result = [...pagVendedorResult, ...saldoResult].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        break;

      case 'ventas':
        // Obtener recargas de todas las tiendas gestionadas por todos los usuarios
        result = await Recarga.findAll({
          include: [
            {
              model: Tienda,
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombre_tienda', 'nombres_apellidos'],
                },
              ],
            },
          ],
          attributes: ['fecha', 'valor', 'operadora', 'tipo', 'celular', 'folio' ],
          order: [['fecha', 'DESC']],
        });
        break;

      case 'recargas':
        // Obtener el historial de recargas, movimientos financieros y pagos de todas las tiendas
    
        const saldos = await Saldo.findAll({
          attributes: ['fecha', 'valor', 'valor_con_porcentaje', 'porcentaje', 'verificado'],
          include: [
            {
              model: Tienda,
              as: 'tienda',
              attributes: ['UsuarioId'],
              include: [
                {
                  model: Usuario,
                  as: 'usuario',
                  attributes: ['correo', 'nombres_apellidos'],
                },
              ],
            },
          ],
          order: [['fecha', 'DESC']],
        });

        const pagos = await PagVendedor.findAll({
          where: { tipo: 'Recarga' },
          attributes: ['fecha', 'valor', 'tipo'],
          include: [
                {
                  model: Usuario,
                  as: 'vendedor',
                  attributes: ['correo', 'nombres_apellidos'],
                },
              ],
          
          order: [['fecha', 'DESC']],
        });

        const movimientos = [
       
          ...saldos.map(saldo => ({
            tipoMovimiento: saldo.credito ? 'Pago' : 'Saldo', 
            fecha: saldo.fecha,
            valor: saldo.valor,
            valorConPorcentaje: saldo.valor_con_porcentaje,
            porcentaje: saldo.porcentaje,
            verificado: saldo.verificado,
            nombres_apellidos: saldo.tienda.usuario.nombres_apellidos,
            correo: saldo.tienda.usuario.correo,
          })),
          ...pagos.map(pago => ({
            tipoMovimiento: 'Abono',
            fecha: pago.fecha,
            valor: pago.valor,
            tipo: pago.tipo,
            nombres_apellidos: pago.vendedor.nombres_apellidos, // Aquí debes acceder a "pago.vendedor"
            correo: pago.vendedor.correo, // Aquí también debes usar "pago.vendedor"
          }))
        ];

        movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        result = movimientos;
        break;

      default:
        return res.status(400).json({ error: 'Opción inválida' });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Ruta para actualizar el ordenGeografico de una tienda
router.post('/actualizar-orden', async (req, res) => {
  const { tiendaId, ordenGeografico } = req.body;

  try {
    // Verificar que el ordenGeografico y tiendaId sean válidos
    if (!tiendaId || !ordenGeografico) {
      return res.status(400).json({ error: 'Faltan parámetros necesarios (tiendaId o ordenGeografico)' });
    }

    // Buscar la tienda por ID
    const tienda = await Tienda.findByPk(tiendaId);
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    const createdBy = tienda.createdBy; // Obtener el createdBy de la tienda
    const ordenActual = tienda.orden; // Obtener el orden actual de la tienda

    // Agregar logs para verificar valores
    console.log('Nuevo orden:', ordenGeografico, 'Orden actual:', ordenActual);

    // Si el nuevo orden es igual al actual, no hacemos nada
    if (ordenGeografico === ordenActual) {
      return res.status(200).json({ message: 'El orden es el mismo, no hay cambios.' });
    }

    // Si el nuevo orden es menor que el actual
    if (ordenGeografico < ordenActual) {
      // Incrementar los valores de orden entre ordenGeografico y ordenActual - 1
      const resultadoIncremento = await Tienda.update(
        { orden: sequelize.literal('orden + 1') },
        {
          where: {
            createdBy: createdBy,
            orden: {
              [Op.gte]: ordenGeografico,
              [Op.lt]: ordenActual,
            },
          },
        }
      );
      console.log('Filas afectadas por incremento de orden:', resultadoIncremento);
    }

    // Si el nuevo orden es mayor que el actual
    if (ordenGeografico > ordenActual) {
      // Decrementar los valores de orden entre ordenActual + 1 y ordenGeografico
      const resultadoDecremento = await Tienda.update(
        { orden: sequelize.literal('orden - 1') },
        {
          where: {
            createdBy: createdBy,
            orden: {
              [Op.gt]: ordenActual,
              [Op.lte]: ordenGeografico,
            },
          },
        }
      );
      console.log('Filas afectadas por decremento de orden:', resultadoDecremento);
    }

    // Actualizar el orden de la tienda seleccionada
    tienda.orden = ordenGeografico;
    const resultadoGuardar = await tienda.save();
    console.log('Resultado de la actualización de tienda:', resultadoGuardar);

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Orden geográfico actualizado correctamente', tienda });
  } catch (error) {
    // Manejo de errores
    console.error('Error al actualizar el orden geográfico:', error.message || error);
    return res.status(500).json({ error: 'Error al actualizar el orden geográfico' });
  }
});




  router.get("/historial4p2/:option", authenticateToken, async (req, res) => {
    const { option } = req.params;
    // Extraer parámetros de fecha (en formato "YYYY-MM-DD") de la query string
    const { startDate: startDateQuery, endDate: endDateQuery } = req.query;
    let start, end;
  
    // Si se envía alguna fecha, se define el rango completo del día o el rango entre ambas fechas
    if (startDateQuery || endDateQuery) {
      if (startDateQuery && !endDateQuery) {
        start = parseDbDate(startDateQuery, true);
        end = parseDbDate(startDateQuery, false);
      } else if (!startDateQuery && endDateQuery) {
        start = parseDbDate(endDateQuery, true);
        end = parseDbDate(endDateQuery, false);
      } else if (startDateQuery && endDateQuery) {
        start = parseDbDate(startDateQuery, true);
        end = parseDbDate(endDateQuery, false);
      }
    }
  
    // Se preparan dos filtros: uno para campos "createdAt" (por ejemplo, en Tienda) y otro para "fecha" (en Recarga, Saldo, etc.)
    const dateFilterCreatedAt =
      start && end ? { createdAt: { [Op.between]: [start, end] } } : {};
    const dateFilterFecha =
      start && end ? { fecha: { [Op.between]: [start, end] } } : {};
  
    try {
      // Solo el administrador tiene permiso para esta consulta
      if (req.user.rol !== "administrador") {
        return res.status(403).json({ error: "No autorizado" });
      }
  
      let result;
      switch (option.toLowerCase()) {
        case "general": {
          // Se consultan varios movimientos y se unen en un solo arreglo
          const aperturas2 = await Tienda.findAll({
            attributes: ["createdAt", "id"],
            include: [
              {
                model: Usuario,
                as: "usuario",
                attributes: ["nombres_apellidos", "nombre_tienda"],
                where: { activo: true },
              },
              {
                model: Usuario,
                as: "creador",
                attributes: ["nombres_apellidos", "correo"],
                where: { activo: true },
              },
            ],
            where:
              Object.keys(dateFilterCreatedAt).length > 0
                ? dateFilterCreatedAt
                : {},
            order: [["createdAt", "DESC"]],
            limit:
              Object.keys(dateFilterCreatedAt).length > 0 ? undefined : 500,
          });
  
          // Calcular el promedio semanal para cada tienda (usando recargas de las últimas 8 semanas)
          for (const tienda of aperturas2) {
            const fechaActual = new Date();
            const fechaInicio = new Date(tienda.createdAt);
            const ochoSemanasAtras = new Date(fechaActual);
            ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);
            const fechaInicioReal =
              fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;
            if (!tienda.id) {
              tienda.dataValues.promedioSemanal = 0;
              continue;
            }
            const recargas = await Recarga.findAll({
              where: {
                TiendaId: tienda.id,
                fecha: { [Op.between]: [fechaInicioReal, fechaActual] },
              },
            });
            if (recargas.length === 0) {
              tienda.dataValues.promedioSemanal = 0;
              continue;
            }
            const semanas = {};
            recargas.forEach((recarga) => {
              const semana = getWeekOfYear(recarga.fecha);
              if (!semanas[semana]) {
                semanas[semana] = [];
              }
              semanas[semana].push(recarga);
            });
            const semanasTotales = Object.keys(semanas).length;
            const promedioSemanal = calcularPromedioSemanal(recargas).toFixed(2); // Esta función agrupa por semanas (lunes a domingo) y promedia

            tienda.dataValues.promedioSemanal = promedioSemanal;
          }
  
          const recargas2 = await Recarga.findAll({
            attributes: ["fecha", "valor"],
            include: [
              {
                model: Tienda,
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["nombres_apellidos", "nombre_tienda"],
                  },
                ],
              },
            ],
            where:
              Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {},
            order: [["fecha", "DESC"]],
            limit: Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
  
          const abonos2 = await Saldo.findAll({
            where: {
              credito: true,
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["fecha", "valor", "credito"],
            include: [
              {
                model: Tienda,
                as: "tienda",
                attributes: ["UsuarioId"],
                required: true,
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                  },
                  {
                    model: Usuario,
                    as: "creador",
                    attributes: ["nombres_apellidos", "correo"],
                    where: { activo: true, rol: "vendedor" },
                  },
                ],
              },
            ],
            order: [["fecha", "DESC"]],
            limit: Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
  
          const saldos2 = await Saldo.findAll({
            where: {
              credito: false,
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["fecha", "valor", "credito"],
            include: [
              {
                model: Tienda,
                as: "tienda",
                attributes: ["UsuarioId"],
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["correo", "nombres_apellidos", "nombre_tienda"],
                  },
                  {
                    model: Usuario,
                    as: "creador",
                    attributes: ["nombres_apellidos", "correo"],
                    where: { activo: true },
                  },
                ],
              },
            ],
            order: [["fecha", "DESC"]],
            limit: Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
  
          const pagos2 = await PagVendedor.findAll({
            where: {
              tipo: "Deposito",
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["fecha", "valor", "tipo"],
            include: [
              {
                model: Usuario,
                as: "vendedor",
                attributes: ["correo", "nombres_apellidos"],
              },
            ],
            order: [["fecha", "DESC"]],
            limit: Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
  
          const recepcionSaldo2 = await Saldo.findAll({
            where: {
              credito: true,
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["fecha", "valor", "credito"],
            include: [
              {
                model: Tienda,
                as: "tienda",
                attributes: ["UsuarioId"],
                include: [
                  {
                    model: Usuario,
                    as: "creador",
                    attributes: ["correo", "nombres_apellidos"],
                  },
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["nombre_tienda"],
                  },
                ],
              },
            ],
            order: [["fecha", "DESC"]],
            limit: Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });

// Definir filtro para la fecha de eliminación (campo en el usuario)
const dateFilterEliminacion =
  start && end ? { fechaEliminacion: { [Op.between]: [start, end] } } : {};

// Consulta para obtener las tiendas eliminadas aplicando el filtro de fecha
const eliminadas = await Tienda.findAll({
  include: [
    {
      model: Usuario,
      as: "usuario",
      attributes: ["nombres_apellidos", "nombre_tienda", "fechaEliminacion"],
      where: {
        eliminado: true,
        ...dateFilterEliminacion,
      },
    },
  ],
  order: [[{ model: Usuario, as: "usuario" }, "fechaEliminacion", "DESC"]],
  limit: Object.keys(dateFilterEliminacion).length > 0 ? undefined : 500,
});

// Mapear el resultado para integrarlo al historial general
const eliminaciones = eliminadas.map((e) => ({
  fecha: e.usuario.fechaEliminacion,
  titulo: "Eliminada",
  autor: e.usuario.nombres_apellidos || e.usuario.nombre_tienda || "Desconocido",
  valor: 0,
}));


          
  
          result = [
            ...aperturas2.map((a) => ({
              fecha: a.createdAt,
              titulo: "Apertura",
              autor:
                a.creador?.nombres_apellidos ||
                a.creador?.correo ||
                "Desconocido",
              usuario:
                a.usuario?.nombres_apellidos ||
                a.usuario?.nombre_tienda ||
                "Desconocido",
              valor: a.dataValues.promedioSemanal || 0,
            })),
            ...recargas2.map((r) => ({
              fecha: r.fecha,
              titulo: "Recarga",
              autor:
                r.Tienda?.usuario?.nombres_apellidos ||
                r.Tienda?.usuario?.nombre_tienda ||
                "Desconocido",
              valor: r.valor,
            })),
            ...abonos2.map((a) => ({
              fecha: a.fecha,
              titulo: "Abono",
              usuario:
                a.tienda?.usuario?.nombres_apellidos ||
                a.tienda?.usuario?.nombre_tienda ||
                "Desconocido",
              autor:
                a.tienda?.creador?.nombres_apellidos ||
                a.tienda?.creador?.nombre_tienda ||
                "Desconocido",
              valor: a.valor,
            })),
            ...saldos2.map((s) => ({
              fecha: s.fecha,
              titulo: "Saldo",
              usuario:
                s.tienda?.usuario?.nombres_apellidos ||
                s.tienda?.usuario?.nombre_tienda ||

                "Desconocido",
              autor:
                s.tienda?.creador?.nombres_apellidos ||
                s.tienda?.creadir?.correo ||
                "Desconocido",
              valor: s.valor,
            })),
            ...recepcionSaldo2.map((rs) => ({
              fecha: rs.fecha,
              titulo: "Recepción de abono",
              autor:
                rs.tienda?.creador?.nombres_apellidos ||
                rs.tienda?.creador?.correo ||
                "Desconocido",
              usuario:
                rs.tienda?.usuario?.nombre_tienda ||
                "Desconocido",
              valor: rs.valor,
            })),
            ...pagos2.map((p) => ({
              fecha: p.fecha,
              titulo: "Pago",
              autor: "Daniel Fosado",

              usuario: p.vendedor?.nombres_apellidos || "Desconocido",
              valor: p.valor,
            })),
    
            ...eliminaciones
          ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          if (!startDateQuery && !endDateQuery) {
            result = result.slice(0, 500);
          }

          
          break;
        }
        case "aperturas": {
          result = await Tienda.findAll({
            attributes: ["id", "createdAt", "updatedAt", "latitud", "longitud"],
            include: [
              {
                model: Usuario,
                as: "usuario",
                attributes: [
                  "activo",
                  "correo",
                  "nombre_tienda",
                  "celular",
                  "eliminado",
                  "nombres_apellidos",
                ],
                where: { activo: true },
              },
              {
                model: Usuario,
                as: "creador",
                attributes: ["nombres_apellidos", "correo"],
                where: { activo: true },
              },
            ],
            where:
              Object.keys(dateFilterCreatedAt).length > 0
                ? dateFilterCreatedAt
                : {},
            order: [["createdAt", "DESC"]],
            limit:
              Object.keys(dateFilterCreatedAt).length > 0 ? undefined : 500,
          });
          // Calcular el promedio semanal para cada tienda
          for (const tienda of result) {
            const fechaActual = new Date();
            const fechaInicio = new Date(tienda.createdAt);
            const ochoSemanasAtras = new Date(fechaActual);
            ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);
            const fechaInicioReal =
              fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;
            if (!tienda.id) {
              tienda.dataValues.promedioSemanal = 0;
              continue;
            }
            const recargas = await Recarga.findAll({
              where: {
                TiendaId: tienda.id,
                fecha: { [Op.between]: [fechaInicioReal, fechaActual] },
              },
            });
            if (recargas.length === 0) {
              tienda.dataValues.promedioSemanal = 0;
              continue;
            }
            const semanas = {};
            recargas.forEach((recarga) => {
              const semana = getWeekOfYear(recarga.fecha);
              if (!semanas[semana]) {
                semanas[semana] = [];
              }
              semanas[semana].push(recarga);
            });
            const semanasTotales = Object.keys(semanas).length;
            const promedioSemanal = calcularPromedioSemanal(recargas).toFixed(2); // Esta función agrupa por semanas (lunes a domingo) y promedia

            tienda.dataValues.promedioSemanal = promedioSemanal;
          }
          break;
        }
        case "recargas": {
          result = await Recarga.findAll({
            include: [
              {
                model: Tienda,
                attributes: ["UsuarioId"],
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                  },
                ],
              },
            ],
            attributes: ["fecha", "valor", "operadora", "tipo", "celular", "folio"],
            where:
              Object.keys(dateFilterFecha).length > 0
                ? dateFilterFecha
                : {},
            order: [["fecha", "DESC"]],
            limit:
              Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
          break;
        }
        case "abonos": {
          const saldoResult = await Saldo.findAll({
            where: {
              credito: true,
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["valor", "fecha", "credito"],
            include: [
              {
                model: Tienda,
                as: "tienda",
                attributes: ["UsuarioId"],
                required: true,
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                  },
                  {
                    model: Usuario,
                    as: "creador",
                    attributes: ["nombres_apellidos", "correo"],
                    where: { activo: true, rol: "vendedor" },
                  },
                ],
              },
            ],
            order: [["fecha", "DESC"]],
            limit:
              Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
          result = [...saldoResult].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          break;
        }
        case "saldos": {
          result = await Saldo.findAll({
            where: {
              credito: false,
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["valor", "fecha", "credito"],
            include: [
              {
                model: Tienda,
                as: "tienda",
                attributes: ["UsuarioId"],
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["correo", "nombre_tienda"],
                  },
                  {
                    model: Usuario,
                    as: "creador",
                    attributes: ["nombres_apellidos", "correo"],
                    where: { activo: true },
                  },
                ],
              },
            ],
            order: [["fecha", "DESC"]],
            limit:
              Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
          break;
        }
        case "depósitos": {
          const pagVendedorResult = await PagVendedor.findAll({
            where: {
              tipo: "Deposito",
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["fecha", "valor", "tipo"],
            include: [
              {
                model: Usuario,
                as: "vendedor",
                attributes: ["correo", "nombres_apellidos"],
              },
            ],
            order: [["fecha", "DESC"]],
            limit:
              Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
          result = [...pagVendedorResult].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          break;
        }
        case "recepción de saldo": {
          const saldoResult2 = await Saldo.findAll({
            where: {
              credito: true,
              ...(Object.keys(dateFilterFecha).length > 0 ? dateFilterFecha : {}),
            },
            attributes: ["valor", "fecha", "credito"],
            include: [
              {
                model: Tienda,
                as: "tienda",
                attributes: ["UsuarioId"],
                required: true,
                include: [
                  {
                    model: Usuario,
                    as: "usuario",
                    attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                  },
                  {
                    model: Usuario,
                    as: "creador",
                    attributes: ["nombres_apellidos", "correo"],
                    where: { activo: true, rol: "administrador" },
                  },
                ],
              },
            ],
            order: [["fecha", "DESC"]],
            limit:
              Object.keys(dateFilterFecha).length > 0 ? undefined : 500,
          });
          result = [...saldoResult2].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          break;
        }
        default:
          return res.status(400).json({ error: "Opción inválida" });
      }
  
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
router.get("/historial4p/:option", authenticateToken, async (req, res) => {
  const { option } = req.params;

  try {
    // Verificar si el usuario autenticado tiene permisos para consultar la información
    if (req.user.rol !== "administrador") {
      return res.status(403).json({ error: "No autorizado" });
    }

    let result;
    switch (option) {
      case "general":
        const aperturas2 = await Tienda.findAll({
          attributes: ["createdAt"],
          include: [
            {
              model: Usuario,
              as: "usuario",
              attributes: ["nombres_apellidos", "nombre_tienda"],
              where: { activo: true },
            },
          ],
        });
         // Calcular el promedio de ventas semanal (similar al método anterior)
         for (const tienda of aperturas2) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt);
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);

          const fechaInicioReal =
            fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;

          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: {
                [Op.between]: [fechaInicioReal, fechaActual],
              },
            },
          });

          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const semanas = {};
          recargas.forEach((recarga) => {
            const semana = getWeekOfYear(recarga.fecha);
            if (!semanas[semana]) {
              semanas[semana] = [];
            }
            semanas[semana].push(recarga);
          });

          const semanasTotales = Object.keys(semanas).length;
          const promedioSemanal =
            semanasTotales > 0
              ? recargas.reduce((total, recarga) => total + recarga.valor, 0) /
                semanasTotales
              : 0;

          tienda.dataValues.promedioSemanal = promedioSemanal;
        }

        const recargas2 = await Recarga.findAll({
          attributes: ["fecha", "valor"],
          include: [
            {
              model: Tienda,
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["nombres_apellidos","nombre_tienda"],
                },
              ],
            },
          ],
        });

        const abonos2 = await Saldo.findAll({
          where: { credito: true },
          attributes: ["fecha", "valor"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["nombres_apellidos", "nombre_tienda"],
                },
              ],
            },
          ],
        });

        const saldos2 = await Saldo.findAll({
          where: { credito: false },
          attributes: ["fecha", "valor"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["nombres_apellidos","nombre_tienda"],
                },
              ],
            },
          ],
        });

        const pagos2 = await PagVendedor.findAll({
          where: { tipo: "Deposito" },
          attributes: ["fecha", "valor"],
          include: [
            {
              model: Usuario,
              as: "vendedor",
              attributes: ["nombres_apellidos"],
            },
          ],
        });

        const recepcionSaldo2 = await Saldo.findAll({
          where: { credito: true },
          attributes: ["fecha", "valor"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["nombres_apellidos", "nombre_tienda"],
                },
              ],
            },
          ],
        });

        result = [
          ...aperturas2.map((a) => ({
            fecha: a.createdAt,
            titulo: "Apertura",
            autor: a.usuario?.nombres_apellidos || a.usuario?.nombre_tienda || "Desconocido",
            valor: a.promedioSemanal,
          })),
          ...recargas2.map((r) => ({
            fecha: r.fecha,
            titulo: "Recarga",
            autor: r.Tienda?.usuario?.nombres_apellidos || r.Tienda?.usuario?.nombre_tienda || "Desconocido",
            valor: r.valor,
          })),
          ...abonos2.map((a) => ({
            fecha: a.fecha,
            titulo: "Abono",
            autor: a.tienda?.usuario?.nombres_apellidos || a.tienda?.usuario?.nombre_tienda || "Desconocido",
            valor: a.valor,
          })),
          ...saldos2.map((s) => ({
            fecha: s.fecha,
            titulo: "Saldo",
            autor: s.tienda?.usuario?.nombres_apellidos || s.tienda?.usuario?.nombre_tienda || "Desconocido",
            valor: s.valor,
          })),
          ...pagos2.map((p) => ({
            fecha: p.fecha,
            titulo: "Pago",
            autor: p.vendedor?.nombres_apellidos || "Desconocido",
            valor: p.valor,
          })),
          ...recepcionSaldo2.map((rs) => ({
            fecha: rs.fecha,
            titulo: "Recepción de Saldo",
            autor: rs.tienda?.crea?.nombres_apellidos || rs.tienda?.usuario?.nombre_tienda || "Desconocido",
            valor: rs.valor,
          })),
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        break;

      case "aperturas":
        // Obtener tiendas aperturadas y eliminadas por todos los usuarios
        result = await Tienda.findAll({
          attributes: ["id", "createdAt", "updatedAt", "latitud", "longitud"],
          include: [
            {
              model: Usuario,
              as: "usuario",
              attributes: [
                "activo",
                "correo",
                "nombre_tienda",
                "celular",
                "eliminado",
                "nombres_apellidos",
              ],
              where: {
                activo: true,
              },
            },
            {
              model: Usuario,
              as: "creador",
              attributes: ["nombres_apellidos", "correo"],
              where: {
                activo: true,
              },
            },
          ],
          order: [["createdAt", "DESC"]],
        });

        // Calcular el promedio de ventas semanal (similar al método anterior)
        for (const tienda of result) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt);
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);

          const fechaInicioReal =
            fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;

          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: {
                [Op.between]: [fechaInicioReal, fechaActual],
              },
            },
          });

          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const semanas = {};
          recargas.forEach((recarga) => {
            const semana = getWeekOfYear(recarga.fecha);
            if (!semanas[semana]) {
              semanas[semana] = [];
            }
            semanas[semana].push(recarga);
          });

          const semanasTotales = Object.keys(semanas).length;
          const promedioSemanal =
            semanasTotales > 0
              ? recargas.reduce((total, recarga) => total + recarga.valor, 0) /
                semanasTotales
              : 0;

          tienda.dataValues.promedioSemanal = promedioSemanal;
        }

        break;

      case "recargas":
        // Obtener recargas de todas las tiendas gestionadas por todos los usuarios
        result = await Recarga.findAll({
          include: [
            {
              model: Tienda,
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
              ],
            },
          ],
          attributes: [
            "fecha",
            "valor",
            "operadora",
            "tipo",
            "celular",
            "folio",
          ],
          order: [["fecha", "DESC"]],
        });
        break;

      case "abonos":
        // Obtener todos los depósitos y saldos acreditados de todos los usuarios

        const saldoResult = await Saldo.findAll({
          where: { credito: true },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
	      required: true, // Esto asegura que la relación con Tienda sea obligatoria

              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: {
                    activo: true,
                    rol: "vendedor",

                  },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
        });

        result = [...saldoResult].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        break;

      case "saldos":
        // Obtener el historial de saldos acreditados y retirados por todos los usuarios
        result = await Saldo.findAll({
          where: { credito: false },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: {
                    activo: true,
                  },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
        });
        break;

      case "pagos":
        // Obtener todos los depósitos y saldos acreditados de todos los usuarios
        const pagVendedorResult = await PagVendedor.findAll({
          where: { tipo: "Deposito" },
          attributes: ["fecha", "valor", "tipo"],

          include: [
            {
              model: Usuario,
              as: "vendedor",
              attributes: ["correo", "nombres_apellidos"],
            },
          ],
          order: [["fecha", "DESC"]],
        });

        result = [...pagVendedorResult].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        break;

      case "recepción de saldo":
        const saldoResult2 = await Saldo.findAll({
          where: { credito: true },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
       	      required: true, // Esto asegura que la relación con Tienda sea obligatoria

              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: {
                    activo: true,
                    rol: "administrador",
                  },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
        });

        result = [...saldoResult2].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        break;


  const recargas = await Recarga.findAll({
    attributes: ["fecha"],
    include: [
      {
        model: Tienda,
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["nombre_tienda"],
          },
        ],
      },
    ],
  });

  const abonos = await Saldo.findAll({
    where: { credito: true },
    attributes: ["fecha"],
    include: [
      {
        model: Tienda,
        as: "tienda",
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["nombres_apellidos", "nombre_tienda"],
          },
        ],
      },
    ],
  });

  const saldos = await Saldo.findAll({
    where: { credito: false },
    attributes: ["fecha"],
    include: [
      {
        model: Tienda,
        as: "tienda",
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["nombre_tienda"],
          },
        ],
      },
    ],
  });

  const pagos = await PagVendedor.findAll({
    where: { tipo: "Deposito" },
    attributes: ["fecha"],
    include: [
      {
        model: Usuario,
        as: "vendedor",
        attributes: ["nombres_apellidos"],
      },
    ],
  });

  const recepcionSaldo = await Saldo.findAll({
    where: { credito: true },
    attributes: ["fecha"],
    include: [
      {
        model: Tienda,
        as: "tienda",
        include: [
          {
            model: Usuario,
            as: "usuario",
            attributes: ["nombres_apellidos", "nombre_tienda"],
          },
        ],
      },
    ],
  });

  result = [
    ...aperturas.map((a) => ({
      fecha: a.createdAt,
      titulo: "Apertura",
      autor: a.usuario?.nombres_apellidos || a.usuario?.nombre_tienda || "Desconocido",
    })),
    ...recargas.map((r) => ({
      fecha: r.fecha,
      titulo: "Recarga",
      autor: r.Tienda?.usuario?.nombre_tienda || "Desconocido",
    })),
    ...abonos.map((a) => ({
      fecha: a.fecha,
      titulo: "Abono",
      autor: a.tienda?.usuario?.nombres_apellidos || a.tienda?.usuario?.nombre_tienda || "Desconocido",
    })),
    ...saldos.map((s) => ({
      fecha: s.fecha,
      titulo: "Saldo",
      autor: s.tienda?.usuario?.nombre_tienda || "Desconocido",
    })),
    ...pagos.map((p) => ({
      fecha: p.fecha,
      titulo: "Pago",
      autor: p.vendedor?.nombres_apellidos || "Desconocido",
    })),
    ...recepcionSaldo.map((rs) => ({
      fecha: rs.fecha,
      titulo: "Recepción de Saldo",
      autor: rs.tienda?.usuario?.nombres_apellidos || rs.tienda?.usuario?.nombre_tienda || "Desconocido",
    })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  break;


      default:
        return res.status(400).json({ error: "Opción inválida" });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/historial4/:option", authenticateToken, async (req, res) => {
  const { option } = req.params;

  try {
    // Verificar si el usuario autenticado tiene permisos para consultar la información
    if (req.user.rol !== "administrador") {
      return res.status(403).json({ error: "No autorizado" });
    }

    let result;
    switch (option) {
      case "aperturas":
        // Obtener tiendas aperturadas y eliminadas por todos los usuarios
        result = await Tienda.findAll({
          attributes: ["id", "createdAt", "updatedAt", "latitud", "longitud"],
          include: [
            {
              model: Usuario,
              as: "usuario",
              attributes: [
                "activo",
                "correo",
                "nombre_tienda",
                "celular",
                "eliminado",
                "nombres_apellidos",
              ],
              where: {
                activo: true,
              },
            },
            {
              model: Usuario,
              as: "creador",
              attributes: ["nombres_apellidos", "correo"],
              where: {
                activo: true,
              },
            },
          ],
          order: [["createdAt", "DESC"]],
        });

        // Calcular el promedio de ventas semanal (similar al método anterior)
        for (const tienda of result) {
          const fechaActual = new Date();
          const fechaInicio = new Date(tienda.createdAt);
          const ochoSemanasAtras = new Date(fechaActual);
          ochoSemanasAtras.setDate(fechaActual.getDate() - 8 * 7);

          const fechaInicioReal =
            fechaInicio > ochoSemanasAtras ? fechaInicio : ochoSemanasAtras;

          if (!tienda.id) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const recargas = await Recarga.findAll({
            where: {
              TiendaId: tienda.id,
              fecha: {
                [Op.between]: [fechaInicioReal, fechaActual],
              },
            },
          });

          if (recargas.length === 0) {
            tienda.dataValues.promedioSemanal = 0;
            continue;
          }

          const semanas = {};
          recargas.forEach((recarga) => {
            const semana = getWeekOfYear(recarga.fecha);
            if (!semanas[semana]) {
              semanas[semana] = [];
            }
            semanas[semana].push(recarga);
          });

          const semanasTotales = Object.keys(semanas).length;
          const promedioSemanal =
            semanasTotales > 0
              ? recargas.reduce((total, recarga) => total + recarga.valor, 0) /
                semanasTotales
              : 0;

          tienda.dataValues.promedioSemanal = promedioSemanal;
        }

        break;

      case "recargas":
        // Obtener recargas de todas las tiendas gestionadas por todos los usuarios
        result = await Recarga.findAll({
          include: [
            {
              model: Tienda,
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
              ],
            },
          ],
          attributes: [
            "fecha",
            "valor",
            "operadora",
            "tipo",
            "celular",
            "folio",
          ],
          order: [["fecha", "DESC"]],
        });
        break;

      case "abonos":
        // Obtener todos los depósitos y saldos acreditados de todos los usuarios

        const saldoResult = await Saldo.findAll({
          where: { credito: true },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
	      required: true, // Esto asegura que la relación con Tienda sea obligatoria

              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: {
                    activo: true,
                    rol: "vendedor",

                  },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
        });

        result = [...saldoResult].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        break;

      case "saldos":
        // Obtener el historial de saldos acreditados y retirados por todos los usuarios
        result = await Saldo.findAll({
          where: { credito: false },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: {
                    activo: true,
                  },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
        });
        break;

      case "pagos":
        // Obtener todos los depósitos y saldos acreditados de todos los usuarios
        const pagVendedorResult = await PagVendedor.findAll({
          where: { tipo: "Deposito" },
          attributes: ["fecha", "valor", "tipo"],

          include: [
            {
              model: Usuario,
              as: "vendedor",
              attributes: ["correo", "nombres_apellidos"],
            },
          ],
          order: [["fecha", "DESC"]],
        });

        result = [...pagVendedorResult].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        break;

      case "recepción de saldo":
        const saldoResult2 = await Saldo.findAll({
          where: { credito: true },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
       	      required: true, // Esto asegura que la relación con Tienda sea obligatoria

              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: {
                    activo: true,
                    rol: "administrador",
                  },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
        });

        result = [...saldoResult2].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );
        break;

      default:
        return res.status(400).json({ error: "Opción inválida" });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/historial5/:option", authenticateToken, async (req, res) => {
  const { option } = req.params;
  const { page = 1, limit = 50, startDate, endDate } = req.query;

  // Convertir parámetros de paginación a números
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const offset = (pageNumber - 1) * limitNumber;

  try {
    // Verificar si el usuario autenticado tiene permisos
    if (req.user.rol !== "administrador") {
      return res.status(403).json({ error: "No autorizado" });
    }

    // Crear el filtro de rango de fechas si se proporciona
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    let result;
    switch (option) {
      case "aperturas":
        result = await Tienda.findAndCountAll({
          where: {
            ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
          },
          attributes: ["id", "createdAt", "updatedAt", "latitud", "longitud"],
          include: [
            {
              model: Usuario,
              as: "usuario",
              attributes: [
                "activo",
                "correo",
                "nombre_tienda",
                "celular",
                "eliminado",
                "nombres_apellidos",
              ],
              where: { activo: true },
            },
            {
              model: Usuario,
              as: "creador",
              attributes: ["nombres_apellidos", "correo"],
              where: { activo: true },
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: limitNumber,
          offset: offset,
        });
        break;

      case "recargas":
        result = await Recarga.findAndCountAll({
          where: {
            ...(Object.keys(dateFilter).length && { fecha: dateFilter }),
          },
          include: [
            {
              model: Tienda,
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
              ],
            },
          ],
          attributes: ["fecha", "valor", "operadora", "tipo", "celular", "folio"],
          order: [["fecha", "DESC"]],
          limit: limitNumber,
          offset: offset,
        });
        break;

      case "abonos":
        result = await Saldo.findAndCountAll({
          where: {
            credito: true,
            ...(Object.keys(dateFilter).length && { fecha: dateFilter }),
          },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: { activo: true, rol: "vendedor" },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
          limit: limitNumber,
          offset: offset,
        });
        break;

      case "saldos":
        result = await Saldo.findAndCountAll({
          where: {
            credito: false,
            ...(Object.keys(dateFilter).length && { fecha: dateFilter }),
          },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: { activo: true },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
          limit: limitNumber,
          offset: offset,
        });
        break;

      case "pagos":
        result = await PagVendedor.findAndCountAll({
          where: {
            tipo: "Deposito",
            ...(Object.keys(dateFilter).length && { fecha: dateFilter }),
          },
          attributes: ["fecha", "valor", "tipo"],
          include: [
            {
              model: Usuario,
              as: "vendedor",
              attributes: ["correo", "nombres_apellidos"],
            },
          ],
          order: [["fecha", "DESC"]],
          limit: limitNumber,
          offset: offset,
        });
        break;

      case "recepción de saldo":
        result = await Saldo.findAndCountAll({
          where: {
            credito: true,
            ...(Object.keys(dateFilter).length && { fecha: dateFilter }),
          },
          attributes: ["valor", "fecha", "credito"],
          include: [
            {
              model: Tienda,
              as: "tienda",
              attributes: ["UsuarioId"],
              required: true,
              include: [
                {
                  model: Usuario,
                  as: "usuario",
                  attributes: ["correo", "nombre_tienda", "nombres_apellidos"],
                },
                {
                  model: Usuario,
                  as: "creador",
                  attributes: ["nombres_apellidos", "correo"],
                  where: { activo: true, rol: "administrador" },
                },
              ],
            },
          ],
          order: [["fecha", "DESC"]],
          limit: limitNumber,
          offset: offset,
        });
        break;

      default:
        return res.status(400).json({ error: "Opción inválida" });
    }

    // Retornar resultados paginados
    res.status(200).json({
      totalItems: result.count,
      totalPages: Math.ceil(result.count / limitNumber),
      currentPage: pageNumber,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Ruta para actualizar el porcentaje de una tienda
router.post('/actualizar-porcentaje', async (req, res) => {
  const { tiendaId, porcentaje } = req.body;

  try {
    // Verificar que el porcentaje y tiendaId sean válidos
    if (!tiendaId || porcentaje == null) {
      return res.status(400).json({ error: 'Faltan parámetros necesarios (tiendaId o porcentaje)' });
    }

    // Validar que el porcentaje esté en el rango permitido (0 a 7, incluyendo 0 y 7)
    if (porcentaje < 0 || porcentaje > 7) {
      return res.status(400).json({ error: 'El porcentaje debe estar en el rango de 0 a 7 inclusive' });
    }

    // Buscar la tienda por ID
    const tienda = await Tienda.findByPk(tiendaId);
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Actualizar el porcentaje de la tienda
    tienda.porcentaje = porcentaje;
    const resultadoGuardar = await tienda.save();

    // Agregar logs para verificar valores
    console.log('Resultado de la actualización de porcentaje:', resultadoGuardar);

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Porcentaje actualizado correctamente', tienda });
  } catch (error) {
    // Manejo de errores
    console.error('Error al actualizar el porcentaje:', error.message || error);
    return res.status(500).json({ error: 'Error al actualizar el porcentaje' });
  }
});



router.post('/actualizar-contado', async (req, res) => {
  const { tiendaId, contado } = req.body;

  try {
    // Verificar que el tiendaId y contado sean válidos
    if (!tiendaId || typeof contado !== 'boolean') {
      return res.status(400).json({ error: 'Faltan parámetros necesarios o el parámetro contado no es válido' });
    }

    // Buscar la tienda por ID
    const tienda = await Tienda.findByPk(tiendaId);
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Actualizar el valor de contado de la tienda
    tienda.contado = contado;
    const resultadoGuardar = await tienda.save();

    // Agregar logs para verificar valores
    console.log('Resultado de la actualización de contado:', resultadoGuardar);

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Estado de contado actualizado correctamente', tienda });
  } catch (error) {
    // Manejo de errores
    console.error('Error al actualizar el estado de contado:', error.message || error);
    return res.status(500).json({ error: 'Error al actualizar el estado de contado' });
  }
});



router.post('/actualizar-contado', async (req, res) => {
  const { tiendaId, contado } = req.body;

  try {
    // Verificar que el tiendaId y contado sean válidos
    if (!tiendaId || typeof contado !== 'boolean') {
      return res.status(400).json({ error: 'Faltan parámetros necesarios o el parámetro contado no es válido' });
    }

    // Buscar la tienda por ID
    const tienda = await Tienda.findByPk(tiendaId);
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Actualizar el valor de contado de la tienda
    tienda.contado = contado;
    const resultadoGuardar = await tienda.save();

    // Agregar logs para verificar valores
    console.log('Resultado de la actualización de contado:', resultadoGuardar);

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Estado de contado actualizado correctamente', tienda });
  } catch (error) {
    // Manejo de errores
    console.error('Error al actualizar el estado de contado:', error.message || error);
    return res.status(500).json({ error: 'Error al actualizar el estado de contado' });
  }
});


router.post('/restablecer-celular', async (req, res) => {
  const { tiendaId, nuevoCelular } = req.body; // nuevoCelular es el número de celular que se desea actualizar

  try {
    // Verificar que el tiendaId y nuevoCelular sean válidos
    if (!tiendaId) {
      return res.status(400).json({ error: 'Falta el parámetro tiendaId' });
    }
    if (!nuevoCelular) {
      return res.status(400).json({ error: 'Falta el parámetro nuevoCelular' });
    }
    if (nuevoCelular.length !== 10) {
      return res.status(400).json({ error: 'El número de celular debe tener exactamente 10 dígitos' });
    }

    // Buscar la tienda por ID, incluyendo el usuario asociado
    const tienda = await Tienda.findByPk(tiendaId, {
      include: [{ model: Usuario, as: 'usuario' }],
    });

    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Obtener el usuario asociado a la tienda
    const usuario = tienda.usuario;
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado en la tienda' });
    }

    // Verificar si el nuevo número de celular ya está en uso por otro usuario
    const usuarioExistente = await Usuario.findOne({
      where: {
        celular: usuario.celular.slice(0, -10) + nuevoCelular, // Verificamos si el número completo (con el prefijo) ya existe
        id: { [Op.ne]: usuario.id } // Excluimos al propio usuario de la búsqueda
      }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'El número de celular ya está en uso por otro usuario' });
    }

    // Obtener el prefijo del número actual (excluyendo los 10 últimos dígitos)
    const prefijoActual = usuario.celular.slice(0, -10);

    // Actualizar el número de celular con el nuevo número y mantener el prefijo
    usuario.celular = prefijoActual + nuevoCelular; // Asumiendo que el prefijo no cambia, solo se reemplazan los 10 dígitos finales

    // Encriptar la nueva contraseña basada en el nuevo número de celular (10 últimos dígitos)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevoCelular, saltRounds);
    usuario.contrasenia = hashedPassword; // Se guarda la nueva contraseña

    // Guardar los cambios en el usuario
    const resultadoGuardar = await usuario.save();
    if (!resultadoGuardar) {
      return res.status(500).json({ error: 'No se pudo guardar el usuario con el nuevo número de celular y contraseña' });
    }

    // Eliminar todas las sesiones anteriores asociadas al usuario
    await Session.destroy({
      where: {
        userId: usuario.id
      }
    });

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Número de celular y contraseña restablecidos correctamente', usuario });
  } catch (error) {
    // Manejo de errores con más detalles
    console.error('Error al restablecer el celular:', error.message || error);
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({ error: 'Error en la base de datos al procesar la solicitud' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Error de validación en los datos proporcionados' });
    }
    return res.status(500).json({ error: 'Error inesperado al restablecer el número de celular y la contraseña' });
  }
});


router.post('/restablecer-contrasenia', async (req, res) => {
  const { tiendaId } = req.body;

  try {
    // Verificar que el tiendaId sea válido
    if (!tiendaId) {
      return res.status(400).json({ error: 'Falta el parámetro tiendaId' });
    }

    // Buscar la tienda por ID, incluyendo el usuario asociado
    const tienda = await Tienda.findByPk(tiendaId, {
      include: [{ model: Usuario, as: 'usuario' }],
    });

    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Obtener el usuario asociado a la tienda
    const usuario = tienda.usuario;
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Restablecer el correo y la contraseña
    usuario.correo = null; // Eliminar el correo registrado

    // Encriptar la nueva contraseña basada en el número de celular
    const celular = usuario.celular.slice(-10);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(celular, saltRounds);
    usuario.contrasenia = hashedPassword;

    // Guardar los cambios en el usuario
    const resultadoGuardar = await usuario.save();
    const userId = usuario.id;

    // Eliminar todas las sesiones anteriores asociadas al usuario
    await Session.destroy({
      where: {
        userId: userId
      }
    });

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Contraseña restablecida correctamente', usuario });
  } catch (error) {
    // Manejo de errores
    console.error('Error al restablecer la contraseña:', error.message || error);
    return res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});
// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'administrador') {
    next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};

// Middleware para verificar si el usuario es administrador o vendedor
const isAdminOrSeller = (req, res, next) => {
  if (req.user && (req.user.rol === 'administrador' || req.user.rol === 'vendedor')) {
    next();
  } else {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador o vendedor.' });
  }
};

// Ruta para actualizar el porcentaje del usuario
router.post('/actualizar-porcentaje-usuario', authenticateToken, isAdmin, async (req, res) => {
  const { usuarioId, porcentaje } = req.body;

  try {
    // Verificar que el usuarioId y porcentaje sean válidos
    if (!usuarioId || porcentaje == null) {
      return res.status(400).json({ error: 'Faltan parámetros necesarios (usuarioId o porcentaje)' });
    }

    // Validar que el porcentaje esté en el rango permitido (0 a 2, incluyendo 0 y 2)
    if (porcentaje < 0 || porcentaje > 2) {
      return res.status(400).json({ error: 'El porcentaje debe estar en el rango de 0 a 2 inclusive' });
    }

    // Buscar el usuario por ID
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar el porcentaje del usuario
    usuario.porcentaje = porcentaje;
    const resultadoGuardar = await usuario.save();

    // Agregar logs para verificar valores
    console.log('Resultado de la actualización de porcentaje del usuario:', resultadoGuardar);

    // Devolver respuesta exitosa
    return res.status(200).json({ message: 'Porcentaje del usuario actualizado correctamente', usuario });
  } catch (error) {
    // Manejo de errores
    console.error('Error al actualizar el porcentaje del usuario:', error.message || error);
    return res.status(500).json({ error: 'Error al actualizar el porcentaje del usuario' });
  }
});

// Editar correo del usuario (por administrador)
router.put('/editar-correo/:userId', authenticateToken, isAdminOrSeller, async (req, res) => {
  const { correo } = req.body;
  const userId = req.params.userId; // Obtener el ID del usuario desde los parámetros de la URL

  try {
    // Verificar si ya existe un usuario con el nuevo correo
    const existingUser = await Usuario.findOne({ where: { correo } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está en uso por otro usuario' });
    }

    // Buscar el usuario por ID
    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar el correo del usuario
    user.correo_antiguo = user.correo;  // Guardar correo anterior si deseas un registro
    user.correo = correo;
    await user.save();

    // Eliminar todas las sesiones del usuario
    await Session.destroy({
      where: {
        userId: userId
      }
    });

    res.json({ message: 'Correo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el correo:', error);
    res.status(500).json({ error: 'Error al actualizar el correo' });
  }
});



// Editar correo del usuario (por administrador)
router.put('/editar-correo', authenticateToken, isAdminOrSeller, async (req, res) => {
  const { userId , correo } = req.body;

  try {
    // Verificar si ya existe un usuario con el nuevo correo
    const existingUser = await Usuario.findOne({ where: { correo } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está en uso por otro usuario' });
    }

    // Buscar el usuario por ID
    const user = await Usuario.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Actualizar el correo del usuario
    user.correo_antiguo = user.correo;  // Guardar correo anterior si deseas un registro
    user.correo = correo;
    await user.save();

    // Eliminar todas las sesiones del usuario
    await Session.destroy({
      where: {
        userId: userId
      }
    });

    res.json({ message: 'Correo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar el correo:', error);
    res.status(500).json({ error: 'Error al actualizar el correo' });
  }
});



// Editar correo del usuario (por administrador)
router.put('/actualizar-ubicacion', authenticateToken, isAdminOrSeller, async (req, res) => {
  const { tiendaId , latitud, longitud } = req.body;

  try {

    // Buscar el usuario por ID
    const tienda = await Tienda.findByPk(tiendaId);

    tienda.latitud=latitud;
    tienda.longitud=longitud;

    await tienda.save();



    res.json({ message: 'Ubicación actualizada correctamente' });
  } catch (error) {
    console.error('Error al actualizar Ubicación', error);
    res.status(500).json({ error: 'Error al actualizar Ubicación' });
  }
});


// Función de ejemplo para buscar una tienda por nombre
async function buscarTiendaPorNombre(nombreTienda) {
  // Reemplaza esto con la lógica para buscar una tienda en tu base de datos.
  return await Usuario.findOne({ where: { nombre_tienda: nombreTienda } });
}

// Función de ejemplo para buscar una tienda por nombre
async function buscarCelular(celular) {
  // Reemplaza esto con la lógica para buscar una tienda en tu base de datos.
  return await Usuario.findOne({ where: { celular: celular } });
}

// Función de ejemplo para buscar una tienda por nombre
async function buscarVendedorPorNombreApellido(nombreVendedor) {
  // Reemplaza esto con la lógica para buscar una tienda en tu base de datos.
  return await Usuario.findOne({ where: { nombres_apellidos: nombreTienda } });
}


router.post('/eliminar-tienda/:id', authenticateToken, async (req, res) => {
  // Verificar que el usuario sea administrador
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No autorizado. Solo los administradores pueden realizar esta acción.' });
  }

  try {
    // Buscar la tienda por su ID
    const tienda = await Tienda.findByPk(req.params.id);
    if (!tienda) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    // Buscar el usuario asociado a la tienda
    const usuario = await Usuario.findByPk(tienda.UsuarioId);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario asociado no encontrado' });
    }

       // Guardar el creador y el orden de la tienda eliminada
       const creadorId = tienda.createdBy;
       const ordenEliminada = tienda.orden;
         // Actualizar el estado de la tienda para marcarla como eliminada
    await tienda.update({
      orden: 0 // O null si permites valores nulos
    });  

        // Reorganizar las tiendas cuyo "orden" es mayor al de la tienda eliminada
        const tiendasAActualizar = await Tienda.findAll({
          where: {
            createdBy: creadorId,
            orden: {
              [Op.gt]: ordenEliminada // Usar Op.gt para comparar el campo "orden"
            }
          },
          order: [['orden', 'ASC']]
        });
    
        // Reducir el orden de las tiendas afectadas
        for (const t of tiendasAActualizar) {
          await t.update({ orden: t.orden - 1 });
        }
  // Guardar el nombre original de la tienda
  let nuevoNombreTienda = usuario.nombre_tienda;

  // Buscar un nombre único
  let nombreUnicoEncontrado = false;
  while (!nombreUnicoEncontrado) {
    const tiendaExistente = await buscarTiendaPorNombre(nuevoNombreTienda); // Cambia esta función a la lógica que usas para buscar por nombre.
    if (!tiendaExistente) {
      nombreUnicoEncontrado = true;
    } else {
      nuevoNombreTienda += ' '; // Agregar un espacio más.
    }
  }

    // Guardar el nombre original de la tienda
  let nuevoCelular = usuario.celular;

  // Buscar un nombre único
  let celularUnicoEncontrado = false;
  while (!celularUnicoEncontrado) {
    const celularExistente = await buscarCelular(nuevoCelular); // Cambia esta función a la lógica que usas para buscar por nombre.
    if (!celularExistente) {
      celularUnicoEncontrado = true;
    } else {
      nuevoCelular += ' '; // Agregar un espacio más.
    }
  }


    
       // Modificar el usuario (no eliminarlo)
       await usuario.update({
        eliminado: true,
        fechaEliminacion: new Date(),
        contrasenia: crypto.randomBytes(32).toString('hex'), // Cambiar a una contraseña aleatoria
        nombre_tienda: nuevoNombreTienda, // Agregar sufijo al nombre de la tienda
        celular: nuevoCelular,

      });


    // Cerrar sesiones activas del usuario asociado
    await Session.destroy({
      where: {
        userId: tienda.UsuarioId
      }
    });



    res.status(200).json({ message: 'Tienda, usuario y entidades relacionadas eliminadas correctamente, y el orden ajustado.' });
  } catch (error) {
    console.error('Error al eliminar tienda y sus relaciones:', error);
    res.status(500).json({ error: 'Error al eliminar tienda y sus relaciones' });
  }
});

async function generarDatoUnico(valorInicial, buscarFuncion) {
  let nuevoValor = valorInicial;
  while (await buscarFuncion(nuevoValor)) {
    nuevoValor += ' ';
  }
  return nuevoValor;
}

router.post('/eliminar-vendedor/:id', authenticateToken, async (req, res) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'No autorizado. Solo los administradores pueden realizar esta acción.' });
  }

  try {
    const vendedor = await Usuario.findByPk(req.params.id);
    if (!vendedor || vendedor.rol !== 'vendedor') {
      return res.status(404).json({ error: 'Vendedor no encontrado o no válido.' });
    }

    // Eliminar todas las tiendas creadas por el vendedor
    const tiendas = await Tienda.findAll({
      where: { createdBy: vendedor.id },
      order: [['orden', 'ASC']]
    });

    for (const tienda of tiendas) {
      const usuario = await Usuario.findByPk(tienda.UsuarioId);
      if (!usuario) continue;

      const ordenEliminada = tienda.orden;

      // Marcar la tienda como eliminada (orden 0)
      await tienda.update({ orden: 0 });

      // Reordenar otras tiendas del mismo creador
      const tiendasAReordenar = await Tienda.findAll({
        where: {
          createdBy: vendedor.id,
          orden: { [Op.gt]: ordenEliminada }
        },
        order: [['orden', 'ASC']]
      });

      for (const t of tiendasAReordenar) {
        await t.update({ orden: t.orden - 1 });
      }

      // Reasignar datos únicos al usuario asociado a la tienda
      const nuevoNombreTienda = await generarDatoUnico(usuario.nombre_tienda, async (v) =>
        Usuario.findOne({ where: { nombre_tienda: v } })
      );

      const nuevoCelular = await generarDatoUnico(usuario.celular, async (v) =>
        Usuario.findOne({ where: { celular: v } })
      );

      await usuario.update({
        eliminado: true,
        fechaEliminacion: new Date(),
        contrasenia: crypto.randomBytes(32).toString('hex'),
        nombre_tienda: nuevoNombreTienda,
        celular: nuevoCelular,
      });

      await Session.destroy({ where: { userId: usuario.id } });
    }

    // Finalmente, marcar como eliminado al vendedor
    const nuevoNombreTiendaV = await generarDatoUnico(vendedor.nombre_tienda, async (v) =>
      Usuario.findOne({ where: { nombre_tienda: v } })
    );

    const nuevoCelularV = await generarDatoUnico(vendedor.celular, async (v) =>
      Usuario.findOne({ where: { celular: v } })
    );

    const nuevoCorreoV = await generarDatoUnico(vendedor.correo, async (v) =>
      Usuario.findOne({ where: { correo: v } })
    );

    const nuevoNombreApellidosV = await generarDatoUnico(vendedor.nombres_apellidos, async (v) =>
      Usuario.findOne({ where: { nombres_apellidos: v } })
    );

    await vendedor.update({
      eliminado: true,
      fechaEliminacion: new Date(),
      contrasenia: crypto.randomBytes(32).toString('hex'),
      nombre_tienda: nuevoNombreTiendaV,
      celular: nuevoCelularV,
      correo: null,
      nombres_apellidos: nuevoNombreApellidosV,
    });

    await Session.destroy({ where: { userId: vendedor.id } });

    return res.status(200).json({
      message: 'Vendedor y todas las tiendas asociadas eliminadas correctamente.',
    });
  } catch (error) {
    console.error('Error al eliminar vendedor y tiendas asociadas:', error);
    return res.status(500).json({ error: 'Error interno al eliminar vendedor y tiendas asociadas.' });
  }
});






module.exports = router;
