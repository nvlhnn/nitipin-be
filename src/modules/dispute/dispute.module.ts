import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisputeService } from './dispute.service.js';
import { DisputeController } from './dispute.controller.js';
import { Dispute } from './entities/dispute.entity.js';
import { Order } from '../order/entities/order.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Dispute, Order])],
  controllers: [DisputeController],
  providers: [DisputeService],
  exports: [DisputeService],
})
export class DisputeModule {}
