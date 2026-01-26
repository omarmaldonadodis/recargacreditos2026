// backend/routes/alertas.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const alertasService = require('../services/alertasService');

// Middleware admin
const soloAdmin = (req, res, next) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
};

/**
 * GET /api/alertas
 * Obtener todas las alertas activas
 */
router.get('/', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const alertas = await alertasService.obtenerAlertasActivas();
    
    res.json({
      total: alertas.length,
      alertas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alertas/estadisticas
 * Obtener estadísticas de alertas
 */
router.get('/estadisticas', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const stats = await alertasService.obtenerEstadisticas();
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alertas/resumen
 * Resumen rápido de alertas críticas
 */
router.get('/resumen', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const alertas = await alertasService.obtenerAlertasActivas();
    const alertasCriticas = alertas.filter(a => a.urgencia === 'alta');
    
    res.json({
      total: alertas.length,
      criticas: alertasCriticas.length,
      resumen: alertasCriticas.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alertas/:tipo/:id/vista
 * Marcar alerta como vista
 */
router.post('/:tipo/:id/vista', authenticateToken, soloAdmin, async (req, res) => {
  try {
    const { tipo, id } = req.params;
    
    const resultado = await alertasService.marcarComoVista(tipo, id);
    
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;