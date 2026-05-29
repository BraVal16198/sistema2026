import {
  Activity,
  CalendarDays,
  Download,
  FileText,
  LogOut,
  Plus,
  Stethoscope,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useEffect, useMemo, useState } from 'react'
import { useAppMessage } from '../../../context/AppMessageContext'

import { apiFetch } from '../../../lib/api'
import {
  formatLongDateEs,
  getTodayIso,
  isPastIsoDate,
  isTodayAppointmentDate,
  isUpcomingAppointment,
  splitAppointments,
} from '../../../lib/appointmentDates'
import { clearSession } from '../../../lib/session'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Activity },
  { key: 'pacientes', label: 'Pacientes', icon: Users },
  { key: 'citas', label: 'Citas', icon: CalendarDays },
  { key: 'medicos', label: 'Médicos', icon: Stethoscope },
  { key: 'reportes', label: 'Reportes', icon: FileText },
]

const statsDashboard = [
  { label: 'Total Pacientes', value: '1,248', extra: '+12%', color: 'bg-blue-500', icon: Users },
  { label: 'Crtas Hoy', value: '24', extra: '+5%', color: 'bg-green-500', icon: CalendarDays },
  { label: 'Ingresos Mes', value: 'S/ 17,800', extra: '+18%', color: 'bg-purple-500', icon: TrendingUp },
  { label: 'Satisfacción', value: '94%', extra: '+2%', color: 'bg-orange-500', icon: Activity },
]

const pacientesItems = [
  { dni: '45678901', fullName: 'María García Pérez', age: '35 años', phone: '987654321', lastVisit: '02 Abr 2026' },
  { dni: '78901234', fullName: 'Carlos Ruiz López', age: '42 años', phone: '987654322', lastVisit: '28 Mar 2026' },
  { dni: '56789012', fullName: 'Ana López Torres', age: '28 años', phone: '987654323', lastVisit: '15 Mar 2026' },
  { dni: '67890123', fullName: 'Pedro Sánchez Vila', age: '55 años', phone: '987654324', lastVisit: '10 Mar 2026' },
  { dni: '89012345', fullName: 'Lucía Martín Cruz', age: '31 años', phone: '987654325', lastVisit: '05 Mar 2026' },
]

const agendaItems = [
  { patient: 'María García', hour: '09:00', doctor: 'Dr. Juan Pérez - Medicina General', status: 'Confirmada' },
  { patient: 'Carlos Ruiz', hour: '10:30', doctor: 'Dr. Juan Pérez - Medicina General', status: 'Confirmada' },
  { patient: 'Ana López', hour: '14:00', doctor: 'Dra. Ana Torres - Cardiología', status: 'Pendiente' },
  { patient: 'Pedro Sánchez', hour: '15:30', doctor: 'Dr. Juan Pérez - Medicina General', status: 'Confirmada' },
]

const medicosEspecialidades = [
  { value: 'Dr. Juan Pérez - Medicina General', label: 'Dr. Juan Pérez - Medicina General' },
  { value: 'Dra. Ana Torres - Cardiología', label: 'Dra. Ana Torres - Cardiología' },
  { value: 'Dr. Carlos Ruiz - Pediatría', label: 'Dr. Carlos Ruiz - Pediatría' },
  { value: 'Dra. María López - Traumatología', label: 'Dra. María López - Traumatología' },
]

const horariosCitas = [
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
  '07:00 PM',
  '08:00 PM',
]

const metodosPago = ['Efectivo', 'Tarjeta', 'Yape/Plin', 'Transferencia']

const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return ''
  const [year, month, day] = fechaNacimiento.split('-').map(Number)
  if (!year || !month || !day) return ''
  const hoy = new Date()
  let edad = hoy.getFullYear() - year
  const mesActual = hoy.getMonth() + 1
  const diaActual = hoy.getDate()
  if (mesActual < month || (mesActual === month && diaActual < day)) {
    edad -= 1
  }
  return edad >= 0 ? String(edad) : ''
}

