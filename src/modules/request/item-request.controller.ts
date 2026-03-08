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
import { ItemRequestService } from './item-request.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CreateItemRequestDto,
  UpdateItemRequestDto,
  ItemRequestQueryDto,
} from './dto/item-request.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { ItemRequest } from './entities/item-request.entity.js';

@Controller('requests')
export class ItemRequestController {
  constructor(private readonly requestService: ItemRequestService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateItemRequestDto,
  ) {
    return this.requestService.create(user.sub, dto);
  }

  @Public()
  @Get()
  async findAll(@Query() query: ItemRequestQueryDto) {
    const { data, total } = await this.requestService.findAll(query);
    return new PaginatedResponseDto<ItemRequest>(
      data,
      total,
      query.page || 1,
      query.per_page || 20,
    );
  }

  @Get('me')
  async findMyRequests(
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    const { data, total } = await this.requestService.findMyRequests(
      user.sub,
      status,
      page,
      perPage,
    );
    return new PaginatedResponseDto<ItemRequest>(
      data,
      total,
      page || 1,
      perPage || 20,
    );
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.requestService.findOne(id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateItemRequestDto,
  ) {
    return this.requestService.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.requestService.remove(user.sub, id);
    return { message: 'Request cancelled successfully' };
  }
}
