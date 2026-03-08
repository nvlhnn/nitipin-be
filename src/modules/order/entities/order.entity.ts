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
import { Offer } from '../../offer/entities/offer.entity.js';
import { Trip } from '../../trip/entities/trip.entity.js';
import { ItemRequest } from '../../request/entities/item-request.entity.js';
import { OrderStatus } from '../../../common/enums/index.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  order_number!: string;

  @Column({ type: 'uuid' })
  offer_id!: string;

  @Column({ type: 'uuid', nullable: true })
  trip_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  item_request_id!: string | null;

  @Column({ type: 'uuid' })
  traveler_id!: string;

  @Column({ type: 'uuid' })
  requester_id!: string;

  // Product snapshot
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

  // Pricing (IDR)
  @Column({ type: 'bigint' })
  agreed_price!: number;

  @Column({ type: 'bigint' })
  service_fee!: number;

  @Column({ type: 'bigint' })
  platform_fee!: number;

  @Column({ type: 'bigint' })
  total_amount!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  // Proof & shipping
  @Column({ type: 'text', array: true, default: '{}' })
  proof_image_urls!: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  receipt_image_url!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shipping_courier!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_number!: string | null;

  @Column({ type: 'text', nullable: true })
  shipping_notes!: string | null;

  // Payment
  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_id!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paid_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  released_at!: Date | null;

  // Progress timestamps
  @Column({ type: 'timestamptz', nullable: true })
  purchased_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  shipped_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  delivered_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  auto_confirm_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;

  // Relations
  @ManyToOne(() => Offer)
  @JoinColumn({ name: 'offer_id' })
  offer!: Offer;

  @ManyToOne(() => Trip, { nullable: true })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip | null;

  @ManyToOne(() => ItemRequest, { nullable: true })
  @JoinColumn({ name: 'item_request_id' })
  item_request!: ItemRequest | null;

  @ManyToOne(() => User, (user) => user.traveler_orders)
  @JoinColumn({ name: 'traveler_id' })
  traveler!: User;

  @ManyToOne(() => User, (user) => user.requester_orders)
  @JoinColumn({ name: 'requester_id' })
  requester!: User;
}
