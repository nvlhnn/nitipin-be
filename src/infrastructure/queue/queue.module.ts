import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailProcessor } from './processors/email.processor.js';
import { NotificationProcessor } from './processors/notification.processor.js';
import { WalletProcessor } from './processors/wallet.processor.js';
import { QueueService } from './queue.service.js';
import { Notification } from '../../modules/notification/entities/notification.entity.js';
import { Wallet } from '../../modules/wallet/entities/wallet.entity.js';
import { WalletTransaction } from '../../modules/wallet/entities/wallet-transaction.entity.js';
import { QUEUE_NAMES } from './queue.constants.js';

@Module({
  imports: [
    // Global BullMQ connection
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD', ''),
        },
      }),
    }),
    // Register queues
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.WALLET },
    ),
    TypeOrmModule.forFeature([Notification, Wallet, WalletTransaction]),
  ],
  providers: [
    QueueService,
    EmailProcessor,
    NotificationProcessor,
    WalletProcessor,
  ],
  exports: [QueueService],
})
export class QueueModule {}
