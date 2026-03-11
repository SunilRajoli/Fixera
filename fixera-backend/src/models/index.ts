import sequelize from '../config/sequelize';

import { User } from './User';
import { OtpCode } from './OtpCode';
import { Technician } from './Technician';
import { Service, TechnicianService, RepairType } from './Service';
import { Booking, Job } from './Booking';
import { TimeSlot } from './TimeSlot';
import { Payment, Wallet, Transaction, Payout } from './Payment';
import {
  Dispute,
  Review,
  Notification,
  TechnicianLocation,
} from './Misc';
import { Invoice } from './Invoice';

// Associations

User.hasOne(Technician, { foreignKey: 'user_id', as: 'technicianProfile' });
Technician.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Booking, { foreignKey: 'customer_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Technician.belongsToMany(Service, {
  through: TechnicianService,
  foreignKey: 'technician_id',
  otherKey: 'service_id',
  as: 'services',
});
Service.belongsToMany(Technician, {
  through: TechnicianService,
  foreignKey: 'service_id',
  otherKey: 'technician_id',
  as: 'technicians',
});

Service.hasMany(RepairType, { foreignKey: 'service_id', as: 'repairTypes' });
RepairType.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

Booking.hasOne(Job, { foreignKey: 'booking_id', as: 'job' });
Job.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.belongsTo(TimeSlot, { foreignKey: 'slot_id', as: 'slot' });
TimeSlot.hasMany(Booking, { foreignKey: 'slot_id', as: 'bookings' });

Booking.hasOne(Payment, { foreignKey: 'booking_id', as: 'payment' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasOne(Dispute, { foreignKey: 'booking_id', as: 'dispute' });
Dispute.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasOne(Review, { foreignKey: 'booking_id', as: 'review' });
Review.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasOne(Invoice, { foreignKey: 'booking_id', as: 'invoice' });
Invoice.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

User.hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });
Invoice.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

Technician.hasMany(Invoice, { foreignKey: 'technician_id', as: 'invoices' });
Invoice.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });

Technician.hasMany(Job, { foreignKey: 'technician_id', as: 'jobs' });
Job.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });

Technician.hasOne(Wallet, { foreignKey: 'technician_id', as: 'wallet' });
Wallet.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });

Technician.hasMany(Payout, { foreignKey: 'technician_id', as: 'payouts' });
Payout.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });

Technician.hasOne(TechnicianLocation, {
  foreignKey: 'technician_id',
  as: 'location',
});
TechnicianLocation.belongsTo(Technician, {
  foreignKey: 'technician_id',
  as: 'technician',
});

Wallet.hasMany(Transaction, { foreignKey: 'wallet_id', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

export {
  sequelize,
  User,
  OtpCode,
  Technician,
  Service,
  TechnicianService,
  RepairType,
  Booking,
  Job,
  TimeSlot,
  Payment,
  Wallet,
  Transaction,
  Payout,
  Dispute,
  Review,
  Notification,
  TechnicianLocation,
  Invoice,
};


