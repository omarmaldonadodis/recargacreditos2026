// backend/services/whatsapp/WhapiProvider.js
const WhatsAppProvider = require('./WhatsAppProvider');
const axios = require('axios');

class WhapiProvider extends WhatsAppProvider {
  constructor(apiToken, channelId = null) {
    super();
    
    if (!apiToken) {
      this.isConfigured = false;
      console.warn('⚠️ Whapi.cloud no está configurado. Falta WHAPI_API_TOKEN en .env');
      return;
    }

    this.apiToken = apiToken;
    this.channelId = channelId;
    this.baseURL = 'https://gate.whapi.cloud';
    this.isConfigured = true;
    
    // Cache de números resueltos para no llamar la API en cada envío
    this.numeroCache = new Map();

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Whapi.cloud configurado correctamente');
  }

  /**
   * Formato base: quita +, espacios y guiones
   */
  formatPhoneNumber(celular) {
    let numero = celular.replace(/[\s+\-()]/g, '');

    // Fix México: 52XXXXXXXXXX (12 dígitos) → 521XXXXXXXXXX (13 dígitos)
    if (numero.startsWith('52') && numero.length === 12) {
      numero = '521' + numero.slice(2);
    }

    return numero + '@s.whatsapp.net';
  }

  /**
   * Resuelve el número correcto usando la API de Whapi (con cache)
   * Esto maneja automáticamente los requisitos de cada país
   */
  async resolverNumero(celular) {
    // Revisar cache primero
    if (this.numeroCache.has(celular)) {
      return this.numeroCache.get(celular);
    }

    try {
      let numero = celular.replace(/\s+/g, '');
      if (!numero.startsWith('+')) {
        numero = '+' + numero.replace('+', '');
      }

      const response = await this.client.post('/contacts', {
        force_check: false,
        contacts: [numero]
      });

      const contacto = response.data?.contacts?.[0];

      if (contacto?.status === 'valid' && contacto?.wa_id) {
        const waId = contacto.wa_id.includes('@')
          ? contacto.wa_id
          : contacto.wa_id + '@s.whatsapp.net';

        console.log(`📱 Número resuelto: ${celular} → ${waId}`);

        // Guardar en cache (expira en 24h)
        this.numeroCache.set(celular, waId);
        setTimeout(() => this.numeroCache.delete(celular), 24 * 60 * 60 * 1000);

        return waId;
      }

      // Si no es válido, loguear y usar fallback
      console.warn(`⚠️ Número no válido en WhatsApp: ${celular} (status: ${contacto?.status})`);
      return this.formatPhoneNumber(celular);

    } catch (error) {
      console.warn(`⚠️ No se pudo resolver número ${celular}, usando formato local:`, error.message);
      return this.formatPhoneNumber(celular);
    }
  }

  /**
   * Envía un mensaje de texto
   */
  async enviarMensaje(numero, mensaje) {
    if (!this.isConfigured) {
      return { 
        success: false, 
        error: 'Whapi.cloud no está configurado. Verifica WHAPI_API_TOKEN en .env',
        provider: 'whapi'
      };
    }

    try {
      // Resolver número correcto para el país
      const to = await this.resolverNumero(numero);
      console.log(`📤 Enviando WhatsApp → ${numero} (${to})`);

      const payload = { to, body: mensaje };

      const typingTime = process.env.WHAPI_TYPING_TIME;
      if (typingTime) {
        payload.typing_time = parseInt(typingTime);
      }

      const response = await this.client.post('/messages/text', payload);

      if (response.data && response.data.sent) {
        console.log(`✓ WhatsApp enviado → ${numero} | ID: ${response.data.id}`);
        
        return { 
          success: true, 
          messageId: response.data.id,
          provider: 'whapi',
          timestamp: new Date().toISOString(),
          resolvedNumber: to,
          data: response.data
        };
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }

    } catch (error) {
      console.error(`✗ Error enviando WhatsApp → ${numero}:`, error.message);
      
      let errorMessage = error.message;
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        switch(status) {
          case 401: errorMessage = 'Token de API inválido o expirado'; break;
          case 403: errorMessage = 'Acceso denegado. Verifica los permisos del token'; break;
          case 404: errorMessage = 'Número no encontrado en WhatsApp'; break;
          case 429: errorMessage = 'Límite de tasa excedido. Intenta más tarde'; break;
          case 500: errorMessage = 'Error del servidor de Whapi.cloud'; break;
          default:  errorMessage = data?.message || data?.error || errorMessage;
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
   * Envía un mensaje con imagen
   */
  async enviarMensajeConImagen(numero, mensaje, urlImagen) {
    if (!this.isConfigured) {
      return { success: false, error: 'Whapi.cloud no está configurado', provider: 'whapi' };
    }

    try {
      const to = await this.resolverNumero(numero);
      
      const response = await this.client.post('/messages/image', {
        to,
        body: mensaje,
        media: urlImagen
      });

      if (response.data && response.data.sent) {
        console.log(`✓ WhatsApp con imagen enviado → ${numero}`);
        return { success: true, messageId: response.data.id, provider: 'whapi' };
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }

    } catch (error) {
      console.error('✗ Error enviando imagen:', error.message);
      return { success: false, error: error.message, provider: 'whapi' };
    }
  }

  /**
   * Verifica el estado de la conexión
   */
  async verificarEstado() {
    if (!this.isConfigured) {
      return { conectado: false, error: 'No configurado' };
    }

    try {
      const response = await this.client.get('/settings');
      return {
        conectado: true,
        canal: response.data.channel || 'default',
        numero: response.data.number || 'N/A',
        estado: response.data.status || 'unknown'
      };
    } catch (error) {
      return { conectado: false, error: error.message };
    }
  }

  async obtenerInfoCanal() {
    if (!this.isConfigured) throw new Error('Whapi.cloud no está configurado');
    const response = await this.client.get('/settings');
    return response.data;
  }

  async verificarNumero(numero) {
    if (!this.isConfigured) throw new Error('Whapi.cloud no está configurado');
    const to = await this.resolverNumero(numero);
    return { waId: to, valido: true };
  }

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
      } else {
        console.warn('⚠️ No se pudo verificar la conexión:', estado.error);
        console.warn('   Dashboard: https://panel.whapi.cloud/channels');
      }
    } catch (error) {
      console.error('❌ Error al inicializar Whapi.cloud:', error.message);
    }
  }

  async cerrar() {
    this.numeroCache.clear();
    console.log('🔌 Whapi.cloud cerrado');
  }

  getEstado() {
    if (!this.isConfigured) {
      return {
        conectado: false,
        configurado: false,
        error: 'WHAPI_API_TOKEN no está configurado en .env'
      };
    }

    return {
      conectado: true,
      configurado: true,
      proveedor: 'whapi.cloud',
      baseURL: this.baseURL,
      tieneToken: !!this.apiToken,
      numerosEnCache: this.numeroCache.size
    };
  }
}

module.exports = WhapiProvider;