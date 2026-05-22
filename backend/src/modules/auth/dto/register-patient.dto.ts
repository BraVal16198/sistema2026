import { IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterPatientDto {
  @IsString()
  @Length(8, 8)
  @Matches(/^\d{8}$/)
  dni: string;

  @IsString()
  @MinLength(2)
  nombres: string;

  @IsString()
  @MinLength(2)
  apellidoPaterno: string;

  @IsString()
  @MinLength(2)
  apellidoMaterno: string;

  @IsOptional()
  @IsString()
  @Length(9, 9)
  @Matches(/^\d{9}$/)
  telefono?: string;

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @IsString()
  @MinLength(4)
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}

