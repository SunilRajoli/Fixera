/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
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
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.ENUM('UPI', 'CARD', 'WALLET', 'CASH'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'CAPTURED', 'REFUNDED', 'FAILED', 'DISPUTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      gateway_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      refund_status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      refund_initiated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refund_completed_at: {
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

    await queryInterface.createTable('wallets', {
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
      balance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      locked_balance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_earned: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_withdrawn: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.createTable('transactions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      wallet_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'wallets',
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
      type: {
        type: DataTypes.ENUM(
          'CREDIT',
          'DEBIT',
          'HOLD',
          'RELEASE',
          'REFUND',
          'COMMISSION',
          'PAYOUT'
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      withdrawable_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      note: {
        type: DataTypes.STRING,
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

    await queryInterface.createTable('payouts', {
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
      wallet_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSED', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      retry_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      bank_ref: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      failed_reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      processed_at: {
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payouts');
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('wallets');
    await queryInterface.dropTable('payments');

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_payment_method";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_transactions_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_transactions_status";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payouts_status";'
    );
  },
};

