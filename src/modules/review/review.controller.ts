import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewService } from './review.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CreateReviewDto, ReviewQueryDto } from './dto/review.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { Review } from './entities/review.entity.js';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('orders/:id/reviews')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(user.sub, id, dto);
  }

  @Public()
  @Get('users/:id/reviews')
  async findByUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ReviewQueryDto,
  ) {
    const { data, total } = await this.reviewService.findByUser(id, query);
    return new PaginatedResponseDto<Review>(
      data,
      total,
      query.page || 1,
      query.per_page || 20,
    );
  }
}
