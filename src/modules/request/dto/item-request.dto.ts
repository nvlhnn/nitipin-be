import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsDateString,
  IsIn,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { RequestStatus } from '../../../common/enums/index.js';

export class CreateItemRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  product_name!: string;

  @IsOptional()
  @IsString()
  product_url?: string;

  @IsOptional()
  @IsString()
  product_image_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  destination_country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  destination_city?: string;

  @IsInt()
  @Min(1)
  max_budget!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category!: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class UpdateItemRequestDto {
  @IsOptional()
  @IsString()
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
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_budget?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  quantity?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class ItemRequestQueryDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budget_max?: number;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  @IsIn(['newest', 'deadline', 'budget_desc'])
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
