import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { TripModule } from './modules/trip/trip.module.js';
import { ItemRequestModule } from './modules/request/item-request.module.js';
import { OfferModule } from './modules/offer/offer.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { MessageModule } from './modules/message/message.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { ReviewModule } from './modules/review/review.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { DisputeModule } from './modules/dispute/dispute.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { EventsModule } from './infrastructure/events/events.module.js';
import { SchedulerModule } from './infrastructure/scheduler/scheduler.module.js';
import { QueueModule } from './infrastructure/queue/queue.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    TripModule,
    ItemRequestModule,
    OfferModule,
    OrderModule,
    MessageModule,
    WalletModule,
    ReviewModule,
    NotificationModule,
    DisputeModule,
    UploadModule,
    HealthModule,
    EventsModule,
    SchedulerModule,
    QueueModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
