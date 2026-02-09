// backend/services/whatsapp/WhapiProvider.js
const WhatsAppProvider = require('./WhatsAppProvider');
const axios = require('axios');

class WhapiProvider extends WhatsAppProvider {
  constructor(apiToken, channelId = null) {
    super();
    
    // Configuración
    if (!apiToken) {
      this.isConfigured = false;
      console.warn('⚠️ Whapi.cloud no está configurado. Falta WHAPI_API_TOKEN en .env');
      return;
    }

    this.apiToken = apiToken;
    this.channelId = channelId; // Opcional, pero recomendado para multi-canal
    this.baseURL = 'https://gate.whapi.cloud';
    this.isConfigured = true;
    
    // Configurar axios con el token
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 segundos timeout
    });

    console.log('✅ Whapi.cloud configurado correctamente');
  }

  /**
   * Formatea número de teléfono para Whapi.cloud
   * Ejemplo: +593987654321 -> 593987654321 (sin + ni espacios)
   */
  formatPhoneNumber(celular) {
    return celular.replace(/\s+/g, '').replace('+', '');
  }

  /**
   * Envía un mensaje de texto usando Whapi.cloud
   */
  async enviarMensaje(numero, mensaje) {
    if (!this.isConfigured) {
      console.error('✗ Whapi.cloud no está configurado correctamente');
      return { 
        success: false, 
        error: 'Whapi.cloud no está configurado. Verifica WHAPI_API_TOKEN en .env',
        provider: 'whapi'
      };
    }

    try {
      const to = this.formatPhoneNumber(numero);
      
      const payload = {
        to: to,
        body: mensaje
      };

      // Si hay typing_time configurado, agregarlo (simula que alguien está escribiendo)
      const typingTime = process.env.WHAPI_TYPING_TIME;
      if (typingTime) {
        payload.typing_time = parseInt(typingTime);
      }

      const response = await this.client.post('/messages/text', payload);

      if (response.data && response.data.sent) {
        console.log(`✓ WhatsApp enviado (Whapi.cloud) → ${numero}`);
        
        return { 
          success: true, 
          messageId: response.data.id,
          provider: 'whapi',
          timestamp: new Date().toISOString(),
          data: response.data
        };
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }

    } catch (error) {
      console.error('✗ Error enviando WhatsApp (Whapi.cloud):', error.message);
      
      // Manejo de errores específicos de la API
      let errorMessage = error.message;
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        switch(status) {
          case 401:
            errorMessage = 'Token de API inválido o expirado';
            break;
          case 403:
            errorMessage = 'Acceso denegado. Verifica los permisos del token';
            break;
          case 404:
            errorMessage = 'Número no encontrado en WhatsApp';
            break;
          case 429:
            errorMessage = 'Límite de tasa excedido. Intenta más tarde';
            break;
          case 500:
            errorMessage = 'Error del servidor de Whapi.cloud';
            break;
          default:
            errorMessage = data?.message || data?.error || errorMessage;
        }
        
        console.error(`   Estado HTTP: ${status}`);
        console.error(`   Detalle: ${JSON.stringify(data)}`);
      }
      
      return { 
        success: false, 
        error: errorMessage,
        provider: 'whapi'
      };
    }
  }

  /**
   * Verifica el estado de la conexión con Whapi.cloud
   */
  async verificarEstado() {
    if (!this.isConfigured) {
      return {
        conectado: false,
        error: 'No configurado'
      };
    }

    try {
      // Endpoint para verificar el estado del canal
      const response = await this.client.get('/settings');
      
      return {
        conectado: true,
        canal: response.data.channel || 'default',
        numero: response.data.number || 'N/A',
        estado: response.data.status || 'unknown'
      };
      
    } catch (error) {
      console.error('Error verificando estado:', error.message);
      
      return {
        conectado: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene la información del canal
   */
  async obtenerInfoCanal() {
    if (!this.isConfigured) {
      throw new Error('Whapi.cloud no está configurado');
    }

    try {
      const response = await this.client.get('/settings');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo info del canal:', error.message);
      throw error;
    }
  }

  /**
   * Verifica si un número está registrado en WhatsApp
   */
  async verificarNumero(numero) {
    if (!this.isConfigured) {
      throw new Error('Whapi.cloud no está configurado');
    }

    try {
      const to = this.formatPhoneNumber(numero);
      const response = await this.client.post('/contacts/check', {
        contacts: [to]
      });

      return response.data;
    } catch (error) {
      console.error('Error verificando número:', error.message);
      throw error;
    }
  }

  /**
   * Whapi.cloud no requiere inicialización especial
   * La conexión se maneja a través del QR en el dashboard
   */
  async inicializar() {
    if (!this.isConfigured) {
      console.error('⚠️ Whapi.cloud no puede inicializarse: falta configuración');
      return;
    }

    try {
      console.log('🔄 Verificando conexión con Whapi.cloud...');
      
      const estado = await this.verificarEstado();
      
      if (estado.conectado) {
        console.log('✅ Whapi.cloud está listo para enviar mensajes');
        console.log(`   Canal: ${estado.canal}`);
        console.log(`   Número: ${estado.numero}`);
        console.log(`   Estado: ${estado.estado}`);
      } else {
        console.warn('⚠️ No se pudo verificar la conexión con Whapi.cloud');
        console.warn(`   Error: ${estado.error}`);
        console.warn('   Asegúrate de haber escaneado el QR en el dashboard de Whapi.cloud');
        console.warn('   Dashboard: https://panel.whapi.cloud/channels');
      }
      
    } catch (error) {
      console.error('❌ Error al inicializar Whapi.cloud:', error.message);
      console.warn('   Asegúrate de haber escaneado el QR en el dashboard de Whapi.cloud');
      console.warn('   Dashboard: https://panel.whapi.cloud/channels');
    }
  }

  /**
   * Whapi.cloud no requiere cierre explícito
   */
  async cerrar() {
    console.log('🔌 Cerrando conexión con Whapi.cloud...');
    // No hay conexión persistente que cerrar
  }

  /**
   * Obtiene el estado actual del proveedor
   */
  getEstado() {
    if (!this.isConfigured) {
      return {
        conectado: false,
        configurado: false,
        error: 'WHAPI_API_TOKEN no está configurado en .env'
      };
    }

    return {
      conectado: true, // Asumimos que está conectado si está configurado
      configurado: true,
      proveedor: 'whapi.cloud',
      baseURL: this.baseURL,
      tieneToken: !!this.apiToken
    };
  }

  /**
   * Envía un mensaje con imagen (opcional)
   */
  async enviarMensajeConImagen(numero, mensaje, urlImagen) {
    if (!this.isConfigured) {
      return { 
        success: false, 
        error: 'Whapi.cloud no está configurado',
        provider: 'whapi'
      };
    }

    try {
      const to = this.formatPhoneNumber(numero);
      
      const payload = {
        to: to,
        body: mensaje,
        media: urlImagen
      };

      const response = await this.client.post('/messages/image', payload);

      if (response.data && response.data.sent) {
        console.log(`✓ WhatsApp con imagen enviado → ${numero}`);
        return { 
          success: true, 
          messageId: response.data.id,
          provider: 'whapi'
        };
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }

    } catch (error) {
      console.error('✗ Error enviando imagen:', error.message);
      return { 
        success: false, 
        error: error.message,
        provider: 'whapi'
      };
    }
  }
}

module.exports = WhapiProvider;