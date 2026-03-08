import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Review } from './entities/review.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { User } from '../user/entities/user.entity.js';
import { CreateReviewDto, ReviewQueryDto } from './dto/review.dto.js';
import { OrderStatus, UserType } from '../../common/enums/index.js';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(
    userId: string,
    orderId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, deleted_at: IsNull() },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (
      order.status !== OrderStatus.COMPLETED &&
      order.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Can only review completed orders',
      });
    }

    // Check review window (7 days after completion)
    if (order.completed_at) {
      const windowMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - order.completed_at.getTime() > windowMs) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Review window has expired (7 days)',
        });
      }
    }

    // Determine roles
    const isTraveler = order.traveler_id === userId;
    const isRequester = order.requester_id === userId;

    if (!isTraveler && !isRequester) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your order',
      });
    }

    const reviewerId = userId;
    const revieweeId = isTraveler ? order.requester_id : order.traveler_id;
    const roleReviewed = isTraveler ? UserType.REQUESTER : UserType.TRAVELER;

    // Check for duplicate
    const existing = await this.reviewRepo.findOne({
      where: { order_id: orderId, reviewer_id: reviewerId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'You have already reviewed this order',
      });
    }

    const review = this.reviewRepo.create({
      order_id: orderId,
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      role_reviewed: roleReviewed,
      rating: dto.rating,
      comment: dto.comment || null,
    });

    const saved = await this.reviewRepo.save(review);

    // Update user's denormalized rating
    await this.updateUserRating(revieweeId, roleReviewed);

    return this.reviewRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['reviewer', 'reviewee', 'order'],
    });
  }

  async findByUser(
    userId: string,
    query: ReviewQueryDto,
  ): Promise<{ data: Review[]; total: number }> {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);

    const where: Record<string, unknown> = { reviewee_id: userId };
    if (query.role) where.role_reviewed = query.role;

    const [data, total] = await this.reviewRepo.findAndCount({
      where,
      relations: ['reviewer', 'order'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return { data, total };
  }

  private async updateUserRating(
    userId: string,
    role: UserType,
  ): Promise<void> {
    const reviews = await this.reviewRepo.find({
      where: { reviewee_id: userId, role_reviewed: role },
    });

    if (reviews.length === 0) return;

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    const update: Record<string, unknown> = {};
    if (role === UserType.TRAVELER) {
      update.traveler_rating = parseFloat(avg.toFixed(2));
      update.traveler_review_count = reviews.length;
    } else {
      update.requester_rating = parseFloat(avg.toFixed(2));
      update.requester_review_count = reviews.length;
    }

    await this.userRepo.update(userId, update);
  }
}
