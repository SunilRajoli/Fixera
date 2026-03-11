import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/sequelize';
import {
  PaymentMethod,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
  PayoutStatus,
} from '../types';

// Payment
interface PaymentAttributes {
  id: string;
  booking_id: string;
  customer_id: string;
  amount: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  gateway_ref?: string | null;
  refund_status?: string | null;
  refund_initiated_at?: Date | null;
  refund_completed_at?: Date | null;
}

type PaymentCreationAttributes = Optional<
  PaymentAttributes,
  | 'id'
  | 'status'
  | 'gateway_ref'
  | 'refund_status'
  | 'refund_initiated_at'
  | 'refund_completed_at'
>;

export class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: string;
  public booking_id!: string;
  public customer_id!: string;
  public amount!: string;
  public payment_method!: PaymentMethod;
  public status!: PaymentStatus;
  public gateway_ref!: string | null;
  public refund_status!: string | null;
  public refund_initiated_at!: Date | null;
  public refund_completed_at!: Date | null;
}

Payment.init(
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
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING,
    },
    gateway_ref: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refund_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refund_initiated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    refund_completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payments',
  }
);

// Wallet
interface WalletAttributes {
  id: string;
  technician_id: string;
  balance: string;
  locked_balance: string;
  total_earned: string;
  total_withdrawn: string;
}

type WalletCreationAttributes = Optional<
  WalletAttributes,
  'id' | 'balance' | 'locked_balance' | 'total_earned' | 'total_withdrawn'
>;

export class Wallet
  extends Model<WalletAttributes, WalletCreationAttributes>
  implements WalletAttributes
{
  public id!: string;
  public technician_id!: string;
  public balance!: string;
  public locked_balance!: string;
  public total_earned!: string;
  public total_withdrawn!: string;
}

Wallet.init(
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
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    locked_balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_earned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_withdrawn: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'wallets',
  }
);

// Transaction
interface TransactionAttributes {
  id: string;
  wallet_id: string;
  booking_id?: string | null;
  type: TransactionType;
  amount: string;
  status: TransactionStatus;
  withdrawable_at?: Date | null;
  note?: string | null;
}

type TransactionCreationAttributes = Optional<
  TransactionAttributes,
  'id' | 'booking_id' | 'status' | 'withdrawable_at' | 'note'
>;

export class Transaction
  extends Model<TransactionAttributes, TransactionCreationAttributes>
  implements TransactionAttributes
{
  public id!: string;
  public wallet_id!: string;
  public booking_id!: string | null;
  public type!: TransactionType;
  public amount!: string;
  public status!: TransactionStatus;
  public withdrawable_at!: Date | null;
  public note!: string | null;
}

Transaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    booking_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TransactionType)),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TransactionStatus)),
      allowNull: false,
      defaultValue: TransactionStatus.PENDING,
    },
    withdrawable_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'transactions',
  }
);

// Payout
interface PayoutAttributes {
  id: string;
  technician_id: string;
  wallet_id: string;
  amount: string;
  status: PayoutStatus;
  retry_count: number;
  bank_ref?: string | null;
  failed_reason?: string | null;
  processed_at?: Date | null;
}

type PayoutCreationAttributes = Optional<
  PayoutAttributes,
  'id' | 'status' | 'retry_count' | 'bank_ref' | 'failed_reason' | 'processed_at'
>;

export class Payout
  extends Model<PayoutAttributes, PayoutCreationAttributes>
  implements PayoutAttributes
{
  public id!: string;
  public technician_id!: string;
  public wallet_id!: string;
  public amount!: string;
  public status!: PayoutStatus;
  public retry_count!: number;
  public bank_ref!: string | null;
  public failed_reason!: string | null;
  public processed_at!: Date | null;
}

Payout.init(
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
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PayoutStatus)),
      allowNull: false,
      defaultValue: PayoutStatus.PENDING,
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bank_ref: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    failed_reason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payouts',
  }
);

