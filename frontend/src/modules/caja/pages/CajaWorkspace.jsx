import {
  CalendarDays,
  CreditCard,
  Download,
  DollarSign,
  FileText,
  LogOut,
  ReceiptText,
  Search,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useEffect, useMemo, useState } from 'react'
import { useAppMessage } from '../../../context/AppMessageContext'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: CalendarDays },
  { key: 'facturacion', label: 'Facturación', icon: ReceiptText },
  { key: 'pagos', label: 'Pagos', icon: DollarSign },
  { key: 'reportes', label: 'Reportes', icon: FileText },
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

const formatDateDMY = (input) => {
  if (!input) return '--/--/----'
  const parts = input.split('-')
  if (parts.length !== 3) return input
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

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

const getTodayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toIsoFromEpoch = (value) => {
  if (!value) return ''
  const d = new Date(Number(value))
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function CajaWorkspace({ onLogout }) {
  const { showMessage } = useAppMessage()
  const [activeView, setActiveView] = useState('facturacion')
  const [pagosPendientesState, setPagosPendientesState] = useState([])
  const [historialPagosState, setHistorialPagosState] = useState([])
  const [statsDia, setStatsDia] = useState({
    citasCreadas: 0,
    pagosPendientes: 0,
    pagosCompletados: 0,
    totalRecaudado: 0,
  })
  const [pacientesConCitaDia, setPacientesConCitaDia] = useState([])
  const [reportDate] = useState(getTodayIso())
  const [cajaCerradaHoy, setCajaCerradaHoy] = useState(false)
  const [resumenCierre, setResumenCierre] = useState(null)
  const [nuevaCitaCaja, setNuevaCitaCaja] = useState({
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

  const loadCajaData = async () => {
    try {
      const response = await fetch(`${API_URL}/patient/caja/overview`)
      if (!response.ok) return
      const payload = await response.json()
      setPagosPendientesState(Array.isArray(payload.pagosPendientes) ? payload.pagosPendientes : [])
      setHistorialPagosState(Array.isArray(payload.historialPagos) ? payload.historialPagos : [])
      const pagosCompletados = Array.isArray(payload.historialPagos) ? payload.historialPagos.length : 0
      const totalRecaudadoFallback = (payload.historialPagos ?? []).reduce((acc, item) => {
        const raw = String(item?.amount ?? '0').replace('S/', '').trim()
        const amount = Number.parseFloat(raw)
        return acc + (Number.isNaN(amount) ? 0 : amount)
      }, 0)
      setStatsDia({
        citasCreadas: Number(payload?.statsDia?.citasCreadas ?? 0),
        pagosPendientes: Number(payload?.statsDia?.pagosPendientes ?? (payload.pagosPendientes ?? []).length),
        pagosCompletados: Number(payload?.statsDia?.pagosCompletados ?? pagosCompletados),
        totalRecaudado: Number(payload?.statsDia?.totalRecaudado ?? totalRecaudadoFallback),
      })
      setPacientesConCitaDia(Array.isArray(payload.pacientesConCitaDia) ? payload.pacientesConCitaDia : [])
    } catch {
      showMessage('No se pudo sincronizar Caja con backend.', { variant: 'error' })
    }
  }

  useEffect(() => {
    loadCajaData()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadCajaData()
    }, 8000)
    return () => window.clearInterval(intervalId)
  }, [])

  const headerData = useMemo(() => {
    if (activeView === 'facturacion') {
      return {
        title: 'Facturación',
        subtitle: 'V_factura - Generación de Comprobantes Electrónicos',
        actionLabel: 'Nueva Factura',
        actionColor: 'bg-[#2463eb]',
        actionIcon: ReceiptText,
      }
    }
    if (activeView === 'pagos') {
      return {
        title: 'Procesamiento de Pagos',
        subtitle: 'V_pago - Integración con Pasarela de Pagos',
        actionLabel: 'Registrar Pago',
        actionColor: 'bg-[#18b04b]',
        actionIcon: DollarSign,
      }
    }
    return {
      title: 'Facturación',
      subtitle: 'V_factura - Generación de Comprobantes Electrónicos',
      actionLabel: 'Nueva Factura',
      actionColor: 'bg-[#2463eb]',
      actionIcon: ReceiptText,
    }
  }, [activeView])

  const pagosDelDiaSeleccionado = useMemo(
    () =>
      historialPagosState.filter((item) => {
        const iso = toIsoFromEpoch(item.createdAt)
        return iso === reportDate
      }),
    [historialPagosState, reportDate],
  )

  const facturasState = useMemo(() => {
    const pendingRows = pagosPendientesState.map((item) => ({
      id: item.invoice,
      patient: item.patient,
      date: reportDate,
      amount: item.amount,
      status: 'Pendiente',
    }))
    const paidRows = historialPagosState.map((item) => ({
      id: item.invoice,
      patient: item.patient,
      date: toIsoFromEpoch(item.createdAt) || reportDate,
      amount: item.amount,
      status: item.status === 'Completado' ? 'Pagada' : item.status,
    }))
    return [...pendingRows, ...paidRows]
  }, [historialPagosState, pagosPendientesState, reportDate])

  const resumenPorMetodo = useMemo(() => {
    const acc = { Efectivo: 0, Tarjeta: 0, 'Yape/Plin': 0, Transferencia: 0 }
    pagosDelDiaSeleccionado.forEach((item) => {
      const raw = String(item?.amount ?? '0').replace('S/', '').trim()
      const amount = Number.parseFloat(raw)
      if (!Number.isNaN(amount) && acc[item.method] !== undefined) {
        acc[item.method] += amount
      }
    })
    return acc
  }, [pagosDelDiaSeleccionado])

  const statsReportePagos = useMemo(() => {
    const total = pagosDelDiaSeleccionado.reduce((acc, item) => {
      const raw = String(item?.amount ?? '0').replace('S/', '').trim()
      const amount = Number.parseFloat(raw)
      return acc + (Number.isNaN(amount) ? 0 : amount)
    }, 0)
    const pacientesUnicos = new Set(pagosDelDiaSeleccionado.map((item) => `${item.patient}-${item.invoice}`)).size
    const metodoCount = pagosDelDiaSeleccionado.reduce(
      (acc, item) => {
        const method = item.method || 'Otros'
        acc[method] = (acc[method] || 0) + 1
        return acc
      },
      {},
    )
    return {
      cantidadPagos: pagosDelDiaSeleccionado.length,
      pacientesPagaron: pacientesUnicos,
      totalRecaudado: total,
      ticketPromedio: pagosDelDiaSeleccionado.length ? total / pagosDelDiaSeleccionado.length : 0,
      metodoCount,
    }
  }, [pagosDelDiaSeleccionado])

  const exportarReporteCajaPdf = () => {
    const fecha = formatDateDMY(reportDate)
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Reporte de Pagos - Caja', 14, 18)
    doc.setFontSize(11)
    doc.text(`Fecha de reporte: ${fecha}`, 14, 28)
    doc.text(`Pagos realizados: ${statsReportePagos.cantidadPagos}`, 14, 36)
    doc.text(`Pacientes que pagaron: ${statsReportePagos.pacientesPagaron}`, 14, 44)
    doc.text(`Total recaudado: S/ ${statsReportePagos.totalRecaudado.toFixed(2)}`, 14, 52)
    doc.text(`Ticket promedio: S/ ${statsReportePagos.ticketPromedio.toFixed(2)}`, 14, 60)
    doc.text('Detalle de pagos del día:', 14, 72)
    let y = 80
    pagosDelDiaSeleccionado.slice(0, 18).forEach((item) => {
      doc.text(`- ${item.patient} | ${item.invoice} | ${item.method} | ${item.amount}`, 14, y)
      y += 7
    })
    doc.save(`reporte-caja-${reportDate}.pdf`)
    showMessage('Reporte de pagos exportado en PDF.', { variant: 'success' })
  }

  const cerrarCajaDelDia = () => {
    if (cajaCerradaHoy) {
      showMessage('La caja de hoy ya fue cerrada.', { variant: 'warning' })
      return
    }
    const hoy = new Date()
    const fecha = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`
    setResumenCierre({
      fecha,
      citasCreadas: statsDia.citasCreadas,
      pagosCompletados: statsDia.pagosCompletados,
      totalRecaudado: statsDia.totalRecaudado,
    })
    setCajaCerradaHoy(true)
    showMessage('Caja cerrada correctamente para el día de hoy.', { variant: 'success' })
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-slate-900">
      <section className="grid min-h-screen grid-cols-[166px_1fr]">
        <aside className="flex flex-col justify-between bg-[#1f3f9f] px-4 py-5 text-white">
          <div>
            <h1 className="text-[25px] font-bold leading-none">Sistema Tech</h1>
            <p className="mt-1 text-xs text-white/85">Caja</p>

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
            <button
              type="button"
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white ${headerData.actionColor}`}
            >
              <headerData.actionIcon className="h-4 w-4" />
              {headerData.actionLabel}
            </button>
          </header>
          {activeView === 'facturacion' ? (
            <section className="grid grid-cols-[1fr_1.9fr] gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Facturas</h3>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-400">
                  <Search className="h-4 w-4" />
                  Buscar factura...
                </div>

                <div className="mt-3 space-y-2">
                  {facturasState.map((item) => (
                    <div key={item.id} className="rounded bg-[#f5f6f9] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#2367d9]">{item.id}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            item.status === 'Pagada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="font-semibold">{item.patient}</p>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <p>{item.date}</p>
                        <p className="font-semibold text-slate-800">{item.amount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Nueva Cita por DNI</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <p className="col-span-2 mt-1 text-sm font-semibold text-slate-700">Datos del paciente</p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">DNI</label>
                    <input
                      placeholder="DNI del paciente"
                      value={nuevaCitaCaja.dni}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, dni: event.target.value.replace(/\D/g, '') }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Nombres</label>
                    <input
                      placeholder="Nombres"
                      value={nuevaCitaCaja.nombres}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, nombres: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Apellido paterno</label>
                    <input
                      placeholder="Apellido paterno"
                      value={nuevaCitaCaja.apellidoPaterno}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, apellidoPaterno: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Apellido materno</label>
                    <input
                      placeholder="Apellido materno"
                      value={nuevaCitaCaja.apellidoMaterno}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, apellidoMaterno: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Teléfono</label>
                    <input
                      placeholder="Teléfono"
                      value={nuevaCitaCaja.telefono}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, telefono: event.target.value.replace(/\D/g, '').slice(0, 9) }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Fecha de nacimiento</label>
                    <input
                      type="date"
                      value={nuevaCitaCaja.fechaNacimiento}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, fechaNacimiento: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Edad</label>
                    <input
                      value={calcularEdad(nuevaCitaCaja.fechaNacimiento)}
                      placeholder="Edad"
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-600"
                    />
                  </div>
                  <div className="col-span-2 my-1 border-t border-slate-200 pt-3" />
                  <p className="col-span-2 text-sm font-semibold text-slate-700">Datos de la cita</p>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Especialidad y médico</label>
                    <select
                      value={nuevaCitaCaja.medicoEspecialidad}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, medicoEspecialidad: event.target.value }))
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
                      value={nuevaCitaCaja.hora}
                      onChange={(event) => setNuevaCitaCaja((prev) => ({ ...prev, hora: event.target.value }))}
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
                      value={nuevaCitaCaja.fecha}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, fecha: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Método de pago</label>
                    <select
                      value={nuevaCitaCaja.metodoPago}
                      onChange={(event) =>
                        setNuevaCitaCaja((prev) => ({ ...prev, metodoPago: event.target.value }))
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
                      value={nuevaCitaCaja.motivo}
                      onChange={(event) => setNuevaCitaCaja((prev) => ({ ...prev, motivo: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={cajaCerradaHoy}
                  onClick={async () => {
                    const { dni, nombres, apellidoPaterno, apellidoMaterno, telefono, fechaNacimiento, medicoEspecialidad, fecha, hora, motivo, metodoPago } = nuevaCitaCaja
                    if (!dni || dni.length !== 8 || !medicoEspecialidad || !fecha || !hora || !motivo || !metodoPago) {
                      showMessage(
                        'Completa lo mínimo para crear cita: DNI (8), médico, fecha, hora, motivo y método de pago.',
                        { variant: 'warning' },
                      )
                      return
                    }
                    const today = new Date()
                    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                    if (fecha < todayIso) {
                      showMessage('La fecha no puede ser anterior al día actual.', { variant: 'warning' })
                      return
                    }
                    try {
                      const response = await fetch(`${API_URL}/patient/caja/citas/by-dni/${dni}`, {
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
                      showMessage('Cita creada en Caja correctamente. Pago pendiente generado.', {
                        variant: 'success',
                      })
                      setNuevaCitaCaja({
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
                      await loadCajaData()
                    } catch {
                      showMessage('No se pudo crear la cita desde Caja. Verifica backend y base de datos activos.', {
                        variant: 'error',
                      })
                    }
                  }}
                  className="mt-3 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Crear Cita
                </button>
              </article>
            </section>
          ) : null}

          {activeView === 'pagos' ? (
            <section className="grid grid-cols-[1fr_1.9fr] gap-4">
              <article className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Pagos Pendientes</h3>
                  <div className="mt-3 space-y-2">
                    {pagosPendientesState.map((item) => (
                      <div key={item.invoice} className="rounded-lg border border-amber-200 bg-[#fbf9ec] px-3 py-2">
                        <p className="font-semibold">{item.patient}</p>
                        <p className="text-sm text-slate-500">{item.invoice}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="font-semibold text-slate-700">{item.amount}</p>
                          <button
                            type="button"
                            disabled={cajaCerradaHoy}
                            onClick={async () => {
                              try {
                                if (!item.id) {
                                  showMessage('El pago no tiene identificador válido. Actualiza la vista.', {
                                    variant: 'warning',
                                  })
                                  return
                                }
                                const response = await fetch(`${API_URL}/patient/caja/pagos/${item.id}/pagar`, {
                                  method: 'POST',
                                })
                                if (!response.ok) {
                                  const errorData = await response.json().catch(() => ({}))
                                  throw new Error(errorData.message || 'No se pudo registrar el pago.')
                                }
                                showMessage('Pago registrado correctamente desde Caja.', { variant: 'success' })
                                await loadCajaData()
                              } catch (error) {
                                showMessage(error.message || 'No se pudo registrar el pago.', { variant: 'error' })
                              }
                            }}
                            className="rounded-lg bg-[#18b04b] px-3 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Pagar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-2xl font-semibold">Resumen del Día</h3>
                  <div className="mt-3 rounded bg-[#e8f6ec] px-3 py-2">
                    <p className="text-sm text-slate-500">Total Recaudado</p>
                    <p className="text-[34px] font-semibold text-emerald-700">S/ {statsDia.totalRecaudado.toFixed(2)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded bg-[#f5f6f9] px-3 py-2">
                      <p className="text-sm text-slate-500">Efectivo</p>
                      <p className="text-xl font-semibold">S/ {resumenPorMetodo.Efectivo.toFixed(2)}</p>
                    </div>
                    <div className="rounded bg-[#f5f6f9] px-3 py-2">
                      <p className="text-sm text-slate-500">Tarjeta</p>
                      <p className="text-xl font-semibold">S/ {resumenPorMetodo.Tarjeta.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Historial de Pagos</h3>
                <table className="mt-3 w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f5f6f9] text-left text-xs font-semibold text-slate-600">
                      <th className="px-2 py-2">Fecha/Hora</th>
                      <th className="px-2 py-2">Paciente</th>
                      <th className="px-2 py-2">Factura</th>
                      <th className="px-2 py-2">Método</th>
                      <th className="px-2 py-2">Monto</th>
                      <th className="px-2 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialPagosState.map((item) => (
                      <tr key={`${item.invoice}-${item.datetime}`} className="border-b border-slate-200 text-sm">
                        <td className="px-2 py-2">{item.datetime}</td>
                        <td className="px-2 py-2">{item.patient}</td>
                        <td className="px-2 py-2 text-[#2367d9]">{item.invoice}</td>
                        <td className="px-2 py-2">{item.method}</td>
                        <td className="px-2 py-2">{item.amount}</td>
                        <td className="px-2 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              item.status === 'Completado'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </article>
            </section>
          ) : null}

          {activeView === 'dashboard' ? (
            <section className="grid grid-cols-[1fr_1.9fr] gap-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-2xl font-semibold">Facturas</h3>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-400">
                  <Search className="h-4 w-4" />
                  Buscar factura...
                </div>
                <div className="mt-3 space-y-2">
                  {facturasState.map((item) => (
                    <div key={`${item.id}-mini`} className="rounded bg-[#f5f6f9] px-3 py-2">
                      <p className="font-semibold text-[#2367d9]">{item.id}</p>
                      <p className="font-semibold">{item.patient}</p>
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <p>{item.date}</p>
                        <p className="font-semibold text-slate-800">{item.amount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-center text-slate-400">
                  <CreditCard className="mx-auto h-10 w-10" />
                  <p className="mt-3 text-base">Selecciona una factura para ver los detalles</p>
                </div>
              </article>
            </section>
          ) : null}

          {activeView === 'reportes' ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600">
                  Mostrando solo pagos del día: <span className="font-semibold">{formatDateDMY(reportDate)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={exportarReporteCajaPdf}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#2463eb] px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Download className="h-4 w-4" />
                    Exportar PDF del día
                  </button>
                  <button
                    type="button"
                    onClick={cerrarCajaDelDia}
                    disabled={cajaCerradaHoy}
                    className="rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cajaCerradaHoy ? 'Caja cerrada' : 'Cerrar caja del día'}
                  </button>
                </div>
              </div>
              {resumenCierre ? (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <p className="font-semibold">Cierre de caja: {resumenCierre.fecha}</p>
                  <p>Citas creadas: {resumenCierre.citasCreadas}</p>
                  <p>Pagos completados: {resumenCierre.pagosCompletados}</p>
                  <p>Total recaudado: S/ {Number(resumenCierre.totalRecaudado).toFixed(2)}</p>
                </section>
              ) : null}

              <section className="grid grid-cols-4 gap-3">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Pagos del día</p>
                  <p className="mt-1 text-3xl font-semibold text-blue-700">{statsReportePagos.cantidadPagos}</p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Pacientes que pagaron</p>
                  <p className="mt-1 text-3xl font-semibold text-amber-600">{statsReportePagos.pacientesPagaron}</p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Ticket Promedio</p>
                  <p className="mt-1 text-3xl font-semibold text-emerald-700">S/ {statsReportePagos.ticketPromedio.toFixed(2)}</p>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">Total Recaudado</p>
                  <p className="mt-1 text-3xl font-semibold text-[#2367d9]">S/ {statsReportePagos.totalRecaudado.toFixed(2)}</p>
                </article>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-semibold">Resumen por método de pago</h3>
                  <div className="mt-3 space-y-2">
                    {Object.keys(statsReportePagos.metodoCount).length ? (
                      Object.entries(statsReportePagos.metodoCount).map(([metodo, cantidad]) => {
                        const width = Math.max(8, Math.min(100, (Number(cantidad) / Math.max(1, statsReportePagos.cantidadPagos)) * 100))
                        return (
                          <div key={metodo} className="rounded-lg border border-slate-200 p-2">
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <p className="font-semibold">{metodo}</p>
                              <p className="text-slate-600">{String(cantidad)} pago(s)</p>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500">Sin pagos para la fecha seleccionada.</p>
                    )}
                  </div>
                </article>

                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xl font-semibold">Pacientes que pagaron ({formatDateDMY(reportDate)})</h3>
                  <table className="mt-3 w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f5f6f9] text-left text-xs font-semibold text-slate-600">
                        <th className="px-2 py-2">Paciente</th>
                        <th className="px-2 py-2">Factura</th>
                        <th className="px-2 py-2">Método</th>
                        <th className="px-2 py-2">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosDelDiaSeleccionado.slice(0, 12).map((item) => (
                        <tr key={`${item.invoice}-${item.datetime}-rep`} className="border-b border-slate-200 text-sm">
                          <td className="px-2 py-2">{item.patient}</td>
                          <td className="px-2 py-2">{item.invoice}</td>
                          <td className="px-2 py-2">{item.method}</td>
                          <td className="px-2 py-2">{item.amount}</td>
                        </tr>
                      ))}
                      {!pagosDelDiaSeleccionado.length ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-sm text-slate-500">
                            No hay pagos en la fecha seleccionada.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </article>
              </section>
            </section>
          ) : null}
        </article>
      </section>
    </main>
  )
}

export default CajaWorkspace
