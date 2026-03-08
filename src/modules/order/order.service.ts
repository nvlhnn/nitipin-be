import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Order } from './entities/order.entity.js';
import { OrderQueryDto, UpdateOrderStatusDto } from './dto/order.dto.js';
import type { TimelineStep } from './dto/order.dto.js';
import { QueueService } from '../../infrastructure/queue/queue.service.js';
import { OrderStatus, UserType } from '../../common/enums/index.js';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly queueService: QueueService,
  ) {}

  async findMyOrders(
    userId: string,
    query: OrderQueryDto,
  ): Promise<{ data: Order[]; total: number }> {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.traveler', 'traveler')
      .leftJoinAndSelect('order.requester', 'requester')
      .leftJoinAndSelect('order.trip', 'trip')
      .where('order.deleted_at IS NULL');

    if (query.role === UserType.TRAVELER) {
      qb.andWhere('order.traveler_id = :userId', { userId });
    } else if (query.role === UserType.REQUESTER) {
      qb.andWhere('order.requester_id = :userId', { userId });
    } else {
      qb.andWhere(
        '(order.traveler_id = :userId OR order.requester_id = :userId)',
        { userId },
      );
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    qb.orderBy('order.created_at', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(
    userId: string,
    orderId: string,
  ): Promise<Order & { timeline: TimelineStep[] }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
      relations: ['traveler', 'requester', 'trip', 'offer'],
    });

    if (!order) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.traveler_id !== userId && order.requester_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your order',
      });
    }

    return { ...order, timeline: this.buildTimeline(order) };
  }

  async updateStatus(
    userId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order & { timeline: TimelineStep[] }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
      relations: ['traveler', 'requester', 'trip'],
    });

    if (!order) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.traveler_id !== userId && order.requester_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your order',
      });
    }

    const isTraveler = order.traveler_id === userId;

    // Validate transitions
    this.validateStatusTransition(order, dto, isTraveler);

    // Apply status-specific updates
    const now = new Date();
    order.status = dto.status;

    switch (dto.status) {
      case OrderStatus.PURCHASED:
        order.proof_image_urls = dto.proof_image_urls || [];
        order.receipt_image_url = dto.receipt_image_url || null;
        order.purchased_at = now;
        break;
      case OrderStatus.SHIPPED:
        order.shipping_courier = dto.shipping_courier || null;
        order.tracking_number = dto.tracking_number || null;
        order.shipping_notes = dto.shipping_notes || null;
        order.shipped_at = now;
        // Auto-confirm after 3 days
        order.auto_confirm_at = new Date(
          now.getTime() + 3 * 24 * 60 * 60 * 1000,
        );
        break;
      case OrderStatus.DELIVERED:
        order.delivered_at = now;
        break;
      case OrderStatus.COMPLETED:
        order.completed_at = now;
        break;
      case OrderStatus.CANCELLED:
        order.cancelled_at = now;
        // TODO: Trigger refund if paid
        break;
      case OrderStatus.PAID:
        order.paid_at = now;
        break;
    }

    await this.orderRepo.save(order);

    // Queue notifications to the other party
    const otherUserId = isTraveler ? order.requester_id : order.traveler_id;
    await this.queueService.sendOrderNotification(
      otherUserId,
      order.order_number,
      dto.status,
      order.id,
    );

    // Queue wallet operations
    if (dto.status === OrderStatus.COMPLETED) {
      // Credit traveler's wallet
      await this.queueService.creditWallet({
        userId: order.traveler_id,
        amount: Number(order.agreed_price) + Number(order.service_fee),
        orderId: order.id,
        notes: `Payment for order ${order.order_number}`,
      });
    }

    if (dto.status === OrderStatus.CANCELLED && order.paid_at) {
      // Refund requester
      await this.queueService.refundToWallet(
        order.requester_id,
        Number(order.total_amount),
        order.id,
      );
    }

    return { ...order, timeline: this.buildTimeline(order) };
  }

  async initiatePayment(
    userId: string,
    orderId: string,
    paymentMethod: string,
  ): Promise<{
    payment_url: string;
    payment_token: string;
    expires_at: string;
  }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.requester_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the requester can pay',
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Order is not pending payment',
      });
    }

    order.payment_method = paymentMethod;
    await this.orderRepo.save(order);

    // TODO: Integrate with Midtrans API
    return {
      payment_url: `https://midtrans.com/payment/${order.id}`,
      payment_token: `mock-token-${order.id}`,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }

  // --- Private ---

  private validateStatusTransition(
    order: Order,
    dto: UpdateOrderStatusDto,
    isTraveler: boolean,
  ): void {
    const validTransitions: Partial<
      Record<
        OrderStatus,
        {
          to: OrderStatus[];
          who: UserType | 'system' | 'any';
          required?: string[];
        }[]
      >
    > = {
      [OrderStatus.PENDING]: [
        { to: [OrderStatus.PAID], who: 'system' },
        { to: [OrderStatus.CANCELLED], who: 'any' },
      ],
      [OrderStatus.PAID]: [
        {
          to: [OrderStatus.PURCHASED],
          who: UserType.TRAVELER,
          required: ['proof_image_urls'],
        },
        { to: [OrderStatus.CANCELLED], who: 'any' },
      ],
      [OrderStatus.PURCHASED]: [
        {
          to: [OrderStatus.SHIPPED],
          who: UserType.TRAVELER,
          required: ['shipping_courier', 'tracking_number'],
        },
        { to: [OrderStatus.DISPUTED], who: 'any', required: ['reason'] },
      ],
      [OrderStatus.SHIPPED]: [
        { to: [OrderStatus.DELIVERED], who: UserType.REQUESTER },
        { to: [OrderStatus.DISPUTED], who: 'any', required: ['reason'] },
      ],
      [OrderStatus.DELIVERED]: [{ to: [OrderStatus.COMPLETED], who: 'any' }],
    };

    const transitions = validTransitions[order.status];
    if (!transitions) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `No transitions allowed from '${order.status}'`,
      });
    }

    const allowed = transitions.find((t) => t.to.includes(dto.status));
    if (!allowed) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Cannot transition from '${order.status}' to '${dto.status}'`,
      });
    }

    // Check role permissions
    if (allowed.who === UserType.TRAVELER && !isTraveler) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the traveler can perform this action',
      });
    }
    if (allowed.who === UserType.REQUESTER && isTraveler) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the requester can perform this action',
      });
    }

    // Check required fields
    if (allowed.required) {
      for (const field of allowed.required) {
        const value = (dto as unknown as Record<string, unknown>)[field];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          throw new BadRequestException({
            code: 'BAD_REQUEST',
            message: `Field '${field}' is required for this status transition`,
          });
        }
      }
    }
  }

  private buildTimeline(order: Order): TimelineStep[] {
    return [
      {
        step: 'matched',
        label: 'Request Diterima',
        date: order.created_at?.toISOString() || null,
        done: true,
      },
      {
        step: 'payment',
        label: 'Pembayaran',
        date: order.paid_at?.toISOString() || null,
        done: !!order.paid_at,
      },
      {
        step: 'purchased',
        label: 'Barang Dibeli',
        date: order.purchased_at?.toISOString() || null,
        done: !!order.purchased_at,
      },
      {
        step: 'shipped',
        label: 'Dikirim',
        date: order.shipped_at?.toISOString() || null,
        done: !!order.shipped_at,
      },
      {
        step: 'delivered',
        label: 'Barang Diterima',
        date: order.delivered_at?.toISOString() || null,
        done: !!order.delivered_at,
      },
      {
        step: 'completed',
        label: 'Selesai',
        date: order.completed_at?.toISOString() || null,
        done: !!order.completed_at,
      },
    ];
  }
}
