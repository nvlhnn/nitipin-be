import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Offer } from './entities/offer.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { Trip } from '../trip/entities/trip.entity.js';
import { ItemRequest } from '../request/entities/item-request.entity.js';
import {
  CreateOfferDto,
  UpdateOfferDto,
  OfferQueryDto,
} from './dto/offer.dto.js';
import { QueueService } from '../../infrastructure/queue/queue.service.js';
import {
  TripStatus,
  RequestStatus,
  OfferStatus,
  OrderStatus,
} from '../../common/enums/index.js';

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(ItemRequest)
    private readonly requestRepo: Repository<ItemRequest>,
    private readonly config: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  async create(userId: string, dto: CreateOfferDto): Promise<Offer> {
    if (!dto.trip_id && !dto.item_request_id) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Either trip_id or item_request_id is required',
      });
    }

    let toUserId: string;

    if (dto.trip_id) {
      // Requester → Provider's trip
      const trip = await this.tripRepo.findOne({
        where: {
          id: dto.trip_id,
          deleted_at: IsNull(),
          status: TripStatus.OPEN,
        },
      });
      if (!trip)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Trip not found or not open',
        });
      if (trip.user_id === userId)
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Cannot offer on your own trip',
        });
      toUserId = trip.user_id;
    } else {
      // Provider claims a request
      const request = await this.requestRepo.findOne({
        where: {
          id: dto.item_request_id,
          deleted_at: IsNull(),
          status: RequestStatus.OPEN,
        },
      });
      if (!request)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Item request not found or not open',
        });
      if (request.user_id === userId)
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Cannot offer on your own request',
        });
      toUserId = request.user_id;
    }

    const offer = this.offerRepo.create({
      trip_id: dto.trip_id || null,
      item_request_id: dto.item_request_id || null,
      from_user_id: userId,
      to_user_id: toUserId,
      product_name: dto.product_name || '',
      product_url: dto.product_url || null,
      product_image_url: dto.product_image_url || null,
      product_notes: dto.product_notes || null,
      quantity: dto.quantity || 1,
      proposed_price: dto.proposed_price,
      message: dto.message || null,
      status: OfferStatus.PENDING,
    });

    const saved = await this.offerRepo.save(offer);

    const fullOffer = await this.offerRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['from_user', 'to_user', 'trip', 'item_request'],
    });

    // Queue notification to recipient
    await this.queueService.sendOfferNotification(
      toUserId,
      `New offer for ${dto.product_name || 'your request'} — Rp ${dto.proposed_price.toLocaleString()}`,
      fullOffer.id,
    );

    return fullOffer;
  }

  async findMyOffers(
    userId: string,
    query: OfferQueryDto,
  ): Promise<{ data: Offer[]; total: number }> {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);

    const qb = this.offerRepo
      .createQueryBuilder('offer')
      .leftJoinAndSelect('offer.from_user', 'from_user')
      .leftJoinAndSelect('offer.to_user', 'to_user')
      .leftJoinAndSelect('offer.trip', 'trip')
      .leftJoinAndSelect('offer.item_request', 'item_request');

    if (query.direction === 'sent') {
      qb.where('offer.from_user_id = :userId', { userId });
    } else if (query.direction === 'received') {
      qb.where('offer.to_user_id = :userId', { userId });
    } else {
      qb.where('(offer.from_user_id = :userId OR offer.to_user_id = :userId)', {
        userId,
      });
    }

    if (query.status) {
      qb.andWhere('offer.status = :status', { status: query.status });
    }

    qb.orderBy('offer.created_at', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(userId: string, offerId: string): Promise<Offer> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId },
      relations: ['from_user', 'to_user', 'trip', 'item_request'],
    });

    if (!offer) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Offer not found',
      });
    }

    if (offer.from_user_id !== userId && offer.to_user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your offer',
      });
    }

    return offer;
  }

  async update(
    userId: string,
    offerId: string,
    dto: UpdateOfferDto,
  ): Promise<{ offer: Offer; order?: Order }> {
    const offer = await this.findOne(userId, offerId);

    // Edit price (only from_user, only while pending)
    if (dto.proposed_price && !dto.status) {
      if (offer.from_user_id !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Only the sender can edit the price',
        });
      }
      if (offer.status !== OfferStatus.PENDING) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Can only edit price while pending',
        });
      }
      offer.proposed_price = dto.proposed_price;
      await this.offerRepo.save(offer);
      return { offer };
    }

    if (!dto.status) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Status or proposed_price required',
      });
    }

    // Status transitions
    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Cannot transition from '${offer.status}' to '${dto.status}'`,
      });
    }

    if (dto.status === OfferStatus.CANCELLED) {
      // Only from_user can cancel
      if (offer.from_user_id !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Only the sender can cancel',
        });
      }
    } else if (
      dto.status === OfferStatus.ACCEPTED ||
      dto.status === OfferStatus.REJECTED
    ) {
      // Only to_user can accept/reject
      if (offer.to_user_id !== userId) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Only the recipient can accept/reject',
        });
      }
    }

    offer.status = dto.status as OfferStatus;
    await this.offerRepo.save(offer);

    // Queue notifications for status change
    const notifyUserId =
      dto.status === OfferStatus.CANCELLED
        ? offer.to_user_id
        : offer.from_user_id;
    const statusLabel =
      dto.status === OfferStatus.ACCEPTED
        ? 'accepted'
        : dto.status === OfferStatus.REJECTED
          ? 'rejected'
          : 'cancelled';
    await this.queueService.sendOfferNotification(
      notifyUserId,
      `Your offer has been ${statusLabel}`,
      offer.id,
    );

    // Auto-create order on accept
    let order: Order | undefined;
    if (dto.status === OfferStatus.ACCEPTED) {
      order = await this.createOrderFromOffer(offer);
    }

    return { offer, order };
  }

  async findByTrip(userId: string, tripId: string): Promise<Offer[]> {
    // Verify trip ownership
    const trip = await this.tripRepo.findOne({ where: { id: tripId } });
    if (!trip)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Trip not found',
      });
    if (trip.user_id !== userId)
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your trip',
      });

    return this.offerRepo.find({
      where: { trip_id: tripId },
      relations: ['from_user', 'to_user'],
      order: { created_at: 'DESC' },
    });
  }

  async findByRequest(userId: string, requestId: string): Promise<Offer[]> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Request not found',
      });
    if (request.user_id !== userId)
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your request',
      });

    return this.offerRepo.find({
      where: { item_request_id: requestId },
      relations: ['from_user', 'to_user'],
      order: { created_at: 'DESC' },
    });
  }

  // --- Private ---

  private async createOrderFromOffer(offer: Offer): Promise<Order> {
    const platformFeePercent = parseFloat(
      this.config.get<string>('PLATFORM_FEE_PERCENT', '5.0'),
    );

    // Determine traveler/requester based on context
    let travelerId: string;
    let requesterId: string;

    if (offer.trip_id) {
      // Offer on a trip: trip owner is traveler, offer sender is requester
      travelerId = offer.to_user_id;
      requesterId = offer.from_user_id;
    } else {
      // Offer on a request: offer sender is traveler, request owner is requester
      travelerId = offer.from_user_id;
      requesterId = offer.to_user_id;
    }

    const serviceFee = offer.trip_id
      ? (await this.tripRepo.findOneOrFail({ where: { id: offer.trip_id } }))
          .fee_per_item * offer.quantity
      : 0;

    const platformFee = Math.ceil(
      Number(offer.proposed_price) * (platformFeePercent / 100),
    );
    const totalAmount = Number(offer.proposed_price) + serviceFee + platformFee;

    // Generate order number
    const year = new Date().getFullYear();
    const count = await this.orderRepo.count();
    const orderNumber = `NTP-${year}-${String(count + 1).padStart(6, '0')}`;

    const order = this.orderRepo.create({
      order_number: orderNumber,
      offer_id: offer.id,
      trip_id: offer.trip_id,
      item_request_id: offer.item_request_id,
      traveler_id: travelerId,
      requester_id: requesterId,
      product_name: offer.product_name,
      product_url: offer.product_url,
      product_image_url: offer.product_image_url,
      product_notes: offer.product_notes,
      quantity: offer.quantity,
      agreed_price: offer.proposed_price,
      service_fee: serviceFee,
      platform_fee: platformFee,
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
    });

    return this.orderRepo.save(order);
  }
}
