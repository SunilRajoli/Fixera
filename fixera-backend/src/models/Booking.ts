import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { BookingStatus, PaymentMethod } from '../types';

// Booking
interface BookingAttributes {
  id: string;
  customer_id: string;
  service_id: string;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
  status: BookingStatus;
  scheduled_time: Date;
  slot_id?: string | null;
  matching_attempts: number;
  inspection_fee?: string | null;
  repair_cost?: string | null;
  repair_type_id?: string | null;
  payment_method?: PaymentMethod | null;
  auto_confirm_at?: Date | null;
  dispute_window_end?: Date | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
}

type BookingCreationAttributes = Optional<
  BookingAttributes,
  | 'id'
  | 'status'
  | 'slot_id'
  | 'matching_attempts'
  | 'inspection_fee'
  | 'repair_cost'
  | 'repair_type_id'
  | 'payment_method'
  | 'auto_confirm_at'
  | 'dispute_window_end'
  | 'cancelled_by'
  | 'cancel_reason'
>;

export class Booking
  extends Model<BookingAttributes, BookingCreationAttributes>
  implements BookingAttributes
{
  public id!: string;
  public customer_id!: string;
  public service_id!: string;
  public description!: string;
  public address!: string;
  public latitude!: string;
  public longitude!: string;
  public status!: BookingStatus;
  public scheduled_time!: Date;
  public slot_id!: string | null;
  public matching_attempts!: number;
  public inspection_fee!: string | null;
  public repair_cost!: string | null;
  public repair_type_id!: string | null;
  public payment_method!: PaymentMethod | null;
  public auto_confirm_at!: Date | null;
  public dispute_window_end!: Date | null;
  public cancelled_by!: string | null;
  public cancel_reason!: string | null;
}

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
      type: DataTypes.ENUM(...Object.values(BookingStatus)),
      allowNull: false,
      defaultValue: BookingStatus.PENDING,
    },
    scheduled_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    slot_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
    },
    payment_method: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
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
  },
  {
    sequelize,
    tableName: 'bookings',
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['status'] },
      { fields: ['scheduled_time'] },
    ],
  }
);

// Job
interface JobAttributes {
  id: string;
  booking_id: string;
  technician_id: string;
  assigned_at: Date;
  accepted_at?: Date | null;
  started_at?: Date | null;
  completed_at?: Date | null;
}

type JobCreationAttributes = Optional<
  JobAttributes,
  'id' | 'assigned_at' | 'accepted_at' | 'started_at' | 'completed_at'
>;

export class Job
  extends Model<JobAttributes, JobCreationAttributes>
  implements JobAttributes
{
  public id!: string;
  public booking_id!: string;
  public technician_id!: string;
  public assigned_at!: Date;
  public accepted_at!: Date | null;
  public started_at!: Date | null;
  public completed_at!: Date | null;
}

Job.init(
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
    technician_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
  },
  {
    sequelize,
    tableName: 'jobs',
    indexes: [{ fields: ['technician_id'] }],
  }
);

