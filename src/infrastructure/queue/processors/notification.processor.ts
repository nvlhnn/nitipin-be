import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { Notification } from '../../../modules/notification/entities/notification.entity.js';
import type { NotificationJobData } from '../queue.service.js';

@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, title, body, type, referenceType, referenceId } = job.data;

    this.logger.log(`Processing notification: ${type} → user ${userId}`);

    // Save to database
    const notification = this.notifRepo.create({
      user_id: userId,
      title,
      body,
      notification_type: type,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
    });
    await this.notifRepo.save(notification);

    // TODO: Push notification via FCM / APNs
    // await this.fcmService.send(userId, { title, body, data: { type, referenceId } });

    this.logger.log(`Notification created: ${notification.id}`);
  }
}
