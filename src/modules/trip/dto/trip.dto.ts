import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  IsDateString,
  IsIn,
  Min,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { TripType, TripStatus } from '../../../common/enums/index.js';

export class CreateTripDto {
  @IsString()
  @IsEnum(TripType)
  trip_type!: TripType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin_city?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  destination_country!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  destination_city!: string;

  @IsDateString()
  departure_date!: string;

  @IsDateString()
  return_date!: string;

  @IsArray()
  @IsString({ each: true })
  categories!: string[];

  @IsInt()
  @Min(0)
  fee_per_item!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_items?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  cover_image_url?: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  origin_city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  destination_city?: string;

  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @IsOptional()
  @IsDateString()
  return_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  fee_per_item?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_items?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  cover_image_url?: string;
}

export class UpdateTripStatusDto {
  @IsString()
  @IsEnum(TripStatus)
  status!: TripStatus;
}

export class TripQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(TripType)
  trip_type?: TripType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  departure_from?: string;

  @IsOptional()
  @IsDateString()
  departure_to?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fee_max?: number;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsString()
  @IsIn(['departure_date', 'fee_asc', 'fee_desc', 'rating', 'newest'])
  sort?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  per_page?: number;
}
