import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { UserType } from '../../../common/enums/index.js';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ReviewQueryDto {
  @IsOptional()
  @IsEnum(UserType)
  role?: UserType;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  per_page?: number;
}
