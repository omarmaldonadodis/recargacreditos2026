const nodemailer = require('nodemailer');

// Configuración de tu servicio de correo (aquí usaré Gmail como ejemplo)
const transporter = nodemailer.createTransport({
  service: 'gmail', // Usando Gmail, pero puedes configurar otro servicio
  auth: {
    user: process.env.EMAIL_USER, // Tu correo electrónico (asegúrate de tenerlo configurado en variables de entorno)
    pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación de Gmail o el password de tu cuenta
  },
});

// Función para enviar el correo
const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER, // Remitente (debe ser el correo que configuraste antes)
      to, // Destinatario
      subject, // Asunto
      text, // Contenido del correo
    });
    console.log('Correo enviado: ' + info.response);
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    throw new Error('No se pudo enviar el correo');
  }
};

module.exports = { sendEmail };
