'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Positions', [
      {
      name: 'Security'
      },
      {
      name: 'Designer'
      },
      {
      name: 'Content manager'
      },
      {
      name: 'Lawyer'
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Positions', null, {});
  }
};
