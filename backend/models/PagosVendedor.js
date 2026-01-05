const sequelize = require('../config/database');
const Usuario = require('./Usuario');

class PagosVendedor extends Model {}

PagosVendedor.init({
  valor: { type: DataTypes.FLOAT, allowNull: false },

  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  tipo: { type: DataTypes.ENUM('abono, pago'), allowNull: false }
}, {
  sequelize,
  modelName: 'PagosVendedor',
});

// Definir las relaciones
PagosVendedor.belongsTo(Usuario, {
  as: 'usuario',
  foreignKey: 'usuarioId'
});


module.exports = PagosVendedor;