const formatDateDMY = (isoDate) => {
  if (!isoDate) return '--/--/----'
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

const MONTHS_ES = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const toInputDate = (value) => {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const match = String(value)
    .toLowerCase()
    .match(/^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})$/)
  if (!match) return ''
  const day = Number(match[1])
  const monthName = match[2]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const year = Number(match[3])
  const month = MONTHS_ES[monthName]
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const medicos = [
  {
    name: 'Dr. Juan Pérez Gómez',
    specialty: 'Medicina General',
    cmp: '054321',
    dni: '12345678',
    phone: '987654321',
    email: 'jperez@systemtech.com',
    schedule: '08:00 - 17:00',
    today: '8',
    month: '156',
  },
  {
    name: 'Dra. Ana Torres Ruiz',
    specialty: 'Cardiología',
    cmp: '065432',
    dni: '23456789',
    phone: '987654322',
    email: 'atorres@systemtech.com',
    schedule: '09:00 - 18:00',
    today: '5',
    month: '124',
  },
  {
    name: 'Dr. Carlos Ruiz Mendoza',
    specialty: 'Pediatría',
    cmp: '076543',
    dni: '34567890',
    phone: '987654323',
    email: 'cruiz@systemtech.com',
    schedule: '14:00 - 20:00',
    today: '6',
    month: '98',
  },
  {
    name: 'Dra. María López Vega',
    specialty: 'Traumatología',
    cmp: '087654',
    dni: '45678901',
    phone: '987654324',
    email: 'mlopez@systemtech.com',
    schedule: '08:00 - 14:00',
    today: '4',
    month: '87',
  },
]

const statsReportes = [
  { label: 'Total Pacientes Registrados', value: '1,248', extra: '+12% vs mes anterior', color: 'bg-blue-500', icon: Users },
  { label: 'Citas Realizadas (Mes)', value: '158', extra: '-13% vs mes anterior', color: 'bg-green-500', icon: CalendarDays },
  { label: 'Ingresos Totales', value: 'S/ 63,800', extra: '+28% vs trimestre anterior', color: 'bg-purple-500', icon: TrendingUp },
  { label: 'Índice de Satisfacción', value: '0%', extra: 'Desde API', color: 'bg-orange-500', icon: Activity },
]

const topMedicos = [
  { pos: '1', name: 'Dr. Juan Pérez', consultas: '156', ingresos: '12,480', sat: '4.8', width: 'w-[95%]' },
  { pos: '2', name: 'Dra. Ana Torres', consultas: '124', ingresos: '14,880', sat: '4.9', width: 'w-[93%]' },
  { pos: '3', name: 'Dr. Carlos Ruiz', consultas: '98', ingresos: '8,820', sat: '4.7', width: 'w-[90%]' },
  { pos: '4', name: 'Dra. María López', consultas: '87', ingresos: '7,830', sat: '4.6', width: 'w-[88%]' },
]

