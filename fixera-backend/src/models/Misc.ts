import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { DisputeResolution, DisputeStatus, NotificationType } from '../types';

// Dispute
interface DisputeAttributes {
  id: string;
  booking_id: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolution?: DisputeResolution | null;
  admin_note?: string | null;
  resolved_by?: string | null;
  resolved_at?: Date | null;
}

type DisputeCreationAttributes = Optional<
  DisputeAttributes,
  'id' | 'status' | 'resolution' | 'admin_note' | 'resolved_by' | 'resolved_at'
>;

export class Dispute
  extends Model<DisputeAttributes, DisputeCreationAttributes>
  implements DisputeAttributes
{
  public id!: string;
  public booking_id!: string;
  public raised_by!: string;
  public reason!: string;
  public status!: DisputeStatus;
  public resolution!: DisputeResolution | null;
  public admin_note!: string | null;
  public resolved_by!: string | null;
  public resolved_at!: Date | null;
}

Dispute.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    raised_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(DisputeStatus)),
      allowNull: false,
      defaultValue: DisputeStatus.OPEN,
    },
    resolution: {
      type: DataTypes.ENUM(...Object.values(DisputeResolution)),
      allowNull: true,
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resolved_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'disputes',
  }
);

// Review
interface ReviewAttributes {
  id: string;
  booking_id: string;
  customer_id: string;
  technician_id: string;
  rating: number;
  comment?: string | null;
  ip_address?: string | null;
}

type ReviewCreationAttributes = Optional<
  ReviewAttributes,
  'id' | 'comment' | 'ip_address'
>;

export class Review
  extends Model<ReviewAttributes, ReviewCreationAttributes>
  implements ReviewAttributes
{
  public id!: string;
  public booking_id!: string;
  public customer_id!: string;
  public technician_id!: string;
  public rating!: number;
  public comment!: string | null;
  public ip_address!: string | null;
}

Review.init(
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
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'reviews',
  }
);

// Notification
interface NotificationAttributes {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_status: boolean;
  meta?: object | null;
}

type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  'id' | 'read_status' | 'meta'
>;

export class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  public id!: string;
  public user_id!: string;
  public type!: NotificationType;
  public title!: string;
  public message!: string;
  public read_status!: boolean;
  public meta!: object | null;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(NotificationType)),
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
  },
  {
    sequelize,
    tableName: 'notifications',
  }
);

// TechnicianLocation
interface TechnicianLocationAttributes {
  id: string;
  technician_id: string;
  booking_id?: string | null;
  latitude: string;
  longitude: string;
  tracking_active: boolean;
}

type TechnicianLocationCreationAttributes = Optional<
  TechnicianLocationAttributes,
  'id' | 'booking_id' | 'tracking_active'
>;

export class TechnicianLocation
  extends Model<TechnicianLocationAttributes, TechnicianLocationCreationAttributes>
  implements TechnicianLocationAttributes
{
  public id!: string;
  public technician_id!: string;
  public booking_id!: string | null;
  public latitude!: string;
  public longitude!: string;
  public tracking_active!: boolean;
}

TechnicianLocation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    technician_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: true,
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
  },
  {
    sequelize,
    tableName: 'technician_locations',
  }
);

