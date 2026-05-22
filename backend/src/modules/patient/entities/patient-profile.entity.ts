import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('patient_profiles')
export class PatientProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', nullable: true })
  paternalLastName: string | null;

  @Column({ type: 'varchar', nullable: true })
  maternalLastName: string | null;

  @Column({ unique: true })
  dni: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  birthDate: string | null;

  @Column()
  bloodType: string;

  @Column('simple-array')
  allergies: string[];

  @Column('simple-array')
  chronicDiseases: string[];

  @Column('simple-array')
  currentMedication: string[];
}