function AdminWorkspace({ onLogout }) {
  const { showMessage } = useAppMessage()
  const [activeView, setActiveView] = useState('dashboard')
  const [statsState, setStatsState] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    ingresosMes: 0,
    satisfaccion: 0,
  })
  const [pacientesState, setPacientesState] = useState(pacientesItems)
  const [agendaItemsState, setAgendaItemsState] = useState([])
  const [medicosState, setMedicosState] = useState(medicos)
  const [activeReportType, setActiveReportType] = useState('general')
  const [reportRange, setReportRange] = useState(() => {
    const today = new Date()
    const toIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const fromDate = new Date(today)
    fromDate.setDate(fromDate.getDate() - 6)
    const fromIso = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`
    return { from: fromIso, to: toIso }
  })
  const [showNewDoctorForm, setShowNewDoctorForm] = useState(false)
  const [selectedCita, setSelectedCita] = useState(null)
  const [editingCitaId, setEditingCitaId] = useState('')
  const [editCitaForm, setEditCitaForm] = useState({ date: '', hour: '', status: 'Pendiente' })
  const [nuevaCitaAdmin, setNuevaCitaAdmin] = useState({
    dni: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    fechaNacimiento: '',
    medicoEspecialidad: '',
    fecha: '',
    hora: '',
    motivo: '',
    metodoPago: '',
  })
  const [nuevoMedico, setNuevoMedico] = useState({
    nombres: '',
    apellidos: '',
    specialty: '',
    cmp: '',
    dni: '',
    phone: '',
    email: '',
    schedule: '',
  })

  const loadAdminData = async () => {
    try {
      const response = await apiFetch('/patient/admin/overview')
      if (!response.ok) return
      const payload = await response.json()
      if (payload.stats) {
        setStatsState({
          totalPacientes: Number(payload.stats.totalPacientes ?? 0),
          citasHoy: Number(payload.stats.citasHoy ?? 0),
          ingresosMes: Number(payload.stats.ingresosMes ?? 0),
          satisfaccion: Number(payload.stats.satisfaccion ?? 0),
        })
      }
      if (Array.isArray(payload.pacientes)) setPacientesState(payload.pacientes)
      if (Array.isArray(payload.citas)) setAgendaItemsState(payload.citas)
    } catch {
      showMessage('No se pudo cargar el resumen global de Admin.', { variant: 'error' })
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAdminData()
    }, 8000)
    return () => window.clearInterval(intervalId)
  }, [])

  const citasClasificadas = useMemo(() => {
    const { upcoming, past } = splitAppointments(agendaItemsState)
    const hoy = agendaItemsState.filter((c) => isTodayAppointmentDate(c.date))
    return { upcoming, past, hoy, todas: agendaItemsState }
  }, [agendaItemsState])

  const statsReportesDynamic = useMemo(
    () => [
      {
        label: 'Total Pacientes Registrados',
        value: String(statsState.totalPacientes),
        extra: 'Datos en vivo',
        color: 'bg-blue-500',
        icon: Users,
      },
      {
        label: 'Citas Programadas Hoy',
        value: String(statsState.citasHoy),
        extra: formatLongDateEs(getTodayIso()),
        color: 'bg-green-500',
        icon: CalendarDays,
      },
      {
        label: 'Ingresos del Mes',
        value: `S/ ${statsState.ingresosMes.toFixed(2)}`,
        extra: 'Pagos confirmados',
        color: 'bg-purple-500',
        icon: TrendingUp,
      },
      {
        label: 'Índice de Satisfacción',
        value: `${statsState.satisfaccion}%`,
        extra: 'Citas completadas / total',
        color: 'bg-orange-500',
        icon: Activity,
      },
    ],
    [statsState],
  )

  const statsDashboardDynamic = [
    { label: 'Total Pacientes', value: statsState.totalPacientes.toString(), extra: 'Actualizado', color: 'bg-blue-500', icon: Users },
    { label: 'Crtas Hoy', value: statsState.citasHoy.toString(), extra: 'Actualizado', color: 'bg-green-500', icon: CalendarDays },
    { label: 'Ingresos Mes', value: `S/ ${statsState.ingresosMes.toFixed(2)}`, extra: 'Actualizado', color: 'bg-purple-500', icon: TrendingUp },
    {
      label: 'Satisfacción',
      value: `${statsState.satisfaccion}%`,
      extra: 'Citas completadas / total',
      color: 'bg-orange-500',
      icon: Activity,
    },
  ]

  const headerData = useMemo(() => {
    if (activeView === 'dashboard') {
      return { title: 'Dashboard Principal', subtitle: 'Gestión Estratégica y Control de Calidad', actionLabel: null }
    }
    if (activeView === 'pacientes') {
      return { title: 'Gestión de Pacientes', subtitle: 'V_paciente - Proceso de Atención al Cliente', actionLabel: 'Nuevo Paciente' }
    }
    if (activeView === 'citas') {
      return { title: 'Gestión de Citas', subtitle: 'V_cita - Programación y Verificación de Disponibilidad', actionLabel: 'Nueva Cita' }
    }
    if (activeView === 'medicos') {
      return { title: 'Gestión de Médicos', subtitle: 'Administración del personal médico', actionLabel: 'Registrar Médico' }
    }
    return { title: 'Reportes y Análisis', subtitle: 'Gestión de Calidad y Control Estratégico', actionLabel: null }
  }, [activeView])

  const handleExportPdf = () => {
    const doc = new jsPDF()
    const fromDate = new Date(reportRange.from)
    const toDate = new Date(reportRange.to)
    const diffMs = Math.max(0, toDate.getTime() - fromDate.getTime())
    const rangeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1
    const periodoLabel = `${formatDateDMY(reportRange.from)} a ${formatDateDMY(reportRange.to)} (${rangeDays} dia${rangeDays === 1 ? '' : 's'})`
    const reporteLabel =
      activeReportType === 'general'
        ? 'General'
        : activeReportType === 'financiero'
          ? 'Financiero'
          : 'Desempeno medico'

    doc.setFontSize(16)
    doc.text('Reporte Administrativo - Sistema Tech', 14, 18)
    doc.setFontSize(11)
    doc.text(`Tipo: ${reporteLabel}`, 14, 30)
    doc.text(`Periodo: ${periodoLabel}`, 14, 38)
    doc.text(`Pacientes: ${statsState.totalPacientes}`, 14, 46)
    doc.text(`Citas hoy: ${statsState.citasHoy}`, 14, 54)
    doc.text(`Ingresos mes: S/ ${statsState.ingresosMes.toFixed(2)}`, 14, 62)

    doc.setFontSize(10)
    let y = 76
    doc.text('Citas recientes:', 14, y)
    y += 8
    agendaItemsState.slice(0, 8).forEach((cita) => {
      doc.text(`- ${cita.patient} | ${cita.doctor} | ${cita.hour} | ${cita.status}`, 14, y)
      y += 7
    })

    doc.save(`reporte-${reporteLabel.toLowerCase()}-${Date.now()}.pdf`)
    showMessage('Reporte exportado en PDF.', { variant: 'success' })
  }

  const handleRegistrarMedico = () => {
    const fullName = `${nuevoMedico.nombres.trim()} ${nuevoMedico.apellidos.trim()}`.trim()
    if (!fullName || !nuevoMedico.specialty.trim() || !nuevoMedico.cmp.trim() || nuevoMedico.dni.trim().length !== 8) {
      showMessage('Completa datos de médico: nombre, especialidad, CMP y DNI válido (8 dígitos).', {
        variant: 'warning',
      })
      return
    }

    setMedicosState((prev) => [
      {
        name: fullName,
        specialty: nuevoMedico.specialty.trim(),
        cmp: nuevoMedico.cmp.trim(),
        dni: nuevoMedico.dni.trim(),
        phone: nuevoMedico.phone.trim() || '--',
        email: nuevoMedico.email.trim() || '--',
        schedule: nuevoMedico.schedule.trim() || '--',
        today: '0',
        month: '0',
      },
      ...prev,
    ])
    setNuevoMedico({
      nombres: '',
      apellidos: '',
      specialty: '',
      cmp: '',
      dni: '',
      phone: '',
      email: '',
      schedule: '',
    })
    setShowNewDoctorForm(false)
    showMessage('Médico registrado correctamente en Administrador (vista local).', { variant: 'success' })
  }

  const handleVerCita = (item) => {
    setSelectedCita(item)
    setEditingCitaId('')
  }

  const handleEditarCita = (item) => {
    setEditingCitaId(item.id)
    setSelectedCita(item)
    setEditCitaForm({
      date: toInputDate(item.date),
      hour: item.hour || '',
      status: item.status || 'Pendiente',
    })
  }

  const handleGuardarEdicionCita = async () => {
    if (!editingCitaId) return
    if (editCitaForm.date && isPastIsoDate(editCitaForm.date)) {
      showMessage('La fecha no puede ser anterior al día actual.', { variant: 'warning' })
      return
    }
    try {
      const response = await apiFetch(`/patient/appointments/${editingCitaId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editCitaForm.status,
          date: editCitaForm.date || undefined,
          hour: editCitaForm.hour || undefined,
        }),
      })
      if (!response.ok) throw new Error()
      await loadAdminData()
      setSelectedCita(null)
      setEditingCitaId('')
      showMessage('Cita actualizada y sincronizada con todos los módulos.', { variant: 'success' })
    } catch {
      showMessage('No se pudo actualizar la cita en backend.', { variant: 'error' })
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <section className="grid min-h-screen grid-cols-[166px_1fr]">
        <aside className="flex flex-col justify-between bg-[#1f3f9f] px-4 py-5 text-white">
          <div>
            <h1 className="text-[25px] font-bold leading-none">Sistema Tech</h1>
            <p className="mt-1 text-xs text-white/85">Admin</p>
            <nav className="mt-8 space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.key
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                      isActive ? 'bg-[#1e4dff] text-white shadow-lg' : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </nav>
          </div>
          <button
            type="button"
            onClick={() => {
              clearSession()
              onLogout()
            }}
            className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </aside>

        <article className="max-h-screen overflow-y-auto px-6 py-5">
          <header className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-[33px] font-semibold">{headerData.title}</h2>
              <p className="text-base text-slate-500">{headerData.subtitle}</p>
            </div>
            {activeView === 'reportes' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5">
                  <label className="text-xs font-semibold text-slate-500">Desde</label>
                  <input
                    type="date"
                    value={reportRange.from}
                    max={reportRange.to}
                    onChange={(event) => setReportRange((prev) => ({ ...prev, from: event.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <label className="text-xs font-semibold text-slate-500">Hasta</label>
                  <input
                    type="date"
                    value={reportRange.to}
                    min={reportRange.from}
                    onChange={(event) => setReportRange((prev) => ({ ...prev, to: event.target.value }))}
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white"
                >
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </button>
              </div>
            ) : null}
            {headerData.actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  if (activeView === 'medicos') {
                    setShowNewDoctorForm((prev) => !prev)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {headerData.actionLabel}
              </button>
            ) : null}
          </header>
          {activeView === 'dashboard' ? (
            <div className="space-y-4">
              <section className="grid grid-cols-4 gap-3">
                {statsDashboardDynamic.map((card) => {
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
                      <p className="text-sm text-emerald-600">{card.extra}</p>
                    </div>
                  )
                })}
              </section>
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Citas Mensuales</h3>
                  <div className="mt-4 h-48 rounded border border-dashed border-slate-300 p-4">
                    <div className="flex h-full items-end gap-4">
                      <div className="w-16 bg-blue-500" style={{ height: '56%' }} />
                      <div className="w-16 bg-blue-500" style={{ height: '64%' }} />
                      <div className="w-16 bg-blue-500" style={{ height: '75%' }} />
                      <div className="w-16 bg-blue-500" style={{ height: '72%' }} />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Ingresos Mensuales (S/)</h3>
                  <div className="mt-4 h-48 rounded border border-dashed border-slate-300 p-4">
                    <svg className="h-full w-full" viewBox="0 0 300 140">
                      <polyline
                        fill="none"
                        stroke="#18a97d"
                        strokeWidth="2"
                        points="10,90 95,65 190,35 280,40"
                      />
                      <circle cx="10" cy="90" r="2.5" fill="#18a97d" />
                      <circle cx="95" cy="65" r="2.5" fill="#18a97d" />
                      <circle cx="190" cy="35" r="2.5" fill="#18a97d" />
                      <circle cx="280" cy="40" r="2.5" fill="#18a97d" />
                    </svg>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeView === 'pacientes' ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-400">Buscar por nombre o DNI...</div>
              <table className="mt-3 w-full border-collapse">
                <thead>
                  <tr className="bg-[#f5f6f9] text-left text-xs font-semibold text-slate-600">
                    <th className="px-3 py-2">DNI</th>
                    <th className="px-3 py-2">Nombre Completo</th>
                    <th className="px-3 py-2">Edad</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Última Visita</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesState.map((item) => (
                    <tr key={item.dni} className="border-b border-slate-200 text-sm">
                      <td className="px-3 py-2">{item.dni}</td>
                      <td className="px-3 py-2">{item.fullName}</td>
                      <td className="px-3 py-2">{item.age}</td>
                      <td className="px-3 py-2">{item.phone}</td>
                      <td className="px-3 py-2">{item.lastVisit}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <span className="text-blue-500">✎</span>
                          <span className="text-emerald-500">📄</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {activeView === 'citas' ? (
            <section className="grid grid-cols-[1fr_1.9fr] gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Calendario</h3>
                <div className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {formatLongDateEs(getTodayIso())}
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Citas del día: {citasClasificadas.hoy.length}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {citasClasificadas.hoy.length === 0 ? (
                    <p className="col-span-2 text-xs text-slate-500">Sin citas para hoy.</p>
                  ) : null}
                  {citasClasificadas.hoy.map((item) => (
                    <div key={item.id} className="rounded bg-[#eef2fb] px-2 py-1.5">
                      <p className="text-sm font-semibold">{item.patient}</p>
                      <p className="text-xs text-slate-600">{item.hour}</p>
                    </div>
                  ))}
                </div>
              </article>
              <article className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-semibold">Nueva Cita por DNI</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <p className="col-span-2 mt-1 text-sm font-semibold text-slate-700">Datos del paciente</p>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">DNI</label>
                      <input
                        placeholder="DNI del paciente"
                        value={nuevaCitaAdmin.dni}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, '') }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Nombres</label>
                      <input
                        value={nuevaCitaAdmin.nombres}
                        onChange={(event) => setNuevaCitaAdmin((prev) => ({ ...prev, nombres: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Apellido paterno</label>
                      <input
                        value={nuevaCitaAdmin.apellidoPaterno}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, apellidoPaterno: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Apellido materno</label>
                      <input
                        value={nuevaCitaAdmin.apellidoMaterno}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, apellidoMaterno: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Teléfono</label>
                      <input
                        value={nuevaCitaAdmin.telefono}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, telefono: event.target.value.replace(/\D/g, '').slice(0, 9) }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha de nacimiento</label>
                      <input
                        type="date"
                        value={nuevaCitaAdmin.fechaNacimiento}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, fechaNacimiento: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Edad</label>
                      <input
                        value={calcularEdad(nuevaCitaAdmin.fechaNacimiento)}
                        readOnly
                        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                      />
                    </div>
                    <div className="col-span-2 my-1 border-t border-slate-200 pt-3" />
                    <p className="col-span-2 text-sm font-semibold text-slate-700">Datos de la cita</p>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Especialidad y médico</label>
                      <select
                        value={nuevaCitaAdmin.medicoEspecialidad}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, medicoEspecialidad: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Seleccionar médico y especialidad</option>
                        {medicosEspecialidades.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Hora</label>
                      <select
                        value={nuevaCitaAdmin.hora}
                        onChange={(event) => setNuevaCitaAdmin((prev) => ({ ...prev, hora: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Seleccionar hora</option>
                        {horariosCitas.map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha de cita</label>
                      <input
                        type="date"
                        min={getTodayIso()}
                        value={nuevaCitaAdmin.fecha}
                        onChange={(event) => setNuevaCitaAdmin((prev) => ({ ...prev, fecha: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Método de pago</label>
                      <select
                        value={nuevaCitaAdmin.metodoPago}
                        onChange={(event) =>
                          setNuevaCitaAdmin((prev) => ({ ...prev, metodoPago: event.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Seleccionar método de pago</option>
                        {metodosPago.map((metodo) => (
                          <option key={metodo} value={metodo}>
                            {metodo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1 block text-xs font-semibold text-slate-500">Motivo</label>
                      <input
                        placeholder="Motivo de la cita"
                        value={nuevaCitaAdmin.motivo}
                        onChange={(event) => setNuevaCitaAdmin((prev) => ({ ...prev, motivo: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const { dni, nombres, apellidoPaterno, apellidoMaterno, telefono, fechaNacimiento, medicoEspecialidad, fecha, hora, motivo, metodoPago } = nuevaCitaAdmin
                      if (!dni || dni.length !== 8 || !medicoEspecialidad || !fecha || !hora || !motivo || !metodoPago) {
                        showMessage(
                          'Completa lo mínimo: DNI (8 dígitos), médico, fecha, hora, motivo y método de pago.',
                          { variant: 'warning' },
                        )
                        return
                      }
                      if (isPastIsoDate(fecha)) {
                        showMessage('La fecha no puede ser anterior al día actual.', { variant: 'warning' })
                        return
                      }
                      try {
                        const response = await apiFetch(`/patient/admin/citas/by-dni/${dni}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            nombres: nombres.trim() || undefined,
                            apellidoPaterno: apellidoPaterno.trim() || undefined,
                            apellidoMaterno: apellidoMaterno.trim() || undefined,
                            telefono: telefono || undefined,
                            fechaNacimiento: fechaNacimiento || undefined,
                            medicoEspecialidad,
                            fecha,
                            hora,
                            motivo,
                            metodoPago,
                          }),
                        })
                        if (!response.ok) throw new Error()
                        showMessage('Cita creada en Administrador correctamente.', { variant: 'success' })
                        setNuevaCitaAdmin({
                          dni: '',
                          nombres: '',
                          apellidoPaterno: '',
                          apellidoMaterno: '',
                          telefono: '',
                          fechaNacimiento: '',
                          medicoEspecialidad: '',
                          fecha: '',
                          hora: '',
                          motivo: '',
                          metodoPago: '',
                        })
                        await loadAdminData()
                      } catch {
                        showMessage('No se pudo crear la cita desde Administrador.', { variant: 'error' })
                      }
                    }}
                    className="mt-3 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Crear Cita
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Citas registradas</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Hoy ({formatLongDateEs(getTodayIso())}): {citasClasificadas.hoy.length} · Próximas:{' '}
                    {citasClasificadas.upcoming.length} · Anteriores: {citasClasificadas.past.length}
                  </p>
                  <div className="mt-3 space-y-3">
                    {[...citasClasificadas.upcoming, ...citasClasificadas.past].map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="rounded-full bg-[#e7effd] p-2 text-[#3975d9]">
                              <CalendarDays className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-[#2d6dda]">{item.hour}</p>
                              <p className="font-semibold">{item.patient}</p>
                              <p className="text-sm text-slate-500">{item.doctor}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                !isUpcomingAppointment(item)
                                  ? 'bg-slate-100 text-slate-600'
                                  : item.status === 'Pendiente'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {!isUpcomingAppointment(item) ? `${item.status} · pasada` : item.status}
                            </span>
                            <button type="button" onClick={() => handleVerCita(item)} className="text-sm font-semibold">
                              Ver
                            </button>
                            <button type="button" onClick={() => handleEditarCita(item)} className="rounded-md bg-[#f0f1f4] px-2 py-1 text-sm font-semibold">
                              Editar
                            </button>
                          </div>
                        </div>
                        {selectedCita?.id === item.id ? (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                            <p className="font-semibold">Detalle de cita</p>
                            <p>Paciente: {item.patient}</p>
                            <p>Medico: {item.doctor}</p>
                            <p>Fecha: {item.date || '--'}</p>
                            <p>Hora: {item.hour}</p>
                            <p>Estado: {item.status}</p>
                          </div>
                        ) : null}
                        {editingCitaId === item.id ? (
                          <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white p-3">
                            <input
                              type="date"
                              min={getTodayIso()}
                              value={editCitaForm.date}
                              onChange={(event) => setEditCitaForm((prev) => ({ ...prev, date: event.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                            <select
                              value={editCitaForm.hour}
                              onChange={(event) => setEditCitaForm((prev) => ({ ...prev, hour: event.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              {horariosCitas.map((hora) => (
                                <option key={hora} value={hora}>
                                  {hora}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editCitaForm.status}
                              onChange={(event) => setEditCitaForm((prev) => ({ ...prev, status: event.target.value }))}
                              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              <option value="Pendiente">Pendiente</option>
                              <option value="Confirmada">Confirmada</option>
                              <option value="Completada">Completada</option>
                            </select>
                            <div className="col-span-3 flex gap-2">
                              <button type="button" onClick={handleGuardarEdicionCita} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">
                                Guardar edicion
                              </button>
                              <button type="button" onClick={() => setEditingCitaId('')} className="rounded bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === 'medicos' ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {showNewDoctorForm ? (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="mb-2 text-sm font-semibold text-blue-700">Registrar medico</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={nuevoMedico.nombres} onChange={(e) => setNuevoMedico((p) => ({ ...p, nombres: e.target.value }))} placeholder="Nombres" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.apellidos} onChange={(e) => setNuevoMedico((p) => ({ ...p, apellidos: e.target.value }))} placeholder="Apellidos" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.specialty} onChange={(e) => setNuevoMedico((p) => ({ ...p, specialty: e.target.value }))} placeholder="Especialidad" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.cmp} onChange={(e) => setNuevoMedico((p) => ({ ...p, cmp: e.target.value }))} placeholder="CMP" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.dni} onChange={(e) => setNuevoMedico((p) => ({ ...p, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))} placeholder="DNI" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.phone} onChange={(e) => setNuevoMedico((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 9) }))} placeholder="Telefono" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.email} onChange={(e) => setNuevoMedico((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                    <input value={nuevoMedico.schedule} onChange={(e) => setNuevoMedico((p) => ({ ...p, schedule: e.target.value }))} placeholder="Horario (ej: 08:00 - 14:00)" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={handleRegistrarMedico} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white">Guardar medico</button>
                    <button type="button" onClick={() => setShowNewDoctorForm(false)} className="rounded bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">Cancelar</button>
                  </div>
                </div>
              ) : null}
              <div className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-400">Buscar por nombre, DNI o especialidad...</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {medicosState.map((item) => (
                  <article key={item.name} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <span className="rounded-full bg-[#e8efff] p-2 text-[#356fdb]">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.specialty}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Activo</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 bg-[#f8f9fc] p-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">CMP</p>
                        <p>{item.cmp}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">DNI</p>
                        <p>{item.dni}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Teléfono</p>
                        <p>{item.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <p>{item.email}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">Horario: {item.schedule}</p>
                    <div className="mt-2 grid grid-cols-2">
                      <div className="bg-[#edf2fb] px-2 py-1 text-center">
                        <p className="text-xl">{item.today}</p>
                        <p className="text-xs text-slate-500">Consultas Hoy</p>
                      </div>
                      <div className="bg-[#eaf8f0] px-2 py-1 text-center">
                        <p className="text-xl text-emerald-700">{item.month}</p>
                        <p className="text-xs text-slate-500">Pacientes/Mes</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" className="rounded bg-[#f0f1f4] px-3 py-1.5 text-sm font-semibold">
                        Editar
                      </button>
                      <button type="button" className="rounded px-3 py-1.5 text-sm font-semibold">
                        Ver Agenda
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeView === 'reportes' ? (
            <section className="space-y-4 pb-6">
              <section className="grid grid-cols-4 gap-3">
                {statsReportesDynamic.map((card) => {
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
                      <p className="text-sm text-emerald-600">{card.extra}</p>
                    </div>
                  )
                })}
              </section>

              <section className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveReportType('general')}
                  className={`rounded-xl py-5 text-center font-semibold ${activeReportType === 'general' ? 'border-2 border-blue-500 bg-[#edf4ff]' : 'border border-slate-300 bg-white'}`}
                >
                  Reporte General
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportType('financiero')}
                  className={`rounded-xl py-5 text-center font-semibold ${activeReportType === 'financiero' ? 'border-2 border-blue-500 bg-[#edf4ff]' : 'border border-slate-300 bg-white'}`}
                >
                  Reporte Financiero
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportType('desempeno')}
                  className={`rounded-xl py-5 text-center font-semibold ${activeReportType === 'desempeno' ? 'border-2 border-blue-500 bg-[#edf4ff]' : 'border border-slate-300 bg-white'}`}
                >
                  Desempeño Médico
                </button>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                Periodo activo: <span className="font-semibold">{formatDateDMY(reportRange.from)} a {formatDateDMY(reportRange.to)}</span>
              </section>

              {activeReportType === 'general' ? (
                <section className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Citas Mensuales</h3>
                  <div className="mt-4 h-56 rounded border border-dashed border-slate-300 p-4">
                    <div className="flex h-full items-end gap-4">
                      <div className="w-16 bg-red-500" style={{ height: '72%' }} />
                      <div className="w-16 bg-red-500" style={{ height: '82%' }} />
                      <div className="w-16 bg-red-500" style={{ height: '92%' }} />
                      <div className="w-16 bg-red-500" style={{ height: '80%' }} />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Ingresos y Gastos (S/)</h3>
                  <div className="mt-4 h-56 rounded border border-dashed border-slate-300 p-4">
                    <svg className="h-full w-full" viewBox="0 0 300 170">
                      <polyline fill="none" stroke="#cb3f5a" strokeWidth="2" points="10,110 95,84 190,58 280,62" />
                      <circle cx="10" cy="110" r="2.5" fill="#cb3f5a" />
                      <circle cx="95" cy="84" r="2.5" fill="#cb3f5a" />
                      <circle cx="190" cy="58" r="2.5" fill="#cb3f5a" />
                      <circle cx="280" cy="62" r="2.5" fill="#cb3f5a" />
                    </svg>
                  </div>
                </div>
                </section>
              ) : null}

              {activeReportType === 'financiero' ? (
                <section className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-2xl font-semibold">Resumen Financiero</h3>
                    <p className="mt-3 text-sm text-slate-600">Ingresos acumulados: <span className="font-semibold">S/ {statsState.ingresosMes.toFixed(2)}</span></p>
                    <p className="mt-1 text-sm text-slate-600">Citas registradas: <span className="font-semibold">{agendaItemsState.length}</span></p>
                    <p className="mt-1 text-sm text-slate-600">Pacientes totales: <span className="font-semibold">{statsState.totalPacientes}</span></p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-2xl font-semibold">Ultimos movimientos</h3>
                    <div className="mt-3 space-y-2 text-sm">
                      {agendaItemsState.slice(0, 8).map((item) => (
                        <div key={`${item.id}-rep`} className="rounded border border-slate-200 px-2 py-1.5">
                          <p className="font-semibold">{item.patient}</p>
                          <p className="text-slate-500">{item.doctor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {activeReportType === 'desempeno' ? (
                <section className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Distribución por Especialidad</h3>
                  <div className="mt-4 flex h-56 items-center justify-center">
                    <div className="h-40 w-40 rounded-full" style={{ background: 'conic-gradient(#3f7dde 0 42%, #1eb980 42% 67%, #f5a407 67% 85%, #8b5cf6 85% 100%)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <p>Medicina General 42%</p>
                    <p>Cardiología 25%</p>
                    <p>Pediatría 18%</p>
                    <p>Traumatología 15%</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Satisfacción del Cliente (%)</h3>
                  <div className="mt-4 h-56 rounded border border-dashed border-slate-300 p-4">
                    <svg className="h-full w-full" viewBox="0 0 300 170">
                      <polyline fill="none" stroke="#dba022" strokeWidth="2" points="10,70 95,60 190,80 280,45" />
                      <circle cx="10" cy="70" r="2.5" fill="#dba022" />
                      <circle cx="95" cy="60" r="2.5" fill="#dba022" />
                      <circle cx="190" cy="80" r="2.5" fill="#dba022" />
                      <circle cx="280" cy="45" r="2.5" fill="#dba022" />
                    </svg>
                  </div>
                </div>
                </section>
              ) : null}

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Top Médicos del Mes</h3>
                <table className="mt-3 w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f5f6f9] text-left text-xs font-semibold text-slate-600">
                      <th className="px-3 py-2">Médico</th>
                      <th className="px-3 py-2">Consultas</th>
                      <th className="px-3 py-2">Ingresos (S/)</th>
                      <th className="px-3 py-2">Satisfacción</th>
                      <th className="px-3 py-2">Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMedicos.map((item) => (
                      <tr key={item.pos} className="border-b border-slate-200 text-sm">
                        <td className="px-3 py-2">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#e8efff] text-[#3e76dd]">
                            {item.pos}
                          </span>
                          {item.name}
                        </td>
                        <td className="px-3 py-2">{item.consultas}</td>
                        <td className="px-3 py-2">{item.ingresos}</td>
                        <td className="px-3 py-2">⭐ {item.sat}</td>
                        <td className="px-3 py-2">
                          <div className="h-2 w-full rounded-full bg-slate-200">
                            <div className={`h-2 rounded-full bg-emerald-500 ${item.width}`} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  )
}

export default AdminWorkspace
