import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewService } from './review.service.js';
import { ReviewController } from './review.controller.js';
import { Review } from './entities/review.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { User } from '../user/entities/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Order, User])],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
