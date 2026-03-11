import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { UserRole } from '../types';

interface UserAttributes {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  password_hash?: string | null;
  role: UserRole;
  is_active: boolean;
  device_id?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'email' | 'password_hash' | 'is_active' | 'device_id' | 'created_at' | 'updated_at'
>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string | null;
  public phone!: string;
  public password_hash!: string | null;
  public role!: UserRole;
  public is_active!: boolean;
  public device_id!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'users',
    indexes: [
      { fields: ['phone'] },
      { fields: ['role'] },
    ],
  }
);

