import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants.js';
import { Wallet } from '../../../modules/wallet/entities/wallet.entity.js';
import { WalletTransaction } from '../../../modules/wallet/entities/wallet-transaction.entity.js';
import type { WalletCreditJobData } from '../queue.service.js';
import { TransactionType } from '../../../common/enums/index.js';

@Processor(QUEUE_NAMES.WALLET)
export class WalletProcessor extends WorkerHost {
  private readonly logger = new Logger(WalletProcessor.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
  ) {
    super();
  }

  async process(job: Job<WalletCreditJobData>): Promise<void> {
    const { userId, amount, orderId, notes } = job.data;

    this.logger.log(
      `Processing wallet ${job.name}: ${amount} → user ${userId}`,
    );

    // Get or create wallet
    let wallet = await this.walletRepo.findOne({ where: { user_id: userId } });
    if (!wallet) {
      wallet = this.walletRepo.create({ user_id: userId, balance: 0 });
      wallet = await this.walletRepo.save(wallet);
    }

    // Credit balance
    wallet.balance = Number(wallet.balance) + amount;
    await this.walletRepo.save(wallet);

    // Record transaction
    const txType =
      job.name === 'refund' ? TransactionType.REFUND : TransactionType.CREDIT;
    const tx = this.txRepo.create({
      wallet_id: wallet.id,
      order_id: orderId || null,
      type: txType,
      amount,
      balance_after: wallet.balance,
      notes: notes || `${txType} - ${amount}`,
    });
    await this.txRepo.save(tx);

    this.logger.log(
      `Wallet ${job.name} completed: ${amount} → wallet ${wallet.id} (new balance: ${wallet.balance})`,
    );
  }
}
