import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import { UserType } from '../../../common/enums/index.js';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  order_id!: string;

  @Column({ type: 'uuid' })
  reviewer_id!: string;

  @Column({ type: 'uuid' })
  reviewee_id!: string;

  @Column({ type: 'varchar', length: 20 })
  role_reviewed!: UserType;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  // Relations
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => User, (user) => user.given_reviews)
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: User;

  @ManyToOne(() => User, (user) => user.received_reviews)
  @JoinColumn({ name: 'reviewee_id' })
  reviewee!: User;
}
