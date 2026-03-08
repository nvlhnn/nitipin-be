import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { Order } from '../../modules/order/entities/order.entity.js';
import { Offer } from '../../modules/offer/entities/offer.entity.js';
import { ItemRequest } from '../../modules/request/entities/item-request.entity.js';
import { QueueService } from '../queue/queue.service.js';
import {
  OrderStatus,
  OfferStatus,
  RequestStatus,
  NotificationType,
} from '../../common/enums/index.js';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(ItemRequest)
    private readonly requestRepo: Repository<ItemRequest>,
    private readonly queueService: QueueService,
  ) {}

  /**
   * Auto-confirm delivery: shipped → delivered after 3 days
   * If a requester hasn't confirmed delivery within 3 days of shipping,
   * the system automatically marks it as delivered.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoConfirmDelivery(): Promise<void> {
    const now = new Date();

    const orders = await this.orderRepo.find({
      where: {
        status: OrderStatus.SHIPPED,
        auto_confirm_at: LessThan(now),
        deleted_at: IsNull(),
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`Auto-confirming ${orders.length} shipped order(s)`);

    for (const order of orders) {
      order.status = OrderStatus.DELIVERED;
      order.delivered_at = now;
      await this.orderRepo.save(order);

      // Notify both parties
      await this.queueService.sendOrderNotification(
        order.requester_id,
        order.order_number,
        'delivered',
        order.id,
      );
      await this.queueService.sendOrderNotification(
        order.traveler_id,
        order.order_number,
        'delivered',
        order.id,
      );

      this.logger.log(
        `Order ${order.order_number} auto-confirmed as delivered`,
      );
    }
  }

  /**
   * Auto-complete orders: delivered → completed after 3 days
   * If neither party completes the order within 3 days of delivery,
   * the system automatically marks it as completed.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoCompleteOrders(): Promise<void> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const orders = await this.orderRepo.find({
      where: {
        status: OrderStatus.DELIVERED,
        delivered_at: LessThan(threeDaysAgo),
        completed_at: IsNull(),
        deleted_at: IsNull(),
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`Auto-completing ${orders.length} delivered order(s)`);

    const now = new Date();
    for (const order of orders) {
      order.status = OrderStatus.COMPLETED;
      order.completed_at = now;
      await this.orderRepo.save(order);

      // Credit traveler's wallet
      await this.queueService.creditWallet({
        userId: order.traveler_id,
        amount: Number(order.agreed_price) + Number(order.service_fee),
        orderId: order.id,
        notes: `Payment for order ${order.order_number}`,
      });

      // Notify both parties
      await this.queueService.sendOrderNotification(
        order.requester_id,
        order.order_number,
        'completed',
        order.id,
      );
      await this.queueService.sendOrderNotification(
        order.traveler_id,
        order.order_number,
        'completed',
        order.id,
      );

      this.logger.log(`Order ${order.order_number} auto-completed`);
    }
  }

  /**
   * Expire pending orders: pending → cancelled after 24 hours with no payment
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expirePendingOrders(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        paid_at: IsNull(),
        created_at: LessThan(oneDayAgo),
        deleted_at: IsNull(),
      },
    });

    if (orders.length === 0) return;

    this.logger.log(`Expiring ${orders.length} unpaid pending order(s)`);

    const now = new Date();
    for (const order of orders) {
      order.status = OrderStatus.CANCELLED;
      order.cancelled_at = now;
      await this.orderRepo.save(order);

      // Notify both parties
      await this.queueService.sendOrderNotification(
        order.requester_id,
        order.order_number,
        'expired',
        order.id,
      );
      await this.queueService.sendOrderNotification(
        order.traveler_id,
        order.order_number,
        'expired',
        order.id,
      );

      this.logger.log(
        `Order ${order.order_number} expired (no payment within 24h)`,
      );
    }
  }

  /**
   * Expire offers: pending > 48h → expired
   * Technically we have 'cancelled' status for offers, which we'll use for expiration.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expirePendingOffers(): Promise<void> {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const offers = await this.offerRepo.find({
      where: {
        status: OfferStatus.PENDING,
        created_at: LessThan(twoDaysAgo),
      },
    });

    if (offers.length === 0) return;

    this.logger.log(
      `Expiring ${offers.length} pending offer(s) older than 48 hours`,
    );

    for (const offer of offers) {
      offer.status = OfferStatus.CANCELLED; // Consider it expired
      await this.offerRepo.save(offer);

      // Notify users
      await this.queueService.sendOfferNotification(
        offer.from_user_id,
        'Your offer has expired.',
        offer.id,
      );
      await this.queueService.sendOfferNotification(
        offer.to_user_id,
        'An offer you received has expired.',
        offer.id,
      );

      this.logger.log(`Offer ${offer.id} expired (> 48h pending)`);
    }
  }

  /**
   * Expire requests: past deadline → expired
   * Uses 'CANCELLED' status for expiration.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireRequests(): Promise<void> {
    // Find requests where the deadline is strongly before today
    const today = new Date().toISOString().split('T')[0];

    const requests = await this.requestRepo.find({
      where: {
        status: RequestStatus.OPEN,
        deadline: LessThan(today),
        deleted_at: IsNull(),
      },
    });

    if (requests.length === 0) return;

    this.logger.log(`Expiring ${requests.length} request(s) past deadline`);

    for (const request of requests) {
      request.status = RequestStatus.CANCELLED; // Using CANCELLED for expired
      await this.requestRepo.save(request);

      // Notify user
      await this.queueService.createNotification({
        userId: request.user_id,
        title: 'Request Expired',
        body: `Your request for ${request.product_name} has expired.`,
        type: NotificationType.SYSTEM,
      });

      this.logger.log(`Request ${request.id} expired (past deadline)`);
    }
  }
}
