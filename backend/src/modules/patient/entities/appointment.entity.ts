import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PatientProfileEntity } from './patient-profile.entity';

@Entity('appointments')
export class AppointmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfileEntity, { onDelete: 'CASCADE', eager: true })
  patientProfile: PatientProfileEntity;

  @Column()
  date: string;

  @Column()
  time: string;

  @Column()
  doctor: string;

  @Column()
  specialty: string;

  @Column()
  reason: string;

  @Column()
  place: string;

  @Column()
  status: string;

  @Column()
  paymentStatus: string;

  @Column({ type: 'bigint', nullable: true })
  holdExpiresAt: number | null;

  @Column({ type: 'bigint', nullable: true })
  createdAt: number | null;
}
