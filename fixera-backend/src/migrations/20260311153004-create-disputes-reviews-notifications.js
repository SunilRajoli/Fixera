/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('disputes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      raised_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(
          'OPEN',
          'UNDER_REVIEW',
          'AWAITING_RESPONSE',
          'RESOLVED',
          'ESCALATED'
        ),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      resolution: {
        type: DataTypes.ENUM(
          'REFUND_CUSTOMER',
          'PAY_TECHNICIAN',
          'PARTIAL_SPLIT'
        ),
        allowNull: true,
      },
      admin_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      resolved_at: {
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

    await queryInterface.createTable('reviews', {
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
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
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

    await queryInterface.createTable('notifications', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.ENUM(
          'BOOKING_CREATED',
          'JOB_ASSIGNED',
          'JOB_ACCEPTED',
          'TECHNICIAN_EN_ROUTE',
          'JOB_STARTED',
          'JOB_COMPLETED',
          'PAYMENT_RECEIVED',
          'PAYOUT_SENT',
          'DISPUTE_OPENED',
          'DISPUTE_RESOLVED',
          'REVIEW_REQUEST',
          'OTP_SENT'
        ),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      read_status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      meta: {
        type: DataTypes.JSONB,
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

    await queryInterface.createTable('technician_locations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      technician_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'technicians',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      tracking_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('technician_locations');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('reviews');
    await queryInterface.dropTable('disputes');

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_disputes_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_disputes_resolution";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_notifications_type";'
    );
  },
};

