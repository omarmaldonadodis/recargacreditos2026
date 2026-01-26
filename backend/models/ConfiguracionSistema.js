// backend/models/ConfiguracionSistema.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class ConfiguracionSistema extends Model {}

ConfiguracionSistema.init({
  clave: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },
  valor: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  descripcion: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  sequelize,
  modelName: 'ConfiguracionSistema'
});

module.exports = ConfiguracionSistema;