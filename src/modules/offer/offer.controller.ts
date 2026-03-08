import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OfferService } from './offer.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import {
  CreateOfferDto,
  UpdateOfferDto,
  OfferQueryDto,
} from './dto/offer.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { Offer } from './entities/offer.entity.js';

@Controller()
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post('offers')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offerService.create(user.sub, dto);
  }

  @Get('offers/me')
  async findMyOffers(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: OfferQueryDto,
  ) {
    const { data, total } = await this.offerService.findMyOffers(
      user.sub,
      query,
    );
    return new PaginatedResponseDto<Offer>(
      data,
      total,
      query.page || 1,
      query.per_page || 20,
    );
  }

  @Get('offers/:id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offerService.findOne(user.sub, id);
  }

  @Put('offers/:id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.offerService.update(user.sub, id, dto);
  }

  // GET /trips/:id/offers — Provider only
  @Get('trips/:id/offers')
  async findByTrip(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offerService.findByTrip(user.sub, id);
  }

  // GET /requests/:id/offers — Requester only
  @Get('requests/:id/offers')
  async findByRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.offerService.findByRequest(user.sub, id);
  }
}
