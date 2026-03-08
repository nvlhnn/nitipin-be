import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { Order } from './entities/order.entity.js';
import { QueueModule } from '../../infrastructure/queue/queue.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), QueueModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
