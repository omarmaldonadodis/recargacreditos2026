const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const tiendaRoutes = require('./routes/tiendas');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tiendas', tiendaRoutes);

sequelize.sync({ alter: true }).then(() => {
  console.log('Base de datos sincronizada');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${process.env.PORT}`);
  });
});
