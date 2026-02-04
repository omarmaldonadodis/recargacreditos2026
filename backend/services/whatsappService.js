// backend/services/whatsappService.js
const { getProvider } = require('./whatsapp');

class WhatsAppService {
  constructor() {
    this.provider = null;
    this.initialized = false;
    this.enabled = process.env.WHATSAPP_ENABLED !== 'false';
  }

  /**
   * Verifica si WhatsApp está habilitado
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Obtiene el proveedor configurado e inicializa si es necesario
   */
  async getProvider() {
    if (!this.enabled) {
      throw new Error('WhatsApp está desactivado en la configuración');
    }

    if (!this.provider) {
      this.provider = getProvider();
      
      if (!this.initialized) {
        await this.provider.inicializar();
        this.initialized = true;
      }
    }
    return this.provider;
  }

  /**
   * Envía notificación de abono
   */
  async notificarAbono(celular, valor, creditoRestante, nombreTienda) {
    // Si WhatsApp está desactivado, retornar silenciosamente
    if (!this.enabled) {
      return { 
        success: false, 
        error: 'WhatsApp desactivado',
        silent: true 
      };
    }

    try {
      const provider = await this.getProvider();
      const mensaje = provider.construirMensajeAbono(valor, creditoRestante, nombreTienda);
      
      return await provider.enviarMensaje(celular, mensaje);
    } catch (error) {
      console.error('Error en notificarAbono:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación de saldo
   */
  async notificarSaldo(celular, valor, saldoActual, nombreTienda) {
    // Si WhatsApp está desactivado, retornar silenciosamente
    if (!this.enabled) {
      return { 
        success: false, 
        error: 'WhatsApp desactivado',
        silent: true 
      };
    }

    try {
      const provider = await this.getProvider();
      const mensaje = provider.construirMensajeSaldo(valor, saldoActual, nombreTienda);
      
      return await provider.enviarMensaje(celular, mensaje);
    } catch (error) {
      console.error('Error en notificarSaldo:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cierra la conexión (útil al apagar el servidor)
   */
  async cerrar() {
    if (this.provider && this.provider.cerrar) {
      try {
        await this.provider.cerrar();
        this.provider = null;
        this.initialized = false;
      } catch (error) {
        console.error('Error cerrando WhatsApp:', error.message);
      }
    }
  }

  /**
   * Obtiene el estado de la conexión
   */
  async getEstado() {
    if (!this.enabled) {
      return { 
        enabled: false,
        message: 'WhatsApp está desactivado en la configuración' 
      };
    }

    try {
      const provider = await this.getProvider();
      
      if (provider.getEstado) {
        return { 
          enabled: true,
          ...provider.getEstado() 
        };
      }
      
      return { enabled: true, disponible: true };
    } catch (error) {
      return { 
        enabled: true,
        error: error.message 
      };
    }
  }
}

module.exports = new WhatsAppService();