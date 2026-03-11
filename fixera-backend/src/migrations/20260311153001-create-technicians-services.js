/* eslint-disable @typescript-eslint/no-var-requires */
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('technicians', {
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
      verification_status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_reviews: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      acceptance_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1.0,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      service_radius_km: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      bank_account_hash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      id_proof_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      certification_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      photo_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_online: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      max_jobs_per_slot: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      working_hours_start: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '09:00',
      },
      working_hours_end: {
        type: DataTypes.STRING(5),
        allowNull: false,
        defaultValue: '18:00',
      },
      slot_duration_mins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 120,
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

    await queryInterface.addIndex('technicians', ['verification_status']);
    await queryInterface.addIndex('technicians', ['city']);

    await queryInterface.createTable('services', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      inspection_fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable('technician_services', {
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
      years_exp: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addIndex('technician_services', ['technician_id', 'service_id'], {
      unique: true,
      name: 'technician_services_technician_service_unique',
    });

    await queryInterface.createTable('repair_types', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      min_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      max_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('repair_types', ['service_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('repair_types', ['service_id']);
    await queryInterface.dropTable('repair_types');

    await queryInterface.removeIndex('technician_services', 'technician_services_technician_service_unique');
    await queryInterface.dropTable('technician_services');

    await queryInterface.dropTable('services');

    await queryInterface.removeIndex('technicians', ['verification_status']);
    await queryInterface.removeIndex('technicians', ['city']);
    await queryInterface.dropTable('technicians');

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_technicians_verification_status";'
    );
  },
};

