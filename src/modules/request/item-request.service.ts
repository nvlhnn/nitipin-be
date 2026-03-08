import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { ItemRequest } from './entities/item-request.entity.js';
import {
  CreateItemRequestDto,
  UpdateItemRequestDto,
  ItemRequestQueryDto,
} from './dto/item-request.dto.js';
import { RequestStatus } from '../../common/enums/index.js';

@Injectable()
export class ItemRequestService {
  constructor(
    @InjectRepository(ItemRequest)
    private readonly requestRepo: Repository<ItemRequest>,
  ) {}

  async create(
    userId: string,
    dto: CreateItemRequestDto,
  ): Promise<ItemRequest> {
    const request = this.requestRepo.create({
      ...dto,
      user_id: userId,
      quantity: dto.quantity || 1,
      status: RequestStatus.OPEN,
    });
    return this.requestRepo.save(request);
  }

  async findAll(
    query: ItemRequestQueryDto,
  ): Promise<{ data: ItemRequest[]; total: number }> {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);

    const qb: SelectQueryBuilder<ItemRequest> = this.requestRepo
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.user', 'user')
      .where('req.deleted_at IS NULL');

    if (query.status) {
      qb.andWhere('req.status = :status', { status: query.status });
    } else {
      qb.andWhere('req.status = :status', { status: RequestStatus.OPEN });
    }

    if (query.country) {
      qb.andWhere('LOWER(req.destination_country) = LOWER(:country)', {
        country: query.country,
      });
    }
    if (query.city) {
      qb.andWhere('LOWER(req.destination_city) = LOWER(:city)', {
        city: query.city,
      });
    }
    if (query.category) {
      qb.andWhere('req.category = :category', { category: query.category });
    }
    if (query.budget_max) {
      qb.andWhere('req.max_budget <= :budgetMax', {
        budgetMax: query.budget_max,
      });
    }
    if (query.q) {
      qb.andWhere(
        '(LOWER(req.product_name) LIKE LOWER(:q) OR LOWER(req.notes) LIKE LOWER(:q))',
        { q: `%${query.q}%` },
      );
    }

    switch (query.sort) {
      case 'deadline':
        qb.orderBy('req.deadline', 'ASC', 'NULLS LAST');
        break;
      case 'budget_desc':
        qb.orderBy('req.max_budget', 'DESC');
        break;
      default:
        qb.orderBy('req.created_at', 'DESC');
    }

    const [data, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<ItemRequest> {
    const request = await this.requestRepo.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Item request not found',
      });
    }

    return request;
  }

  async findMyRequests(
    userId: string,
    status?: string,
    page = 1,
    perPage = 20,
  ): Promise<{ data: ItemRequest[]; total: number }> {
    const where: Record<string, unknown> = {
      user_id: userId,
      deleted_at: IsNull(),
    };
    if (status) where.status = status;

    const [data, total] = await this.requestRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: Math.min(perPage, 50),
    });

    return { data, total };
  }

  async update(
    userId: string,
    requestId: string,
    dto: UpdateItemRequestDto,
  ): Promise<ItemRequest> {
    const request = await this.findOne(requestId);

    if (request.user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your request',
      });
    }

    Object.assign(request, dto);
    return this.requestRepo.save(request);
  }

  async remove(userId: string, requestId: string): Promise<void> {
    const request = await this.findOne(requestId);

    if (request.user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your request',
      });
    }

    request.deleted_at = new Date();
    request.status = RequestStatus.CANCELLED;
    await this.requestRepo.save(request);
  }
}
