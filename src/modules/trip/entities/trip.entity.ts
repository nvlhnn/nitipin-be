import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity.js';
import { Offer } from '../../offer/entities/offer.entity.js';
import { TripType, TripStatus } from '../../../common/enums/index.js';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({
    type: 'enum',
    enum: TripType,
    default: TripType.INTERNATIONAL,
  })
  trip_type!: TripType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  origin_city!: string | null;

  @Column({ type: 'varchar', length: 100 })
  destination_country!: string;

  @Column({ type: 'varchar', length: 100 })
  destination_city!: string;

  @Column({ type: 'date' })
  departure_date!: string;

  @Column({ type: 'date' })
  return_date!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  categories!: string[];

  @Column({ type: 'bigint' })
  fee_per_item!: number;

  @Column({ type: 'int', nullable: true })
  max_items!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cover_image_url!: string | null;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.OPEN,
  })
  status!: TripStatus;

  @Column({ type: 'int', default: 0 })
  accepted_items!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;

  // Relations
  @ManyToOne(() => User, (user) => user.trips)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Offer, (offer) => offer.trip)
  offers!: Offer[];
}
