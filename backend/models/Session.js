const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Session extends Model {}

Session.init({
  token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },

}, {
  sequelize,
  modelName: 'Session',
  timestamps: false // Si no necesitas timestamps automáticos
});

module.exports = Session;
