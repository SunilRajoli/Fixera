'use strict';

/** Add index on technicians.is_online for matching and admin filters. is_online = technician's choice to be available for jobs (distinct from User.is_active). */
const INDEX_NAME = 'technicians_is_online';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('technicians', ['is_online'], { name: INDEX_NAME });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('technicians', INDEX_NAME);
  },
};
