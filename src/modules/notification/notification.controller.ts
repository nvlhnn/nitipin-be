import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { Notification } from './entities/notification.entity.js';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifService: NotificationService) {}

  @Get()
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('is_read') isRead?: string,
    @Query('page') page?: number,
    @Query('per_page') perPage?: number,
  ) {
    const isReadBool =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    const { data, total } = await this.notifService.findAll(
      user.sub,
      isReadBool,
      page,
      perPage,
    );
    return new PaginatedResponseDto<Notification>(
      data,
      total,
      page || 1,
      perPage || 20,
    );
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notifService.markRead(user.sub, id);
    return { message: 'Notification marked as read' };
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: CurrentUserPayload) {
    await this.notifService.markAllRead(user.sub);
    return { message: 'All notifications marked as read' };
  }
}
