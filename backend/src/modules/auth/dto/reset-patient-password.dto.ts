import { IsString, Length, Matches, MinLength } from 'class-validator';

export class ResetPatientPasswordDto {
  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/)
  dni: string;

  @IsString()
  @MinLength(4)
  password: string;
}
