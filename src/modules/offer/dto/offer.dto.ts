import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  IsIn,
  Min,
  MaxLength,
  ValidateIf,
  IsEnum,
} from 'class-validator';
import { OfferStatus } from '../../../common/enums/index.js';

export class CreateOfferDto {
  @IsOptional()
  @IsUUID()
  trip_id?: string;

  @IsOptional()
  @IsUUID()
  item_request_id?: string;

  @ValidateIf((o: CreateOfferDto) => !!o.trip_id)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  product_name?: string;

  @IsOptional()
  @IsString()
  product_url?: string;

  @IsOptional()
  @IsString()
  product_image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  product_notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsInt()
  @Min(1)
  proposed_price!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class UpdateOfferDto {
  @IsOptional()
  @IsEnum(OfferStatus)
  @IsIn([OfferStatus.ACCEPTED, OfferStatus.REJECTED, OfferStatus.CANCELLED])
  status?: OfferStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  proposed_price?: number;
}

export class OfferQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['sent', 'received'])
  direction?: string;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  per_page?: number;
}
