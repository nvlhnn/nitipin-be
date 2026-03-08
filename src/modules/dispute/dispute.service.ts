import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Dispute } from './entities/dispute.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { DisputeStatus, OrderStatus } from '../../common/enums/index.js';

export class CreateDisputeDto {
  reason!: string;
  evidence_urls?: string[];
}

export class UpdateDisputeDto {
  status?: string;
  resolution_notes?: string;
}

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(
    userId: string,
    orderId: string,
    reason: string,
    evidenceUrls?: string[],
  ): Promise<Dispute> {
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

    if (
      ![
        OrderStatus.PURCHASED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ].includes(order.status)
    ) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Cannot dispute this order',
      });
    }

    // Check for existing open dispute
    const existing = await this.disputeRepo.findOne({
      where: { order_id: orderId, status: DisputeStatus.OPEN },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'A dispute already exists for this order',
      });
    }

    const dispute = this.disputeRepo.create({
      order_id: orderId,
      opened_by: userId,
      reason,
      evidence_urls: evidenceUrls || [],
      status: DisputeStatus.OPEN,
    });

    // Update order status to disputed
    order.status = OrderStatus.DISPUTED;
    await this.orderRepo.save(order);

    return this.disputeRepo.save(dispute);
  }

  async findByOrder(userId: string, orderId: string): Promise<Dispute[]> {
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

    return this.disputeRepo.find({
      where: { order_id: orderId },
      relations: ['opener'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(userId: string, disputeId: string): Promise<Dispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id: disputeId },
      relations: ['opener', 'order'],
    });

    if (!dispute)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Dispute not found',
      });

    const order = await this.orderRepo.findOne({
      where: { id: dispute.order_id },
    });
    if (
      !order ||
      (order.traveler_id !== userId && order.requester_id !== userId)
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your dispute',
      });
    }

    return dispute;
  }
}
