import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { SaveClinicalRecordDto } from './dto/save-clinical-record.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { PatientService } from './patient.service';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('catalog')
  getCatalog() {
    return this.patientService.getCatalog();
  }

  @Get('portal/:username/state')
  getState(@Param('username') username: string) {
    return this.patientService.getState(username);
  }

  @Post('portal/:username/citas')
  createAppointment(
    @Param('username') username: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.patientService.createAppointment(username, dto);
  }

  @Post('portal/:username/pagos/:paymentId/pagar')
  payPending(
    @Param('username') username: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.patientService.payPending(username, paymentId);
  }

  @Delete('portal/:username/citas/:appointmentId')
  cancelAppointment(
    @Param('username') username: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.patientService.cancelAppointment(username, appointmentId);
  }

  @Post('history/by-dni/:dni')
  saveClinicalRecordByDni(
    @Param('dni') dni: string,
    @Body() dto: SaveClinicalRecordDto,
  ) {
    return this.patientService.saveClinicalRecordByDni(dni, dto);
  }

  @Post('caja/citas/by-dni/:dni')
  createAppointmentByDni(
    @Param('dni') dni: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.patientService.createAppointmentByDni(dni, dto);
  }

  @Post('admin/citas/by-dni/:dni')
  createAppointmentByDniFromAdmin(
    @Param('dni') dni: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.patientService.createAppointmentByDni(dni, dto);
  }

  @Post('caja/pagos/:paymentId/pagar')
  payPendingByCaja(@Param('paymentId') paymentId: string) {
    return this.patientService.payPendingById(paymentId);
  }

  @Get('caja/overview')
  getCajaOverview() {
    return this.patientService.getCajaOverview();
  }

  @Get('admin/overview')
  getAdminOverview() {
    return this.patientService.getAdminOverview();
  }

  @Get('medico/overview')
  getMedicoOverview(
    @Query('doctor') doctor: string,
    @Query('specialty') specialty: string,
    @Query('date') date: string,
  ) {
    return this.patientService.getMedicoOverview(doctor, specialty, date);
  }

  @Post('appointments/:appointmentId/update')
  updateAppointment(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.patientService.updateAppointment(appointmentId, dto);
  }
}
