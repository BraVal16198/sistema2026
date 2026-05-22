import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserEntity } from '../modules/users/entities/user.entity';
import { PatientProfileEntity } from '../modules/patient/entities/patient-profile.entity';
import { AppointmentEntity } from '../modules/patient/entities/appointment.entity';
import { PaymentEntity } from '../modules/patient/entities/payment.entity';
import { HistoryEntryEntity } from '../modules/patient/entities/history-entry.entity';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USER', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'sistema2026'),
  entities: [
    UserEntity,
    PatientProfileEntity,
    AppointmentEntity,
    PaymentEntity,
    HistoryEntryEntity,
  ],
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
});

