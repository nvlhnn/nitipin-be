import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import {
  TransactionType,
  WithdrawalStatus,
} from '../../../common/enums/index.js';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  wallet_id!: string;

  @Column({ type: 'uuid', nullable: true })
  order_id!: string | null;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'bigint' })
  amount!: number;

  @Column({ type: 'bigint' })
  balance_after!: number;

  // Withdrawal details
  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank_account!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank_holder!: string | null;

  @Column({ type: 'enum', enum: WithdrawalStatus, nullable: true })
  withdrawal_status!: WithdrawalStatus | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  // Relations
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: Wallet;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;
}
