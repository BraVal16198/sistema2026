import { IsString, Length, Matches } from 'class-validator';

export class RecoverPatientDto {
  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/)
  dni: string;
}

