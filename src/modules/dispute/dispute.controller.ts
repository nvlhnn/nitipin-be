import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisputeService } from './dispute.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';

@Controller()
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post('orders/:id/disputes')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string; evidence_urls?: string[] },
  ) {
    return this.disputeService.create(
      user.sub,
      id,
      body.reason,
      body.evidence_urls,
    );
  }

  @Get('orders/:id/disputes')
  async findByOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.disputeService.findByOrder(user.sub, id);
  }

  @Get('disputes/:id')
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.disputeService.findOne(user.sub, id);
  }
}
