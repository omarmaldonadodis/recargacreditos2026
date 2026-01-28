// backend/scripts/registrar-saldo-inicial.js
const sequelize = require('../config/database');
const IncrementoSaldo = require('../models/IncrementoSaldo');
const ConfiguracionSistema = require('../models/ConfiguracionSistema');

async function iniciarContabilidad() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🚀 Registrando saldo inicial para contabilidad...\n');
    
    const fechaInicio = new Date();
    
    // ============================================
    // GENERAL (2611)
    // ============================================
    console.log('💰 GENERAL (2611)...');
    
    const saldoInicialGeneral = 46373.50; // ⬅️ TU SALDO ACTUAL
    
    const incrementoGeneral = await IncrementoSaldo.create({
      saldoAnterior: 0, // ⬅️ Empezamos desde 0
      saldoNuevo: saldoInicialGeneral, // ⬅️ El saldo que tienes ahora
      diferencia: saldoInicialGeneral, // ⬅️ Todo es incremento inicial
      tipoIncremento: 'deposito_inicial',
      proveedor: 'general',
      operadora: 'Sistema',
      fecha: fechaInicio,
      estado: 'pendiente', // ⬅️ PENDIENTE para asignación manual
      RecargaId: null, // No vinculado a ninguna recarga
      notas: `💰 SALDO INICIAL DEL SISTEMA
Saldo actual: $${saldoInicialGeneral.toFixed(2)}
Este es el punto de partida de la contabilidad.
Pendiente de asignar depósitos manualmente desde la interfaz.`
    }, { transaction });
    
    console.log(`   ✅ Incremento inicial creado (ID: ${incrementoGeneral.id})`);
    console.log(`   📊 Saldo inicial: $${saldoInicialGeneral.toFixed(2)}`);
    console.log(`   ⏳ Estado: PENDIENTE (requiere asignación manual)\n`);
    
    // ============================================
    // MOVISTAR (2612)
    // ============================================
    console.log('💰 MOVISTAR (2612)...');
    
    const saldoInicialMovistar = 21254.83; // ⬅️ TU SALDO ACTUAL
    
    const incrementoMovistar = await IncrementoSaldo.create({
      saldoAnterior: 0, // ⬅️ Empezamos desde 0
      saldoNuevo: saldoInicialMovistar, // ⬅️ El saldo que tienes ahora
      diferencia: saldoInicialMovistar, // ⬅️ Todo es incremento inicial
      tipoIncremento: 'deposito_inicial',
      proveedor: 'movistar',
      operadora: 'Sistema',
      fecha: fechaInicio,
      estado: 'pendiente', // ⬅️ PENDIENTE para asignación manual
      RecargaId: null,
      comisionAcumulada: 0,
      cantidadRecargasComision: 0,
      notas: `💰 SALDO INICIAL DEL SISTEMA
Saldo actual: $${saldoInicialMovistar.toFixed(2)}
Este es el punto de partida de la contabilidad.
Pendiente de asignar depósitos manualmente desde la interfaz.
La ganancia vendrá de las comisiones futuras.`
    }, { transaction });
    
    console.log(`   ✅ Incremento inicial creado (ID: ${incrementoMovistar.id})`);
    console.log(`   📊 Saldo inicial: $${saldoInicialMovistar.toFixed(2)}`);
    console.log(`   ⏳ Estado: PENDIENTE (requiere asignación manual)\n`);
    
    // ============================================
    // GUARDAR FECHA DE INICIO
    // ============================================
    await ConfiguracionSistema.findOrCreate({
      where: { clave: 'fecha_inicio_contabilidad' },
      defaults: {
        valor: fechaInicio.toISOString(),
        descripcion: 'Fecha desde la cual se inicia el sistema de contabilidad'
      },
      transaction
    });
    
    await ConfiguracionSistema.findOrCreate({
      where: { clave: 'saldo_inicial_general' },
      defaults: {
        valor: saldoInicialGeneral.toString(),
        descripcion: 'Saldo inicial de General registrado en el sistema'
      },
      transaction
    });
    
    await ConfiguracionSistema.findOrCreate({
      where: { clave: 'saldo_inicial_movistar' },
      defaults: {
        valor: saldoInicialMovistar.toString(),
        descripcion: 'Saldo inicial de Movistar registrado en el sistema'
      },
      transaction
    });
    
    await transaction.commit();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 ¡SALDOS INICIALES REGISTRADOS!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 RESUMEN:');
    console.log(`   • General: $${saldoInicialGeneral.toLocaleString()}`);
    console.log(`   • Movistar: $${saldoInicialMovistar.toLocaleString()}`);
    console.log(`   • Fecha: ${fechaInicio.toLocaleString()}\n`);
    
    console.log('📋 PRÓXIMOS PASOS EN LA INTERFAZ:\n');
    
    console.log('1️⃣  ABRIR MODAL DE CONTABILIDAD');
    console.log('   • Click en el saldo de General o Movistar en el navbar\n');
    
    console.log('2️⃣  VER INCREMENTOS PENDIENTES (Tab "📋 Incrementos")');
    console.log(`   • General: $${saldoInicialGeneral.toLocaleString()} - PENDIENTE`);
    console.log(`   • Movistar: $${saldoInicialMovistar.toLocaleString()} - PENDIENTE\n`);
    
    console.log('3️⃣  REGISTRAR DEPÓSITOS (Tab "💵 Depósitos")');
    console.log('   Ejemplo para General:');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │ Monto: 45000                            │');
    console.log('   │ Usuario: Juan Pérez - Vendedor          │');
    console.log('   │ Tipo: Efectivo                          │');
    console.log('   │ Referencia: DEP-INIT-001                │');
    console.log('   │ Notas: Depósito inicial General         │');
    console.log('   │ [Registrar Depósito]                    │');
    console.log('   └─────────────────────────────────────────┘\n');
    
    console.log('   💡 Puedes registrar varios depósitos de diferentes usuarios');
    console.log('   💡 La suma de depósitos puede ser menor que el saldo');
    console.log('   💡 La diferencia será la ganancia del proveedor\n');
    
    console.log('4️⃣  ASIGNAR DEPÓSITOS AL INCREMENTO (Tab "🔗 Asignar")');
    console.log('   • Selecciona el incremento pendiente');
    console.log('   • Marca los depósitos que quieres asignar');
    console.log('   • El sistema calculará la ganancia automáticamente');
    console.log('   • Click en "Confirmar Asignación"\n');
    
    console.log('5️⃣  VERIFICAR EN REPORTES (Tab "📊 Reportes")');
    console.log('   • Verás el saldo inicial');
    console.log('   • Total depositado por cada usuario');
    console.log('   • Ganancia calculada\n');
    
    console.log('✅ A partir de ahora:');
    console.log('   • Todas las recargas nuevas se contarán');
    console.log('   • Los incrementos futuros se detectarán automáticamente');
    console.log('   • Las comisiones de Movistar se acumularán\n');
    
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error:', error);
    console.error('\n💡 Si el error es "Duplicate entry", significa que');
    console.error('   ya ejecutaste este script antes. Puedes:');
    console.error('   1. Verificar los incrementos en la interfaz');
    console.error('   2. O eliminarlos desde MySQL y volver a ejecutar\n');
    process.exit(1);
  }
}

// Ejecutar
iniciarContabilidad();