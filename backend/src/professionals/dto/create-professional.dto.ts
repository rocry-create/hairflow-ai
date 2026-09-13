import { IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;
}
