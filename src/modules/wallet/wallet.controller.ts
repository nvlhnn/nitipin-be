import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { WithdrawDto, WalletTransactionQueryDto } from './dto/wallet.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';
import { WalletTransaction } from './entities/wallet-transaction.entity.js';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  async getBalance(@CurrentUser() user: CurrentUserPayload) {
    return this.walletService.getBalance(user.sub);
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: WalletTransactionQueryDto,
  ) {
    const { data, total } = await this.walletService.getTransactions(
      user.sub,
      query,
    );
    return new PaginatedResponseDto<WalletTransaction>(
      data,
      total,
      query.page || 1,
      query.per_page || 20,
    );
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: WithdrawDto,
  ) {
    return this.walletService.withdraw(user.sub, dto);
  }
}
