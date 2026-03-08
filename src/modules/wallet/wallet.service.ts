import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity.js';
import { WalletTransaction } from './entities/wallet-transaction.entity.js';
import { WithdrawDto, WalletTransactionQueryDto } from './dto/wallet.dto.js';
import { TransactionType, WithdrawalStatus } from '../../common/enums/index.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {}

  async getBalance(
    userId: string,
  ): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: Number(wallet.balance), currency: 'IDR' };
  }

  async getTransactions(
    userId: string,
    query: WalletTransactionQueryDto,
  ): Promise<{ data: WalletTransaction[]; total: number }> {
    const wallet = await this.getOrCreateWallet(userId);
    const page = query.page || 1;
    const perPage = Math.min(query.per_page || 20, 50);

    const where: Record<string, unknown> = { wallet_id: wallet.id };
    if (query.type) where.type = query.type;

    const [data, total] = await this.txRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return { data, total };
  }

  async withdraw(userId: string, dto: WithdrawDto): Promise<WalletTransaction> {
    const wallet = await this.getOrCreateWallet(userId);

    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Insufficient balance',
      });
    }

    // Deduct balance
    wallet.balance = Number(wallet.balance) - dto.amount;
    await this.walletRepo.save(wallet);

    // Create transaction
    const tx = this.txRepo.create({
      wallet_id: wallet.id,
      type: TransactionType.WITHDRAWAL,
      amount: dto.amount,
      balance_after: wallet.balance,
      bank_name: dto.bank_name,
      bank_account: dto.bank_account,
      bank_holder: dto.bank_holder,
      withdrawal_status: WithdrawalStatus.PENDING,
      notes: `Withdrawal to ${dto.bank_name} - ${dto.bank_account}`,
    });

    return this.txRepo.save(tx);
  }

  // Called by other services (order completion)
  async credit(
    userId: string,
    amount: number,
    orderId?: string,
    notes?: string,
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(userId);

    wallet.balance = Number(wallet.balance) + amount;
    await this.walletRepo.save(wallet);

    const tx = this.txRepo.create({
      wallet_id: wallet.id,
      order_id: orderId || null,
      type: TransactionType.CREDIT,
      amount,
      balance_after: wallet.balance,
      notes: notes || 'Payment received',
    });
    await this.txRepo.save(tx);
  }

  // --- Private ---

  private async getOrCreateWallet(userId: string): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { user_id: userId } });

    if (!wallet) {
      wallet = this.walletRepo.create({ user_id: userId, balance: 0 });
      wallet = await this.walletRepo.save(wallet);
    }

    return wallet;
  }
}
