import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  COSTO_POR_ESPECIALIDAD,
  HORARIOS_CITAS,
  MEDICO_ESPECIALIDADES,
  METODOS_PAGO,
} from '../../common/catalog';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { SaveClinicalRecordDto } from './dto/save-clinical-record.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentEntity } from './entities/appointment.entity';
import { HistoryEntryEntity } from './entities/history-entry.entity';
import { PatientProfileEntity } from './entities/patient-profile.entity';
import { PaymentEntity } from './entities/payment.entity';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfileEntity)
    private readonly profileRepo: Repository<PatientProfileEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepo: Repository<AppointmentEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(HistoryEntryEntity)
    private readonly historyRepo: Repository<HistoryEntryEntity>,
  ) {}

  private formatLongDateEs(dateIso: string) {
    const parsed = this.parseAppointmentDate(dateIso);
    if (!parsed) return dateIso;
    return parsed.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private formatDateFromIso(dateIso: string) {
    return this.formatLongDateEs(dateIso);
  }

  private assertAppointmentDateNotPast(dateIso: string) {
    const s = String(dateIso ?? '').trim();
    const todayIso = this.getTodayIso();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s < todayIso) {
      throw new BadRequestException('No se pueden agendar citas en fechas pasadas');
    }
    const d = this.parseAppointmentDate(s);
    if (!d) {
      throw new BadRequestException('Fecha de cita inválida');
    }
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = this.startOfToday();
    if (day.getTime() < today.getTime()) {
      throw new BadRequestException('No se pueden agendar citas en fechas pasadas');
    }
  }

  private getTodayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseAppointmentDate(dateStr: string): Date | null {
    const s = String(dateStr ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const months: Record<string, number> = {
      enero: 0,
      febrero: 1,
      marzo: 2,
      abril: 3,
      mayo: 4,
      junio: 5,
      julio: 6,
      agosto: 7,
      septiembre: 8,
      setiembre: 8,
      octubre: 9,
      noviembre: 10,
      diciembre: 11,
    };
    const match = s.match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i);
    if (match) {
      const month = months[match[2].toLowerCase()];
      if (month === undefined) return null;
      return new Date(Number(match[3]), month, Number(match[1]));
    }
    const fallback = new Date(s);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  private startOfToday(): Date {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  private addDaysIso(dateIso: string, days: number): string {
    const base = this.parseAppointmentDate(dateIso);
    if (!base) return dateIso;
    base.setDate(base.getDate() + days);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private isUpcomingAppointment(appointment: AppointmentEntity): boolean {
    const status = String(appointment.status ?? '').trim();
    if (status === 'Completada' || status === 'Cancelada') return false;
    const d = this.parseAppointmentDate(appointment.date);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= this.startOfToday().getTime();
  }

  private splitAppointments(appointments: AppointmentEntity[]) {
    const upcoming: AppointmentEntity[] = [];
    const past: AppointmentEntity[] = [];
    for (const apt of appointments) {
      if (this.isUpcomingAppointment(apt)) upcoming.push(apt);
      else past.push(apt);
    }
    const compareAsc = (a: AppointmentEntity, b: AppointmentEntity) => {
      const ta = this.parseAppointmentDate(a.date)?.getTime() ?? 0;
      const tb = this.parseAppointmentDate(b.date)?.getTime() ?? 0;
      return ta - tb;
    };
    upcoming.sort(compareAsc);
    past.sort((a, b) => compareAsc(b, a));
    return { upcoming, past };
  }

  private calcAge(birthDate?: string | null) {
    if (!birthDate) return '--';
    const birth = this.parseAppointmentDate(birthDate) ?? new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return '--';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
    return years >= 0 ? `${years} años` : '--';
  }

  getCatalog() {
    return {
      medicosEspecialidades: MEDICO_ESPECIALIDADES.map((item) => ({
        value: item.value,
        label: item.value,
        doctor: item.doctor,
        specialty: item.specialty,
      })),
      horariosCitas: [...HORARIOS_CITAS],
      metodosPago: [...METODOS_PAGO],
      costosPorEspecialidad: COSTO_POR_ESPECIALIDAD,
      incrementos: [
        { id: 1, meta: 'Registro de clientes y consulta', valor: 'Login, registro y portal paciente' },
        { id: 2, meta: 'Programación de citas médicas', valor: 'Citas desde paciente, caja y admin' },
        { id: 3, meta: 'Integración de pagos y facturación', valor: 'Cobros en caja y portal paciente' },
        { id: 4, meta: 'Validación y ensamblado final', valor: 'Historia clínica, médico y reportes PDF' },
      ],
    };
  }

  private async resolveProfile(username: string) {
    await this.ensureGlobalSeed();
    const normalized = username.trim().toLowerCase();
    let profile = await this.profileRepo.findOne({ where: { username: normalized } });

    if (!profile) {
      if (normalized === 'paciente') {
        return this.ensureSeed('paciente');
      }
      throw new NotFoundException(
        `No existe perfil clínico para "${normalized}". Regístrate como paciente primero.`,
      );
    }

    if (normalized === 'paciente') {
      await this.ensureSeed('paciente');
      profile = await this.profileRepo.findOne({ where: { username: normalized } });
    }

    return profile!;
  }

  private async ensureGlobalSeed() {
    const todayIso = this.getTodayIso();
    const tomorrowIso = this.addDaysIso(todayIso, 1);
    const todayParsed = this.parseAppointmentDate(todayIso);
    const todayShort = todayParsed
      ? todayParsed.toLocaleDateString('es-PE')
      : new Date().toLocaleDateString('es-PE');

    const seedPatients = [
      {
        username: 'paciente1',
        fullName: 'Marcelo Campos Roble',
        firstName: 'Marcelo',
        paternalLastName: 'Campos',
        maternalLastName: 'Roble',
        dni: '70052091',
        phone: '987456123',
        birthDate: '2002-12-12',
        bloodType: 'O+',
      },
      {
        username: 'paciente2',
        fullName: 'Lucia Herrera Soto',
        firstName: 'Lucia',
        paternalLastName: 'Herrera',
        maternalLastName: 'Soto',
        dni: '70052092',
        phone: '987456124',
        birthDate: '1999-07-10',
        bloodType: 'A+',
      },
      {
        username: 'paciente3',
        fullName: 'Pedro Quispe Ramos',
        firstName: 'Pedro',
        paternalLastName: 'Quispe',
        maternalLastName: 'Ramos',
        dni: '70052093',
        phone: '987456125',
        birthDate: '1988-03-22',
        bloodType: 'B+',
      },
      {
        username: 'paciente4',
        fullName: 'Ana Vera Condori',
        firstName: 'Ana',
        paternalLastName: 'Vera',
        maternalLastName: 'Condori',
        dni: '70052094',
        phone: '987456126',
        birthDate: '1995-11-02',
        bloodType: 'AB+',
      },
      {
        username: 'paciente5',
        fullName: 'Jose Rojas Medina',
        firstName: 'Jose',
        paternalLastName: 'Rojas',
        maternalLastName: 'Medina',
        dni: '70052095',
        phone: '987456127',
        birthDate: '2001-05-18',
        bloodType: 'O-',
      },
    ];

    const doctorPool = [
      { doctor: 'Dr. Juan Pérez', specialty: 'Medicina General', hour: '09:00 AM', method: 'Efectivo' },
      { doctor: 'Dra. Ana Torres', specialty: 'Cardiología', hour: '11:00 AM', method: 'Tarjeta' },
      { doctor: 'Dr. Carlos Ruiz', specialty: 'Pediatría', hour: '03:00 PM', method: 'Yape/Plin' },
      { doctor: 'Dra. María López', specialty: 'Traumatología', hour: '05:00 PM', method: 'Transferencia' },
      { doctor: 'Dr. Juan Pérez', specialty: 'Medicina General', hour: '06:00 PM', method: 'Efectivo' },
    ];

    for (let i = 0; i < seedPatients.length; i += 1) {
      const data = seedPatients[i];
      const doctorInfo = doctorPool[i];
      let profile = await this.profileRepo.findOne({ where: { username: data.username } });
      if (!profile) {
        profile = await this.profileRepo.save(
          this.profileRepo.create({
            username: data.username,
            fullName: data.fullName,
            firstName: data.firstName,
            paternalLastName: data.paternalLastName,
            maternalLastName: data.maternalLastName,
            dni: data.dni,
            phone: data.phone,
            birthDate: data.birthDate,
            bloodType: data.bloodType,
            allergies: [],
            chronicDiseases: [],
            currentMedication: [],
          }),
        );
      }

      const existingAppointments = await this.appointmentRepo.count({
        where: { patientProfile: { id: profile.id } },
      });

      if (!existingAppointments) {
        const isPaid = i < 3;
        const createdAt = Date.now() - i * 10 * 60 * 1000;
        const appointment = await this.appointmentRepo.save(
          this.appointmentRepo.create({
            patientProfile: profile,
            date: this.formatLongDateEs(todayIso),
            time: doctorInfo.hour,
            doctor: doctorInfo.doctor,
            specialty: doctorInfo.specialty,
            reason: `Motivo: Consulta de ${doctorInfo.specialty}`,
            place: 'Consultorio por confirmar',
            status: isPaid ? 'Confirmada' : 'Pendiente',
            paymentStatus: isPaid ? 'PAGADO' : 'PENDIENTE_PAGO',
            holdExpiresAt: isPaid ? null : Date.now() + 3 * 60 * 60 * 1000,
            createdAt,
          }),
        );

        await this.paymentRepo.save(
          this.paymentRepo.create({
            patientProfile: profile,
            appointmentId: appointment.id,
            invoice: `F001-${String(Date.now() + i).slice(-5)}`,
            concept: `Consulta ${doctorInfo.specialty}`,
            date: todayShort,
            amount: (COSTO_POR_ESPECIALIDAD[doctorInfo.specialty] ?? 80).toFixed(2),
            method: doctorInfo.method,
            status: isPaid ? 'Pagado' : 'Pendiente',
            holdExpiresAt: isPaid ? null : Date.now() + 3 * 60 * 60 * 1000,
            createdAt,
          }),
        );

        await this.historyRepo.save(
          this.historyRepo.create({
            patientProfile: profile,
            date: this.formatLongDateEs(todayIso),
            doctor: `${doctorInfo.doctor} - ${doctorInfo.specialty}`,
            specialty: doctorInfo.specialty,
            motivo: `Consulta de ${doctorInfo.specialty}`,
            diagnostico: isPaid ? 'Control realizado' : 'Pendiente de atención',
            tratamiento: isPaid ? 'Tratamiento ambulatorio' : 'Pendiente de atención',
            examenes: isPaid ? 'Examen básico normal' : 'Pendiente',
            observaciones: isPaid
              ? 'Atendido y pago confirmado.'
              : 'Reserva creada, pendiente de pago.',
            createdAt,
          }),
        );

        await this.appointmentRepo.save(
          this.appointmentRepo.create({
            patientProfile: profile,
            date: this.formatLongDateEs(tomorrowIso),
            time: '10:30 AM',
            doctor: doctorInfo.doctor,
            specialty: doctorInfo.specialty,
            reason: `Motivo: Seguimiento de ${doctorInfo.specialty}`,
            place: 'Consultorio por confirmar',
            status: 'Pendiente',
            paymentStatus: 'PENDIENTE_PAGO',
            holdExpiresAt: null,
            createdAt: createdAt + 1,
          }),
        );
      }
    }
  }

  private async ensureSeed(username: string) {
    const isDemoPaciente = username === 'paciente';
    let profile = await this.profileRepo.findOne({ where: { username } });

    if (!profile) {
      profile = await this.profileRepo.save(
        this.profileRepo.create({
          username,
          fullName: isDemoPaciente ? 'María García' : `Paciente ${username}`,
          firstName: isDemoPaciente ? 'María' : null,
          paternalLastName: isDemoPaciente ? 'García' : null,
          maternalLastName: isDemoPaciente ? 'Pérez' : null,
          dni: isDemoPaciente ? '45678901' : String(Date.now()).slice(-8),
          phone: isDemoPaciente ? '987654321' : null,
          birthDate: isDemoPaciente ? '1990-04-12' : null,
          bloodType: 'O+',
          allergies: isDemoPaciente ? ['Penicilina', 'Polen'] : [],
          chronicDiseases: isDemoPaciente ? ['Hipertensión'] : [],
          currentMedication: isDemoPaciente ? ['Enalapril 10mg'] : [],
        }),
      );
    }

    if (!isDemoPaciente) {
      return profile;
    }

    const existingAppointments = await this.appointmentRepo.count({
      where: { patientProfile: { id: profile.id } },
    });
    if (!existingAppointments) {
      const todayIso = this.getTodayIso();
      const tomorrowIso = this.addDaysIso(todayIso, 1);
      await this.appointmentRepo.save([
        this.appointmentRepo.create({
          patientProfile: profile,
          date: this.formatLongDateEs(todayIso),
          time: '10:00 AM',
          doctor: 'Dr. Juan Pérez',
          specialty: 'Medicina General',
          reason: 'Motivo: Control de presión arterial',
          place: 'Consultorio 201',
          status: 'Confirmada',
          paymentStatus: 'PAGADO',
          holdExpiresAt: null,
          createdAt: Date.now() - 2000,
        }),
        this.appointmentRepo.create({
          patientProfile: profile,
          date: this.formatLongDateEs(tomorrowIso),
          time: '02:30 PM',
          doctor: 'Dra. Ana Torres',
          specialty: 'Cardiología',
          reason: 'Motivo: Evaluación cardiológica',
          place: 'Consultorio 305',
          status: 'Pendiente',
          paymentStatus: 'PAGADO',
          holdExpiresAt: null,
          createdAt: Date.now() - 1000,
        }),
      ]);
    }

    const existingHistory = await this.historyRepo.count({
      where: { patientProfile: { id: profile.id } },
    });
    if (!existingHistory) {
      await this.historyRepo.save([
        this.historyRepo.create({
          patientProfile: profile,
          date: '01 de abril de 2026',
          doctor: 'Dr. Juan Pérez - Medicina General',
          specialty: 'Medicina General',
          motivo: 'Control de presión arterial',
          diagnostico: 'Hipertensión leve',
          tratamiento: 'Enalapril 10mg, 1 vez al día',
          examenes: '• Presión Arterial: 140/90\n• Glucosa: 95 mg/dL',
          observaciones: 'Control en 15 días',
          createdAt: Date.now() - 2000,
        }),
        this.historyRepo.create({
          patientProfile: profile,
          date: '14 de marzo de 2026',
          doctor: 'Dra. Ana Torres - Cardiología',
          specialty: 'Cardiología',
          motivo: 'Evaluación cardiológica',
          diagnostico: 'Ritmo cardíaco normal',
          tratamiento: 'Monitoreo y dieta baja en sodio',
          examenes: '• ECG: Normal\n• Frecuencia cardíaca: 72 lpm',
          observaciones: 'Nueva evaluación en 3 meses',
          createdAt: Date.now() - 1000,
        }),
      ]);
    }

    const existingPayments = await this.paymentRepo.count({
      where: { patientProfile: { id: profile.id }, status: 'Pagado' },
    });
    if (!existingPayments) {
      await this.paymentRepo.save([
        this.paymentRepo.create({
          patientProfile: profile,
          appointmentId: null,
          invoice: `F001-${profile.dni.slice(-5)}`,
          concept: 'Consulta + Electrocardiograma',
          date: '1/4/2026',
          amount: '153.40',
          method: 'Tarjeta',
          status: 'Pagado',
          holdExpiresAt: null,
          createdAt: Date.now() - 2000,
        }),
        this.paymentRepo.create({
          patientProfile: profile,
          appointmentId: null,
          invoice: `B001-${profile.dni.slice(-4)}`,
          concept: 'Consulta Cardiología',
          date: '14/3/2026',
          amount: '120.00',
          method: 'Efectivo',
          status: 'Pagado',
          holdExpiresAt: null,
          createdAt: Date.now() - 1000,
        }),
      ]);
    }

    return profile;
  }

  private async ensureProfileByDni(dni: string, dto?: CreateAppointmentDto) {
    const existing = await this.profileRepo.findOne({ where: { dni } });
    const nombres = dto?.nombres?.trim() ?? '';
    const apellidoPaterno = dto?.apellidoPaterno?.trim() ?? '';
    const apellidoMaterno = dto?.apellidoMaterno?.trim() ?? '';
    const fullNameFromDto =
      `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();

    if (existing) {
      let shouldUpdate = false;
      if (nombres && existing.firstName !== nombres) {
        existing.firstName = nombres;
        shouldUpdate = true;
      }
      if (apellidoPaterno && existing.paternalLastName !== apellidoPaterno) {
        existing.paternalLastName = apellidoPaterno;
        shouldUpdate = true;
      }
      if (apellidoMaterno && existing.maternalLastName !== apellidoMaterno) {
        existing.maternalLastName = apellidoMaterno;
        shouldUpdate = true;
      }
      if (fullNameFromDto && existing.fullName !== fullNameFromDto) {
        existing.fullName = fullNameFromDto;
        shouldUpdate = true;
      }
      if (dto?.telefono && existing.phone !== dto.telefono) {
        existing.phone = dto.telefono;
        shouldUpdate = true;
      }
      if (dto?.fechaNacimiento && existing.birthDate !== dto.fechaNacimiento) {
        existing.birthDate = dto.fechaNacimiento;
        shouldUpdate = true;
      }
      if (shouldUpdate) {
        return this.profileRepo.save(existing);
      }
      return existing;
    }

    const username = `paciente_${dni}`;
    return this.profileRepo.save(
      this.profileRepo.create({
        username,
        fullName: fullNameFromDto || `Paciente ${dni}`,
        firstName: nombres || null,
        paternalLastName: apellidoPaterno || null,
        maternalLastName: apellidoMaterno || null,
        dni,
        phone: dto?.telefono ?? null,
        birthDate: dto?.fechaNacimiento ?? null,
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        currentMedication: [],
      }),
    );
  }

  private async cleanupExpired(profileId: string) {
    const now = Date.now();
    const expired = await this.paymentRepo.find({
      where: { patientProfile: { id: profileId }, status: 'Pendiente' },
    });

    const expiredPayments = expired.filter(
      (item) => item.holdExpiresAt && now >= Number(item.holdExpiresAt),
    );
    const expiredIds = expiredPayments
      .map((item) => item.appointmentId)
      .filter((value): value is string => Boolean(value));

    if (!expiredPayments.length) return;

    await this.paymentRepo.delete({
      id: In(expiredPayments.map((item) => item.id)),
    });
    if (expiredIds.length) {
      await this.appointmentRepo.delete({ id: In(expiredIds) });
    }
  }

  async getState(username: string) {
    const profile = await this.resolveProfile(username);
    await this.cleanupExpired(profile.id);

    const [appointments, pendingPayments, paidPayments, history] = await Promise.all([
      this.appointmentRepo.find({
        where: { patientProfile: { id: profile.id } },
        order: { createdAt: 'DESC' },
      }),
      this.paymentRepo.find({
        where: { patientProfile: { id: profile.id }, status: 'Pendiente' },
        order: { createdAt: 'DESC' },
      }),
      this.paymentRepo.find({
        where: { patientProfile: { id: profile.id }, status: 'Pagado' },
        order: { createdAt: 'DESC' },
      }),
      this.historyRepo.find({
        where: { patientProfile: { id: profile.id } },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const { upcoming, past } = this.splitAppointments(appointments);

    return {
      profile: {
        username: profile.username,
        fullName: profile.fullName,
        firstName: profile.firstName,
        paternalLastName: profile.paternalLastName,
        maternalLastName: profile.maternalLastName,
        dni: profile.dni,
        phone: profile.phone,
        birthDate: profile.birthDate,
        grupoSanguineo: profile.bloodType,
        alergias: profile.allergies,
        enfermedadesCronicas: profile.chronicDiseases,
        medicacionActual: profile.currentMedication,
      },
      proximasCitas: upcoming,
      citasAnteriores: past,
      historialConsultas: history,
      pagosPendientes: pendingPayments.map((item) => ({
        ...item,
        monto: Number(item.amount),
      })),
      pagosHistorial: paidPayments.map((item) => ({
        fecha: item.date,
        factura: item.invoice,
        concepto: item.concept,
        metodo: item.method,
        monto: `S/ ${Number(item.amount).toFixed(2)}`,
        estado: item.status,
      })),
    };
  }

  async createAppointment(username: string, dto: CreateAppointmentDto) {
    const profile = await this.resolveProfile(username);
    this.assertAppointmentDateNotPast(dto.fecha);
    const selectedDoctor = dto.medicoEspecialidad;
    const [doctor = '', specialty = 'General'] = selectedDoctor.split(' - ');
    const amount = COSTO_POR_ESPECIALIDAD[specialty] ?? 80;
    const holdExpiresAt = Date.now() + 4 * 60 * 1000;
    const fechaCita = this.formatDateFromIso(dto.fecha);

    const appointment = await this.appointmentRepo.save(
      this.appointmentRepo.create({
        patientProfile: profile,
        date: fechaCita,
        time: dto.hora,
        doctor,
        specialty,
        reason: `Motivo: ${dto.motivo}`,
        place: 'Consultorio por confirmar',
        status: 'Pendiente',
        paymentStatus: 'PENDIENTE_PAGO',
        holdExpiresAt,
        createdAt: Date.now(),
      }),
    );

    await this.paymentRepo.save(
      this.paymentRepo.create({
        patientProfile: profile,
        appointmentId: appointment.id,
        invoice: `F001-${String(Date.now()).slice(-5)}`,
        concept: `Consulta ${specialty}`,
        date: new Date().toLocaleDateString('es-PE'),
        amount: amount.toFixed(2),
        method: dto.metodoPago,
        status: 'Pendiente',
        holdExpiresAt,
        createdAt: Date.now(),
      }),
    );

    await this.historyRepo.save(
      this.historyRepo.create({
        patientProfile: profile,
        date: fechaCita,
        doctor: selectedDoctor,
        specialty,
        motivo: dto.motivo,
        diagnostico: 'Pendiente de atención',
        tratamiento: 'Pendiente de atención',
        examenes: 'Pendiente de atención',
        observaciones: 'Cita solicitada, pendiente de pago y confirmación.',
        createdAt: Date.now(),
      }),
    );

    return this.getState(username);
  }

  async payPending(username: string, paymentId: string) {
    const profile = await this.resolveProfile(username);
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, patientProfile: { id: profile.id }, status: 'Pendiente' },
    });

    if (!payment) throw new NotFoundException('Pago pendiente no encontrado');

    payment.status = 'Pagado';
    payment.holdExpiresAt = null;
    payment.date = new Date().toLocaleDateString('es-PE');
    await this.paymentRepo.save(payment);

    if (payment.appointmentId) {
      const appointment = await this.appointmentRepo.findOne({
        where: { id: payment.appointmentId, patientProfile: { id: profile.id } },
      });
      if (appointment) {
        appointment.status = 'Confirmada';
        appointment.paymentStatus = 'PAGADO';
        appointment.holdExpiresAt = null;
        await this.appointmentRepo.save(appointment);
      }
    }

    return this.getState(username);
  }

  async cancelAppointment(username: string, appointmentId: string) {
    const profile = await this.resolveProfile(username);
    await this.appointmentRepo.delete({
      id: appointmentId,
      patientProfile: { id: profile.id },
    });
    await this.paymentRepo.delete({
      appointmentId,
      patientProfile: { id: profile.id },
      status: 'Pendiente',
    });

    return this.getState(username);
  }

  async saveClinicalRecordByDni(dni: string, dto: SaveClinicalRecordDto) {
    const profile = await this.profileRepo.findOne({ where: { dni } });
    if (!profile) {
      throw new NotFoundException('Paciente no encontrado por DNI');
    }

    if (dto.bloodType) {
      profile.bloodType = dto.bloodType;
    }
    if (dto.alergias !== undefined) {
      profile.allergies = dto.alergias
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (dto.medicacionActual !== undefined) {
      profile.currentMedication = dto.medicacionActual
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    await this.profileRepo.save(profile);

    await this.historyRepo.save(
      this.historyRepo.create({
        patientProfile: profile,
        date: new Date().toLocaleDateString('es-PE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        doctor: `${dto.doctor} - ${dto.specialty}`,
        specialty: dto.specialty,
        motivo: dto.motivo || 'Pendiente',
        diagnostico: dto.diagnostico || 'Pendiente',
        tratamiento: dto.tratamiento || 'Pendiente',
        examenes: dto.examenes || 'Pendiente',
        observaciones: dto.observaciones || 'Sin observaciones',
        createdAt: Date.now(),
      }),
    );

    return this.getState(profile.username);
  }

  async createAppointmentByDni(dni: string, dto: CreateAppointmentDto) {
    const profile = await this.ensureProfileByDni(dni, dto);
    this.assertAppointmentDateNotPast(dto.fecha);
    const selectedDoctor = dto.medicoEspecialidad;
    const [doctor = '', specialty = 'General'] = selectedDoctor.split(' - ');
    const amount = COSTO_POR_ESPECIALIDAD[specialty] ?? 80;
    const holdExpiresAt = Date.now() + 4 * 60 * 1000;
    const fechaCita = this.formatDateFromIso(dto.fecha);

    await this.appointmentRepo.save(
      this.appointmentRepo.create({
        patientProfile: profile,
        date: fechaCita,
        time: dto.hora,
        doctor,
        specialty,
        reason: `Motivo: ${dto.motivo}`,
        place: 'Consultorio por confirmar',
        status: 'Pendiente',
        paymentStatus: 'PENDIENTE_PAGO',
        holdExpiresAt,
        createdAt: Date.now(),
      }),
    );

    const appointment = await this.appointmentRepo.findOne({
      where: { patientProfile: { id: profile.id } },
      order: { createdAt: 'DESC' },
    });

    await this.paymentRepo.save(
      this.paymentRepo.create({
        patientProfile: profile,
        appointmentId: appointment?.id ?? null,
        invoice: `F001-${String(Date.now()).slice(-5)}`,
        concept: `Consulta ${specialty}`,
        date: new Date().toLocaleDateString('es-PE'),
        amount: amount.toFixed(2),
        method: dto.metodoPago,
        status: 'Pendiente',
        holdExpiresAt,
        createdAt: Date.now(),
      }),
    );

    await this.historyRepo.save(
      this.historyRepo.create({
        patientProfile: profile,
        date: fechaCita,
        doctor: selectedDoctor,
        specialty,
        motivo: dto.motivo,
        diagnostico: 'Pendiente de atención',
        tratamiento: 'Pendiente de atención',
        examenes: 'Pendiente de atención',
        observaciones: 'Cita solicitada desde Caja, pendiente de pago y confirmación.',
        createdAt: Date.now(),
      }),
    );

    return this.getState(profile.username);
  }

  async payPendingById(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, status: 'Pendiente' },
    });
    if (!payment) throw new NotFoundException('Pago pendiente no encontrado');

    payment.status = 'Pagado';
    payment.holdExpiresAt = null;
    payment.date = new Date().toLocaleDateString('es-PE');
    await this.paymentRepo.save(payment);

    if (payment.appointmentId) {
      const appointment = await this.appointmentRepo.findOne({
        where: { id: payment.appointmentId },
      });
      if (appointment) {
        appointment.status = 'Confirmada';
        appointment.paymentStatus = 'PAGADO';
        appointment.holdExpiresAt = null;
        await this.appointmentRepo.save(appointment);
      }
    }

    return { ok: true };
  }

  async getCajaOverview() {
    await this.ensureGlobalSeed();
    const [pending, paid, appointments] = await Promise.all([
      this.paymentRepo.find({
        where: { status: 'Pendiente' },
        order: { createdAt: 'DESC' },
      }),
      this.paymentRepo.find({
        where: { status: 'Pagado' },
        order: { createdAt: 'DESC' },
      }),
      this.appointmentRepo.find({
        order: { createdAt: 'DESC' },
      }),
    ]);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const todayFormatted = this.formatLongDateEs(this.getTodayIso());
    const citasDelDia = appointments.filter((item) => item.date === todayFormatted);
    const pagosDelDia = paid.filter((item) => {
      if (!item.createdAt) return false;
      const createdAt = Number(item.createdAt);
      return createdAt >= startOfDay && createdAt < endOfDay;
    });
    const totalRecaudadoDia = pagosDelDia.reduce(
      (acc, item) => acc + Number(item.amount),
      0,
    );

    return {
      statsDia: {
        citasCreadas: citasDelDia.length,
        pagosPendientes: pending.length,
        pagosCompletados: pagosDelDia.length,
        totalRecaudado: Number(totalRecaudadoDia.toFixed(2)),
      },
      pacientesConCitaDia: citasDelDia.map((item) => ({
        id: item.id,
        patient: item.patientProfile.fullName,
        dni: item.patientProfile.dni,
        doctor: `${item.doctor} - ${item.specialty}`,
        date: item.date,
        hour: item.time,
        status: item.status,
      })),
      pagosPendientes: pending.map((item) => ({
        id: item.id,
        patient: item.patientProfile.fullName,
        dni: item.patientProfile.dni,
        invoice: item.invoice,
        amount: `S/ ${Number(item.amount).toFixed(2)}`,
        method: item.method,
      })),
      historialPagos: paid.map((item) => ({
        datetime: item.date,
        createdAt: item.createdAt,
        patient: item.patientProfile.fullName,
        invoice: item.invoice,
        method: item.method,
        amount: `S/ ${Number(item.amount).toFixed(2)}`,
        status: 'Completado',
      })),
    };
  }

  async getAdminOverview() {
    await this.ensureGlobalSeed();
    const [profiles, appointments, payments] = await Promise.all([
      this.profileRepo.find(),
      this.appointmentRepo.find({ order: { createdAt: 'DESC' } }),
      this.paymentRepo.find({ order: { createdAt: 'DESC' } }),
    ]);

    const ingresos = payments
      .filter((item) => item.status === 'Pagado')
      .reduce((acc, item) => acc + Number(item.amount), 0);

    const todayFormatted = this.formatLongDateEs(this.getTodayIso());
    const citasHoy = appointments.filter((item) => item.date === todayFormatted).length;
    const citasCompletadas = appointments.filter((item) => item.status === 'Completada').length;
    const satisfaccion =
      appointments.length > 0
        ? Math.round((citasCompletadas / appointments.length) * 100)
        : 0;

    return {
      stats: {
        totalPacientes: profiles.length,
        citasHoy,
        ingresosMes: ingresos,
        satisfaccion,
        citasCompletadas,
        citasTotales: appointments.length,
      },
      pacientes: profiles.map((p) => ({
        dni: p.dni,
        fullName: p.fullName,
        age: this.calcAge(p.birthDate),
        phone: p.phone ?? '--',
        lastVisit: appointments.find((a) => a.patientProfile.id === p.id)?.date ?? '--',
      })),
      citas: appointments.map((a) => ({
        id: a.id,
        patient: a.patientProfile.fullName,
        hour: a.time,
        doctor: `${a.doctor} - ${a.specialty}`,
        status: a.status,
        date: a.date,
      })),
    };
  }

  async getMedicoOverview(doctor: string, specialty: string, dateIso?: string) {
    await this.ensureGlobalSeed();
    const formattedDate = dateIso ? this.formatLongDateEs(dateIso) : null;
    const whereBase = {
      doctor,
      specialty,
    };

    const [appointmentsAll, historyAll] = await Promise.all([
      this.appointmentRepo.find({
        where: whereBase,
        order: { createdAt: 'DESC' },
      }),
      this.historyRepo.find({
        order: { createdAt: 'DESC' },
      }),
    ]);

    const history = historyAll.filter(
      (item) =>
        item.specialty === specialty ||
        String(item.doctor ?? '').includes(doctor),
    );

    const appointmentsDay = formattedDate
      ? appointmentsAll.filter((item) => item.date === formattedDate)
      : appointmentsAll;

    const patientsMap = new Map<string, any>();
    appointmentsAll.forEach((item) => {
      const profile = item.patientProfile;
      if (!patientsMap.has(profile.dni)) {
        const birthDate = profile.birthDate;
        let age = '--';
        if (birthDate) {
          const birth = new Date(birthDate);
          if (!Number.isNaN(birth.getTime())) {
            const now = new Date();
            let years = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
            age = years >= 0 ? `${years} años` : '--';
          }
        }
        patientsMap.set(profile.dni, {
          dni: profile.dni,
          fullName: profile.fullName,
          firstName: profile.firstName ?? '',
          paternalLastName: profile.paternalLastName ?? '',
          maternalLastName: profile.maternalLastName ?? '',
          age,
          birthDate: profile.birthDate ?? '',
          phone: profile.phone ?? '',
          lastVisit: item.date,
        });
      }
    });

    const clinicalRecords = history.reduce((acc, item) => {
      const dni = item.patientProfile.dni;
      if (!acc[dni]) {
        acc[dni] = {
          bloodType: item.patientProfile.bloodType ?? '',
          motivo: item.motivo ?? '',
          diagnostico: item.diagnostico ?? '',
          tratamiento: item.tratamiento ?? '',
          examenes: item.examenes ?? '',
          observaciones: item.observaciones ?? '',
          alergias: (item.patientProfile.allergies ?? []).join(', '),
          medicacionActual: (item.patientProfile.currentMedication ?? []).join(', '),
        };
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      appointments: appointmentsDay.map((item) => ({
        id: item.id,
        date: item.date,
        hour: item.time,
        patient: item.patientProfile.fullName,
        dni: item.patientProfile.dni,
        status: item.status,
        type: item.reason?.replace('Motivo: ', '') || 'Consulta',
        place: item.place,
      })),
      pacientesItems: Array.from(patientsMap.values()),
      clinicalRecords,
    };
  }

  async updateAppointment(appointmentId: string, dto: UpdateAppointmentDto) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    appointment.status = dto.status;
    if (dto.date) {
      const looksIso = /^\d{4}-\d{2}-\d{2}$/.test(dto.date);
      if (looksIso) {
        this.assertAppointmentDateNotPast(dto.date);
      }
      appointment.date = looksIso ? this.formatLongDateEs(dto.date) : dto.date;
    }
    if (dto.hour) {
      appointment.time = dto.hour;
    }

    if (dto.status === 'Confirmada' || dto.status === 'Completada') {
      const payment = await this.paymentRepo.findOne({
        where: { appointmentId: appointment.id },
      });
      if (payment?.status === 'Pagado') {
        appointment.paymentStatus = 'PAGADO';
        appointment.holdExpiresAt = null;
      }
    }

    await this.appointmentRepo.save(appointment);
    return { ok: true, appointment };
  }
}
