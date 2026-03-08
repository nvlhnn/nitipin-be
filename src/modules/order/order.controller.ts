import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import {
  OrderQueryDto,
  UpdateOrderStatusDto,
  InitiatePaymentDto,
} from './dto/order.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { Order } from './entities/order.entity.js';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async findMyOrders(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: OrderQueryDto,
  ) {
    const { data, total } = await this.orderService.findMyOrders(
      user.sub,
      query,
    );
    return new PaginatedResponseDto<Order>(
      data,
      total,
      query.page || 1,
      query.per_page || 20,
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderService.findOne(user.sub, id);
  }

  @Put(':id/status')
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(user.sub, id, dto);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.orderService.initiatePayment(user.sub, id, dto.payment_method);
  }
}
