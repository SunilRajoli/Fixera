import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';

interface InvoiceAttributes {
  id: string;
  booking_id: string;
  customer_id: string;
  technician_id: string;
  service_charge: string;
  gst_rate: string;
  gst_amount: string;
  total_amount: string;
  platform_commission: string;
  technician_payout: string;
  invoice_number: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID';
  issued_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

type InvoiceCreationAttributes = Optional<
  InvoiceAttributes,
  'id' | 'gst_rate' | 'status' | 'issued_at' | 'created_at' | 'updated_at'
>;

export class Invoice
  extends Model<InvoiceAttributes, InvoiceCreationAttributes>
  implements InvoiceAttributes
{
  public id!: string;
  public booking_id!: string;
  public customer_id!: string;
  public technician_id!: string;
  public service_charge!: string;
  public gst_rate!: string;
  public gst_amount!: string;
  public total_amount!: string;
  public platform_commission!: string;
  public technician_payout!: string;
  public invoice_number!: string;
  public status!: 'DRAFT' | 'ISSUED' | 'PAID';
  public issued_at!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Invoice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    technician_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
      defaultValue: DataTypes.NOW,
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
    tableName: 'invoices',
  }
);

