import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripService } from './trip.service.js';
import { TripController } from './trip.controller.js';
import { Trip } from './entities/trip.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Trip])],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
