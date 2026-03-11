import { NextFunction, Request, Response } from 'express';
import * as jobService from '../services/job.service';
import { Technician } from '../models';
import { success as successResponse } from '../utils/response';
import AppError from '../utils/AppError';

async function getTechnicianId(userId: string): Promise<string> {
  const technician = await Technician.findOne({
    where: { user_id: userId },
  });
  if (!technician) {
    throw new AppError('Technician profile not found', 403, 'FORBIDDEN');
  }
  return technician.id;
}

export async function getTechnicianJobs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const filter = (req.query.filter as string) || 'today';

    const jobs = await jobService.getTechnicianJobs(
      req.user.userId,
      filter === 'upcoming' || filter === 'completed'
        ? (filter as 'upcoming' | 'completed')
        : 'today'
    );

    successResponse(res, jobs, 'Jobs');
  } catch (err) {
    next(err);
  }
}

export async function acceptJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const job = await jobService.acceptJob(String(req.params.id), technicianId);
    successResponse(res, job, 'Job accepted');
  } catch (err) {
    next(err);
  }
}

export async function rejectJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    await jobService.rejectJob(String(req.params.id), technicianId);
    successResponse(res, { ok: true }, 'Job rejected');
  } catch (err) {
    next(err);
  }
}

export async function startTravel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const job = await jobService.startTravel(String(req.params.id), technicianId);
    successResponse(res, job, 'Travel started');
  } catch (err) {
    next(err);
  }
}

export async function startJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const job = await jobService.startJob(String(req.params.id), technicianId);
    successResponse(res, job, 'Job started');
  } catch (err) {
    next(err);
  }
}

export async function completeJob(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    const technicianId = await getTechnicianId(req.user.userId);
    const job = await jobService.completeJob(String(req.params.id), technicianId);
    successResponse(res, job, 'Job completed');
  } catch (err) {
    next(err);
  }
}

