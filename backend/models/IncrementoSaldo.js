// backend/models/IncrementoSaldo.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class IncrementoSaldo extends Model {}

IncrementoSaldo.init({
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
  
  // NUEVO: Tipo de incremento
  tipoIncremento: {
    type: DataTypes.ENUM(
      'deposito_inicial',      // General: depósito directo
      'comisiones_acumuladas', // Movistar: suma de comisiones
      'ajuste_manual',         // Corrección administrativa
      'diferencia_sistema'     // Diferencia detectada sin clasificar
    ),
    allowNull: false,
    defaultValue: 'diferencia_sistema'
  },
  
  proveedor: { 
    type: DataTypes.ENUM('general', 'movistar'), 
    allowNull: false
  },
  
  operadora: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  
  fecha: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  
  estado: { 
    type: DataTypes.ENUM('pendiente', 'asignado', 'ignorado', 'verificado'),
    defaultValue: 'pendiente' 
  },
  
  // NUEVO: Referencia a depósito (para General)
  DepositoId: {
    type: DataTypes.INTEGER,
    references: { model: 'Depositos', key: 'id' },
    allowNull: true,
    comment: 'Depósito que generó este incremento (General)'
  },
  
  // Referencia a recarga que lo detectó
  RecargaId: {
    type: DataTypes.INTEGER,
    references: { model: 'Recargas', key: 'id' },
    allowNull: true
  },
  
  // NUEVO: Para tracking de comisiones Movistar
  comisionAcumulada: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Suma de comisiones (Movistar)'
  },
  
  cantidadRecargasComision: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Cantidad de recargas que aportaron comisión'
  },
  
  // NUEVO: Período de acumulación (para Movistar)
  fechaInicioAcumulacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  fechaFinAcumulacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  notas: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  
  // NUEVO: Verificación administrativa
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
  modelName: 'IncrementoSaldo',
  tableName: 'IncrementoSaldos',
  indexes: [
    { fields: ['proveedor', 'fecha'] },
    { fields: ['estado'] },
    { fields: ['tipoIncremento'] }
  ]
});

module.exports = IncrementoSaldo;