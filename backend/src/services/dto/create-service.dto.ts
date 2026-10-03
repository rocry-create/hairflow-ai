import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  @Min(5)
  durationMinutes: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMax?: number | null;

  @IsOptional()
  @IsBoolean()
  requiresEvaluation?: boolean;

  @IsOptional()
  @IsBoolean()
  isMegaHair?: boolean;
}
