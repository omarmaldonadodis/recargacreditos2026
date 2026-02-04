// backend/scripts/verQR.js
const fs = require('fs');
const path = require('path');

const qrPath = path.join(__dirname, '../whatsapp_qr.txt');

if (fs.existsSync(qrPath)) {
  console.log(fs.readFileSync(qrPath, 'utf8'));
} else {
  console.log('⚠️ No hay código QR generado');
  console.log('💡 El QR se genera cuando inicias el servidor');
  console.log('💡 Comando: pm2 restart backend && pm2 logs');
}