import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional } from 'class-validator';

export class RedeemPointsDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsInt()
  @IsPositive()
  points: number;

  @IsString()
  @IsOptional()
  description?: string;
}