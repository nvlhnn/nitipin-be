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
import { MessageService } from './message.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { SendMessageDto } from './dto/message.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { Message } from './entities/message.entity.js';

@Controller()
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  // --- Order chat ---

  @Get('orders/:id/messages')
  async getOrderMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    const { data, total } = await this.messageService.getOrderMessages(
      user.sub,
      id,
      page,
      perPage,
    );
    return new PaginatedResponseDto<Message>(
      data,
      total,
      page || 1,
      perPage || 50,
    );
  }

  @Post('orders/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendOrderMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendOrderMessage(user.sub, id, dto);
  }

  @Put('orders/:id/messages/read')
  @HttpCode(HttpStatus.OK)
  async markOrderMessagesRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.messageService.markOrderMessagesRead(user.sub, id);
    return { message: 'Messages marked as read' };
  }

  // --- Offer chat ---

  @Get('offers/:id/messages')
  async getOfferMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    const { data, total } = await this.messageService.getOfferMessages(
      user.sub,
      id,
      page,
      perPage,
    );
    return new PaginatedResponseDto<Message>(
      data,
      total,
      page || 1,
      perPage || 50,
    );
  }

  @Post('offers/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendOfferMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messageService.sendOfferMessage(user.sub, id, dto);
  }
}
