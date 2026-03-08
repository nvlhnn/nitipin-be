import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  IsArray,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { OrderStatus, UserType } from '../../../common/enums/index.js';

export class OrderQueryDto {
  @IsOptional()
  @IsEnum(UserType)
  role?: UserType;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  per_page?: number;
}

export class UpdateOrderStatusDto {
  @IsString()
  @IsEnum(OrderStatus)
  @IsIn([
    OrderStatus.PAID,
    OrderStatus.PURCHASED,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
    OrderStatus.DISPUTED,
  ])
  status!: OrderStatus;

  // purchased
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  proof_image_urls?: string[];

  @IsOptional()
  @IsString()
  receipt_image_url?: string;

  // shipped
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shipping_courier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tracking_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shipping_notes?: string;

  // disputed
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class InitiatePaymentDto {
  @IsString()
  @IsIn([
    'bank_transfer',
    'qris',
    'gopay',
    'ovo',
    'dana',
    'shopeepay',
    'credit_card',
  ])
  payment_method!: string;
}

export interface TimelineStep {
  step: string;
  label: string;
  date: string | null;
  done: boolean;
}
