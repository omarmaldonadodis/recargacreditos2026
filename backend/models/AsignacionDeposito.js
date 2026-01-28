// backend/models/AsignacionDeposito.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const IncrementoSaldo = require('./IncrementoSaldo');
const Deposito = require('./Deposito');

class AsignacionDeposito extends Model {}

AsignacionDeposito.init({
  IncrementoSaldoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'IncrementoSaldos',
      key: 'id'
    },
    allowNull: false
  },
  
  DepositoId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Depositos',
      key: 'id'
    },
    allowNull: false
  },
  
  // Puede asignarse parcialmente un depósito
  montoAsignado: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'AsignacionDeposito'
});


module.exports = AsignacionDeposito;



