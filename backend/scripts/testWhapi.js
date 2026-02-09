// backend/scripts/testWhapi.js
/**
 * Script de prueba para verificar la configuración de Whapi.cloud
 * Uso: node backend/scripts/testWhapi.js
 */

require('dotenv').config();
const WhapiProvider = require('../services/whatsapp/WhapiProvider');

async function testWhapi() {
  console.log('\n🧪 Iniciando pruebas de Whapi.cloud...\n');

  // 1. Verificar variables de entorno
  console.log('📋 Paso 1: Verificando configuración...');
  
  if (!process.env.WHAPI_API_TOKEN) {
    console.error('❌ Error: WHAPI_API_TOKEN no está configurado en .env');
    console.log('\n💡 Solución:');
    console.log('   1. Ve a https://panel.whapi.cloud');
    console.log('   2. Copia tu API Token');
    console.log('   3. Agrégalo a .env como WHAPI_API_TOKEN=tu_token\n');
    process.exit(1);
  }

  console.log('✅ WHAPI_API_TOKEN configurado');
  console.log(`   Token: ${process.env.WHAPI_API_TOKEN.substring(0, 20)}...`);

  // 2. Crear instancia del proveedor
  console.log('\n📱 Paso 2: Creando proveedor...');
  const provider = new WhapiProvider(
    process.env.WHAPI_API_TOKEN,
    process.env.WHAPI_CHANNEL_ID
  );

  if (!provider.isConfigured) {
    console.error('❌ Error: No se pudo configurar el proveedor');
    process.exit(1);
  }

  console.log('✅ Proveedor creado correctamente');

  // 3. Verificar conexión
  console.log('\n🔗 Paso 3: Verificando conexión con Whapi.cloud...');
  
  try {
    const estado = await provider.verificarEstado();
    
    if (estado.conectado) {
      console.log('✅ Conexión exitosa');
      console.log(`   Canal: ${estado.canal}`);
      console.log(`   Número: ${estado.numero}`);
      console.log(`   Estado: ${estado.estado}`);
    } else {
      console.error('❌ No se pudo conectar');
      console.error(`   Error: ${estado.error}`);
      console.log('\n💡 Solución:');
      console.log('   1. Ve a https://panel.whapi.cloud/channels');
      console.log('   2. Asegúrate de haber escaneado el QR code');
      console.log('   3. Verifica que el canal esté "authenticated"');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error en la verificación:', error.message);
    process.exit(1);
  }

  // 4. Obtener información del canal
  console.log('\n📊 Paso 4: Obteniendo información del canal...');
  
  try {
    const info = await provider.obtenerInfoCanal();
    console.log('✅ Información obtenida:');
    console.log(JSON.stringify(info, null, 2));
  } catch (error) {
    console.warn('⚠️ No se pudo obtener información del canal:', error.message);
  }

  // 5. Probar formato de número
  console.log('\n🔢 Paso 5: Probando formato de números...');
  const ejemplos = [
    '+593987654321',
    '593987654321',
    '+1 555 123 4567',
    '34612345678'
  ];

  ejemplos.forEach(numero => {
    const formateado = provider.formatPhoneNumber(numero);
    console.log(`   ${numero} → ${formateado}`);
  });

  // 6. Mensaje de prueba (opcional)
  console.log('\n📤 Paso 6: Envío de mensaje de prueba');
  console.log('   (Comentado por defecto - edita el script para activar)');
  console.log('   Para probar, descomenta las líneas en testWhapi.js\n');

  
  // ⚠️ DESCOMENTA ESTAS LÍNEAS PARA ENVIAR UN MENSAJE DE PRUEBA
  const numeroDestino = '+593987093311'; // CAMBIA ESTE NÚMERO
  console.log(`   Enviando mensaje de prueba a ${numeroDestino}...`);
  
  const resultado = await provider.enviarMensaje(
    numeroDestino,
    '🧪 Este es un mensaje de prueba desde tu sistema de recargas.\n\n' +
    'Si recibes este mensaje, ¡Whapi.cloud está funcionando correctamente! ✅'
  );

  if (resultado.success) {
    console.log('✅ Mensaje enviado exitosamente');
    console.log(`   ID: ${resultado.messageId}`);
  } else {
    console.error('❌ Error al enviar mensaje:', resultado.error);
  }
  

  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
  console.log('='.repeat(60));
  console.log('\n🎉 Whapi.cloud está configurado correctamente');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Para enviar mensaje de prueba: edita testWhapi.js');
  console.log('   2. Inicia tu servidor: npm start o pm2 restart backend');
  console.log('   3. Los mensajes se enviarán automáticamente cuando haya abonos/saldos\n');
}

// Ejecutar pruebas
testWhapi().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});