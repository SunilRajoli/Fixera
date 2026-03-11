import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

// Service
interface ServiceAttributes {
  id: string;
  name: string;
  description?: string | null;
  inspection_fee: string;
  is_active: boolean;
}

type ServiceCreationAttributes = Optional<
  ServiceAttributes,
  'id' | 'description' | 'is_active'
>;

export class Service
  extends Model<ServiceAttributes, ServiceCreationAttributes>
  implements ServiceAttributes
{
  public id!: string;
  public name!: string;
  public description!: string | null;
  public inspection_fee!: string;
  public is_active!: boolean;
}

Service.init(
  {
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
  },
  {
    sequelize,
    tableName: 'services',
  }
);

// TechnicianService
interface TechnicianServiceAttributes {
  id: string;
  technician_id: string;
  service_id: string;
  years_exp: number;
}

type TechnicianServiceCreationAttributes = Optional<
  TechnicianServiceAttributes,
  'id' | 'years_exp'
>;

export class TechnicianService
  extends Model<TechnicianServiceAttributes, TechnicianServiceCreationAttributes>
  implements TechnicianServiceAttributes
{
  public id!: string;
  public technician_id!: string;
  public service_id!: string;
  public years_exp!: number;
}

TechnicianService.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    technician_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    years_exp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'technician_services',
    indexes: [
      {
        unique: true,
        fields: ['technician_id', 'service_id'],
      },
    ],
  }
);

// RepairType
interface RepairTypeAttributes {
  id: string;
  service_id: string;
  name: string;
  min_price: string;
  max_price: string;
  is_active: boolean;
}

type RepairTypeCreationAttributes = Optional<RepairTypeAttributes, 'id' | 'is_active'>;

export class RepairType
  extends Model<RepairTypeAttributes, RepairTypeCreationAttributes>
  implements RepairTypeAttributes
{
  public id!: string;
  public service_id!: string;
  public name!: string;
  public min_price!: string;
  public max_price!: string;
  public is_active!: boolean;
}

RepairType.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
  },
  {
    sequelize,
    tableName: 'repair_types',
    indexes: [{ fields: ['service_id'] }],
  }
);

