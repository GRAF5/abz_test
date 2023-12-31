'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsTo(models.Position, { foreignKey: "position_id" })
      // define association here
    }
  }
  User.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    phone: DataTypes.STRING,
    photo: DataTypes.STRING,
    registration_timestamp: DataTypes.BIGINT
  }, {
    sequelize,
    modelName: 'User',
    timestamps: false
  });
  return User;
};