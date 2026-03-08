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
import { Trip } from '../../trip/entities/trip.entity.js';
import { ItemRequest } from '../../request/entities/item-request.entity.js';
import { OfferStatus } from '../../../common/enums/index.js';

@Entity('offers')
export class Offer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  trip_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  item_request_id!: string | null;

  @Column({ type: 'uuid' })
  from_user_id!: string;

  @Column({ type: 'uuid' })
  to_user_id!: string;

  @Column({ type: 'varchar', length: 255 })
  product_name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_url!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_image_url!: string | null;

  @Column({ type: 'text', nullable: true })
  product_notes!: string | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'bigint' })
  proposed_price!: number;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({
    type: 'enum',
    enum: OfferStatus,
    default: OfferStatus.PENDING,
  })
  status!: OfferStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  // Relations
  @ManyToOne(() => Trip, (trip) => trip.offers, { nullable: true })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip | null;

  @ManyToOne(() => ItemRequest, (req) => req.offers, { nullable: true })
  @JoinColumn({ name: 'item_request_id' })
  item_request!: ItemRequest | null;

  @ManyToOne(() => User, (user) => user.sent_offers)
  @JoinColumn({ name: 'from_user_id' })
  from_user!: User;

  @ManyToOne(() => User, (user) => user.received_offers)
  @JoinColumn({ name: 'to_user_id' })
  to_user!: User;
}
