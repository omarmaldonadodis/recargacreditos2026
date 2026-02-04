// backend/index.js
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

// ============= IMPORTAR TODOS LOS MODELOS =============
const Usuario = require('./models/Usuario');
const Tienda = require('./models/Tienda');
const Recarga = require('./models/Recarga');
const Saldo = require('./models/Saldo');
const Session = require('./models/Session');
const TipoRecarga = require('./models/TipoRecarga');
const PagVendedor = require('./models/PagVendedor');

// MODELOS DE CONTABILIDAD
const Deposito = require('./models/Deposito');
const IncrementoSaldo = require('./models/IncrementoSaldo');
const AsignacionDeposito = require('./models/AsignacionDeposito');
const ConfiguracionSistema = require('./models/ConfiguracionSistema');
const SaldoProveedor = require('./models/SaldoProveedor');
const AjusteSaldo = require('./models/AjusteSaldo');

const alertasRoutes = require('./routes/alertas');


// ============= CONFIGURAR RELACIONES =============
// Relaciones Usuario
Usuario.hasMany(Tienda, { foreignKey: 'UsuarioId' });
Tienda.belongsTo(Usuario, { foreignKey: 'UsuarioId' });

Usuario.hasMany(Deposito, { foreignKey: 'UsuarioId' });
Deposito.belongsTo(Usuario, { foreignKey: 'UsuarioId' });

// Relaciones Tienda
Tienda.hasMany(Recarga, { foreignKey: 'TiendaId' });
Recarga.belongsTo(Tienda, { foreignKey: 'TiendaId' });

// Relaciones Recarga
Recarga.hasMany(IncrementoSaldo, { foreignKey: 'RecargaId' });
IncrementoSaldo.belongsTo(Recarga, { foreignKey: 'RecargaId' });

Recarga.hasMany(SaldoProveedor, { foreignKey: 'RecargaId' });
SaldoProveedor.belongsTo(Recarga, { foreignKey: 'RecargaId' });

// Relaciones IncrementoSaldo
IncrementoSaldo.belongsToMany(Deposito, { 
  through: AsignacionDeposito,
  as: 'depositos',
  foreignKey: 'IncrementoSaldoId'
});

Deposito.belongsToMany(IncrementoSaldo, { 
  through: AsignacionDeposito,
  as: 'incrementos',
  foreignKey: 'DepositoId'
});

IncrementoSaldo.belongsTo(Deposito, {
  as: 'depositoAsignado',
  foreignKey: 'DepositoId'
});

IncrementoSaldo.belongsTo(Usuario, {
  as: 'verificador',
  foreignKey: 'verificadoPor'
});

IncrementoSaldo.hasMany(SaldoProveedor, { foreignKey: 'IncrementoSaldoId' });
SaldoProveedor.belongsTo(IncrementoSaldo, { foreignKey: 'IncrementoSaldoId' });

// Relaciones AjusteSaldo
AjusteSaldo.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuarioId'
});

AjusteSaldo.belongsTo(Usuario, {
  as: 'aprobador',
  foreignKey: 'aprobadoPor'
});

// ============= IMPORTAR RUTAS =============
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const tiendaRoutes = require('./routes/tiendas');
const incrementosRoutes = require('./routes/incrementos');
const contabilidadRoutes = require('./routes/contabilidad');

const whatsappService = require('./services/whatsappService');


require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ============= MONTAR RUTAS =============
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tiendas', tiendaRoutes);
app.use('/api/incrementos', incrementosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/contabilidad', contabilidadRoutes);

// ============= HEALTH CHECK =============
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    modelos_activos: Object.keys(sequelize.models).length
  });
});

// ============= INICIALIZAR SERVIDOR =============

