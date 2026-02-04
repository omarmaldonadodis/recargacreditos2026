// backend/services/whatsapp/index.js
const BaileysProvider = require('./BaileysProvider');
const TwilioProvider = require('./TwilioProvider');

/**
 * Factory que retorna el proveedor de WhatsApp configurado
 */
function createWhatsAppProvider() {
  const enabled = process.env.WHATSAPP_ENABLED !== 'false';
  
  if (!enabled) {
    console.log('⚠️ WhatsApp está desactivado en .env');
    throw new Error('WhatsApp está desactivado');
  }

  const provider = process.env.WHATSAPP_PROVIDER || 'baileys';

  console.log(`📱 Configurando proveedor de WhatsApp: ${provider.toUpperCase()}`);

  switch (provider.toLowerCase()) {
    case 'twilio':
      return new TwilioProvider(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
        process.env.TWILIO_WHATSAPP_NUMBER
      );

    case 'baileys':
    default:
      return new BaileysProvider();
  }
}

// Exportar instancia singleton
let providerInstance = null;

module.exports = {
  /**
   * Obtiene la instancia del proveedor (singleton)
   */
  getProvider: () => {
    if (!providerInstance) {
      providerInstance = createWhatsAppProvider();
    }
    return providerInstance;
  },

  /**
   * Reinicia el proveedor (útil para cambiar configuración)
   */
  resetProvider: async () => {
    if (providerInstance && providerInstance.cerrar) {
      await providerInstance.cerrar();
    }
    providerInstance = null;
  }
};