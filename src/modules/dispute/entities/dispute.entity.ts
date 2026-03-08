import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import { DisputeStatus } from '../../../common/enums/index.js';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  order_id!: string;

  @Column({ type: 'uuid' })
  opened_by!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  evidence_urls!: string[];

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  status!: DisputeStatus;

  @Column({ type: 'text', nullable: true })
  resolution_notes!: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolved_by!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  opener!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolver!: User | null;
}
