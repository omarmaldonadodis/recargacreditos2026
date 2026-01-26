// backend/models/SaldoProveedor.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class SaldoProveedor extends Model {}

SaldoProveedor.init({
  proveedor: {
    type: DataTypes.ENUM('general', 'movistar'),
    allowNull: false
  },
  
  saldoAnterior: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Saldo antes del evento'
  },
  
  saldo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Saldo después del evento'
  },
  
  diferencia: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Cambio en el saldo'
  },
  
  tipoEvento: {
    type: DataTypes.ENUM(
      'recarga', 
      'deposito_detectado', 
      'comision_acumulada',
      'ajuste_manual',
      'snapshot_inicial',
      'verificacion'
    ),
    allowNull: false
  },
  
  detalles: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Información adicional del evento'
  },
  
  RecargaId: {
    type: DataTypes.INTEGER,
    references: { model: 'Recargas', key: 'id' },
    allowNull: true
  },
  
  IncrementoSaldoId: {
    type: DataTypes.INTEGER,
    references: { model: 'IncrementoSaldos', key: 'id' },
    allowNull: true
  },
  
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si el saldo fue verificado manualmente'
  }
}, {
  sequelize,
  modelName: 'SaldoProveedor',
  tableName: 'SaldoProveedores',
  indexes: [
    { fields: ['proveedor', 'fecha'] },
    { fields: ['tipoEvento'] },
    { fields: ['verificado'] }
  ]
});

module.exports = SaldoProveedor;