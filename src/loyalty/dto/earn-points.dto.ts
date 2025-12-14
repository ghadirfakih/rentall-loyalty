import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, IsEnum } from 'class-validator';
import { TransactionCategory } from '@prisma/client';

export class EarnPointsDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsOptional()
  rentalId?: string;

  @IsEnum(TransactionCategory)
  category: TransactionCategory;

  @IsInt()
  @IsPositive()
  points: number;

  @IsString()
  @IsOptional()
  description?: string;
}