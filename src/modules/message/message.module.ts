import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageService } from './message.service.js';
import { MessageController } from './message.controller.js';
import { Message } from './entities/message.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { Offer } from '../offer/entities/offer.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Order, Offer])],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
