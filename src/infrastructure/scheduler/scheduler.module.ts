import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledTasksService } from './scheduled-tasks.service.js';
import { Order } from '../../modules/order/entities/order.entity.js';
import { Offer } from '../../modules/offer/entities/offer.entity.js';
import { ItemRequest } from '../../modules/request/entities/item-request.entity.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Order, Offer, ItemRequest]),
    QueueModule,
  ],
  providers: [ScheduledTasksService],
})
export class SchedulerModule {}
