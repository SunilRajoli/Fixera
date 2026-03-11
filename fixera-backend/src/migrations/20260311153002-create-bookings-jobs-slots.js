/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('time_slots', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      technician_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'technicians',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      end_time: {
        type: DataTypes.STRING(5),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('AVAILABLE', 'HELD', 'BOOKED', 'RELEASED'),
        allowNull: false,
        defaultValue: 'AVAILABLE',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('time_slots', ['technician_id', 'date']);
    await queryInterface.addIndex('time_slots', ['status']);

    await queryInterface.createTable('bookings', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'services',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING(300),
        allowNull: false,
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          'PENDING',
          'MATCHING',
          'ASSIGNED',
          'ACCEPTED',
          'ON_THE_WAY',
          'IN_PROGRESS',
          'COMPLETED',
          'PAYMENT_HELD',
          'CONFIRMED',
          'CLOSED',
          'REASSIGNING',
          'CANCELLED',
          'FAILED',
          'DISPUTED'
        ),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      scheduled_time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      slot_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'time_slots',
          key: 'id',
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      matching_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      inspection_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      repair_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      repair_type_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'repair_types',
          key: 'id',
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      payment_method: {
        type: DataTypes.ENUM('UPI', 'CARD', 'WALLET', 'CASH'),
        allowNull: true,
      },
      auto_confirm_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dispute_window_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelled_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      cancel_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('bookings', ['customer_id']);
    await queryInterface.addIndex('bookings', ['status']);
    await queryInterface.addIndex('bookings', ['scheduled_time']);

    await queryInterface.createTable('jobs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      technician_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'technicians',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('jobs', ['technician_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('jobs', ['technician_id']);
    await queryInterface.dropTable('jobs');

    await queryInterface.removeIndex('bookings', ['customer_id']);
    await queryInterface.removeIndex('bookings', ['status']);
    await queryInterface.removeIndex('bookings', ['scheduled_time']);
    await queryInterface.dropTable('bookings');

    await queryInterface.removeIndex('time_slots', ['technician_id', 'date']);
    await queryInterface.removeIndex('time_slots', ['status']);
    await queryInterface.dropTable('time_slots');

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_time_slots_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_bookings_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_bookings_payment_method";'
    );
  },
};

