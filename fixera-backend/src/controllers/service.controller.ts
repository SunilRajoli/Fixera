import { Request, Response, NextFunction } from 'express';
import { Service, RepairType } from '../models';
import { success } from '../utils/response';

export async function getServices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const services = await Service.findAll({ where: { is_active: true } });
    success(res, services, 'Services list');
  } catch (err) {
    next(err);
  }
}

export async function getRepairTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serviceId = req.query.serviceId as string;
    if (!serviceId) {
      return void success(res, [], 'Repair types');
    }
    const types = await RepairType.findAll({ where: { service_id: serviceId, is_active: true } });
    success(res, types, 'Repair types');
  } catch (err) {
    next(err);
  }
}