sequelize.sync({ alter: true }).then(async () => {
  console.log('✅ Base de datos sincronizada');
  console.log('\n📦 Modelos registrados:');
  console.log('   - Usuario');
  console.log('   - Tienda');
  console.log('   - Recarga');
  console.log('   - Saldo');
  console.log('   - Session');
  console.log('   - TipoRecarga');
  console.log('   - PagVendedor');
  console.log('   - Deposito');
  console.log('   - IncrementoSaldo');
  console.log('   - AsignacionDeposito');
  console.log('   - ConfiguracionSistema');
  console.log('   - SaldoProveedor ✨');
  console.log('   - AjusteSaldo ✨');
  
  // Inicializar configuración por defecto
  await inicializarConfiguracion();
  
  // Iniciar sistema de alertas
  iniciarSistemaAlertas();

    // ===== INICIALIZAR WHATSAPP =====
    // ===== INICIALIZAR WHATSAPP (OPCIONAL) =====
    const whatsappEnabled = process.env.WHATSAPP_ENABLED !== 'false';

    if (whatsappEnabled) {
      console.log('\n📱 Inicializando servicio de WhatsApp...');
      whatsappService.getProvider().catch(err => {
        console.error('⚠️ WhatsApp falló al inicializar:', err.message);
        console.log('💡 El sistema continuará sin notificaciones de WhatsApp\n');
      });
    } else {
      console.log('\n📱 WhatsApp DESACTIVADO (configuración)\n');
    }
  
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor corriendo en el puerto ${PORT}`);
    console.log(`📊 Sistema de contabilidad ACTIVO`);
    console.log(`🔔 Sistema de alertas ACTIVO`);
  });


}).catch(err => {
  console.error('❌ Error al sincronizar la base de datos:', err);
  process.exit(1);
});

// ============= FUNCIONES DE INICIALIZACIÓN =============

/**
 * Inicializar configuración del sistema
 */
async function inicializarConfiguracion() {
  try {
    const configs = [
      {
        clave: 'deteccion_incrementos_habilitada',
        valor: 'true',
        descripcion: 'Detección automática de incrementos de saldo'
      },
      {
        clave: 'alertas_incrementos_habilitadas',
        valor: 'true',
        descripcion: 'Alertas de nuevos incrementos detectados'
      },
      {
        clave: 'umbral_alerta_general',
        valor: '50',
        descripcion: 'Umbral mínimo para alertar incremento General (en dólares)'
      },
      {
        clave: 'umbral_alerta_movistar',
        valor: '20',
        descripcion: 'Umbral mínimo para alertar incremento Movistar (en dólares)'
      },
      {
        clave: 'verificacion_saldo_automatica',
        valor: 'true',
        descripcion: 'Verificación automática de saldos cada hora'
      }
    ];
    
    for (const config of configs) {
      await ConfiguracionSistema.findOrCreate({
        where: { clave: config.clave },
        defaults: config
      });
    }
    
    console.log('⚙️  Configuración del sistema inicializada');
  } catch (error) {
    console.error('Error inicializando configuración:', error);
  }
}

/**
 * Sistema de alertas para incrementos pendientes
 */
function iniciarSistemaAlertas() {
  const { Op } = require('sequelize');
  
  // Verificar incrementos pendientes cada 5 minutos
  setInterval(async () => {
    try {
      const alertasConfig = await ConfiguracionSistema.findOne({
        where: { clave: 'alertas_incrementos_habilitadas' }
      });
      
      if (alertasConfig && alertasConfig.valor === 'true') {
        await verificarIncrementosPendientes();
      }
    } catch (error) {
      console.error('Error en sistema de alertas:', error);
    }
  }, 5 * 60 * 1000); // 5 minutos
  
  // Verificación de consistencia de saldos cada hora
  setInterval(async () => {
    try {
      const verificacionConfig = await ConfiguracionSistema.findOne({
        where: { clave: 'verificacion_saldo_automatica' }
      });
      
      if (verificacionConfig && verificacionConfig.valor === 'true') {
        await verificarConsistenciaSaldos();
      }
    } catch (error) {
      console.error('Error verificando consistencia:', error);
    }
  }, 60 * 60 * 1000); // 1 hora
  
  console.log('🔔 Sistema de alertas iniciado (verificación cada 5 min)');
}

/**
 * Verificar incrementos pendientes y enviar alertas
 */
async function verificarIncrementosPendientes() {
  const { Op } = require('sequelize');
  
  try {
    const incrementosPendientes = await IncrementoSaldo.findAll({
      where: { estado: 'pendiente' },
      include: [{
        model: Recarga,
        attributes: ['id', 'folio', 'operadora', 'fecha']
      }],
      order: [['fecha', 'DESC']],
      limit: 10
    });
    
    if (incrementosPendientes.length > 0) {
      console.log(`\n🔔 ¡ALERTA! ${incrementosPendientes.length} incremento(s) pendiente(s) de asignar:`);
      
      for (const incremento of incrementosPendientes) {
        const tiempoTranscurrido = calcularTiempoTranscurrido(incremento.fecha);
        const urgencia = tiempoTranscurrido > 24 ? '🔴 URGENTE' : 
                        tiempoTranscurrido > 12 ? '🟡 PRIORIDAD' : '🟢 RECIENTE';
        
        console.log(`   ${urgencia} | ${incremento.proveedor.toUpperCase()} | $${parseFloat(incremento.diferencia).toFixed(2)} | ${incremento.tipoIncremento} | Hace ${tiempoTranscurrido}h`);
      }
      
      // Aquí puedes agregar integración con:
      // - Telegram
      // - Email
      // - Slack
      // - Webhooks
      // await enviarAlertaTelegram(incrementosPendientes);
    }
  } catch (error) {
    console.error('Error verificando incrementos pendientes:', error);
  }
}

/**
 * Verificar consistencia de saldos automáticamente
 */
async function verificarConsistenciaSaldos() {
  try {
    const contabilidadService = require('./services/contabilidadService');
    
    for (const proveedor of ['general', 'movistar']) {
      const resultado = await contabilidadService.verificarConsistencia(proveedor);
      
      if (!resultado.consistente) {
        console.log(`\n⚠️  ADVERTENCIA: Inconsistencia detectada en ${proveedor.toUpperCase()}`);
        console.log(`   Saldo Registrado: $${resultado.saldoRegistrado}`);
        console.log(`   Saldo Esperado: $${resultado.saldoEsperado}`);
        console.log(`   Diferencia: $${resultado.diferencia}`);
        
        // Aquí puedes enviar alertas críticas
        // await enviarAlertaCritica(resultado);
      }
    }
  } catch (error) {
    console.error('Error verificando consistencia automática:', error);
  }
}

/**
 * Calcular tiempo transcurrido en horas
 */
function calcularTiempoTranscurrido(fecha) {
  const ahora = new Date();
  const fechaIncremento = new Date(fecha);
  const diffMs = ahora - fechaIncremento;
  return Math.floor(diffMs / (1000 * 60 * 60)); // horas
}

// ============= MANEJO DE ERRORES GLOBALES =============
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown


process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recibido, cerrando servidor...');
  await whatsappService.cerrar();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT recibido, cerrando servidor...');
  await whatsappService.cerrar();
  await sequelize.close();
  process.exit(0);
});

module.exports = app;