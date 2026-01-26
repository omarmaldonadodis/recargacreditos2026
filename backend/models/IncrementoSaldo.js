// backend/models/IncrementoSaldo.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class IncrementoSaldo extends Model {}

IncrementoSaldo.init({
  saldoAnterior: { 
    type: DataTypes.DECIMAL(10, 2), // Cambiado
    allowNull: false 
  },
  saldoNuevo: { 
    type: DataTypes.DECIMAL(10, 2), // Cambiado
    allowNull: false 
  },
  diferencia: { 
    type: DataTypes.DECIMAL(10, 2), // Cambiado
    allowNull: false 
  },
  // .

    // Proveedor donde se detectó el incremento
  proveedor: { 
    type: DataTypes.ENUM('general', 'movistar'), 
    allowNull: false,
    defaultValue: 'general',
    comment: 'general=2611, movistar=2612'
  },
  
  
  operadora: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  
  fecha: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  
  // Estado del incremento
  estado: { 
    type: DataTypes.ENUM('pendiente', 'asignado', 'ignorado'), 
    defaultValue: 'pendiente' 
  },
  
  // Referencia a la recarga que lo detectó
  RecargaId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Recargas',
      key: 'id'
    },
    allowNull: true
  },
  
  notas: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  sequelize,
  modelName: 'IncrementoSaldo',
  indexes: [
    {
      fields: ['proveedor', 'fecha']
    }
  ]
});

module.exports = IncrementoSaldo;