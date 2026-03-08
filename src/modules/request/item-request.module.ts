import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemRequestService } from './item-request.service.js';
import { ItemRequestController } from './item-request.controller.js';
import { ItemRequest } from './entities/item-request.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ItemRequest])],
  controllers: [ItemRequestController],
  providers: [ItemRequestService],
  exports: [ItemRequestService],
})
export class ItemRequestModule {}
