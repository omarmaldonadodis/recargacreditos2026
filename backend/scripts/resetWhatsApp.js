// backend/scripts/resetWhatsApp.js
const fs = require('fs');
const path = require('path');

console.log('🔄 Reseteando sesión de WhatsApp...\n');

const authPath = path.join(__dirname, '../auth_baileys');

if (fs.existsSync(authPath)) {
  fs.rmSync(authPath, { recursive: true, force: true });
  console.log('✅ Sesión de WhatsApp eliminada');
  console.log('💡 Vuelve a iniciar el servidor para escanear un nuevo QR\n');
  console.log('Comando: npm run dev\n');
} else {
  console.log('⚠️ No hay sesión guardada para eliminar\n');
}