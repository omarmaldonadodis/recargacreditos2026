// backend/services/whatsapp/index.js
const BaileysProvider = require('./BaileysProvider');
const TwilioProvider = require('./TwilioProvider');
const WhapiProvider = require('./WhapiProvider');

/**
 * Factory que retorna el proveedor de WhatsApp configurado
 */
function createWhatsAppProvider() {
  const enabled = process.env.WHATSAPP_ENABLED !== 'false';
  
  if (!enabled) {
    console.log('⚠️ WhatsApp está desactivado en .env');
    throw new Error('WhatsApp está desactivado');
  }

  const provider = process.env.WHATSAPP_PROVIDER || 'whapi';

  console.log(`📱 Configurando proveedor de WhatsApp: ${provider.toUpperCase()}`);

  switch (provider.toLowerCase()) {
    case 'whapi':
      return new WhapiProvider(
        process.env.WHAPI_API_TOKEN,
        process.env.WHAPI_CHANNEL_ID // Opcional
      );

    case 'twilio':
      return new TwilioProvider(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
        process.env.TWILIO_WHATSAPP_NUMBER
      );

    case 'baileys':
      return new BaileysProvider();

    default:
      console.warn(`⚠️ Proveedor desconocido: ${provider}. Usando Whapi como predeterminado.`);
      return new WhapiProvider(
        process.env.WHAPI_API_TOKEN,
        process.env.WHAPI_CHANNEL_ID
      );
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