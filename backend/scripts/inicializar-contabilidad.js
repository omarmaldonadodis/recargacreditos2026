// backend/scripts/inicializar-contabilidad-v2.js
const sequelize = require('../config/database');
const SaldoProveedor = require('../models/SaldoProveedor');
const ConfiguracionSistema = require('../models/ConfiguracionSistema');
const IncrementoSaldo = require('../models/IncrementoSaldo');

async function iniciarContabilidad() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🧹 PASO 1: Limpiando registros anteriores...\n');
    

    // Eliminar configuraciones previas
    await ConfiguracionSistema.destroy({
      where: {
        clave: [
          'fecha_inicio_contabilidad',
          'saldo_inicial_general',
          'saldo_inicial_movistar'
        ]
      },
      transaction
    });
    
    console.log('✅ Registros anteriores eliminados\n');
    
    console.log('🚀 PASO 2: Registrando punto de partida...\n');
    
    const fechaInicio = new Date();
    
    // ============================================
    // GENERAL (2611)
    // ============================================
    console.log('💰 GENERAL (2611)...');
    
    const saldoInicialGeneral = 46153.50; // ⬅️ TU SALDO ACTUAL
    
    // Registrar snapshot inicial (NO como incremento, solo como evento)
    await SaldoProveedor.create({
      proveedor: 'general',
      saldoAnterior: null,
      saldo: saldoInicialGeneral,
      diferencia: 0,
      tipoEvento: 'snapshot_inicial',
      detalles: {
        nota: 'Punto de partida del sistema de contabilidad',
        fecha: fechaInicio.toISOString()
      },
      fecha: fechaInicio,
      verificado: true
    }, { transaction });
    
    console.log(`   ✅ Snapshot inicial registrado: $${saldoInicialGeneral.toFixed(2)}`);
    
    // ============================================
    // MOVISTAR (2612)
    // ============================================
    console.log('\n💰 MOVISTAR (2612)...');
    
    const saldoInicialMovistar = 21254.83; // ⬅️ TU SALDO ACTUAL
    
    await SaldoProveedor.create({
      proveedor: 'movistar',
      saldoAnterior: null,
      saldo: saldoInicialMovistar,
      diferencia: 0,
      tipoEvento: 'snapshot_inicial',
      detalles: {
        nota: 'Punto de partida del sistema de contabilidad',
        fecha: fechaInicio.toISOString()
      },
      fecha: fechaInicio,
      verificado: true
    }, { transaction });
    
    console.log(`   ✅ Snapshot inicial registrado: $${saldoInicialMovistar.toFixed(2)}\n`);
    
    // ============================================
    // GUARDAR CONFIGURACIÓN
    // ============================================
    await ConfiguracionSistema.create({
      clave: 'fecha_inicio_contabilidad',
      valor: fechaInicio.toISOString(),
      descripcion: 'Fecha desde la cual se inicia el sistema de contabilidad'
    }, { transaction });
    
    await ConfiguracionSistema.create({
      clave: 'saldo_inicial_general',
      valor: saldoInicialGeneral.toString(),
      descripcion: 'Saldo inicial de General registrado en el sistema'
    }, { transaction });
    
    await ConfiguracionSistema.create({
      clave: 'saldo_inicial_movistar',
      valor: saldoInicialMovistar.toString(),
      descripcion: 'Saldo inicial de Movistar registrado en el sistema'
    }, { transaction });
    
    // Habilitar detección automática
    const [configDeteccion] = await ConfiguracionSistema.findOrCreate({
      where: { clave: 'deteccion_incrementos_habilitada' },
      defaults: {
        valor: 'true',
        descripcion: 'Detección automática de incrementos de saldo'
      },
      transaction
    });
    
    configDeteccion.valor = 'true';
    await configDeteccion.save({ transaction });
    
    await transaction.commit();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ¡SISTEMA DE CONTABILIDAD INICIALIZADO!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 PUNTO DE PARTIDA:');
    console.log(`   • General: $${saldoInicialGeneral.toLocaleString()}`);
    console.log(`   • Movistar: $${saldoInicialMovistar.toLocaleString()}`);
    console.log(`   • Fecha: ${fechaInicio.toLocaleString()}\n`);
    
    console.log('✅ SISTEMA CONFIGURADO:\n');
    console.log('   1. A partir de ahora, cada recarga se rastreará');
    console.log('   2. GENERAL: Se detectará cuando el saldo suba más de lo esperado');
    console.log('      Ejemplo: Recarga $10, saldo sube $11 → Detecta $1 de ganancia');
    console.log('   3. MOVISTAR: Se detectará la acumulación de comisiones');
    console.log('      Ejemplo: 100 recargas de $10 con comisión $1 c/u → Detecta $100');
    console.log('   4. Podrás registrar depósitos y asignarlos a incrementos\n');
    
    console.log('🔔 PRÓXIMAS ACCIONES:\n');
    console.log('   • Realiza recargas normalmente');
    console.log('   • El sistema detectará automáticamente incrementos');
    console.log('   • Registra tus depósitos en el modal de contabilidad');
    console.log('   • Asigna depósitos a los incrementos detectados');
    console.log('   • Consulta reportes de ganancias reales\n');
    
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
iniciarContabilidad();