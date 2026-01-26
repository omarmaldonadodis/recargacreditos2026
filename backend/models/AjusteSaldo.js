// backend/models/AjusteSaldo.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class AjusteSaldo extends Model {}

AjusteSaldo.init({
  proveedor: {
    type: DataTypes.ENUM('general', 'movistar'),
    allowNull: false
  },
  
  tipoAjuste: {
    type: DataTypes.ENUM(
      'correccion_saldo',
      'conciliacion',
      'ajuste_deposito',
      'ajuste_comision',
      'otro'
    ),
    allowNull: false
  },
  
  saldoAnterior: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  saldoNuevo: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  diferencia: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  detalles: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  usuarioId: {
    type: DataTypes.INTEGER,
    references: { model: 'Usuarios', key: 'id' },
    allowNull: false,
    comment: 'Admin que realizó el ajuste'
  },
  
  aprobadoPor: {
    type: DataTypes.INTEGER,
    references: { model: 'Usuarios', key: 'id' },
    allowNull: true
  },
  
  estado: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
    defaultValue: 'pendiente'
  },
  
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'AjusteSaldo',
  tableName: 'AjustesSaldo'
});

module.exports = AjusteSaldo;