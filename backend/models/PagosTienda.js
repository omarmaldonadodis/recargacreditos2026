const sequelize = require('../config/database');
const Saldo = require('./Saldo');
const Usuario = require('./Usuario');

class PagosTienda extends Model {}

PagosTienda.init({
  valor: { type: DataTypes.FLOAT, allowNull: false },

  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  tipo: { type: DataTypes.ENUM('abono, pago'), allowNull: false }
}, {
  sequelize,
  modelName: 'PagosTienda',
});

// Definir las relaciones
PagosTienda.belongsTo(Saldo, {
  as: 'saldo',
  foreignKey: 'saldoId'
});


module.exports = PagosTienda;