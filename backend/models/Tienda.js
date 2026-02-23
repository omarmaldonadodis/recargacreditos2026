const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario'); // Asegúrate de que el modelo Usuario se importe correctamente

class Tienda extends Model {}

Tienda.init({
  latitud: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  longitud: {
    type: DataTypes.DOUBLE,
    allowNull: true,
  },
  saldo: {
    type: DataTypes.DOUBLE,
    defaultValue: '0.00',
  },
  cupo: {
    type: DataTypes.DOUBLE,
    defaultValue: '0.00',
  },
  porcentaje: {
    type: DataTypes.DOUBLE,
    defaultValue: '4.00',
  },
  credito: {
    type: DataTypes.DOUBLE,
    defaultValue: '0.00',
  },
  UsuarioId: {
    type: DataTypes.INTEGER,
    references: {
      model: Usuario,
      key: 'id',
    },
    allowNull: false,
  },
  createdBy: {  // Campo para almacenar el usuario que creó la tienda
    type: DataTypes.INTEGER,
    references: {
      model: Usuario,
      key: 'id',
    },
    allowNull: true,
  },
  contado: { type: DataTypes.BOOLEAN, defaultValue: false },
  orden: { type: DataTypes.INTEGER },
  seleccionado: { type: DataTypes.BOOLEAN, defaultValue: false },
  notificadoSaldoBajo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Ya se notificó que el saldo es ≤ 100'
  },
  fechaSaldoCero: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha en que el saldo llegó a 0'
  },
  notificadoSinSaldo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Ya se notificó que lleva una semana sin saldo'
  },


}, {
  sequelize,
  modelName: 'Tienda',
  hooks: {
    // Hook antes de crear una nueva tienda
    async beforeCreate(tienda, options) {
      if (tienda.createdBy) {
        // Obtener el valor máximo del campo "orden" para el usuario
        const maxOrden = await Tienda.max('orden', {
          where: {
            createdBy: tienda.createdBy,
          },
        });
        
        // Si no hay tiendas, maxOrden será null, por lo que asignamos 1
        tienda.orden = (maxOrden || 0) + 1;
      }
    },
  },
});

// Definir las relaciones
Tienda.belongsTo(Usuario, {
  foreignKey: 'UsuarioId',
  as: 'usuario',
});

Tienda.belongsTo(Usuario, {
  foreignKey: 'createdBy',
  as: 'creador',
});

module.exports = Tienda;