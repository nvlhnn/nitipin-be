import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service.js';
import { WalletController } from './wallet.controller.js';
import { Wallet } from './entities/wallet.entity.js';
import { WalletTransaction } from './entities/wallet-transaction.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
