import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  IdCard,
  LogOut,
  Plus,
  Stethoscope,
  UserCircle2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { useAppMessage } from '../../../context/AppMessageContext'

import { apiFetch } from '../../../lib/api'
import {
  applyCitasFromPayload,
  getTodayIso,
  isPastIsoDate,
  isUpcomingAppointment,
  splitAppointments,
} from '../../../lib/appointmentDates'

const profileSnapshotKey = (username) =>
  `pacienteProfileSnapshot:${String(username ?? '').trim().toLowerCase()}`

function calculateAge(fechaNacimiento) {
  if (!fechaNacimiento) return '--'
  const birth = new Date(fechaNacimiento)
  if (Number.isNaN(birth.getTime())) return '--'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  const dayDiff = today.getDate() - birth.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1
  return age >= 0 ? String(age) : '--'
}

const NAV_ITEMS = [
  { key: 'panel', label: 'Mi Panel', icon: ClipboardList },
  { key: 'citas', label: 'Mis Citas', icon: CalendarDays },
  { key: 'historial', label: 'Mi Historial', icon: FileText },
  { key: 'pagos', label: 'Mis Pagos', icon: DollarSign },
]

const BASE_ULTIMAS_CONSULTAS = [
  { doctor: 'Dr. Juan Pérez', specialty: 'Medicina General', date: '02 Abr 2026' },
  { doctor: 'Dra. Ana Torres', specialty: 'Cardiología', date: '15 Mar 2026' },
  { doctor: 'Dr. Juan Pérez', specialty: 'Control', date: '28 Feb 2026' },
]

