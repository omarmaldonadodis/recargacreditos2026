// backend/services/checkSaldoCero.js
const cron = require('node-cron');
const Tienda = require('../models/Tienda');
const Usuario = require('../models/Usuario');
const { Op } = require('sequelize');

function iniciarCronSaldoCero() {
  // Corre todos los días a las 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('[CRON] Revisando tiendas sin saldo por una semana...');
    try {
      const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const tiendas = await Tienda.findAll({
        where: {
          saldo: { [Op.lte]: 0 },
          fechaSaldoCero: { [Op.lte]: hace7Dias },
          notificadoSinSaldo: false
        },
        include: [{ model: Usuario, as: 'usuario', attributes: ['celular', 'nombre_tienda', 'activo'] }]
      });

      const whatsappService = require('./whatsappService');

      for (const tienda of tiendas) {
        if (!tienda.usuario?.activo) continue;
        try {
          await whatsappService.notificarSinSaldo(
            tienda.usuario.celular,
            tienda.usuario.nombre_tienda
          );
          tienda.notificadoSinSaldo = true;
          await tienda.save();
          console.log(`[CRON] Notificado sin saldo: ${tienda.usuario.nombre_tienda}`);
        } catch (err) {
          console.error(`[CRON] Error notificando ${tienda.usuario.nombre_tienda}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[CRON] Error en checkSaldoCero:', err.message);
    }
  });

  console.log('✅ Cron de saldo cero iniciado (diario 10:00 AM)');
}

module.exports = iniciarCronSaldoCero;