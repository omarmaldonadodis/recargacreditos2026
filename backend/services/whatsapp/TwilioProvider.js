// backend/services/whatsapp/TwilioProvider.js
const WhatsAppProvider = require('./WhatsAppProvider');

class TwilioProvider extends WhatsAppProvider {
  constructor(accountSid, authToken, whatsappNumber) {
    super();
    
    // Solo inicializar Twilio si tenemos las credenciales
    if (accountSid && authToken && whatsappNumber) {
      const twilio = require('twilio');
      this.client = twilio(accountSid, authToken);
      this.whatsappNumber = whatsappNumber; // Formato: 'whatsapp:+14155238886'
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      console.warn('⚠️ Twilio no está configurado. Faltan credenciales en .env');
    }
  }

  /**
   * Formatea número de teléfono para Twilio
   * Ejemplo: +593987654321 -> whatsapp:+593987654321
   */
  formatPhoneNumber(celular) {
    let formatted = celular.replace(/\s+/g, '');
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    return `whatsapp:${formatted}`;
  }

  /**
   * Envía un mensaje de WhatsApp usando Twilio
   */
  async enviarMensaje(numero, mensaje) {
    if (!this.isConfigured) {
      console.error('✗ Twilio no está configurado correctamente');
      return { 
        success: false, 
        error: 'Twilio no está configurado. Verifica las credenciales en .env',
        provider: 'twilio'
      };
    }

    try {
      const to = this.formatPhoneNumber(numero);
      
      const message = await this.client.messages.create({
        from: this.whatsappNumber,
        to: to,
        body: mensaje
      });

      console.log(`✓ WhatsApp enviado (Twilio) - SID: ${message.sid}`);
      
      return { 
        success: true, 
        sid: message.sid,
        provider: 'twilio'
      };

    } catch (error) {
      console.error('✗ Error enviando WhatsApp (Twilio):', error.message);
      
      return { 
        success: false, 
        error: error.message,
        provider: 'twilio'
      };
    }
  }

  /**
   * Twilio no requiere inicialización
   */
  async inicializar() {
    if (this.isConfigured) {
      console.log('✅ Twilio está listo para enviar mensajes');
    }
  }
}

module.exports = TwilioProvider;