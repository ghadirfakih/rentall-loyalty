import { IsString, IsNotEmpty } from 'class-validator';

export class CheckTierDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}