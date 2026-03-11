import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface OtpCodeAttributes {
  id: string;
  phone: string;
  code: string;
  attempts: number;
  is_used: boolean;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

type OtpCodeCreationAttributes = Optional<
  OtpCodeAttributes,
  'id' | 'attempts' | 'is_used' | 'created_at' | 'updated_at'
>;

export class OtpCode
  extends Model<OtpCodeAttributes, OtpCodeCreationAttributes>
  implements OtpCodeAttributes
{
  public id!: string;
  public phone!: string;
  public code!: string;
  public attempts!: number;
  public is_used!: boolean;
  public expires_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

OtpCode.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: 'otp_codes',
    indexes: [{ fields: ['phone'] }],
  }
);

