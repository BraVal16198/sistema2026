import { Activity, CalendarDays, FileText, LogOut, Stethoscope, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAppMessage } from '../../../context/AppMessageContext'
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Activity },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays },
  { key: 'consultas', label: 'Consultas', icon: Stethoscope },
  { key: 'pacientes', label: 'Pacientes', icon: Users },
]

const MEDICO_PROFILES = [
  { key: 'juan-perez', name: 'Dr. Juan Pérez', specialty: 'Medicina General', avatar: '👨‍⚕️' },
  { key: 'ana-torres', name: 'Dra. Ana Torres', specialty: 'Cardiología', avatar: '👩‍⚕️' },
  { key: 'carlos-ruiz', name: 'Dr. Carlos Ruiz', specialty: 'Pediatría', avatar: '🧑‍⚕️' },
  { key: 'maria-lopez', name: 'Dra. María López', specialty: 'Traumatología', avatar: '👩‍⚕️' },
]

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

const BASE_DATA = {
  'juan-perez': {
    appointments: [
      { id: 'a1', date: '2026-04-30', hour: '09:00', patient: 'María García', dni: '45678901', status: 'Confirmada', type: 'Consulta General' },
      { id: 'a2', date: '2026-04-30', hour: '10:30', patient: 'Carlos Ruiz', dni: '78901234', status: 'Confirmada', type: 'Control' },
      { id: 'a3', date: '2026-04-30', hour: '14:00', patient: 'Ana López', dni: '56789012', status: 'Pendiente', type: 'Primera Vez' },
      { id: 'a4', date: '2026-05-01', hour: '11:00', patient: 'Lucía Martín', dni: '89012345', status: 'Confirmada', type: 'Seguimiento' },
    ],
    pacientesItems: [
      { dni: '45678901', fullName: 'María García Pérez', firstName: 'María', paternalLastName: 'García', maternalLastName: 'Pérez', age: '35 años', birthDate: '1990-04-12', phone: '987654321', lastVisit: '02 Abr 2026' },
      { dni: '78901234', fullName: 'Carlos Ruiz López', firstName: 'Carlos', paternalLastName: 'Ruiz', maternalLastName: 'López', age: '42 años', birthDate: '1983-08-23', phone: '987654322', lastVisit: '28 Mar 2026' },
      { dni: '56789012', fullName: 'Ana López Torres', firstName: 'Ana', paternalLastName: 'López', maternalLastName: 'Torres', age: '28 años', birthDate: '1997-01-16', phone: '987654323', lastVisit: '15 Mar 2026' },
    ],
    clinicalRecords: {
      '45678901': { motivo: 'Control de presión arterial', diagnostico: 'Hipertensión leve', tratamiento: 'Enalapril 10mg', examenes: 'PA 140/90', observaciones: 'Control mensual', alergias: 'Penicilina', medicacionActual: 'Enalapril 10mg' },
      '78901234': { motivo: 'Dolor de cabeza frecuente', diagnostico: 'Migraña', tratamiento: 'Ibuprofeno', examenes: 'Neurológico normal', observaciones: 'Evitar estrés', alergias: 'Ninguna', medicacionActual: 'Ibuprofeno' },
      '56789012': { motivo: 'Primera evaluación', diagnostico: 'En evaluación', tratamiento: 'Pendiente', examenes: 'Pendiente', observaciones: 'Solicitar laboratorio', alergias: 'Ninguna', medicacionActual: 'Ninguna' },
    },
  },
  'ana-torres': {
    appointments: [
      { id: 'b1', date: '2026-04-30', hour: '11:00', patient: 'Ana López', dni: '56789012', status: 'Confirmada', type: 'Cardiología' },
      { id: 'b2', date: '2026-04-30', hour: '13:00', patient: 'Lucía Martín', dni: '89012345', status: 'Pendiente', type: 'Control' },
    ],
    pacientesItems: [
      { dni: '56789012', fullName: 'Ana López Torres', firstName: 'Ana', paternalLastName: 'López', maternalLastName: 'Torres', age: '28 años', birthDate: '1997-01-16', phone: '987654323', lastVisit: '15 Mar 2026' },
      { dni: '89012345', fullName: 'Lucía Martín Cruz', firstName: 'Lucía', paternalLastName: 'Martín', maternalLastName: 'Cruz', age: '31 años', birthDate: '1994-09-09', phone: '987654325', lastVisit: '05 Mar 2026' },
    ],
    clinicalRecords: {},
  },
  'carlos-ruiz': {
    appointments: [
      { id: 'c1', date: '2026-04-30', hour: '16:00', patient: 'Pedro Sánchez', dni: '67890123', status: 'Confirmada', type: 'Pediatría' },
      { id: 'c2', date: '2026-04-30', hour: '17:00', patient: 'Sofía Ramos', dni: '34567890', status: 'Pendiente', type: 'Control' },
    ],
    pacientesItems: [
      { dni: '67890123', fullName: 'Pedro Sánchez Vila', firstName: 'Pedro', paternalLastName: 'Sánchez', maternalLastName: 'Vila', age: '55 años', birthDate: '1970-11-20', phone: '987654324', lastVisit: '10 Mar 2026' },
      { dni: '34567890', fullName: 'Sofía Ramos Pérez', firstName: 'Sofía', paternalLastName: 'Ramos', maternalLastName: 'Pérez', age: '9 años', birthDate: '2016-06-30', phone: '987654326', lastVisit: '25 Mar 2026' },
    ],
    clinicalRecords: {},
  },
  'maria-lopez': {
    appointments: [
      { id: 'd1', date: '2026-04-30', hour: '08:30', patient: 'Jose Rojas', dni: '70052095', status: 'Confirmada', type: 'Traumatología' },
      { id: 'd2', date: '2026-04-30', hour: '10:00', patient: 'Ana Vera', dni: '70052094', status: 'Pendiente', type: 'Control' },
    ],
    pacientesItems: [
      { dni: '70052095', fullName: 'Jose Rojas Medina', firstName: 'Jose', paternalLastName: 'Rojas', maternalLastName: 'Medina', age: '24 años', birthDate: '2001-05-18', phone: '987456127', lastVisit: '30 Abr 2026' },
      { dni: '70052094', fullName: 'Ana Vera Condori', firstName: 'Ana', paternalLastName: 'Vera', maternalLastName: 'Condori', age: '30 años', birthDate: '1995-11-02', phone: '987456126', lastVisit: '30 Abr 2026' },
    ],
    clinicalRecords: {},
  },
}

