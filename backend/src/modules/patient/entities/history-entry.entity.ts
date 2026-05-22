import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PatientProfileEntity } from './patient-profile.entity';

@Entity('history_entries')
export class HistoryEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfileEntity, { onDelete: 'CASCADE', eager: true })
  patientProfile: PatientProfileEntity;

  @Column()
  date: string;

  @Column()
  doctor: string;

  @Column()
  specialty: string;

  @Column()
  motivo: string;

  @Column()
  diagnostico: string;

  @Column()
  tratamiento: string;

  @Column()
  examenes: string;

  @Column()
  observaciones: string;

  @Column({ type: 'bigint', nullable: true })
  createdAt: number | null;
}
