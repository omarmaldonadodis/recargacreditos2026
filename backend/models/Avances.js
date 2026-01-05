const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Tienda = require('./Tienda');
const Usuario = require('./Usuario');

const Avance = sequelize.define('Avance', {
  valor: { type: DataTypes.FLOAT, allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  tipo: { type: DataTypes.STRING }
});

// Asociación con Tienda
Avance.belongsTo(Tienda, {
  foreignKey: 'TiendaId',
  as: 'tienda'
});

// Asociación con Usuario que acredita el avance
Avance.belongsTo(Usuario, { 
  as: 'acreditador',
  foreignKey: 'acreditadorId'
});

module.exports = Avance;
