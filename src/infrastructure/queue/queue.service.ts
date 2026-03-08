import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants.js';
import { NotificationType } from '../../common/enums/index.js';

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  referenceType?: string;
  referenceId?: string;
}

export interface WalletCreditJobData {
  userId: string;
  amount: number;
  orderId?: string;
  notes?: string;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WALLET) private readonly walletQueue: Queue,
  ) {}

  // --- Email jobs ---

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    await this.emailQueue.add(
      'password-reset',
      {
        to: email,
        subject: 'Reset Password - Nitipin',
        template: 'password-reset',
        context: {
          token,
          resetUrl: `https://nitipin.com/reset-password?token=${token}`,
        },
      } satisfies EmailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    await this.emailQueue.add(
      'verify-email',
      {
        to: email,
        subject: 'Verifikasi Email - Nitipin',
        template: 'verify-email',
        context: {
          token,
          verifyUrl: `https://nitipin.com/verify-email?token=${token}`,
        },
      } satisfies EmailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  async sendOrderStatusEmail(
    email: string,
    orderNumber: string,
    status: string,
  ): Promise<void> {
    await this.emailQueue.add(
      'order-status',
      {
        to: email,
        subject: `Order ${orderNumber} - ${status}`,
        template: 'order-status',
        context: { orderNumber, status },
      } satisfies EmailJobData,
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }

  // --- Notification jobs ---

  async createNotification(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('create', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async sendOrderNotification(
    userId: string,
    orderNumber: string,
    status: string,
    orderId: string,
  ): Promise<void> {
    await this.createNotification({
      userId,
      title: `Order ${orderNumber}`,
      body: `Status updated to: ${status}`,
      type: NotificationType.ORDER_UPDATE,
      referenceType: 'order',
      referenceId: orderId,
    });
  }

  async sendOfferNotification(
    userId: string,
    offerMessage: string,
    offerId: string,
  ): Promise<void> {
    await this.createNotification({
      userId,
      title: 'New Offer',
      body: offerMessage,
      type: NotificationType.NEW_OFFER,
      referenceType: 'offer',
      referenceId: offerId,
    });
  }

  // --- Wallet jobs ---

  async creditWallet(data: WalletCreditJobData): Promise<void> {
    await this.walletQueue.add('credit', data, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async refundToWallet(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<void> {
    await this.walletQueue.add(
      'refund',
      {
        userId,
        amount,
        orderId,
        notes: `Refund for order ${orderId}`,
      } satisfies WalletCreditJobData,
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );
  }
}
