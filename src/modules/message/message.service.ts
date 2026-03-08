import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Message } from './entities/message.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { Offer } from '../offer/entities/offer.entity.js';
import { SendMessageDto } from './dto/message.dto.js';
import { MessageType } from '../../common/enums/index.js';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
  ) {}

  // --- Order Messages ---

  async getOrderMessages(
    userId: string,
    orderId: string,
    page = 1,
    perPage = 50,
  ): Promise<{ data: Message[]; total: number }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
    });
    if (!order)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    if (order.traveler_id !== userId && order.requester_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your order',
      });
    }

    const [data, total] = await this.messageRepo.findAndCount({
      where: { order_id: orderId },
      relations: ['sender'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: Math.min(perPage, 100),
    });

    return { data: data.reverse(), total };
  }

  async sendOrderMessage(
    userId: string,
    orderId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
    });
    if (!order)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    if (order.traveler_id !== userId && order.requester_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your order',
      });
    }

    if (!dto.content && !dto.image_url) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Message must have content or image',
      });
    }

    const message = this.messageRepo.create({
      order_id: orderId,
      sender_id: userId,
      content: dto.content || null,
      image_url: dto.image_url || null,
      message_type: dto.image_url ? MessageType.IMAGE : MessageType.TEXT,
    });

    const saved = await this.messageRepo.save(message);
    return this.messageRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['sender'],
    });
  }

  async markOrderMessagesRead(userId: string, orderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
    });
    if (!order)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    if (order.traveler_id !== userId && order.requester_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your order',
      });
    }

    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .where('order_id = :orderId', { orderId })
      .andWhere('sender_id != :userId', { userId })
      .andWhere('is_read = false')
      .execute();
  }

  // --- Offer Messages ---

  async getOfferMessages(
    userId: string,
    offerId: string,
    page = 1,
    perPage = 50,
  ): Promise<{ data: Message[]; total: number }> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Offer not found',
      });
    if (offer.from_user_id !== userId && offer.to_user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your offer',
      });
    }

    const [data, total] = await this.messageRepo.findAndCount({
      where: { offer_id: offerId },
      relations: ['sender'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: Math.min(perPage, 100),
    });

    return { data: data.reverse(), total };
  }

  async sendOfferMessage(
    userId: string,
    offerId: string,
    dto: SendMessageDto,
  ): Promise<Message> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Offer not found',
      });
    if (offer.from_user_id !== userId && offer.to_user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your offer',
      });
    }

    if (!dto.content && !dto.image_url) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Message must have content or image',
      });
    }

    const message = this.messageRepo.create({
      offer_id: offerId,
      sender_id: userId,
      content: dto.content || null,
      image_url: dto.image_url || null,
      message_type: dto.image_url ? MessageType.IMAGE : MessageType.TEXT,
    });

    const saved = await this.messageRepo.save(message);
    return this.messageRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['sender'],
    });
  }
}
