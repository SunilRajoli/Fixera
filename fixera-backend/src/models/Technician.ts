import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import { VerificationStatus } from '../types';

/**
 * Technician profile (linked to User).
 * - is_online: Technician's choice to be available for jobs. Toggled by the technician (on/off).
 *   Used for matching and admin assign dropdown. Distinct from User.is_active (account active,
 *   admin-only; when false the account is deactivated).
 */
interface TechnicianAttributes {
  id: string;
  user_id: string;
  verification_status: VerificationStatus;
  rating: string;
  total_reviews: number;
  acceptance_rate: string;
  city: string;
  service_radius_km: number;
  bank_account_hash?: string | null;
  id_proof_url?: string | null;
  certification_url?: string | null;
  photo_url?: string | null;
  /** Technician availability: true = accepting jobs, false = offline. User toggles this. */
  is_online: boolean;
  max_jobs_per_slot: number;
  working_hours_start: string;
  working_hours_end: string;
  slot_duration_mins: number;
  created_at?: Date;
  updated_at?: Date;
}

type TechnicianCreationAttributes = Optional<
  TechnicianAttributes,
  | 'id'
  | 'verification_status'
  | 'rating'
  | 'total_reviews'
  | 'acceptance_rate'
  | 'service_radius_km'
  | 'bank_account_hash'
  | 'id_proof_url'
  | 'certification_url'
  | 'photo_url'
  | 'is_online'
  | 'max_jobs_per_slot'
  | 'working_hours_start'
  | 'working_hours_end'
  | 'slot_duration_mins'
  | 'created_at'
  | 'updated_at'
>;

export class Technician
  extends Model<TechnicianAttributes, TechnicianCreationAttributes>
  implements TechnicianAttributes
{
  public id!: string;
  public user_id!: string;
  public verification_status!: VerificationStatus;
  public rating!: string;
  public total_reviews!: number;
  public acceptance_rate!: string;
  public city!: string;
  public service_radius_km!: number;
  public bank_account_hash!: string | null;
  public id_proof_url!: string | null;
  public certification_url!: string | null;
  public photo_url!: string | null;
  public is_online!: boolean;
  public max_jobs_per_slot!: number;
  public working_hours_start!: string;
  public working_hours_end!: string;
  public slot_duration_mins!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Technician.init(
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
    verification_status: {
      type: DataTypes.ENUM(...Object.values(VerificationStatus)),
      allowNull: false,
      defaultValue: VerificationStatus.PENDING,
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
    tableName: 'technicians',
    indexes: [
      { fields: ['verification_status'] },
      { fields: ['city'] },
      { fields: ['is_online'] },
    ],
  }
);

