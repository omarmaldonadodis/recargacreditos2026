const WhatsAppProvider = require('./WhatsAppProvider');

const fs = require('fs');
const path = require('path');

class BaileysProvider extends WhatsAppProvider {
  constructor() {
    super();
    this.sock = null;
    this.isConnected = false;
    this.authPath = path.join(__dirname, '../../auth_baileys');
    this.qrPath = path.join(__dirname, '../../whatsapp_qr.txt');
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reducir intentos
    this.isInitializing = false;
    this.connectionTimeout = null;
  }

  formatPhoneNumber(celular) {
    let numero = celular.replace(/\s+/g, '').replace('+', '');
    return numero + '@s.whatsapp.net';
  }

  guardarQR(qr) {
    try {
      const qrText = `
========================================
   ESCANEA ESTE QR CON WHATSAPP
========================================

${qr}

========================================
INSTRUCCIONES:
1. Abre WhatsApp en tu teléfono
2. Ve a Configuración → Dispositivos vinculados
3. Toca "Vincular un dispositivo"
4. Escanea este código QR

⏰ Este QR expira en 60 segundos
🔄 Si expira, reinicia: pm2 restart backend
========================================

Generado: ${new Date().toLocaleString('es-EC')}
`;
      
      fs.writeFileSync(this.qrPath, qrText, 'utf8');
      console.log(`\n📱 QR guardado en: ${this.qrPath}`);
      console.log('💡 Ver QR: cat ${this.qrPath}\n');
    } catch (error) {
      console.error('Error guardando QR:', error);
    }
  }

