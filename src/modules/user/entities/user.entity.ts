import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Trip } from '../../trip/entities/trip.entity.js';
import { Offer } from '../../offer/entities/offer.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import { Review } from '../../review/entities/review.entity.js';
import { Notification } from '../../notification/entities/notification.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  username!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postal_code!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  google_id!: string | null;

  // Traveler stats (denormalized)
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  traveler_rating!: number;

  @Column({ type: 'int', default: 0 })
  traveler_review_count!: number;

  @Column({ type: 'int', default: 0 })
  traveler_trip_count!: number;

  @Column({ type: 'int', default: 0 })
  traveler_order_count!: number;

  // Requester stats (denormalized)
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  requester_rating!: number;

  @Column({ type: 'int', default: 0 })
  requester_review_count!: number;

  @Column({ type: 'int', default: 0 })
  requester_order_count!: number;

  @Column({ type: 'boolean', default: false })
  is_verified!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_reset_token_hash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  password_reset_expires_at!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_verify_token_hash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  email_verify_expires_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;

  // Relations
  @OneToMany(() => Trip, (trip) => trip.user)
  trips!: Trip[];

  @OneToMany(() => Offer, (offer) => offer.from_user)
  sent_offers!: Offer[];

  @OneToMany(() => Offer, (offer) => offer.to_user)
  received_offers!: Offer[];

  @OneToMany(() => Order, (order) => order.traveler)
  traveler_orders!: Order[];

  @OneToMany(() => Order, (order) => order.requester)
  requester_orders!: Order[];

  @OneToMany(() => Review, (review) => review.reviewer)
  given_reviews!: Review[];

  @OneToMany(() => Review, (review) => review.reviewee)
  received_reviews!: Review[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications!: Notification[];
}
