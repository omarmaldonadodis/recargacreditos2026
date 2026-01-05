const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Session = require('../models/Session');
const authenticateToken = require('../middlewares/authenticateToken');
require('dotenv').config();
const { Op } = require('sequelize');

const axios = require('axios'); // Asegúrate de importar axios



const router = express.Router();


// Registro de usuario
router.post('/register', async (req, res) => {
  const { correo, contrasenia, rol, nombres_apellidos, nombre_tienda, celular } = req.body;
  
  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contrasenia, 10);
    
    // Crear el usuario en la base de datos
    const user = await Usuario.create({
      correo,
      contrasenia: hashedPassword,
      rol,
      nombres_apellidos,
      nombre_tienda,
      celular
    });
    
    // Responder con los datos del usuario recién creado
    res.status(201).json({ message: 'Usuario creado exitosamente', user: { correo: user.correo, rol: user.rol } });
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
router.post('/login', async (req, res) => {
  const { identificador, contrasenia } = req.body;
  
  try {
    // Buscar usuario por correo o nombre_tienda
    const users = await Usuario.findAll({
      where: {
        [Op.or]: [
          { correo: identificador },
          { nombre_tienda: identificador },
          { nombres_apellidos: identificador }

        ]
      }
    });
    console.log("Llega acá")
    
    // Si no hay usuarios, retornar error
    if (users.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }
    
        // Filtrar usuarios válidos por contraseña
        let user = null;
        for (let i = 0; i < users.length; i++) {
          const validPassword = await bcrypt.compare(contrasenia, users[i].contrasenia);
          if (validPassword) {
            user = users[i];
            break; // Detener cuando encontramos la contraseña correcta
          }
        }
    
        if (!user) {
          return res.status(400).json({ error: 'Contraseña incorrecta' });
        }
    
        // Validar si el usuario está eliminado
        if (user.eliminado) {
          return res.status(400).json({ error: 'Cuenta inactiva. Contacte al administrador.' });
        }
        
    const tokenPayload = {
      id: user.id,
      correo: user.correo,
      nombre_tienda: user.nombre_tienda,
      rol: user.rol,
      verificado: user.verificado,
      nombres_apellidos: user.nombres_apellidos || "",
      celular: user.celular || "",

      tokenVersion: user.tokenVersion // Incluir la versión del token para invalidación

    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '100y' });

      // Guardar la sesión en la base de datos
      await Session.create({
        token: token,
        userId: user.id,
        ip: req.ip, // Guardar la IP de la solicitud
        userAgent: req.headers['user-agent'] // Guardar el User-Agent del navegador
      });
    res.json({ token });

  } catch (error) {
    console.error(error); // Para ver el error en la consola

    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Inicio de sesión
router.post('/login2', async (req, res) => {
  const { correo, contrasenia } = req.body;
  
  try {
    // Verificar si el usuario existe
    const user = await Usuario.findOne({ where: { correo } });
    if (!user) return res.status(400).json({ error: 'Usuario no encontrado' });
    
    // Verificar si el usuario está activo
    if (!user.activo) return res.status(403).json({ error: 'Cuenta inactiva. Contacte al administrador.' });

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(contrasenia, user.contrasenia);
    if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Preparar el payload del token
    const tokenPayload = {
      id: user.id,
      correo: user.correo,
      rol: user.rol,
      verificado: user.verificado,
      nombres_apellidos: "prueba"
    };

    // Si el usuario tiene el campo nombre, incluirlo en el token
    if (user.nombres_apellidos) {
      tokenPayload.nombres_apellidos = user.nombres_apellidos;
    }

    // Generar el token JWT
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '10000h' });

    // Responder con el token JWT
    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Impersonar a un vendedor
router.post('/impersonate/:vendedorId', authenticateToken, async (req, res) => {
  try {
    const { vendedorId } = req.params;

    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }

    const vendedor = await Usuario.findByPk(vendedorId);
    if (!vendedor || vendedor.rol !== 'vendedor') {
      return res.status(404).json({ error: 'Vendedor no encontrado.' });
    }

    const impersonateToken = jwt.sign({
      id: vendedor.id,
      correo: vendedor.correo,
      rol: vendedor.rol,
      impersonatedBy: req.user.id // Guardar el ID del administrador que hizo la suplantación
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token: impersonateToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al impersonar vendedor.' });
  }
});

// Ruta para volver al rol de administrador
router.post('/revert-impersonation', authenticateToken, async (req, res) => {
  try {
    // Verificar si el token tiene el campo `impersonatedBy`, lo que indica que es una suplantación
    if (!req.user.impersonatedBy) {
      return res.status(400).json({ error: 'No estás impersonando a nadie.' });
    }

    // Buscar al administrador original
    const administrador = await Usuario.findByPk(req.user.impersonatedBy);
    if (!administrador) {
      return res.status(404).json({ error: 'Administrador no encontrado.' });
    }

    // Generar un nuevo token con los datos del administrador original
    const adminToken = jwt.sign({
      id: administrador.id,
      correo: administrador.correo,
      rol: administrador.rol
    }, process.env.JWT_SECRET, { expiresIn: '10000h' });

    // Devolver el nuevo token
    res.json({ token: adminToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al revertir impersonación.' });
  }
});

// Ruta para que el administrador pueda loguearse como un vendedor
router.post('/actuar_como_vendedor', authenticateToken, async (req, res) => {
  const { vendedorId } = req.body;

  try {
    // Verificar que el usuario autenticado es administrador
    if (req.user.rol !== 'administrador') {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
    }

    // Buscar al usuario vendedor por ID
    const vendedor = await Usuario.findOne({ where: { id: vendedorId, rol: 'vendedor' } });
    if (!vendedor) return res.status(404).json({ error: 'Vendedor no encontrado.' });

    // Generar un token temporal para el vendedor
    const tokenPayload = {
      id: vendedor.id,
      correo: vendedor.correo,
      rol: vendedor.rol,
      verificado: vendedor.verificado,
      nombres_apellidos: vendedor.nombres_apellidos,
      celular:vendedor.celular
    };

    // Guardar el token original del administrador para posibles reversiones
    const tokenVendedor = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '20y' });
    const tokenAdmin = req.headers['authorization'].split(' ')[1]; // Mantener el token original del admin
    await Session.create({
      token: tokenVendedor,
      userId: vendedor.id,
      ip: req.ip, // Guardar la IP de la solicitud
      userAgent: req.headers['user-agent'] // Guardar el User-Agent del navegador
    });
    // Devolver el token del vendedor junto con el token del administrador
    res.json({ token_vendedor: tokenVendedor, token_admin: tokenAdmin });

  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});
// Ruta para volver a la cuenta original del administrador
router.post('/volver_a_admin', authenticateToken, (req, res) => {
  try {
    // Obtener el token original del administrador del cuerpo de la solicitud
    const { token_admin } = req.body;

    // Verificar el token del administrador con la clave secreta
    jwt.verify(token_admin, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
      }

      // Verificar si el usuario es un administrador
      if (user.rol !== 'administrador') {
        return res.status(403).json({ error: 'Solo los administradores pueden volver a su cuenta original.' });
      }

      // Generar un nuevo token con los datos originales del administrador
      const newToken = jwt.sign({
        id: user.id,
        correo: user.correo,
        rol: user.rol,
        verificado: user.verificado,
        nombres_apellidos: user.nombres_apellidos,
        celular:user.celular
      }, process.env.JWT_SECRET, { expiresIn: '20y' });

      // Responder con el nuevo token del administrador
      res.json({ token: newToken });
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Editar correo del usuario
router.put('/editar-correo', authenticateToken, async (req, res) => {
  const { correo } = req.body;
  const userId = req.user.id; // Obtener el ID del usuario desde el token

  try {
    // Verificar si ya existe un usuario con el nuevo correo
    const existingUser = await Usuario.findOne({ where: { correo } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo ya está en uso por otro usuario' });
    }

    // Actualizar el correo del usuario
    const user = await Usuario.findByPk(userId);
    user.correo_antiguo = user.correo;  // Guardar correo anterior si deseas un registro
    user.correo = correo;
    await user.save();

    // Generar un nuevo token
    const tokenPayload = {
      id: user.id,
      correo: user.correo || "",
      nombre_tienda: user.nombre_tienda || "",
      rol: user.rol,
      verificado: user.verificado,
      nombres_apellidos: user.nombres_apellidos || "",
      celular: user.celular || ""
    };
    const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET);
     // Eliminar todas las sesiones anteriores excepto la actual
     await Session.destroy({
      where: {
        userId: userId
      }
    });

    // Guardar la nueva sesión con el token actual
    await Session.create({
      userId: userId,
      token: newToken
    });

    res.json({ message: 'Correo actualizado exitosamente', token: newToken });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el correo' });
  }
});

router.put('/editar-contrasenia', authenticateToken, async (req, res) => {
  const { nueva_contrasenia } = req.body;
  const userId = req.user.id; // Obtener el ID del usuario desde el token

  try {
    // Buscar al usuario por su ID
    const user = await Usuario.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(nueva_contrasenia, 10);

    // Actualizar la contraseña
    user.contrasenia = hashedPassword;
    await user.save();

    // Generar un nuevo token
    const tokenPayload = {
      id: user.id,
      correo: user.correo || "",
      nombre_tienda: user.nombre_tienda,
      rol: user.rol,
      verificado: user.verificado,
      nombres_apellidos: user.nombres_apellidos || "",
      celular: user.celular || ""
    };
    const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Eliminar todas las sesiones anteriores excepto la actual
    await Session.destroy({
      where: {
        userId: userId
      }
    });

    // Guardar la nueva sesión con el token actual
    await Session.create({
      userId: userId,
      token: newToken
    });

    res.json({ message: 'Contraseña actualizada exitosamente', token: newToken });
  } catch (error) {
    console.error('Error al actualizar la contraseña:', error);
    res.status(500).json({ error: 'Error al actualizar la contraseña' });
  }
});

router.put('/cerrar-sesiones', authenticateToken, async (req, res) => {
  const userId = req.user.id; // Obtener el ID del usuario desde el token
  const currentToken = req.headers.authorization?.split(' ')[1]; // Obtener el token actual del encabezado
  console.error('El token actual es', currentToken);


  try {
    // Buscar todas las sesiones del usuario
    const sessions = await Session.findAll({
      where: {
        userId: userId
      }
    });

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ error: 'No se encontraron sesiones activas para este usuario.' });
    }

    // Filtrar las sesiones para eliminar todas menos la actual
    const sessionsToDelete = sessions.filter(session => session.token !== currentToken);

    // Eliminar las sesiones filtradas
    await Session.destroy({
      where: {
        id: sessionsToDelete.map(session => session.id)
      }
    });

    res.json({ message: 'Sesiones cerradas exitosamente, excepto la actual.' });
  } catch (error) {
    console.error('Error al cerrar las sesiones:', error);
    res.status(500).json({ error: 'Error al cerrar las sesiones.' });
  }
});

router.get('/usuario/estado', authenticateToken, async (req, res) => {
  const usuarioId = req.user.id;
  console.log("Impreme el usuarioId", usuarioId);
  try {
    const usuario = await Usuario.findByPk(usuarioId);
    console.log("Impreme el nombre", usuario.celular);

    if (usuario) {
      res.json({ activo: usuario.activo });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el estado del usuario' });
  }
});

const { sendEmail } = require('../utils/email'); // Asegúrate de que la ruta sea correcta


// Ruta para la recuperación de contraseña
router.post('/recuperar-contrasenia', async (req, res) => {
  const { correo } = req.body;

  try {
    // Verificar si el usuario existe
    const usuario = await Usuario.findOne({ where: { correo } });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (!usuario.activo) {
      return res.status(404).json({ error: 'Usuario no activo' });
    }

    // Generar un código de verificación (ejemplo aleatorio de 4 dígitos)
    const codigoVerificacion = Math.floor(1000 + Math.random() * 9000);
    const fechaCodigo = new Date();

    // Guardar el código de verificación y la fecha de expiración
    usuario.codigoVerificacion = codigoVerificacion;
    usuario.fechaCodigo = fechaCodigo;
    await usuario.save();

    // Enviar el código al correo del usuario
    await sendEmail(correo, 'Código de verificación', `Tu código de verificación es: ${codigoVerificacion}`);

    res.json({ message: 'Código de verificación enviado al correo' });
  } catch (error) {
    console.error('Error al enviar el código de verificación:', error);
    res.status(500).json({ error: 'Error al enviar el código de verificación' });
  }
});

// Ruta para confirmar el código y actualizar la contraseña
router.put('/recuperar-contrasenia-confirmar', async (req, res) => {
  const { correo, codigoVerificacion, nueva_contrasenia } = req.body;

  try {
    // Verificar si el usuario existe
    const usuario = await Usuario.findOne({ where: { correo } });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el código es correcto y no ha expirado
    const ahora = new Date();
    const tiempoExpiracion = 15 * 60 * 1000; // 15 minutos en milisegundos
    const tiempoPasado = ahora - new Date(usuario.fechaCodigo);

    if (usuario.codigoVerificacion !== parseInt(codigoVerificacion) || tiempoPasado > tiempoExpiracion) {
      return res.status(400).json({ error: 'El código es incorrecto o ha expirado' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(nueva_contrasenia, 10);

    // Actualizar la contraseña
    usuario.contrasenia = hashedPassword;
    await usuario.save();

    // Eliminar todas las sesiones anteriores del usuario
    await Session.destroy({
      where: {
        userId: usuario.id
      }
    });

    // Generar un nuevo token
    const tokenPayload = {
      id: usuario.id,
      correo: usuario.correo || "",
      nombre_tienda: usuario.nombre_tienda,
      rol: usuario.rol,
      verificado: usuario.verificado,
      nombres_apellidos: usuario.nombres_apellidos || "",
      celular: usuario.celular || ""
    };
    const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Guardar la nueva sesión con el nuevo token
    await Session.create({
      userId: usuario.id,
      token: newToken
    });

    res.json({ message: 'Contraseña actualizada exitosamente', token: newToken });
  } catch (error) {
    console.error('Error al recuperar la contraseña:', error);
    res.status(500).json({ error: 'Error al recuperar la contraseña' });
  }
});



const RECAPTCHA_SECRET_KEY = '6Leq_IkqAAAAAPCmHX_k4_Mvbb4AW6IQ5gAxq_im';



router.post('/validar-recaptcha', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Token faltante' });
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      {},
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        },
        timeout: 5000, // Tiempo máximo de 5 segundos
      }
    );

    const data = response.data;
    console.log("DATA",data);

    if (data.success) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: 'Token inválido o caducado.' });
    }
  } catch (error) {
    console.error('Error al validar reCAPTCHA:', error);
    // Puedes detectar si es por timeout y enviar un mensaje específico
    if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
      return res.status(500).json({ success: false, error: 'La validación de reCAPTCHA demoró demasiado. Inténtalo de nuevo.' });
    }
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});





module.exports = router;
