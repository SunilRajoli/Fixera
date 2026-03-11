import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { SlotStatus } from '../types';

interface TimeSlotAttributes {
  id: string;
  technician_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  booking_id?: string | null;
}

type TimeSlotCreationAttributes = Optional<
  TimeSlotAttributes,
  'id' | 'status' | 'booking_id'
>;

export class TimeSlot
  extends Model<TimeSlotAttributes, TimeSlotCreationAttributes>
  implements TimeSlotAttributes
{
  public id!: string;
  public technician_id!: string;
  public date!: string;
  public start_time!: string;
  public end_time!: string;
  public status!: SlotStatus;
  public booking_id!: string | null;
}

TimeSlot.init(
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    end_time: {
      type: DataTypes.STRING(5),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SlotStatus)),
      allowNull: false,
      defaultValue: SlotStatus.AVAILABLE,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'time_slots',
    indexes: [
      { fields: ['technician_id', 'date'] },
      { fields: ['status'] },
    ],
  }
);

