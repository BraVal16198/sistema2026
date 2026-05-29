const BASE = process.env.API_URL ?? 'http://localhost:3000'
const today = new Date()
const fechaIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

let passed = 0
let failed = 0

async function ok(name, fn) {
  try {
    await fn()
    console.log('OK', name)
    passed += 1
  } catch (e) {
    console.log('FAIL', name, '-', e.message)
    failed += 1
  }
}

await ok('Flujo: crear cita desde paciente1', async () => {
  const res = await fetch(`${BASE}/patient/portal/paciente1/citas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      medicoEspecialidad: 'Dr. Juan Pérez - Medicina General',
      fecha: fechaIso,
      hora: '03:00 PM',
      motivo: 'Control pre presentacion',
      metodoPago: 'Efectivo',
    }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.message || res.status)
  }
})

await ok('Flujo: estado paciente1 tiene citas', async () => {
  const res = await fetch(`${BASE}/patient/portal/paciente1/state`)
  const data = await res.json()
  if (!res.ok) throw new Error('state fail')
  if (!Array.isArray(data.proximasCitas)) throw new Error('sin citas')
})

await ok('Flujo: caja overview con pagos', async () => {
  const res = await fetch(`${BASE}/patient/caja/overview`)
  const data = await res.json()
  if (!res.ok) throw new Error('overview fail')
  if (!Array.isArray(data.pagosPendientes)) throw new Error('sin pagos')
})

await ok('Flujo: login caja y medico', async () => {
  for (const [u, r] of [
    ['caja', 'CAJA'],
    ['medico', 'MEDICO'],
  ]) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: u, role: r }),
    })
    if (!res.ok) throw new Error(`login ${u}`)
  }
})

console.log(`\nE2E: ${passed}/${passed + failed}`)
process.exit(failed ? 1 : 0)
