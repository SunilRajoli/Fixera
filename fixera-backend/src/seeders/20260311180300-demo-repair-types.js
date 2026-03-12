'use strict';

const { v4: uuidv4 } = require('uuid');

/** Repair type templates per service name: name, min_price, max_price (INR) */
const REPAIR_TYPES_BY_SERVICE = {
  'AC Repair': [
    { name: 'Gas refill', min_price: 800, max_price: 1500 },
    { name: 'Capacitor replacement', min_price: 400, max_price: 800 },
    { name: 'Compressor repair', min_price: 2000, max_price: 5000 },
    { name: 'General servicing', min_price: 300, max_price: 600 },
  ],
  'Plumbing': [
    { name: 'Tap/faucet repair', min_price: 200, max_price: 500 },
    { name: 'Pipe leakage', min_price: 500, max_price: 2000 },
    { name: 'Drain cleaning', min_price: 300, max_price: 800 },
    { name: 'New installation', min_price: 1000, max_price: 5000 },
  ],
  'Electrical': [
    { name: 'Switch/socket repair', min_price: 150, max_price: 400 },
    { name: 'Wiring repair', min_price: 500, max_price: 2000 },
    { name: 'MCB replacement', min_price: 300, max_price: 800 },
    { name: 'Full rewiring', min_price: 3000, max_price: 15000 },
  ],
  'Appliance Repair': [
    { name: 'Minor repair', min_price: 300, max_price: 800 },
    { name: 'Part replacement', min_price: 500, max_price: 2500 },
    { name: 'Major repair', min_price: 1000, max_price: 5000 },
  ],
  'Refrigerator': [
    { name: 'Gas refill', min_price: 1000, max_price: 2500 },
    { name: 'Thermostat replacement', min_price: 400, max_price: 900 },
    { name: 'Compressor repair', min_price: 2500, max_price: 6000 },
  ],
  'Washing Machine': [
    { name: 'Drum belt replacement', min_price: 400, max_price: 1000 },
    { name: 'Motor repair', min_price: 800, max_price: 2500 },
    { name: 'Drain pump replacement', min_price: 500, max_price: 1200 },
  ],
};

module.exports = {
  async up(queryInterface) {
    const [services] = await queryInterface.sequelize.query(
      "SELECT id, name FROM services WHERE is_active = true"
    );
    if (!services || services.length === 0) return;

    const now = new Date();
    const toInsert = [];

    for (const svc of services) {
      const templates = REPAIR_TYPES_BY_SERVICE[svc.name];
      if (!templates) continue;

      const [existing] = await queryInterface.sequelize.query(
        "SELECT id FROM repair_types WHERE service_id = :id LIMIT 1",
        { replacements: { id: svc.id } }
      );
      if (existing && existing.length > 0) continue;

      for (const t of templates) {
        toInsert.push({
          id: uuidv4(),
          service_id: svc.id,
          name: t.name,
          min_price: String(t.min_price),
          max_price: String(t.max_price),
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert('repair_types', toInsert);
    }
  },

  async down(queryInterface) {
    const names = Object.keys(REPAIR_TYPES_BY_SERVICE);
    const [services] = await queryInterface.sequelize.query(
      "SELECT id FROM services WHERE name IN (:names)",
      { replacements: { names } }
    );
    if (!services || services.length === 0) return;
    const ids = services.map((s) => s.id);
    await queryInterface.bulkDelete('repair_types', { service_id: ids }, {});
  },
};
