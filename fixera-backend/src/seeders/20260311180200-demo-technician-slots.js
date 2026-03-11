'use strict';

const { v4: uuidv4 } = require('uuid');

const DEMO_TECH_PHONE = process.env.DEMO_TECH_PHONE || '+919876543211';
const DEMO_TECH_NAME = process.env.DEMO_TECH_NAME || 'Demo Technician';

const SLOTS = [
  { start_time: '09:00', end_time: '11:00' },
  { start_time: '11:00', end_time: '13:00' },
  { start_time: '13:00', end_time: '15:00' },
  { start_time: '15:00', end_time: '17:00' },
];

function nextSevenDays() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    let userId;
    let techId;

    const [existingUser] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE phone = :phone',
      { replacements: { phone: DEMO_TECH_PHONE } }
    );
    if (existingUser && existingUser.length > 0) {
      userId = existingUser[0].id;
      const [techRow] = await queryInterface.sequelize.query(
        'SELECT id FROM technicians WHERE user_id = :id',
        { replacements: { id: userId } }
      );
      if (techRow && techRow.length > 0) {
        return;
      }
      techId = uuidv4();
    } else {
      userId = uuidv4();
      techId = uuidv4();
      await queryInterface.bulkInsert('users', [
        {
          id: userId,
          name: DEMO_TECH_NAME,
          phone: DEMO_TECH_PHONE,
          role: 'TECHNICIAN',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const walletId = uuidv4();

    await queryInterface.bulkInsert('technicians', [
      {
        id: techId,
        user_id: userId,
        verification_status: 'APPROVED',
        rating: 0,
        total_reviews: 0,
        acceptance_rate: 100,
        city: 'Hyderabad',
        service_radius_km: 25,
        is_online: false,
        max_jobs_per_slot: 1,
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        slot_duration_mins: 120,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('wallets', [
      {
        id: walletId,
        technician_id: techId,
        balance: 0,
        locked_balance: 0,
        total_earned: 0,
        total_withdrawn: 0,
      },
    ]);

    const [services] = await queryInterface.sequelize.query('SELECT id FROM services WHERE is_active = true');
    if (services && services.length > 0) {
      await queryInterface.bulkInsert(
        'technician_services',
        services.map((s) => ({
          id: uuidv4(),
          technician_id: techId,
          service_id: s.id,
          years_exp: 0,
          created_at: now,
          updated_at: now,
        }))
      );
    }

    const dates = nextSevenDays();
    const timeSlotRows = [];
    for (const date of dates) {
      for (const slot of SLOTS) {
        timeSlotRows.push({
          id: uuidv4(),
          technician_id: techId,
          date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: 'AVAILABLE',
          booking_id: null,
        });
      }
    }
    if (timeSlotRows.length > 0) {
      await queryInterface.bulkInsert('time_slots', timeSlotRows);
    }
  },

  async down(queryInterface) {
    const DEMO_PHONE = process.env.DEMO_TECH_PHONE || '+919876543211';
    const [users] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE phone = :phone',
      { replacements: { phone: DEMO_PHONE } }
    );
    if (!users || users.length === 0) return;
    const userId = users[0].id;

    const [techs] = await queryInterface.sequelize.query(
      'SELECT id FROM technicians WHERE user_id = :id',
      { replacements: { id: userId } }
    );
    if (techs && techs.length > 0) {
      const techId = techs[0].id;
      await queryInterface.bulkDelete('time_slots', { technician_id: techId }, {});
      await queryInterface.bulkDelete('technician_services', { technician_id: techId }, {});
      await queryInterface.bulkDelete('wallets', { technician_id: techId }, {});
      await queryInterface.bulkDelete('technicians', { id: techId }, {});
    }
    await queryInterface.bulkDelete('users', { id: userId }, {});
  },
};
