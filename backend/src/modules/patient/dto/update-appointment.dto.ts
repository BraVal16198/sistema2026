import { IsOptional, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  hour?: string;
}

