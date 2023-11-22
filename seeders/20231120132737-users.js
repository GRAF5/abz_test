'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const names = ["Delbert Mcguire", "Elva Hardin", "Martin Dunn", "Jane Holder",
  "Elisa Knox", "Sang Day", "Josiah Jones", "Sol Cochran", "Patrice Mayer", "Hilda Browning", 
  "Nellie Fuller", "Lola Galvan", "Jackie Wade", "Madelyn Ramos", "Marc Abbott", "Esmeralda Compton",
  "Preston Sutton", "Tracy Middleton", "Jenna Garner", "Hal Wallace", "Erik Gillespie", "Lavern Elliott",
  "Earnestine Schultz", "Jimmie Kaiser", "Katelyn Pacheco", "Jeramy Russo", "Horace Townsend", 
  "Brent Chaney", "Rhonda Rogers", "Herman Glass", "Dolores Robinson", "Vera Bauer", "Rico Ballard",
  "Erwin Montoya", "Willa Cohen", "Dominique Mcknight", "Arnold Mccarty", "Elinor Fitzgerald", "Lea Mays",
  "Herb Heath", "Berry Collins", "Lucien Avila", "Guy Burnett", "Mohammed Kerr", "Mallory Krueger"];
    const phones = ["92613581", "88648672", "33470302", "51641477", "54552178", "58010371",
  "84021437", "48031082", "25848997", "67116310", "12898923", "82306176", "88809350", 
  "56129449", "83763762", "67162125", "94923879", "88151755", "99694789", "29345510", 
  "64576231", "27665734", "93382807", "17811065", "24787082", "91359466", "79077572", 
  "55576769", "72273371", "72667224", "21705989", "89964389", "13887692", "20879286", 
  "77733857", "88603916", "69897657", "36326392", "61623425", "67378529", "27333038", 
  "81947793", "47261515", "99082176", "83188294"];
    return queryInterface.bulkInsert('Users', names.map((name, i) => {
      const position_id = Math.floor(Math.random() * 4) + 1;
      return {
        name,
        email: name.toLocaleLowerCase().replace(' ', '') + '@example.com',
        phone: '+380' + phones[i],
        position_id,
        photo: `https://abz-test.s3.eu-central-003.backblazeb2.com/seed${position_id}.jpg`,
        registration_timestamp: Date.now()
      }
    }));
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};
