import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TripService } from './trip.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CreateTripDto,
  UpdateTripDto,
  UpdateTripStatusDto,
  TripQueryDto,
} from './dto/trip.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { Trip } from './entities/trip.entity.js';

@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTripDto,
  ) {
    return this.tripService.create(user.sub, dto);
  }

  @Public()
  @Get()
  async findAll(@Query() query: TripQueryDto) {
    const { data, total } = await this.tripService.findAll(query);
    const page = query.page || 1;
    const perPage = query.per_page || 20;
    return new PaginatedResponseDto<Trip>(data, total, page, perPage);
  }

  @Get('me')
  async findMyTrips(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    const { data, total } = await this.tripService.findMyTrips(
      user.sub,
      status,
      page,
      perPage,
    );
    return new PaginatedResponseDto<Trip>(
      data,
      total,
      page || 1,
      perPage || 20,
    );
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tripService.findOne(id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripService.update(user.sub, id, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.tripService.updateStatus(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tripService.remove(user.sub, id);
    return { message: 'Trip cancelled successfully' };
  }
}
