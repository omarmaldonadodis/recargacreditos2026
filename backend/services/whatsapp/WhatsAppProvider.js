// backend/services/whatsapp/WhatsAppProvider.js

/**
 * Clase abstracta que define la interfaz para todos los proveedores de WhatsApp
 * Esto permite cambiar de proveedor sin modificar el código que usa el servicio
 */
class WhatsAppProvider {
  /**
   * Formatea número de teléfono
   * @param {string} celular - Número con código de país
   * @returns {string} Número formateado
   */
  formatPhoneNumber(celular) {
    throw new Error('Método formatPhoneNumber() debe ser implementado');
  }

  /**
   * Formatea montos con separador de miles
   * @param {number} monto - Cantidad a formatear
   * @returns {string} Monto formateado
   */
  formatMonto(monto) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(monto);
      
  }

  /**
   * Construye mensaje de abono
   * @param {number} valor - Monto abonado
   * @param {number} creditoRestante - Crédito pendiente
   * @param {string} nombreTienda - Nombre de la tienda
   * @returns {string} Mensaje formateado
   */
  construirMensajeAbono(valor, creditoRestante, nombreTienda) {
    const montoAbonado = this.formatMonto(valor);
    const esPositivo = valor > 0;
    if (creditoRestante <= 0) {
      return `🎉 *${nombreTienda}*\n\n` +
             `Abonaste ${montoAbonado}\n\n` +
             `✅ *¡No tienes deudas pendientes!*\n\n` +
             `Gracias por tu pago puntual.`;
    }
    if (esPositivo) {

      const montoPendiente = this.formatMonto(creditoRestante);
      return `📝 *${nombreTienda}*\n\n` +
            `Abonaste ${montoAbonado}\n\n` +
            `💰 Pendiente: ${montoPendiente}`;
    } else {
      const montoPendiente = this.formatMonto(creditoRestante);

      return `📝 *${nombreTienda}*\n\n` +
             `Se corrigió el abono y agregó ${montoAbonado} a tu crédito pendiente.\n\n` +
              `💰 Pendiente: ${montoPendiente}\n\n`+

             `Por favor, realiza un nuevo abono para reducir tu deuda.`;
    }
  }

  /**
   * Construye mensaje de saldo
   * @param {number} valor - Monto de la operación
   * @param {number} saldoActual - Saldo después de la operación
   * @param {string} nombreTienda - Nombre de la tienda
   * @returns {string} Mensaje formateado
   */
  construirMensajeSaldo(valor, saldoActual, nombreTienda) {
    const esPositivo = valor > 0;
    const montoOperacion = this.formatMonto(valor);
    const saldoFormateado = this.formatMonto(saldoActual);
    
    if (esPositivo) {
      return `💵 *${nombreTienda}*\n\n` +
             `Se agregaron ${montoOperacion} a tu saldo\n\n` +
             `💰 Saldo actual: ${saldoFormateado}`;
    } else {
      return `💸 *${nombreTienda}*\n\n` +
             `Se descontaron ${montoOperacion} de tu saldo\n\n` +
             `💰 Saldo actual: ${saldoFormateado}`;
    }
  }

  /**
   * Envía un mensaje de WhatsApp
   * @param {string} numero - Número de destino
   * @param {string} mensaje - Contenido del mensaje
   * @returns {Promise<{success: boolean, sid?: string, error?: string}>}
   */
  async enviarMensaje(numero, mensaje) {
    throw new Error('Método enviarMensaje() debe ser implementado');
  }

  /**
   * Inicializa la conexión (si es necesario)
   * @returns {Promise<void>}
   */
  async inicializar() {
    // Por defecto no hace nada, los proveedores pueden sobrescribirlo
  }

  /**
   * Cierra la conexión (si es necesario)
   * @returns {Promise<void>}
   */
  async cerrar() {
    // Por defecto no hace nada, los proveedores pueden sobrescribirlo
  }
}

module.exports = WhatsAppProvider;