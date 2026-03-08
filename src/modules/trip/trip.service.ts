import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { Trip } from './entities/trip.entity.js';
import {
  CreateTripDto,
  UpdateTripDto,
  UpdateTripStatusDto,
  TripQueryDto,
} from './dto/trip.dto.js';
import { TripStatus } from '../../common/enums/index.js';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
  ) {}

  async create(userId: string, dto: CreateTripDto): Promise<Trip> {
    const trip = this.tripRepo.create({
      ...dto,
      user_id: userId,
      status: TripStatus.OPEN,
      accepted_items: 0,
    });
    return this.tripRepo.save(trip);
  }

  async findAll(query: TripQueryDto): Promise<{ data: Trip[]; total: number }> {
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);

    const qb: SelectQueryBuilder<Trip> = this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.user', 'user')
      .where('trip.deleted_at IS NULL');

    // Filters
    if (query.status) {
      qb.andWhere('trip.status = :status', { status: query.status });
    } else {
      qb.andWhere('trip.status = :status', { status: TripStatus.OPEN });
    }

    if (query.country) {
      qb.andWhere('LOWER(trip.destination_country) = LOWER(:country)', {
        country: query.country,
      });
    }
    if (query.city) {
      qb.andWhere('LOWER(trip.destination_city) = LOWER(:city)', {
        city: query.city,
      });
    }
    if (query.trip_type) {
      qb.andWhere('trip.trip_type = :tripType', { tripType: query.trip_type });
    }
    if (query.category) {
      qb.andWhere(':category = ANY(trip.categories)', {
        category: query.category,
      });
    }
    if (query.departure_from) {
      qb.andWhere('trip.departure_date >= :depFrom', {
        depFrom: query.departure_from,
      });
    }
    if (query.departure_to) {
      qb.andWhere('trip.departure_date <= :depTo', {
        depTo: query.departure_to,
      });
    }
    if (query.fee_max) {
      qb.andWhere('trip.fee_per_item <= :feeMax', { feeMax: query.fee_max });
    }
    if (query.q) {
      qb.andWhere(
        '(LOWER(trip.destination_country) LIKE LOWER(:q) OR LOWER(trip.destination_city) LIKE LOWER(:q) OR LOWER(trip.description) LIKE LOWER(:q))',
        { q: `%${query.q}%` },
      );
    }

    // Sorting
    switch (query.sort) {
      case 'departure_date':
        qb.orderBy('trip.departure_date', 'ASC');
        break;
      case 'fee_asc':
        qb.orderBy('trip.fee_per_item', 'ASC');
        break;
      case 'fee_desc':
        qb.orderBy('trip.fee_per_item', 'DESC');
        break;
      case 'rating':
        qb.orderBy('user.traveler_rating', 'DESC');
        break;
      default:
        qb.orderBy('trip.created_at', 'DESC');
    }

    const [data, total] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripRepo.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['user'],
    });

    if (!trip) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Trip not found',
      });
    }

    return trip;
  }

  async findMyTrips(
    userId: string,
    status?: string,
    page = 1,
    perPage = 20,
  ): Promise<{ data: Trip[]; total: number }> {
    const where: Record<string, unknown> = {
      user_id: userId,
      deleted_at: IsNull(),
    };
    if (status) where.status = status;

    const [data, total] = await this.tripRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: Math.min(perPage, 50),
    });

    return { data, total };
  }

  async update(
    userId: string,
    tripId: string,
    dto: UpdateTripDto,
  ): Promise<Trip> {
    const trip = await this.findOne(tripId);

    if (trip.user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your trip',
      });
    }

    Object.assign(trip, dto);
    return this.tripRepo.save(trip);
  }

  async updateStatus(
    userId: string,
    tripId: string,
    dto: UpdateTripStatusDto,
  ): Promise<Trip> {
    const trip = await this.findOne(tripId);

    if (trip.user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your trip',
      });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      [TripStatus.OPEN]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED, TripStatus.CANCELLED],
    };

    const allowed = validTransitions[trip.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: `Cannot transition from '${trip.status}' to '${dto.status}'`,
      });
    }

    trip.status = dto.status;
    return this.tripRepo.save(trip);
  }

  async remove(userId: string, tripId: string): Promise<void> {
    const trip = await this.findOne(tripId);

    if (trip.user_id !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not your trip',
      });
    }

    // Soft delete
    trip.deleted_at = new Date();
    trip.status = TripStatus.CANCELLED;
    await this.tripRepo.save(trip);
  }
}
