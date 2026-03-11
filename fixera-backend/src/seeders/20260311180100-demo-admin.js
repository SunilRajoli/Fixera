'use strict';

const { v4: uuidv4 } = require('uuid');

// Default admin user — use this phone on the login page to get OTP (check terminal for code in dev)
const ADMIN_PHONE = process.env.ADMIN_PHONE || '+919876543210';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Fixera Admin';

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE phone = :phone',
      { replacements: { phone: ADMIN_PHONE } }
    );
    if (existing && existing.length > 0) return;

    const now = new Date();
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        name: ADMIN_NAME,
        phone: ADMIN_PHONE,
        role: 'ADMIN',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    const ADMIN_PHONE = process.env.ADMIN_PHONE || '+919876543210';
    await queryInterface.bulkDelete('users', { phone: ADMIN_PHONE }, {});
  },
};
