import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway.js';
import { Message } from '../../modules/message/entities/message.entity.js';
import { Order } from '../../modules/order/entities/order.entity.js';
import { Offer } from '../../modules/offer/entities/offer.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Order, Offer]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
