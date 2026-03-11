import { Op } from 'sequelize';
import twilio, { Twilio } from 'twilio';
import { OtpCode } from '../models';
import AppError from '../utils/AppError';
import logger from '../utils/logger';

const OTP_EXPIRY_MINUTES = 10;

let twilioClient: Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export function generateOtp(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

export async function sendOtp(phone: string): Promise<void> {
  // Invalidate existing unused OTPs
  await OtpCode.update(
    { is_used: true },
    {
      where: {
        phone,
        is_used: false,
      },
    }
  );

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OtpCode.create({
    phone,
    code,
    expires_at: expiresAt,
  });

  const shouldSendTwilio = !!twilioClient && !!process.env.TWILIO_PHONE_NUMBER;

  if (shouldSendTwilio) {
    try {
      await twilioClient!.messages.create({
        to: phone,
        from: process.env.TWILIO_PHONE_NUMBER as string,
        body: `Your ServiceFlow OTP is ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      });
      logger.info('OTP sent via Twilio', { phone });
    } catch (err) {
      logger.error('Failed to send OTP via Twilio', { phone, error: (err as Error).message });
    }
  } else {
    logger.info('OTP generated (dev mode, not sent via SMS)', { phone, code });
  }
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const now = new Date();

  const otp = await OtpCode.findOne({
    where: {
      phone,
      is_used: false,
      expires_at: {
        [Op.gt]: now,
      },
    },
    order: [['created_at', 'DESC']],
  });

  if (!otp) {
    throw new AppError('OTP not found', 400, 'OTP_NOT_FOUND');
  }

  otp.attempts += 1;

  if (otp.attempts > 3) {
    otp.is_used = true;
    await otp.save();
    throw new AppError('Maximum OTP attempts exceeded', 400, 'OTP_MAX_ATTEMPTS');
  }

  if (otp.code !== code) {
    await otp.save();
    throw new AppError('Invalid OTP', 400, 'OTP_INVALID');
  }

  if (otp.expires_at <= now) {
    otp.is_used = true;
    await otp.save();
    throw new AppError('OTP expired', 400, 'OTP_EXPIRED');
  }

  otp.is_used = true;
  await otp.save();
  return true;
}

