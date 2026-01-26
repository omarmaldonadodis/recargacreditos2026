// backend/models/Deposito.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

class Deposito extends Model {}

Deposito.init({
  monto: { 
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false 
  },
  
  UsuarioId: {
    type: DataTypes.INTEGER,
    references: { model: 'Usuarios', key: 'id' },
    allowNull: false
  },

  proveedor: { 
    type: DataTypes.ENUM('general', 'movistar'), 
    allowNull: false,
    defaultValue: 'general'
  },
  
  operadora: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  
  fecha: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  
  asignado: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  
  // NUEVO: Tracking de incremento relacionado
  IncrementoSaldoId: {
    type: DataTypes.INTEGER,
    references: { model: 'IncrementoSaldos', key: 'id' },
    allowNull: true,
    comment: 'Incremento que generó este depósito'
  },
  
  // NUEVO: Tipo de depósito
  tipoDeposito: {
    type: DataTypes.ENUM('efectivo', 'transferencia', 'ajuste', 'otro'),
    defaultValue: 'efectivo'
  },
  
  // NUEVO: Referencia bancaria
  referencia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  notas: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  
  // NUEVO: Verificación
  verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  verificadoPor: {
    type: DataTypes.INTEGER,
    references: { model: 'Usuarios', key: 'id' },
    allowNull: true
  },
  
  fechaVerificacion: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Deposito',
  tableName: 'Depositos',
  indexes: [
    { fields: ['proveedor', 'asignado'] },
    { fields: ['fecha'] },
    { fields: ['verificado'] }
  ]
});

Deposito.belongsTo(Usuario);

module.exports = Deposito;