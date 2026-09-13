import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpsertHairRecordDto {
  @IsOptional()
  @IsString()
  hairType?: string;

  @IsOptional()
  @IsString()
  chemicalHistory?: string;

  @IsOptional()
  @IsDateString()
  lastChemicalAt?: string;

  @IsOptional()
  @IsString()
  productsUsed?: string;

  @IsOptional()
  @IsString()
  colorFormula?: string;
}
