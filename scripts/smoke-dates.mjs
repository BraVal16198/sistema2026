const BASE = process.env.API_URL ?? 'http://localhost:3000'
const today = new Date()
const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
const isoYesterday = (() => {
  const d = new Date(today)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const state = await fetch(`${BASE}/patient/portal/paciente1/state`).then((r) => r.json())
let badUpcoming = 0
for (const c of state.proximasCitas ?? []) {
  const m = String(c.date).match(/de\s+(\w+)\s+de\s+(\d{4})/)
  if (m) console.log('proxima:', c.date, c.status)
  if (c.status === 'Completada') badUpcoming += 1
}
for (const c of state.citasAnteriores ?? []) {
  if (c.status !== 'Completada' && c.status !== 'Cancelada') {
    const m = String(c.date).match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
    if (m) {
      const months = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 }
      const dt = new Date(Number(m[3]), months[m[2].toLowerCase()], Number(m[1]))
      if (dt.getTime() >= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
        console.log('ERROR pasada en futuro:', c.date, c.status)
        badUpcoming += 1
      }
    }
  }
}

const pastRes = await fetch(`${BASE}/patient/portal/paciente1/citas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    medicoEspecialidad: 'Dr. Juan Pérez - Medicina General',
    fecha: isoYesterday,
    hora: '09:00 AM',
    motivo: 'test',
    metodoPago: 'Efectivo',
  }),
})
console.log('POST fecha pasada:', pastRes.status, pastRes.status === 400 ? 'OK rechazada' : 'FALLO')

console.log('Completadas en proximas:', badUpcoming)
console.log('Resumen:', {
  proximas: state.proximasCitas?.length,
  anteriores: state.citasAnteriores?.length,
})
process.exit(badUpcoming > 0 || pastRes.status !== 400 ? 1 : 0)
