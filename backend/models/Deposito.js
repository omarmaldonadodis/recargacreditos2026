// backend/models/Deposito.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

class Deposito extends Model {}

Deposito.init({
  monto: { 
    type: DataTypes.FLOAT, 
    allowNull: false 
  },
  
  // Quien hizo el depósito (vendedor o admin)
  UsuarioId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'Usuarios',
      key: 'id'
    },
    allowNull: false
  },

    // A qué proveedor corresponde este depósito
  proveedor: { 
    type: DataTypes.ENUM('general', 'movistar'), 
    allowNull: false,
    defaultValue: 'general',
    comment: 'general=2611, movistar=2612'
  },

  
  operadora: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  
  fecha: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  
  // Si ya fue asignado a un incremento
  asignado: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  
  notas: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  sequelize,
  modelName: 'Deposito',
  indexes: [
    {
      fields: ['proveedor', 'asignado']
    }
  ]
});

Deposito.belongsTo(Usuario);

module.exports = Deposito;