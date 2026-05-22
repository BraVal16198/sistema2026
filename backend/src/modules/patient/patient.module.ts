import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { AppointmentEntity } from './entities/appointment.entity';
import { HistoryEntryEntity } from './entities/history-entry.entity';
import { PatientProfileEntity } from './entities/patient-profile.entity';
import { PaymentEntity } from './entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientProfileEntity,
      AppointmentEntity,
      PaymentEntity,
      HistoryEntryEntity,
    ]),
  ],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
