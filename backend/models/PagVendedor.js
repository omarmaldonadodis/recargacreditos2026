const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const Tienda = require('./Tienda');  // Asegúrate de importar el modelo Tienda

class PagVendedor extends Model {}

PagVendedor.init({
  valor: { type: DataTypes.FLOAT, allowNull: false },
  tipo: { type: DataTypes.ENUM('Deposito', 'Recarga'), allowNull: false },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: 'PagVendedor',
});



// Definir las relaciones
PagVendedor.belongsTo(Usuario, {
  as: 'acreditador',
  foreignKey: 'acreditadorId'
});

// Definir las relaciones
PagVendedor.belongsTo(Usuario, {
  as: 'vendedor',
  foreignKey: 'vendedorId'
});


module.exports = PagVendedor;

