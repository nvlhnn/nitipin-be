import {
  IsString,
  IsInt,
  IsOptional,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';

export class WithdrawDto {
  @IsInt()
  @Min(10000)
  amount!: number;

  @IsString()
  @MaxLength(100)
  bank_name!: string;

  @IsString()
  @MaxLength(50)
  bank_account!: string;

  @IsString()
  @MaxLength(255)
  bank_holder!: string;
}

export class WalletTransactionQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['credit', 'withdrawal', 'refund'])
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  per_page?: number;
}
