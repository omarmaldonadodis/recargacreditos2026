// backend/index.js
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

// Importar TODOS los modelos antes de las rutas
const Usuario = require('./models/Usuario');
const Tienda = require('./models/Tienda');
const Recarga = require('./models/Recarga');
const Saldo = require('./models/Saldo');
const Session = require('./models/Session');
const TipoRecarga = require('./models/TipoRecarga');
const PagVendedor = require('./models/PagVendedor');

// NUEVOS MODELOS
const Deposito = require('./models/Deposito');
const IncrementoSaldo = require('./models/IncrementoSaldo');
const AsignacionDeposito = require('./models/AsignacionDeposito');
const ConfiguracionSistema = require('./models/ConfiguracionSistema');

// Importar rutas
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const tiendaRoutes = require('./routes/tiendas');
const incrementosRoutes = require('./routes/incrementos');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tiendas', tiendaRoutes);
app.use('/api/incrementos', incrementosRoutes);

// Sincronizar base de datos
sequelize.sync({ alter: true }).then(() => {
  console.log('Base de datos sincronizada');
  console.log('Modelos registrados:');
  console.log('- Usuario');
  console.log('- Tienda');
  console.log('- Recarga');
  console.log('- Saldo');
  console.log('- Session');
  console.log('- TipoRecarga');
  console.log('- PagVendedor');
  console.log('- Deposito');
  console.log('- IncrementoSaldo');
  console.log('- AsignacionDeposito');
  console.log('- ConfiguracionSistema');
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}).catch(err => {
  console.error('Error al sincronizar la base de datos:', err);
});