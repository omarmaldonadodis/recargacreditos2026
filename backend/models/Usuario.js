const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Usuario extends Model {}

Usuario.init({
  correo: { 
    type: DataTypes.STRING, 
    allowNull: true, 
    unique: true,
    validate: {
      isEmail: {
        msg: 'El correo debe ser una dirección de email válida'
      }
    }
  },
  correo_antiguo: { type: DataTypes.STRING, allowNull: true, unique: true },
  contrasenia: { type: DataTypes.STRING, allowNull: false },
  nombres_apellidos: { type: DataTypes.STRING, unique: true, },
  nombre_tienda: { 
    type: DataTypes.STRING, 
    unique: true, 
    allowNull: false,
    validate: {
      is: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9 ]+$/i, // Solo letras, números y espacios
      notEmpty: {
        msg: 'El nombre de la tienda no puede estar vacío'
      }
    }
  },
  dni: { type: DataTypes.STRING },
  celular: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    validate: {
      is: /^\+?[1-9]\d{1,14}\s*$/,
      notEmpty: {
        msg: 'El número de celular no puede estar vacío'
      }
    }
  },
  verificado: { type: DataTypes.BOOLEAN, defaultValue: true },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  eliminado: { type: DataTypes.BOOLEAN, defaultValue: false },

  fechaEliminacion: { 
  type: DataTypes.DATE, 
  allowNull: true 
},


  valor_adeudado: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  valor_depositar: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  valor_recargas: { type: DataTypes.FLOAT, defaultValue: 0.0 },
  porcentaje: { type: DataTypes.FLOAT, defaultValue: 1.0 },
  rol: { type: DataTypes.ENUM('administrador', 'vendedor', 'tienda'), allowNull: false },
  tokenVersion: { type: DataTypes.INTEGER, defaultValue: 0 },   
// Nuevos campos para la recuperación de contraseña
  codigoVerificacion: { 
      type: DataTypes.INTEGER, 
      allowNull: true, 
      validate: {
        isNumeric: true
      }
    },
    fechaCodigo: { 
      type: DataTypes.DATE, 
      allowNull: true 
    }

}, {
  sequelize,
  modelName: 'Usuario',
});

module.exports = Usuario;