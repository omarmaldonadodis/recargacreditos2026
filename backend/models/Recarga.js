const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Tienda = require('./Tienda');
const TipoRecarga = require('./TipoRecarga');


const Recarga = sequelize.define('Recarga', {
  operadora: { type: DataTypes.STRING, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false },
  valor: { type: DataTypes.FLOAT, allowNull: false },
  celular: { type: DataTypes.STRING, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  folio: { type: DataTypes.STRING, allowNull: true },
  exitoso: { type: DataTypes.BOOLEAN, defaultValue: true },
  codigoError: { type: DataTypes.INTEGER, allowNull: true },
  mensajeError: { type: DataTypes.STRING, allowNull: true },

  saldoGestopago: { type: DataTypes.DECIMAL(10, 2), allowNull: true }, // Cambiado
  comision: { type: DataTypes.DECIMAL(10, 2), allowNull: true },


  // Identificar el proveedor usado
  proveedor: { 
    type: DataTypes.ENUM('general', 'movistar'), 
    allowNull: false,
    defaultValue: 'general',
    comment: 'general=2611, movistar=2612'
  },
  
});

Recarga.belongsTo(Tienda);
//Recarga.belongsTo(TipoRecarga);

module.exports = Recarga;