  limpiarTimeout() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  async inicializar() {
    if (this.isInitializing) {
      console.log('⏳ Ya se está inicializando...');
      return;
    }

    try {
      this.isInitializing = true;
      console.log('\n🔄 Inicializando WhatsApp (Baileys v6)...');

      // Crear directorio
      if (!fs.existsSync(this.authPath)) {
        fs.mkdirSync(this.authPath, { recursive: true });
      }

      // Obtener última versión
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📌 Usando versión WA: v${version.join('.')}`);

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

      // Configuración más robusta
      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['RecargaCreditos', 'Chrome', '1.0.0'], // Navegador genérico
        syncFullHistory: false, // No sincronizar historial completo
        markOnlineOnConnect: true,
        getMessage: async (key) => {
          return { conversation: '' };
        },
        shouldIgnoreJid: (jid) => false,
        connectTimeoutMs: 60000, // Timeout de 60 segundos
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 30000, // Keep alive cada 30 segundos
        emitOwnEvents: false,
        fireInitQueries: true,
        generateHighQualityLinkPreview: false,
        patchMessageBeforeSending: (message) => {
          return message;
        }
      });

      // Guardar credenciales
      this.sock.ev.on('creds.update', saveCreds);

      // Manejar conexión
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // QR Code
        if (qr) {
          this.limpiarTimeout();
          
          console.log('\n📱 ═══════════════════════════════════════');
          console.log('   CÓDIGO QR GENERADO');
          console.log('═══════════════════════════════════════');
          
          qrcode.generate(qr, { small: true }, (qrText) => {
            console.log(qrText);
            this.guardarQR(qrText);
          });
          
          console.log('═══════════════════════════════════════');
          console.log('⏰ TIENES 60 SEGUNDOS PARA ESCANEAR\n');

          // Timeout de 60 segundos para el QR
          this.connectionTimeout = setTimeout(() => {
            if (!this.isConnected) {
              console.log('⏱️ QR expirado. Reiniciando...');
              this.sock?.end();
            }
          }, 60000);
        }

        // Conectando
        if (connection === 'connecting') {
          console.log('⏳ Conectando a WhatsApp...');
        }

        // Conexión cerrada
        if (connection === 'close') {
          this.limpiarTimeout();
          
          const shouldReconnect = 
            (lastDisconnect?.error instanceof Boom) &&
            lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;

          const statusCode = lastDisconnect?.error?.output?.statusCode;
          
          console.log('\n❌ Conexión cerrada');
          console.log(`   Código: ${statusCode}`);
          
          // Mensajes más claros según el error
          switch(statusCode) {
            case DisconnectReason.badSession:
              console.log('   Motivo: Sesión corrupta');
              console.log('   Solución: npm run whatsapp:reset');
              break;
            case DisconnectReason.connectionClosed:
              console.log('   Motivo: Conexión cerrada por el servidor');
              break;
            case DisconnectReason.connectionLost:
              console.log('   Motivo: Conexión perdida');
              break;
            case DisconnectReason.connectionReplaced:
              console.log('   Motivo: Sesión reemplazada (otro dispositivo)');
              break;
            case DisconnectReason.loggedOut:
              console.log('   Motivo: Sesión cerrada');
              console.log('   Solución: npm run whatsapp:reset');
              break;
            case DisconnectReason.restartRequired:
              console.log('   Motivo: Reinicio requerido');
              break;
            case DisconnectReason.timedOut:
              console.log('   Motivo: Tiempo de espera agotado');
              break;
            case 405:
              console.log('   Motivo: Método no permitido (error de protocolo)');
              console.log('   Posible causa: Otra sesión activa o versión incompatible');
              break;
            default:
              console.log(`   Motivo: Error ${statusCode}`);
          }

          this.isConnected = false;
          this.isInitializing = false;

          // Intentar reconectar
          if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`\n🔄 Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts} en 10 segundos...`);
            setTimeout(() => this.inicializar(), 10000);
          } else {
            console.log('\n⚠️ No se pudo conectar a WhatsApp');
            console.log('\n💡 SOLUCIONES:');
            console.log('   1. Ejecuta: npm run whatsapp:reset');
            console.log('   2. Reinicia: pm2 restart backend');
            console.log('   3. Verifica que no haya otra sesión activa\n');
          }
        }

        // Conexión abierta
        if (connection === 'open') {
          this.limpiarTimeout();
          
          console.log('\n✅ ═══════════════════════════════════════');
          console.log('   CONECTADO A WHATSAPP');
          console.log('═══════════════════════════════════════\n');
          
          this.isConnected = true;
          this.isInitializing = false;
          this.reconnectAttempts = 0;
          
          // Eliminar QR
          if (fs.existsSync(this.qrPath)) {
            fs.unlinkSync(this.qrPath);
          }
        }
      });

      // Mensajes entrantes
      this.sock.ev.on('messages.upsert', async ({ messages }) => {
        // Opcional
      });

    } catch (error) {
      console.error('\n❌ Error inicializando Baileys:');
      console.error('   ', error.message);
      this.isConnected = false;
      this.isInitializing = false;
      this.limpiarTimeout();
    }
  }

  async enviarMensaje(numero, mensaje) {
    try {
      if (!this.isConnected || !this.sock) {
        throw new Error('WhatsApp no está conectado');
      }

      const jid = this.formatPhoneNumber(numero);
      await this.sock.sendMessage(jid, { text: mensaje });

      console.log(`✓ WhatsApp → ${numero}`);
      
      return { 
        success: true, 
        provider: 'baileys',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`✗ Error → ${numero}:`, error.message);
      
      return { 
        success: false, 
        error: error.message,
        provider: 'baileys'
      };
    }
  }

  async cerrar() {
    this.limpiarTimeout();
    
    if (this.sock) {
      try {
        await this.sock.logout();
        this.sock = null;
        this.isConnected = false;
        console.log('🔌 WhatsApp desconectado');
      } catch (error) {
        console.error('Error cerrando:', error.message);
      }
    }
  }

  haySesionGuardada() {
    const credsPath = path.join(this.authPath, 'creds.json');
    return fs.existsSync(credsPath);
  }

  eliminarSesion() {
    if (fs.existsSync(this.authPath)) {
      fs.rmSync(this.authPath, { recursive: true, force: true });
      console.log('🗑️ Sesión eliminada');
    }
    
    if (fs.existsSync(this.qrPath)) {
      fs.unlinkSync(this.qrPath);
    }
  }

  getEstado() {
    return {
      conectado: this.isConnected,
      inicializando: this.isInitializing,
      sesionGuardada: this.haySesionGuardada(),
      intentosReconexion: this.reconnectAttempts,
      archivoQR: fs.existsSync(this.qrPath) ? this.qrPath : null
    };
  }
}

module.exports = BaileysProvider;