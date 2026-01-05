const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipoRecarga = sequelize.define('TipoRecarga', {
  operadora: { type: DataTypes.STRING, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false },
  valor: { type: DataTypes.FLOAT, allowNull: false },
  token: { type: DataTypes.STRING, allowNull: false }
});

module.exports = TipoRecarga;