function MedicoWorkspace({ onLogout }) {
  const { showMessage } = useAppMessage()
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedProfileKey, setSelectedProfileKey] = useState('')
  const [enteredProfileKey, setEnteredProfileKey] = useState('')
  const [medicoData, setMedicoData] = useState(BASE_DATA['juan-perez'])
  const [agendaDate, setAgendaDate] = useState('2026-04-30')
  const [dniSearch, setDniSearch] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [recordForm, setRecordForm] = useState({
    dni: '',
    patient: '',
    firstName: '',
    paternalLastName: '',
    maternalLastName: '',
    phone: '',
    birthDate: '',
    age: '',
    bloodType: '',
    motivo: '',
    diagnostico: '',
    tratamiento: '',
    examenes: '',
    observaciones: '',
    alergias: '',
    medicacionActual: '',
  })

  const selectedProfile = MEDICO_PROFILES.find((item) => item.key === selectedProfileKey) ?? null
  const enteredProfile = MEDICO_PROFILES.find((item) => item.key === enteredProfileKey) ?? null
  const data = medicoData ?? BASE_DATA['juan-perez']

  const citasDelDia = data.appointments
  const citasRealizadas = citasDelDia.filter((item) => item.status === 'Confirmada' || item.status === 'Completada')

  const dashboardCards = [
    { label: 'Consultas Hoy', value: String(citasDelDia.length), color: 'bg-blue-500', icon: Activity },
    { label: 'Pacientes Atendidos', value: String(data.pacientesItems.length), color: 'bg-green-500', icon: Users },
    { label: 'Próxima Cita', value: citasDelDia[0]?.hour ?? '--:--', color: 'bg-purple-500', icon: CalendarDays },
    { label: 'Realizadas', value: String(citasRealizadas.length), color: 'bg-orange-500', icon: FileText },
  ]

  const loadMedicoData = async (profile = enteredProfile, date = agendaDate) => {
    if (!profile) return
    try {
      const params = new URLSearchParams({
        doctor: profile.name,
        specialty: profile.specialty,
        date,
      })
      const response = await fetch(`${API_URL}/patient/medico/overview?${params.toString()}`)
      if (!response.ok) throw new Error()
      const payload = await response.json()
      setMedicoData({
        appointments: Array.isArray(payload.appointments) ? payload.appointments : [],
        pacientesItems: Array.isArray(payload.pacientesItems) ? payload.pacientesItems : [],
        clinicalRecords: payload.clinicalRecords ?? {},
      })
    } catch {
      showMessage('No se pudo sincronizar la vista médica con backend.', { variant: 'error' })
    }
  }

  const headerData = useMemo(() => {
    if (activeView === 'dashboard') return { title: 'Dashboard Principal', subtitle: 'Panel de Prestación de Servicios Médicos' }
    if (activeView === 'agenda') return { title: 'Gestión de Citas', subtitle: 'v_cita - Programación y Verificación de Disponibilidad' }
    if (activeView === 'consultas') return { title: 'Consultas Médicas', subtitle: 'v_consulta - Proceso de Prestación de Servicios' }
    return { title: 'Gestión de Pacientes', subtitle: 'v_paciente - Proceso de Atención al Cliente' }
  }, [activeView])

  const loadPatientIntoForm = (dni) => {
    const patient = data.pacientesItems.find((item) => item.dni === dni)
    if (!patient) {
      showMessage('DNI no encontrado en tus pacientes.', { variant: 'warning' })
      return
    }
    const record = data.clinicalRecords[dni] ?? {
      bloodType: '',
      motivo: '',
      diagnostico: '',
      tratamiento: '',
      examenes: '',
      observaciones: '',
      alergias: '',
      medicacionActual: '',
    }
    setRecordForm({
      dni,
      patient: patient.fullName,
      firstName: patient.firstName ?? '',
      paternalLastName: patient.paternalLastName ?? '',
      maternalLastName: patient.maternalLastName ?? '',
      phone: patient.phone ?? '',
      birthDate: patient.birthDate ?? '',
      age: patient.age ?? '',
      ...record,
    })
  }

  const handleBuscarPorDni = () => {
    if (!dniSearch.trim()) return
    loadPatientIntoForm(dniSearch.trim())
  }

  const handleSelectAppointment = (appointmentId) => {
    setSelectedAppointmentId(appointmentId)
    const appt = citasDelDia.find((item) => item.id === appointmentId)
    if (!appt) return
    setDniSearch(appt.dni)
    loadPatientIntoForm(appt.dni)
  }

  const handleGuardarHistoria = async () => {
    if (!recordForm.dni || !recordForm.patient) {
      showMessage('Selecciona paciente por DNI o desde la lista del día.', { variant: 'warning' })
      return
    }
    try {
      const response = await fetch(`${API_URL}/patient/history/by-dni/${recordForm.dni}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor: enteredProfile?.name ?? 'Médico',
          specialty: enteredProfile?.specialty ?? 'General',
          bloodType: recordForm.bloodType,
          alergias: recordForm.alergias,
          medicacionActual: recordForm.medicacionActual,
          motivo: recordForm.motivo,
          diagnostico: recordForm.diagnostico,
          tratamiento: recordForm.tratamiento,
          examenes: recordForm.examenes,
          observaciones: recordForm.observaciones,
        }),
      })

      if (!response.ok) {
        throw new Error('No se pudo guardar la historia clínica en backend.')
      }

      await loadMedicoData(enteredProfile, agendaDate)
      showMessage('Historia clínica guardada en backend y lista para verse en Paciente.', {
        variant: 'success',
      })
    } catch {
      showMessage('No se pudo guardar en backend. Verifica que el servidor esté corriendo.', {
        variant: 'error',
      })
    }
  }

  const handleMarcarCita = async (status) => {
    if (!selectedAppointmentId) return
    try {
      const response = await fetch(`${API_URL}/patient/appointments/${selectedAppointmentId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error()
      await loadMedicoData(enteredProfile, agendaDate)
      showMessage(`Cita actualizada a ${status} y sincronizada.`, { variant: 'success' })
    } catch {
      showMessage('No se pudo actualizar la cita en backend.', { variant: 'error' })
    }
  }

  useEffect(() => {
    if (!enteredProfile) return
    loadMedicoData(enteredProfile, agendaDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enteredProfileKey, agendaDate])

  if (!enteredProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d38c9] px-4 text-white">
        <section className="w-full max-w-4xl rounded-2xl bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="text-4xl font-bold">Ingreso Médico</h2>
          <p className="mt-2 text-white/90">Selecciona tu especialidad y perfil médico.</p>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {MEDICO_PROFILES.map((profile) => (
              <button
                key={profile.key}
                type="button"
                onClick={() => setSelectedProfileKey(profile.key)}
                className={`rounded-xl border p-4 text-left transition ${
                  selectedProfileKey === profile.key
                    ? 'border-cyan-300 bg-cyan-300/20'
                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                }`}
              >
                <p className="text-3xl">{profile.avatar}</p>
                <p className="mt-2 text-lg font-semibold">{profile.name}</p>
                <p className="text-sm text-white/80">{profile.specialty}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!selectedProfile}
            onClick={() => {
              setEnteredProfileKey(selectedProfileKey)
              setActiveView('dashboard')
            }}
            className="mt-5 rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-[#0f2f92] disabled:opacity-50"
          >
            Ingresar
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <section className="grid min-h-screen grid-cols-[166px_1fr]">
        <aside className="flex flex-col justify-between bg-[#1f3f9f] px-4 py-5 text-white">
          <div>
            <h1 className="text-[25px] font-bold leading-none">Sistema Tech</h1>
            <p className="mt-1 text-xs text-white/85">{enteredProfile.specialty}</p>
            <div className="mt-3 rounded-lg bg-white/10 p-2">
              <p className="text-sm font-semibold">{enteredProfile.name}</p>
            </div>
            <nav className="mt-8 space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                      activeView === item.key ? 'bg-[#1e4dff] text-white shadow-lg' : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
          <button type="button" onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white">
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </aside>

        <article className="px-6 py-5">
          <header className="mb-4">
            <h2 className="text-[33px] font-semibold">{headerData.title}</h2>
            <p className="text-base text-slate-500">{headerData.subtitle}</p>
          </header>


          {activeView === 'dashboard' ? (
            <div className="space-y-4">
              <section className="grid grid-cols-4 gap-3">
                {dashboardCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div key={card.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">{card.label}</p>
                        <span className={`inline-flex rounded-lg p-2 text-white ${card.color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-1 text-[34px] font-semibold">{card.value}</p>
                    </div>
                  )
                })}
              </section>
            </div>
          ) : null}

          {activeView === 'agenda' ? (
            <section className="grid grid-cols-[1fr_1.9fr] gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Calendario</h3>
                <input
                  type="date"
                  value={agendaDate}
                  onChange={(event) => setAgendaDate(event.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-3 text-sm text-slate-500">Citas del día: {citasDelDia.length}</p>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {citasDelDia.map((item) => (
                    <div key={item.id} className="rounded bg-[#eef2fb] px-2 py-1.5">
                      <p className="text-sm font-semibold">{item.patient}</p>
                      <p className="text-xs text-slate-600">{item.type}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Citas del día</h3>
                <div className="mt-3 space-y-3">
                  {citasDelDia.map((item) => (
                    <div key={item.id} className="flex items-start justify-between rounded-lg border border-slate-200 px-3 py-3">
                      <div>
                        <p className="text-[#2d6dda]">{item.hour}</p>
                        <p className="font-semibold">{item.patient}</p>
                        <p className="text-sm text-slate-500">{enteredProfile.name} - {enteredProfile.specialty}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        item.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          {activeView === 'consultas' ? (
            <section className="grid grid-cols-[1fr_1.9fr] gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Lista de Consultas Hoy</h3>
                <div className="mt-3 flex gap-2">
                  <input
                    value={dniSearch}
                    onChange={(event) => setDniSearch(event.target.value)}
                    placeholder="Buscar por DNI"
                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={handleBuscarPorDni} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">
                    Buscar
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {citasDelDia.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleSelectAppointment(item.id)}
                      className="w-full rounded-lg bg-[#f5f6f9] px-3 py-3 text-left"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-semibold text-[#2d6dda]">{item.hour}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${
                          item.status === 'Confirmada' || item.status === 'Completada'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xl font-semibold">{item.patient}</p>
                      <p className="text-sm text-slate-600">DNI: {item.dni}</p>
                    </button>
                  ))}
                </div>
              </article>

              <article className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">
                    Datos Clínicos - {recordForm.patient || 'Paciente'}
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">DNI</p>
                      <p className="mt-1 font-semibold">{recordForm.dni || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Paciente</p>
                      <p className="mt-1 font-semibold">{recordForm.patient || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Nombres</p>
                      <p className="mt-1 font-semibold">{recordForm.firstName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Apellido Paterno</p>
                      <p className="mt-1 font-semibold">{recordForm.paternalLastName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Apellido Materno</p>
                      <p className="mt-1 font-semibold">{recordForm.maternalLastName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Teléfono</p>
                      <p className="mt-1 font-semibold">{recordForm.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Fecha de Nacimiento</p>
                      <p className="mt-1 font-semibold">{recordForm.birthDate || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Edad</p>
                      <p className="mt-1 font-semibold">{recordForm.age || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Alergias</p>
                      <input
                        value={recordForm.alergias}
                        onChange={(e) => setRecordForm((p) => ({ ...p, alergias: e.target.value }))}
                        placeholder="Alergias"
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <p className="text-slate-500">Tipo de Sangre</p>
                      <select
                        value={recordForm.bloodType}
                        onChange={(e) => setRecordForm((p) => ({ ...p, bloodType: e.target.value }))}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      >
                        <option value="">Selecciona tipo de sangre</option>
                        {BLOOD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-slate-500">Medicación Actual</p>
                      <input
                        value={recordForm.medicacionActual}
                        onChange={(e) =>
                          setRecordForm((p) => ({ ...p, medicacionActual: e.target.value }))
                        }
                        placeholder="Medicación actual"
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Historia Clínica</h3>
                  <div className="mt-3 rounded-lg border border-slate-200 p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Motivo</p>
                        <textarea
                          value={recordForm.motivo}
                          onChange={(e) => setRecordForm((p) => ({ ...p, motivo: e.target.value }))}
                          rows={2}
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <p className="text-slate-500">Diagnóstico</p>
                        <textarea
                          value={recordForm.diagnostico}
                          onChange={(e) =>
                            setRecordForm((p) => ({ ...p, diagnostico: e.target.value }))
                          }
                          rows={2}
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <p className="text-slate-500">Tratamiento</p>
                        <textarea
                          value={recordForm.tratamiento}
                          onChange={(e) =>
                            setRecordForm((p) => ({ ...p, tratamiento: e.target.value }))
                          }
                          rows={2}
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <p className="text-slate-500">Exámenes</p>
                        <textarea
                          value={recordForm.examenes}
                          onChange={(e) => setRecordForm((p) => ({ ...p, examenes: e.target.value }))}
                          rows={2}
                          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                        />
                      </div>
                    </div>
                    <div className="mt-2 rounded bg-[#edf2fb] px-3 py-2 text-sm">
                      <p className="text-slate-500">Observaciones</p>
                      <textarea
                        value={recordForm.observaciones}
                        onChange={(e) =>
                          setRecordForm((p) => ({ ...p, observaciones: e.target.value }))
                        }
                        rows={2}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleGuardarHistoria}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Guardar Historia Clínica
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarcarCita('Completada')}
                      className="rounded bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    >
                      Marcar Realizada
                    </button>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === 'pacientes' ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-400">
                Solo visualización y gestión clínica desde Consultas
              </div>
              <table className="mt-3 w-full border-collapse">
                <thead>
                  <tr className="bg-[#f5f6f9] text-left text-xs font-semibold text-slate-600">
                    <th className="px-3 py-2">DNI</th>
                    <th className="px-3 py-2">Nombre Completo</th>
                    <th className="px-3 py-2">Edad</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Última Visita</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pacientesItems.map((item) => (
                    <tr key={item.dni} className="border-b border-slate-200 text-sm">
                      <td className="px-3 py-2">{item.dni}</td>
                      <td className="px-3 py-2">{item.fullName}</td>
                      <td className="px-3 py-2">{item.age}</td>
                      <td className="px-3 py-2">{item.phone}</td>
                      <td className="px-3 py-2">{item.lastVisit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  )
}

export default MedicoWorkspace
