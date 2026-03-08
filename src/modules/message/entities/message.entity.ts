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
import { Offer } from '../../offer/entities/offer.entity.js';
import { MessageType } from '../../../common/enums/index.js';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  order_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  offer_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  sender_id!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url!: string | null;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  message_type!: MessageType;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  // Relations
  @ManyToOne(() => Order, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;

  @ManyToOne(() => Offer, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender!: User | null;
}
