import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RecoverPatientDto } from './dto/recover-patient.dto';
import { ResetPatientPasswordDto } from './dto/reset-patient-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('paciente/register')
  registerPatient(@Body() dto: RegisterPatientDto) {
    return this.authService.registerPatient(dto);
  }

  @Post('paciente/recover')
  recoverPatient(@Body() dto: RecoverPatientDto) {
    return this.authService.recoverPatientByDni(dto.dni);
  }

  @Post('paciente/reset-password')
  resetPatientPassword(@Body() dto: ResetPatientPasswordDto) {
    return this.authService.resetPatientPasswordByDni(dto.dni, dto.password);
  }
}

