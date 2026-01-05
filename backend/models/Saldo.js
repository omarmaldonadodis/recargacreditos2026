const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Tienda = require('./Tienda');  // Asegúrate de importar el modelo Tienda

class Saldo extends Model {}

Saldo.init({
  valor: { type: DataTypes.FLOAT, allowNull: false },
  valor_con_porcentaje: { type: DataTypes.FLOAT, allowNull: true },
  valor_pagado: { type: DataTypes.FLOAT, allowNull: true },
  valor_restante: { type: DataTypes.FLOAT, allowNull: true },
  porcentaje: { type: DataTypes.FLOAT },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  credito: { type: DataTypes.BOOLEAN, defaultValue: true },
  verificado: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  sequelize,
  modelName: 'Saldo',
});

// Definir las relaciones
Saldo.belongsTo(Usuario, {
  as: 'acreditador',
  foreignKey: 'acreditadorId'
});

Saldo.belongsTo(Tienda, {
  foreignKey: 'TiendaId',
  as: 'tienda'
});

module.exports = Saldo;

