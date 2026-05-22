import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PatientProfileEntity } from './patient-profile.entity';

@Entity('payments')
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfileEntity, { onDelete: 'CASCADE', eager: true })
  patientProfile: PatientProfileEntity;

  @Column({ type: 'varchar', nullable: true })
  appointmentId: string | null;

  @Column({ unique: true })
  invoice: string;

  @Column()
  concept: string;

  @Column()
  date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column()
  method: string;

  @Column()
  status: string;

  @Column({ type: 'bigint', nullable: true })
  holdExpiresAt: number | null;

  @Column({ type: 'bigint', nullable: true })
  createdAt: number | null;
}
