import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class CalculatePointsDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsInt()
  @IsPositive()
  rentalDuration: number;

  @IsInt()
  @IsPositive()
  milesDriven: number;
}