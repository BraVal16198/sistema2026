import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveClinicalRecordDto {
  @IsString()
  @IsNotEmpty()
  doctor: string;

  @IsString()
  @IsNotEmpty()
  specialty: string;

  @IsString()
  @IsOptional()
  bloodType?: string;

  @IsString()
  @IsOptional()
  alergias?: string;

  @IsString()
  @IsOptional()
  medicacionActual?: string;

  @IsString()
  @IsOptional()
  motivo?: string;

  @IsString()
  @IsOptional()
  diagnostico?: string;

  @IsString()
  @IsOptional()
  tratamiento?: string;

  @IsString()
  @IsOptional()
  examenes?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
