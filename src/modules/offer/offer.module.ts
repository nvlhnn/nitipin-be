import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferService } from './offer.service.js';
import { OfferController } from './offer.controller.js';
import { Offer } from './entities/offer.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { Trip } from '../trip/entities/trip.entity.js';
import { ItemRequest } from '../request/entities/item-request.entity.js';
import { QueueModule } from '../../infrastructure/queue/queue.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Offer, Order, Trip, ItemRequest]),
    QueueModule,
  ],
  controllers: [OfferController],
  providers: [OfferService],
  exports: [OfferService],
})
export class OfferModule {}
