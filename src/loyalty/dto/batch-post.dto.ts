import { IsString, IsOptional } from 'class-validator';

export class BatchPostDto {
  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  batchId?: string;
}