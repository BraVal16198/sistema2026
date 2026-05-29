export const MEDICO_ESPECIALIDADES = [
  { value: 'Dr. Juan Pérez - Medicina General', doctor: 'Dr. Juan Pérez', specialty: 'Medicina General' },
  { value: 'Dra. Ana Torres - Cardiología', doctor: 'Dra. Ana Torres', specialty: 'Cardiología' },
  { value: 'Dr. Carlos Ruiz - Pediatría', doctor: 'Dr. Carlos Ruiz', specialty: 'Pediatría' },
  { value: 'Dra. María López - Traumatología', doctor: 'Dra. María López', specialty: 'Traumatología' },
] as const;

export const HORARIOS_CITAS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
] as const;

export const METODOS_PAGO = ['Efectivo', 'Tarjeta', 'Yape/Plin', 'Transferencia'] as const;

export const COSTO_POR_ESPECIALIDAD: Record<string, number> = {
  'Medicina General': 80,
  Cardiología: 120,
  Pediatría: 95,
  Traumatología: 150,
};

/** Usuario de login del sistema → perfil médico en agenda */
export const MEDICO_USER_TO_PROFILE: Record<string, { key: string; doctor: string; specialty: string }> = {
  medico: { key: 'juan-perez', doctor: 'Dr. Juan Pérez', specialty: 'Medicina General' },
};
