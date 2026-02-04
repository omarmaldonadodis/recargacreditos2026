// backend/scripts/testTwilio.js
require('dotenv').config();
const twilio = require('twilio');

async function testTwilio() {
  console.log('🧪 Test de Twilio WhatsApp\n');
  console.log('========================================\n');

  // Verificar configuración
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !whatsappNumber) {
    console.error('❌ ERROR: Faltan credenciales de Twilio en .env\n');
    console.log('Asegúrate de tener:');
    console.log('  - TWILIO_ACCOUNT_SID');
    console.log('  - TWILIO_AUTH_TOKEN');
    console.log('  - TWILIO_WHATSAPP_NUMBER\n');
    process.exit(1);
  }

  console.log('✅ Credenciales encontradas');
  console.log(`   Account SID: ${accountSid.substring(0, 10)}...`);
  console.log(`   WhatsApp Number: ${whatsappNumber}\n`);

  // ============================================
  // ⚠️ CAMBIA ESTE NÚMERO POR EL TUYO
  // ============================================
  const tuNumero = '+593994756205'; // <-- TU NÚMERO AQUÍ
  // ============================================

  const client = twilio(accountSid, authToken);

  try {
    console.log(`📱 Enviando mensaje de prueba a: ${tuNumero}...\n`);

    const mensaje = `🎉 *Test de Twilio*\n\nSi recibes este mensaje, ¡Twilio está funcionando perfectamente!\n\n✅ Sistema de notificaciones ACTIVO\n\nFecha: ${new Date().toLocaleString('es-EC')}`;

    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:${tuNumero}`,
      body: mensaje
    });

    console.log('✅ ¡MENSAJE ENVIADO CON ÉXITO!\n');
    console.log('📊 Detalles:');
    console.log(`   SID: ${message.sid}`);
    console.log(`   Estado: ${message.status}`);
    console.log(`   Precio: ${message.price || 'Gratis (Sandbox)'}`);
    console.log(`   Dirección: ${message.direction}\n`);

    console.log('💡 Verifica tu WhatsApp en unos segundos\n');
    console.log('📱 Si NO te llega, verifica:');
    console.log('   1. Que tu número esté registrado en el sandbox');
    console.log('   2. Que hayas enviado "join xxx" al número de Twilio');
    console.log('   3. Ver logs en: https://console.twilio.com/us1/monitor/logs/sms\n');

  } catch (error) {
    console.error('❌ ERROR al enviar mensaje:\n');
    console.error(`   Código: ${error.code}`);
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Más info: ${error.moreInfo}\n`);

    if (error.code === 63007) {
      console.log('💡 SOLUCIÓN: Tu número NO está registrado en el sandbox');
      console.log('   1. Ve a: https://console.twilio.com/');
      console.log('   2. Messaging → Try it out → Send a WhatsApp message');
      console.log('   3. Envía el mensaje "join xxx" desde tu WhatsApp\n');
    }
  }
}

testTwilio();