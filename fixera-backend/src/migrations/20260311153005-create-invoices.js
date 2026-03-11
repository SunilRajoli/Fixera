/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
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
      service_charge: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      gst_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 18.0,
      },
      gst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      platform_commission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      technician_payout: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      invoice_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('DRAFT', 'ISSUED', 'PAID'),
        allowNull: false,
        defaultValue: 'ISSUED',
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('invoices');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_invoices_status";'
    );
  },
};

