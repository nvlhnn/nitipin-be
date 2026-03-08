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
import { RequestStatus } from '../../../common/enums/index.js';

@Entity('item_requests')
export class ItemRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 255 })
  product_name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_url!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  product_image_url!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 100 })
  destination_country!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destination_city!: string | null;

  @Column({ type: 'bigint' })
  max_budget!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'varchar', length: 50 })
  category!: string;

  @Column({ type: 'date', nullable: true })
  deadline!: string | null;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.OPEN,
  })
  status!: RequestStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Offer, (offer) => offer.item_request)
  offers!: Offer[];
}
