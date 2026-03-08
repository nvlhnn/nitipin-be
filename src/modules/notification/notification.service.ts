import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity.js';
import { NotificationType } from '../../common/enums/index.js';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async findAll(
    userId: string,
    isRead?: boolean,
    page = 1,
    perPage = 20,
  ): Promise<{ data: Notification[]; total: number }> {
    const where: Record<string, unknown> = { user_id: userId };
    if (isRead !== undefined) where.is_read = isRead;

    const [data, total] = await this.notifRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: Math.min(perPage, 50),
    });

    return { data, total };
  }

  async markRead(userId: string, notifId: string): Promise<void> {
    const notif = await this.notifRepo.findOne({
      where: { id: notifId, user_id: userId },
    });
    if (!notif)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Notification not found',
      });

    notif.is_read = true;
    await this.notifRepo.save(notif);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .execute();
  }

  // Called by other services
  async create(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    refType?: string,
    refId?: string,
  ): Promise<Notification> {
    const notif = this.notifRepo.create({
      user_id: userId,
      title,
      body,
      notification_type: type,
      reference_type: refType || null,
      reference_id: refId || null,
    });
    return this.notifRepo.save(notif);
  }
}
