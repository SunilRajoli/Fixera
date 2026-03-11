import jwt from 'jsonwebtoken';
import sequelize from '../config/sequelize';
import {
  User,
  Technician,
  Wallet,
} from '../models';
import AppError from '../utils/AppError';
import { JwtPayload, UserRole } from '../types';
import * as otpService from './otp.service';

function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(payload, secret as jwt.Secret, { expiresIn } as jwt.SignOptions);
}

export async function register(
  phone: string,
  name: string,
  role: UserRole
): Promise<{ user: User; token: string }> {
  const existing = await User.findOne({ where: { phone } });
  if (existing) {
    throw new AppError('Phone already registered', 409, 'PHONE_EXISTS');
  }

  const transaction = await sequelize.transaction();
  try {
    const user = await User.create(
      {
        phone,
        name,
        role,
        is_active: true,
      },
      { transaction }
    );

    if (role === UserRole.TECHNICIAN) {
      const technician = await Technician.create(
        {
          user_id: user.id,
          city: 'UNKNOWN',
        },
        { transaction }
      );

      await Wallet.create(
        {
          technician_id: technician.id,
        },
        { transaction }
      );
    }

    await transaction.commit();

    const token = signToken({
      userId: user.id,
      role: user.role,
      phone: user.phone,
    });

    return { user, token };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

export async function login(phone: string): Promise<void> {
  const user = await User.findOne({ where: { phone } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.is_active) {
    throw new AppError('User is inactive', 403, 'USER_INACTIVE');
  }

  await otpService.sendOtp(phone);
}

export async function verifyLogin(
  phone: string,
  code: string
): Promise<{ user: User; token: string }> {
  await otpService.verifyOtp(phone, code);

  const user = await User.findOne({
    where: { phone },
    include: [{ model: Technician, as: 'technicianProfile' }],
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
  });

  return { user, token };
}

export async function getMe(userId: string): Promise<User> {
  const user = await User.findByPk(userId, {
    include: [{ model: Technician, as: 'technicianProfile' }],
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}

