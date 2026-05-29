const MESES_ES = {
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
}

export function getTodayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Convierte "29 de abril de 2026" o "2026-04-29" a Date (medianoche local). */
export function parseAppointmentDate(dateStr) {
  if (!dateStr) return null
  const s = String(dateStr).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const match = s.match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i)
  if (match) {
    const month = MESES_ES[match[2].toLowerCase()]
    if (month === undefined) return null
    return new Date(Number(match[3]), month, Number(match[1]))
  }

  const fallback = new Date(s)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

export function formatLongDateEs(isoDate) {
  const d = parseAppointmentDate(isoDate)
  if (!d) return ''
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function startOfToday() {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return t
}

export function isPastIsoDate(isoDate) {
  const s = String(isoDate ?? '').trim()
  const today = getTodayIso()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s < today) return true
  const d = parseAppointmentDate(isoDate)
  if (!d) return true
  d.setHours(0, 0, 0, 0)
  return d.getTime() < startOfToday().getTime()
}

export function isTodayIsoDate(isoDate) {
  return isoDate === getTodayIso()
}

export function isTodayAppointmentDate(dateStr) {
  const todayLong = formatLongDateEs(getTodayIso())
  return String(dateStr ?? '').trim() === todayLong
}

/** Próxima = fecha hoy o futuro y no completada/cancelada. */
export function isUpcomingAppointment(appointment) {
  const status = String(appointment?.status ?? '').trim()
  if (status === 'Completada' || status === 'Cancelada') return false

  const d = parseAppointmentDate(appointment?.date)
  if (!d) return false

  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return day.getTime() >= startOfToday().getTime()
}

export function splitAppointments(appointments) {
  const list = Array.isArray(appointments) ? appointments : []
  const upcoming = []
  const past = []

  for (const apt of list) {
    if (isUpcomingAppointment(apt)) upcoming.push(apt)
    else past.push(apt)
  }

  const compareAsc = (a, b) => {
    const ta = parseAppointmentDate(a.date)?.getTime() ?? 0
    const tb = parseAppointmentDate(b.date)?.getTime() ?? 0
    return ta - tb
  }

  upcoming.sort(compareAsc)
  past.sort((a, b) => compareAsc(b, a))

  return { upcoming, past }
}

/** Aplica listas de citas desde API (con o sin citasAnteriores). */
export function applyCitasFromPayload(payload, setUpcoming, setPast) {
  const upcoming = Array.isArray(payload?.proximasCitas) ? payload.proximasCitas : []
  const past = Array.isArray(payload?.citasAnteriores) ? payload.citasAnteriores : []
  if (payload && 'citasAnteriores' in payload) {
    setUpcoming(upcoming)
    setPast(past)
    return
  }
  const merged = splitAppointments(upcoming)
  setUpcoming(merged.upcoming)
  setPast(merged.past)
}
