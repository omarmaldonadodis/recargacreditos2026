const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

function authenticateToken(req, res, next) {
  // Obtener el encabezado de autorización
  const authHeader = req.headers['authorization'];
  console.log('Authorization Header:', authHeader); // Log para verificar el encabezado

  // Verificar si hay un token en el encabezado
  const token = authHeader && authHeader.split(' ')[1];
  if (!authHeader) {
    console.log('No Authorization header present.');
    return res.status(401).json({ error: 'No se proporcionó un token' });
  }

  if (token == null) {
    console.log('Token is null.');
    return res.status(401).json({ error: 'No se proporcionó un token válido' });
  }

  // Verificar el token usando la clave secreta
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });

    // Verificar si el token está en la tabla de sesiones activas
    const session = await Session.findOne({ where: { token } });
    if (!session) return res.status(403).json({ error: 'Sesión no válida o expirada' });

    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
