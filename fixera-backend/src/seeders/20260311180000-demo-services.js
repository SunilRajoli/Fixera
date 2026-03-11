'use strict';

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const DEMO_SERVICES = [
  { name: 'AC Repair', description: 'AC installation, repair and maintenance', inspection_fee: 299 },
  { name: 'Plumbing', description: 'Pipe repair, leakage, installation', inspection_fee: 249 },
  { name: 'Electrical', description: 'Wiring, switchboard, electrical repairs', inspection_fee: 249 },
  { name: 'Appliance Repair', description: 'Home appliance repair and service', inspection_fee: 299 },
  { name: 'Refrigerator', description: 'Fridge repair and gas refill', inspection_fee: 349 },
  { name: 'Washing Machine', description: 'Washing machine repair and service', inspection_fee: 299 },
];

module.exports = {
  async up(queryInterface) {
    const names = DEMO_SERVICES.map((s) => s.name);
    const [existing] = await queryInterface.sequelize.query(
      "SELECT name FROM services WHERE name IN (:names)",
      { replacements: { names } }
    );
    const existingNames = new Set((existing || []).map((r) => r.name));
    const toInsert = DEMO_SERVICES.filter((s) => !existingNames.has(s.name));
    if (toInsert.length === 0) return;

    const now = new Date();
    await queryInterface.bulkInsert(
      'services',
      toInsert.map((s) => ({
        id: uuidv4(),
        name: s.name,
        description: s.description || null,
        inspection_fee: String(s.inspection_fee),
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('services', {
      name: { [Op.in]: DEMO_SERVICES.map((s) => s.name) },
    }, {});
  },
};