const proximasCitas = [
  {
    date: '14 de mayo de 2026',
    time: '10:00',
    doctor: 'Dr. Juan Pérez',
    specialty: 'Medicina General',
    reason: 'Motivo: Control de presión arterial',
    place: 'Consultorio 201',
    status: 'Confirmada',
  },
  {
    date: '09 de junio de 2026',
    time: '14:30',
    doctor: 'Dra. Ana Torres',
    specialty: 'Cardiología',
    reason: 'Motivo: Evaluación cardiológica',
    place: 'Consultorio 305',
    status: 'Pendiente',
  },
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
const COSTO_POR_ESPECIALIDAD = {
  'Medicina General': 80,
  Cardiología: 120,
  Pediatría: 95,
  Traumatología: 150,
}

/** El backend serializa entidades con invoice/concept/…; la UI usa factura/concepto/… */
function normalizePendingPaymentRow(raw) {
  if (!raw || typeof raw !== 'object') return raw
  const montoNum =
    typeof raw.monto === 'number' && !Number.isNaN(raw.monto)
      ? raw.monto
      : Number.parseFloat(String(raw.amount ?? raw.monto ?? 0).replace(',', '.')) || 0
  return {
    ...raw,
    concepto: raw.concepto ?? raw.concept ?? '',
    factura: raw.factura ?? raw.invoice ?? '',
    fecha: raw.fecha ?? raw.date ?? '',
    metodo: raw.metodo ?? raw.method ?? '',
    monto: montoNum,
  }
}

function pendingPaymentMonto(item) {
  if (!item) return 0
  if (typeof item.monto === 'number' && !Number.isNaN(item.monto)) return item.monto
  return Number.parseFloat(String(item.amount ?? 0).replace(',', '.')) || 0
}

const HISTORIAL_BY_USERNAME = {
  paciente: {
    fullName: 'María García',
    dni: '45678901',
    grupoSanguineo: 'O+',
    alergias: ['Penicilina', 'Polen'],
    enfermedadesCronicas: ['Hipertensión'],
    medicacionActual: ['Enalapril 10mg'],
    consultas: [
      {
        date: '01 de abril de 2026',
        doctor: 'Dr. Juan Pérez - Medicina General',
        motivo: 'Control de presión arterial',
        diagnostico: 'Hipertensión leve',
        tratamiento: 'Enalapril 10mg, 1 vez al día',
        examenes: '• Presión Arterial: 140/90\n• Glucosa: 95 mg/dL',
        observaciones: 'Control en 15 días',
      },
      {
        date: '14 de marzo de 2026',
        doctor: 'Dra. Ana Torres - Cardiología',
        motivo: 'Evaluación cardiológica',
        diagnostico: 'Ritmo cardíaco normal',
        tratamiento: 'Monitoreo y dieta baja en sodio',
        examenes: '• ECG: Normal\n• Frecuencia cardíaca: 72 lpm',
        observaciones: 'Nueva evaluación en 3 meses',
      },
    ],
  },
}

const BASE_PAGOS_HISTORIAL = [
  {
    fecha: '1/4/2026',
    factura: 'F001-00001',
    concepto: 'Consulta + Electrocardiograma',
    metodo: 'Tarjeta',
    monto: 'S/ 153.40',
    estado: 'Pagado',
  },
  {
    fecha: '14/3/2026',
    factura: 'B001-00045',
    concepto: 'Consulta Cardiología',
    metodo: 'Efectivo',
    monto: 'S/ 120.00',
    estado: 'Pagado',
  },
  {
    fecha: '27/2/2026',
    factura: 'B001-00034',
    concepto: 'Consulta General',
    metodo: 'Tarjeta',
    monto: 'S/ 80.00',
    estado: 'Pagado',
  },
]

const HISTORIAL_DEMO_PACIENTE = HISTORIAL_BY_USERNAME.paciente

function PacienteWorkspace({ onLogout, portalUsername }) {
  const { showMessage } = useAppMessage()
  const [activeView, setActiveView] = useState('panel')
  const [showNuevaCitaForm, setShowNuevaCitaForm] = useState(false)
  const [showPagoAlert, setShowPagoAlert] = useState(false)
  const [nuevaCita, setNuevaCita] = useState({
    medicoEspecialidad: '',
    fecha: '',
    hora: '',
    motivo: '',
    metodoPago: '',
  })
  const [proximasCitasState, setProximasCitasState] = useState([])
  const [citasAnterioresState, setCitasAnterioresState] = useState([])
  const [pagosPendientesState, setPagosPendientesState] = useState([])
  const [pagosHistorialState, setPagosHistorialState] = useState([])
  const [historialConsultasState, setHistorialConsultasState] = useState([])
  const [profileState, setProfileState] = useState(null)
  const [nowTs, setNowTs] = useState(Date.now())
  const currentUsername = String(portalUsername ?? localStorage.getItem('demoCurrentUsername') ?? 'paciente')
    .trim()
    .toLowerCase()
  const isDemoPaciente = currentUsername === 'paciente'
  /** Solo la cuenta demo `paciente` usa datos mock; el resto debe salir del API (nunca del perfil demo). */
  const historialDemo = isDemoPaciente ? HISTORIAL_DEMO_PACIENTE : null

  let profileSnapshot = null
  const snapshotRaw = localStorage.getItem(profileSnapshotKey(currentUsername))
  if (snapshotRaw) {
    try {
      const parsed = JSON.parse(snapshotRaw)
      if (parsed && String(parsed.username || '').toLowerCase() === currentUsername) {
        profileSnapshot = parsed
      }
    } catch {
      profileSnapshot = null
    }
  }

  const fullNameFromSnapshot = profileSnapshot
    ? `${profileSnapshot.nombres ?? ''} ${profileSnapshot.apellidoPaterno ?? ''} ${profileSnapshot.apellidoMaterno ?? ''}`.trim()
    : ''

  const namePartsFromState = [
    profileState?.firstName,
    profileState?.paternalLastName,
    profileState?.maternalLastName,
  ]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(' ')
    .trim()

  const resolvedFullName =
    (profileState?.fullName && String(profileState.fullName).trim()) ||
    namePartsFromState ||
    fullNameFromSnapshot ||
    (historialDemo ? historialDemo.fullName : '') ||
    `Paciente (${currentUsername})`

  /** Texto compacto para la barra lateral: no depender solo de nombres/apellidos si el API manda solo fullName. */
  const sidebarPatientTitle =
    namePartsFromState ||
    (profileState?.fullName && String(profileState.fullName).trim()) ||
    fullNameFromSnapshot ||
    (historialDemo ? historialDemo.fullName : '') ||
    currentUsername

  const profileDisplay = {
    fullName: resolvedFullName,
    sidebarPatientTitle,
    nombres:
      profileState?.firstName ||
      profileSnapshot?.nombres ||
      (historialDemo ? historialDemo.fullName.split(' ')[0] ?? '' : ''),
    apellidoPaterno:
      profileState?.paternalLastName ||
      profileSnapshot?.apellidoPaterno ||
      (historialDemo ? historialDemo.fullName.split(' ')[1] ?? '' : ''),
    apellidoMaterno:
      profileState?.maternalLastName ||
      profileSnapshot?.apellidoMaterno ||
      (historialDemo ? historialDemo.fullName.split(' ')[2] ?? '' : ''),
    telefono: profileState?.phone || profileSnapshot?.telefono || 'No registrado',
    fechaNacimiento: profileState?.birthDate || profileSnapshot?.fechaNacimiento || '',
    edad: calculateAge(profileState?.birthDate || profileSnapshot?.fechaNacimiento),
    dni: profileState?.dni || profileSnapshot?.dni || (historialDemo ? historialDemo.dni : 'No registrado'),
    grupoSanguineo: profileState?.grupoSanguineo || (historialDemo ? historialDemo.grupoSanguineo : 'No registrado'),
    alergias: profileState?.alergias || (historialDemo ? historialDemo.alergias : []),
    enfermedadesCronicas:
      profileState?.enfermedadesCronicas || (historialDemo ? historialDemo.enfermedadesCronicas : []),
    medicacionActual: profileState?.medicacionActual || (historialDemo ? historialDemo.medicacionActual : []),
  }
  const stateStorageKey = `pacienteState:${currentUsername}`

  const applyPatientState = (payload, expectedUsername) => {
    if (!payload) return
    const expected = String(expectedUsername ?? currentUsername)
      .trim()
      .toLowerCase()
    const profUser = String(payload.profile?.username ?? '')
      .trim()
      .toLowerCase()
    if (profUser && expected && profUser !== expected) {
      return
    }
    setProfileState(payload.profile ?? null)
    applyCitasFromPayload(payload, setProximasCitasState, setCitasAnterioresState)
    setHistorialConsultasState(
      Array.isArray(payload.historialConsultas) ? payload.historialConsultas : [],
    )
    setPagosPendientesState(
      Array.isArray(payload.pagosPendientes)
        ? payload.pagosPendientes.map(normalizePendingPaymentRow)
        : [],
    )
    setPagosHistorialState(Array.isArray(payload.pagosHistorial) ? payload.pagosHistorial : [])
  }

  const totalPagado = pagosHistorialState.reduce((acc, item) => {
    const raw = item.monto
    if (typeof raw === 'number') return acc + raw
    return acc + Number(String(raw).replace(/[^\d.]/g, '') || 0)
  }, 0)
  const citasAnterioresDynamic = useMemo(() => {
    return citasAnterioresState.map((item) => ({
      doctor: item.doctor || 'Sin doctor',
      specialty: item.specialty || 'Sin especialidad',
      date: item.date || '--',
      status: item.status || '',
      time: item.time || '',
    }))
  }, [citasAnterioresState])

  const totalPendiente = pagosPendientesState.reduce((acc, item) => acc + pendingPaymentMonto(item), 0)
  const totalGastado = totalPagado + totalPendiente

  const panelCards = [
    {
      label: 'Próxima Cita',
      value:
        proximasCitasState[0] !== undefined
          ? `${proximasCitasState[0].date}, ${proximasCitasState[0].time}`
          : 'Sin cita',
      color: 'bg-blue-500',
      icon: CalendarDays,
    },
    {
      label: 'Consultas Totales',
      value: String(historialConsultasState.length + proximasCitasState.length + citasAnterioresState.length),
      color: 'bg-green-500',
      icon: Stethoscope,
    },
    {
      label: 'Pagos Pendientes',
      value: `S/ ${totalPendiente.toFixed(2)}`,
      color: 'bg-orange-500',
      icon: DollarSign,
    },
    {
      label: 'Última Consulta',
      value: citasAnterioresState[0]?.date ?? historialConsultasState[0]?.date ?? 'Sin historial',
      color: 'bg-purple-500',
      icon: FileText,
    },
  ]

  useEffect(() => {
    if (!isDemoPaciente) {
      setProximasCitasState([])
      setCitasAnterioresState([])
      setHistorialConsultasState([])
      setPagosHistorialState([])
      setPagosPendientesState([])
      return
    }

    const saved = localStorage.getItem(stateStorageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const allDemo = [
          ...(Array.isArray(parsed.proximasCitas) ? parsed.proximasCitas : []),
          ...(Array.isArray(parsed.citasAnteriores) ? parsed.citasAnteriores : []),
        ]
        const demoSplit = splitAppointments(allDemo.length ? allDemo : proximasCitas)
        setProximasCitasState(demoSplit.upcoming)
        setCitasAnterioresState(demoSplit.past)
        setHistorialConsultasState(
          Array.isArray(parsed.historialConsultas)
            ? parsed.historialConsultas
            : historialDemo?.consultas ?? [],
        )
        setPagosHistorialState(
          Array.isArray(parsed.pagosHistorial) ? parsed.pagosHistorial : BASE_PAGOS_HISTORIAL,
        )
        setPagosPendientesState(
          Array.isArray(parsed.pagosPendientes)
            ? parsed.pagosPendientes.map(normalizePendingPaymentRow)
            : [],
        )
        return
      } catch {
        // Si falla el parseo, se reestablece estado base.
      }
    }

    const demoSplit = splitAppointments(proximasCitas)
    setProximasCitasState(demoSplit.upcoming)
    setCitasAnterioresState(demoSplit.past)
    setHistorialConsultasState(historialDemo?.consultas ?? [])
    setPagosHistorialState(BASE_PAGOS_HISTORIAL)
    setPagosPendientesState([])
  }, [currentUsername, isDemoPaciente, stateStorageKey])

  useEffect(() => {
    if (!isDemoPaciente) return
    localStorage.setItem(
      stateStorageKey,
      JSON.stringify({
        proximasCitas: proximasCitasState,
        citasAnteriores: citasAnterioresState,
        historialConsultas: historialConsultasState,
        pagosHistorial: pagosHistorialState,
        pagosPendientes: pagosPendientesState,
      }),
    )
  }, [
    historialConsultasState,
    isDemoPaciente,
    pagosHistorialState,
    pagosPendientesState,
    proximasCitasState,
    citasAnterioresState,
    stateStorageKey,
  ])

  useEffect(() => {
    setProfileState(null)
    const controller = new AbortController()

    const fetchState = async () => {
      try {
        const response = await apiFetch(`/patient/portal/${encodeURIComponent(currentUsername)}/state`, {
          signal: controller.signal,
        })
        if (!response.ok) return
        const payload = await response.json()
        if (controller.signal.aborted) return
        applyPatientState(payload, currentUsername)
      } catch (error) {
        if (error?.name === 'AbortError') return
        showMessage('No se pudo sincronizar con el backend; se mantiene modo local.', { variant: 'warning' })
      }
    }

    fetchState()
    return () => controller.abort()
  }, [currentUsername])

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTs(Date.now())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = Date.now()

      setProximasCitasState((prev) => {
        const filtered = prev.filter(
          (item) =>
            isUpcomingAppointment(item) &&
            !(item.holdExpiresAt && item.paymentStatus === 'PENDIENTE_PAGO' && now >= item.holdExpiresAt),
        )

        if (filtered.length !== prev.length) {
          localStorage.setItem(`demoProximasCitas:${currentUsername}`, JSON.stringify(filtered))
          showMessage('Una cita fue eliminada por no completar el pago en 4 minutos.', { variant: 'warning' })
        }

        return filtered
      })

      setPagosPendientesState((prev) => prev.filter((item) => !(item.holdExpiresAt && now >= item.holdExpiresAt)))
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [currentUsername])

  const headerData = useMemo(() => {
    if (activeView === 'panel') {
      return { title: 'Dashboard Principal', subtitle: 'Mi Información Médica', actionLabel: null }
    }
    if (activeView === 'citas') {
      return { title: 'Mis Citas', subtitle: 'Gestiona tus citas médicas programadas', actionLabel: 'Solicitar Nueva Cita' }
    }
    if (activeView === 'historial') {
      return { title: 'Historial Clínico', subtitle: 'V_historial - Vista Cronológica del Historial Médico', actionLabel: null }
    }
    return { title: 'Mis Pagos', subtitle: 'Gestiona tus pagos y facturas', actionLabel: null }
  }, [activeView])

  const onChangeNuevaCita = (field, value) => {
    setNuevaCita((prev) => ({ ...prev, [field]: value }))
  }

  const handleConfirmarPago = async (event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    setActiveView('citas')
    setShowPagoAlert(true)

    const { medicoEspecialidad, fecha, hora, motivo, metodoPago } = nuevaCita
    const isComplete =
      medicoEspecialidad.trim() && fecha.trim() && hora.trim() && motivo.trim() && metodoPago.trim()

    if (!isComplete) {
      showMessage('Completa todos los campos para continuar con el pago.', { variant: 'warning' })
      return
    }

    if (isPastIsoDate(fecha)) {
      showMessage('La fecha de la cita no puede ser anterior a hoy.', { variant: 'warning' })
      return
    }

    try {
      const response = await apiFetch(`/patient/portal/${encodeURIComponent(currentUsername)}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicoEspecialidad,
          fecha,
          hora,
          motivo,
          metodoPago,
        }),
      })

      if (!response.ok) {
        throw new Error('No se pudo registrar la cita.')
      }

      const payload = await response.json()
      applyPatientState(payload, currentUsername)
      showMessage('Solicitud registrada. Completa el pago dentro de 4 minutos para conservar tu cita.', {
        variant: 'success',
      })
      setShowPagoAlert(false)
      setShowNuevaCitaForm(false)
      setActiveView('pagos')
      setNuevaCita({
        medicoEspecialidad: '',
        fecha: '',
        hora: '',
        motivo: '',
        metodoPago: '',
      })
    } catch {
      showMessage('No se pudo registrar la cita en backend.', { variant: 'error' })
    }
  }

  const handleDescargarHistorialPdf = () => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 14

      const drawHeader = (title) => {
        doc.setFillColor(24, 99, 235)
        doc.rect(0, 0, pageWidth, 22, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(13)
        doc.text('SISTEMA TECH CLINICA', 14, 9)
        doc.setFontSize(10)
        doc.text('RUC: 20123456789', 14, 15)
        doc.setFontSize(12)
        doc.text(title, pageWidth - 14, 13, { align: 'right' })
        doc.setTextColor(20, 20, 20)
      }

      drawHeader('HISTORIA CLINICA')
      y = 30
      doc.setDrawColor(220, 226, 235)
      doc.roundedRect(12, y - 4, pageWidth - 24, 42, 2, 2)
      doc.setFontSize(10)
      doc.text(`Paciente: ${profileDisplay.fullName}`, 16, y + 2)
      doc.text(`DNI: ${profileDisplay.dni}`, 16, y + 8)
      doc.text(`Telefono: ${profileDisplay.telefono}`, 16, y + 14)
      doc.text(`F. Nacimiento: ${profileDisplay.fechaNacimiento || 'No registrada'}`, 16, y + 20)
      doc.text(`Edad: ${profileDisplay.edad}`, 16, y + 26)
      doc.text(`Grupo sanguineo: ${profileDisplay.grupoSanguineo}`, 16, y + 32)
      doc.text(`Alergias: ${profileDisplay.alergias.join(', ') || '-'}`, 100, y + 8)
      doc.text(`Enf. cronicas: ${profileDisplay.enfermedadesCronicas.join(', ') || '-'}`, 100, y + 14)
      doc.text(`Medicacion: ${profileDisplay.medicacionActual.join(', ') || '-'}`, 100, y + 20)

      y += 48
      doc.setFontSize(11)
      doc.text('Evolucion de consultas', 14, y)
      y += 6

      if (!historialConsultasState.length) {
        doc.setFontSize(10)
        doc.text('Sin consultas registradas.', 14, y)
      }

      historialConsultasState.forEach((item, index) => {
        const blockHeight = 44
        if (y + blockHeight > 280) {
          doc.addPage()
          drawHeader('HISTORIA CLINICA')
          y = 30
        }

        doc.setFillColor(248, 250, 252)
        doc.roundedRect(12, y - 3, pageWidth - 24, blockHeight, 2, 2, 'F')
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(12, y - 3, pageWidth - 24, blockHeight, 2, 2)
        doc.setFontSize(10)
        doc.text(`${index + 1}. ${item.date} - ${item.doctor}`, 16, y + 2)
        doc.text(doc.splitTextToSize(`Motivo: ${item.motivo}`, 170), 16, y + 8)
        doc.text(doc.splitTextToSize(`Diagnostico: ${item.diagnostico}`, 170), 16, y + 14)
        doc.text(doc.splitTextToSize(`Tratamiento: ${item.tratamiento}`, 170), 16, y + 20)
        doc.text(doc.splitTextToSize(`Examenes: ${item.examenes}`, 170), 16, y + 26)
        doc.text(doc.splitTextToSize(`Observaciones: ${item.observaciones}`, 170), 16, y + 32)
        y += blockHeight + 4
      })

      doc.save(`historial-clinico-${profileDisplay.dni || 'paciente'}.pdf`)
      showMessage('PDF de historial descargado correctamente.', { variant: 'success' })
    } catch {
      showMessage('No se pudo generar el PDF del historial.', { variant: 'error' })
    }
  }

  const handlePagarAhora = async () => {
    const pago = pagosPendientesState[0]
    if (!pago) return

    try {
      const response = await apiFetch(
        `/patient/portal/${encodeURIComponent(currentUsername)}/pagos/${encodeURIComponent(pago.id)}/pagar`,
        { method: 'POST' },
      )
      if (!response.ok) throw new Error()
      const payload = await response.json()
      applyPatientState(payload, currentUsername)
      showMessage('Pago realizado. Tus módulos se actualizaron correctamente.', { variant: 'success' })
    } catch {
      showMessage('No se pudo completar el pago en backend.', { variant: 'error' })
    }
  }

  const handleCancelarCita = async (citaId) => {
    try {
      const response = await apiFetch(
        `/patient/portal/${encodeURIComponent(currentUsername)}/citas/${encodeURIComponent(citaId)}`,
        { method: 'DELETE' },
      )
      if (!response.ok) throw new Error()
      const payload = await response.json()
      applyPatientState(payload, currentUsername)
      showMessage('Cita cancelada correctamente.', { variant: 'success' })
    } catch {
      showMessage('No se pudo cancelar la cita en backend.', { variant: 'error' })
    }
  }

  const formatTiempoRestante = (expiresAt) => {
    if (!expiresAt) return '--:--'
    const diffMs = Math.max(0, expiresAt - nowTs)
    const minutes = Math.floor(diffMs / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const descargarFacturaPdf = (pago) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const monto =
        typeof pago.monto === 'number'
          ? pago.monto.toFixed(2)
          : String(pago.monto).replace('S/ ', '')
      const tipoDoc = String(pago.factura || '').startsWith('B') ? 'BOLETA DE PAGO' : 'FACTURA'

      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.text('SISTEMA TECH CLINICA', 14, 11)
      doc.setFontSize(10)
      doc.text('Av. Salud 123 - Lima, Peru', 14, 17)
      doc.text('RUC: 20123456789', 14, 23)
      doc.setFontSize(12)
      doc.text(tipoDoc, pageWidth - 14, 12, { align: 'right' })
      doc.text(String(pago.factura || '-'), pageWidth - 14, 18, { align: 'right' })
      doc.setTextColor(20, 20, 20)

      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(12, 36, pageWidth - 24, 34, 2, 2)
      doc.setFontSize(10)
      doc.text(`Paciente: ${profileDisplay.fullName}`, 16, 45)
      doc.text(`DNI: ${profileDisplay.dni}`, 16, 51)
      doc.text(`Fecha emision: ${pago.fecha}`, 16, 57)
      doc.text(`Metodo de pago: ${pago.metodo}`, 16, 63)

      doc.setFillColor(248, 250, 252)
      doc.rect(12, 78, pageWidth - 24, 10, 'F')
      doc.setFontSize(10)
      doc.text('Descripcion', 16, 84)
      doc.text('Total', pageWidth - 16, 84, { align: 'right' })

      doc.setDrawColor(226, 232, 240)
      doc.rect(12, 88, pageWidth - 24, 24)
      doc.text(doc.splitTextToSize(String(pago.concepto || '-'), 140), 16, 96)
      doc.text(`S/ ${monto}`, pageWidth - 16, 96, { align: 'right' })

      doc.setFontSize(12)
      doc.text('Importe total', pageWidth - 62, 122)
      doc.setFontSize(14)
      doc.text(`S/ ${monto}`, pageWidth - 16, 122, { align: 'right' })

      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('Representacion impresa del comprobante electronico.', 14, 136)
      doc.save(`factura-${pago.factura}.pdf`)
      showMessage('PDF de factura descargado correctamente.', { variant: 'success' })
    } catch {
      showMessage('No se pudo generar el PDF de la factura.', { variant: 'error' })
    }
  }

  const handleVerFactura = () => {
    const pago = pagosPendientesState[0]
    if (!pago) return
    descargarFacturaPdf(pago)
  }

  const handleDescargarPagoPdf = (pago) => {
    descargarFacturaPdf(pago)
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <section className="grid min-h-screen grid-cols-[166px_1fr]">
        <aside className="flex flex-col justify-between bg-[#1f3f9f] px-4 py-5 text-white">
          <div>
            <h1 className="text-[25px] font-bold leading-none">Sistema Tech</h1>
            <p className="mt-1 text-xs text-white/85">Paciente</p>
            <div className="mt-3 rounded-xl border border-white/20 bg-gradient-to-br from-white/20 to-white/10 px-3 py-3 shadow-lg backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-100/90">
                Perfil del Paciente
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-cyan-100">
                  <UserCircle2 className="h-5 w-5" />
                </span>
                <p className="text-sm font-bold leading-tight text-white">
                  {profileDisplay.sidebarPatientTitle || 'Paciente'}
                </p>
              </div>
              <div className="mt-2 rounded-lg bg-black/10 px-2 py-1.5">
                <div className="flex items-center gap-1">
                  <IdCard className="h-3.5 w-3.5 text-cyan-100" />
                  <p className="text-[11px] font-semibold text-white/90">DNI</p>
                </div>
                <p className="mt-0.5 text-xs tracking-wide text-cyan-100">{profileDisplay.dni || 'No registrado'}</p>
              </div>
            </div>

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
            onClick={onLogout}
            className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </aside>

        <article className="px-6 py-5">
          <header className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-[33px] font-semibold">{headerData.title}</h2>
              <p className="text-base text-slate-500">{headerData.subtitle}</p>
            </div>
            {headerData.actionLabel ? (
              <button
                type="button"
                onClick={
                  activeView === 'citas' ? () => setShowNuevaCitaForm(true) : undefined
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                {headerData.actionLabel}
              </button>
            ) : null}
          </header>

          {activeView === 'citas' && showNuevaCitaForm ? (
            <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-2xl font-semibold">Nueva Cita</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Médico y Especialidad
                  <select
                    value={nuevaCita.medicoEspecialidad}
                    onChange={(event) => onChangeNuevaCita('medicoEspecialidad', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  >
                    <option value="">Selecciona médico</option>
                    {medicosEspecialidades.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Fecha
                  <input
                    type="date"
                    min={getTodayIso()}
                    value={nuevaCita.fecha}
                    onChange={(event) => onChangeNuevaCita('fecha', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Hora
                  <select
                    value={nuevaCita.hora}
                    onChange={(event) => onChangeNuevaCita('hora', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  >
                    <option value="">Selecciona hora (9 AM - 8 PM)</option>
                    {horariosCitas.map((hora) => (
                      <option key={hora} value={hora}>
                        {hora}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Método de Pago
                  <select
                    value={nuevaCita.metodoPago}
                    onChange={(event) => onChangeNuevaCita('metodoPago', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  >
                    <option value="">Selecciona método de pago</option>
                    {metodosPago.map((metodo) => (
                      <option key={metodo} value={metodo}>
                        {metodo}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-3 block text-sm font-semibold text-slate-700">
                Motivo
                <textarea
                  value={nuevaCita.motivo}
                  onChange={(event) => onChangeNuevaCita('motivo', event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  placeholder="Describe el motivo de la cita"
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmarPago}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
                >
                  Continuar con el pago
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNuevaCitaForm(false)
                    setShowPagoAlert(false)
                    showMessage('Solicitud cancelada.', { variant: 'info' })
                  }}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <div className="mt-3 rounded-lg border-2 border-red-700 bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-md">
                Advertencia: Tienes 4 minutos para efectuar el pago. Si no lo completas, la cita se eliminara automaticamente.
              </div>

              {showPagoAlert ? (
                <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  Alerta activada. El tiempo de 4 minutos ya esta corriendo para esta solicitud.
                </div>
              ) : null}
            </section>
          ) : null}

          {activeView === 'panel' ? (
            <div className="space-y-4">
              <section className="grid grid-cols-4 gap-3">
                {panelCards.map((card) => {
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

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Últimas Consultas</h3>
                <div className="mt-3 space-y-2">
                  {historialConsultasState.slice(0, 3).map((item, index) => (
                    <div
                      key={item.id ?? `${item.doctor}-${item.date}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-[#f5f6f9] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-[#e9f8f1] p-2 text-[#2dc176]">
                          <Stethoscope className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-base font-semibold">{item.doctor}</p>
                          <p className="text-sm text-slate-500">{item.specialty}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500">{item.date}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeView === 'citas' ? (
            <section className="grid grid-cols-[1.9fr_1fr] gap-4">
              <article>
                <h3 className="mb-2 text-2xl font-semibold">Próximas Citas</h3>
                <div className="space-y-3">
                  {proximasCitasState.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
                      No tienes citas programadas. Solicita una nueva cita con el botón superior.
                    </p>
                  ) : null}
                  {proximasCitasState.map((item, index) => (
                    <div key={item.id ?? `${item.date}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between border-l-4 border-blue-500 pl-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-blue-500" />
                          <p className="text-base font-semibold">{item.date}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            item.status === 'Confirmada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'Pendiente'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm text-slate-700">
                        <p>{item.time}</p>
                        <p>{item.place}</p>
                        <p className="font-semibold">{item.doctor}</p>
                        <p>{item.specialty}</p>
                        <p className="col-span-2 text-slate-500">{item.reason}</p>
                      </div>
                      {item.status !== 'Completada' && item.status !== 'Cancelada' ? (
                        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-2">
                          <button type="button" className="rounded bg-[#f0f1f4] px-3 py-1 text-sm font-semibold">
                            Reprogramar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelarCita(item.id)}
                            className="px-3 py-1 text-sm font-semibold"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>

              <article>
                <h3 className="mb-2 text-2xl font-semibold">Citas Anteriores</h3>
                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  {citasAnterioresDynamic.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">Aún no hay citas pasadas registradas.</p>
                  ) : null}
                  {citasAnterioresDynamic.map((item, idx) => (
                    <div key={`${item.doctor}-${item.date}-${idx}`} className="rounded bg-[#f5f6f9] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{item.doctor}</p>
                          <p className="text-sm text-slate-500">{item.specialty}</p>
                          {item.time ? <p className="text-xs text-slate-400">{item.time}</p> : null}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">{item.date}</p>
                          {item.status ? (
                            <span className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                              {item.status}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          ) : null}

          {activeView === 'historial' ? (
            <section className="space-y-3">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">Mi Historial Clínico</h3>
                  <button
                    type="button"
                    onClick={handleDescargarHistorialPdf}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </button>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Este historial pertenece solo al usuario: {currentUsername}
                </p>
              </article>

              <article className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Datos Clínicos - {profileDisplay.fullName}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500">DNI</p>
                      <p className="mt-1 font-semibold">{profileDisplay.dni}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Teléfono</p>
                      <p className="mt-1 font-semibold">{profileDisplay.telefono}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Fecha de Nacimiento</p>
                      <p className="mt-1 font-semibold">{profileDisplay.fechaNacimiento || 'No registrada'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Edad</p>
                      <p className="mt-1 font-semibold">{profileDisplay.edad}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Nombres</p>
                      <p className="mt-1 font-semibold">{profileDisplay.nombres}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Apellido Paterno</p>
                      <p className="mt-1 font-semibold">{profileDisplay.apellidoPaterno}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Apellido Materno</p>
                      <p className="mt-1 font-semibold">{profileDisplay.apellidoMaterno}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Grupo Sanguíneo</p>
                      <p className="mt-1 font-semibold">{profileDisplay.grupoSanguineo}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Alergias</p>
                      <div className="mt-1 flex gap-2">
                        {profileDisplay.alergias.map((item) => (
                          <span key={item} className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-600">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Enfermedades Crónicas</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profileDisplay.enfermedadesCronicas.map((item) => (
                          <span
                            key={item}
                            className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Medicación Actual</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {profileDisplay.medicacionActual.map((item) => (
                          <span key={item} className="inline-flex rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Historial de Consultas</h3>
                  <div className="mt-3 space-y-3">
                    {historialConsultasState.map((item) => (
                      <div key={item.id ?? item.date} className="rounded-lg border border-slate-200 p-3">
                        <p className="text-base font-semibold">{item.date}</p>
                        <p className="text-sm text-slate-500">{item.doctor}</p>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Motivo</p>
                            <p>{item.motivo}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Diagnóstico</p>
                            <p>{item.diagnostico}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Tratamiento</p>
                            <p>{item.tratamiento}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Exámenes</p>
                            <p className="whitespace-pre-line">{item.examenes}</p>
                          </div>
                        </div>
                        <div className="mt-2 rounded bg-[#edf2fb] px-3 py-2 text-sm">
                          <p className="text-slate-500">Observaciones</p>
                          <p>{item.observaciones}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === 'pagos' ? (
            <section className="space-y-3">
              <div className="rounded-xl border border-orange-300 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Pagos Pendientes</h3>
                <div className="mt-3 rounded-lg bg-[#fbf6ef] px-4 py-3">
                  {pagosPendientesState.length === 0 ? (
                    <p className="text-center text-sm font-medium text-slate-600">
                      No tienes pagos pendientes en este momento.
                    </p>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">
                            {pagosPendientesState[0]?.concepto?.trim() ||
                              'Pago pendiente por cita médica'}
                          </p>
                          <p className="text-sm text-slate-500">
                            Factura: {pagosPendientesState[0]?.factura?.trim() || '—'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {pagosPendientesState[0]?.fecha?.trim() || '—'}
                          </p>
                          <p className="text-sm text-slate-500">
                            Método: {pagosPendientesState[0]?.metodo?.trim() || '—'}
                          </p>
                        </div>
                        <p className="text-4xl font-semibold text-orange-600">
                          S/ {pendingPaymentMonto(pagosPendientesState[0]).toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={handlePagarAhora}
                          className="inline-flex items-center gap-1 rounded bg-emerald-500 px-3 py-1 text-sm font-semibold text-white"
                        >
                          <CreditCard className="h-4 w-4" />
                          Pagar Ahora
                        </button>
                        <button
                          type="button"
                          onClick={handleVerFactura}
                          className="inline-flex items-center gap-1 rounded bg-[#eceef2] px-3 py-1 text-sm font-semibold"
                        >
                          <Download className="h-4 w-4" />
                          Ver Factura
                        </button>
                      </div>
                      {pagosPendientesState[0]?.holdExpiresAt ? (
                        <div className="mt-2 rounded-md border-2 border-red-700 bg-red-600 px-3 py-2 text-sm font-bold text-white">
                          Advertencia: Tienes 4 minutos para efectuar el pago o tu cita se eliminara
                          automaticamente. Tiempo restante:{' '}
                          {formatTiempoRestante(pagosPendientesState[0].holdExpiresAt)}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-500">Total Pagado</p>
                  <p className="text-[34px] font-semibold">S/ {totalPagado.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-500">Pendiente</p>
                  <p className="text-[34px] font-semibold">S/ {totalPendiente.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-sm text-slate-500">Total Gastado</p>
                  <p className="text-[34px] font-semibold">S/ {totalGastado.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Historial de Pagos</h3>
                <table className="mt-3 w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f5f6f9] text-left text-xs font-semibold text-slate-600">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Factura</th>
                      <th className="px-3 py-2">Concepto</th>
                      <th className="px-3 py-2">Método</th>
                      <th className="px-3 py-2">Monto</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosHistorialState.map((item) => (
                      <tr key={`${item.factura}-${item.fecha}`} className="border-b border-slate-200 text-sm">
                        <td className="px-3 py-2">{item.fecha}</td>
                        <td className="px-3 py-2 text-blue-500">{item.factura}</td>
                        <td className="px-3 py-2">{item.concepto}</td>
                        <td className="px-3 py-2">{item.metodo}</td>
                        <td className="px-3 py-2">{item.monto}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                            {item.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleDescargarPagoPdf(item)}
                            className="inline-flex items-center gap-1 rounded bg-[#eceef2] px-2 py-1 text-xs font-semibold hover:bg-[#dfe3ea]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  )
}

export default PacienteWorkspace
