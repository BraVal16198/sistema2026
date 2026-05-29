const BASE = process.env.API_URL ?? 'http://localhost:3000'

const results = []

async function test(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
  } catch (e) {
    results.push({ name, ok: false, error: e.message })
  }
}

async function login(username, password, role) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `login ${res.status}`)
  return data.accessToken
}

await test('GET /patient/catalog', async () => {
  const res = await fetch(`${BASE}/patient/catalog`)
  if (!res.ok) throw new Error(`status ${res.status}`)
  const data = await res.json()
  if (!data.medicosEspecialidades?.length) throw new Error('catalogo vacio')
})

await test('Login administrador', async () => {
  await login('administrador', 'administrador', 'ADMINISTRADOR')
})

await test('Login paciente1', async () => {
  await login('paciente1', 'paciente1', 'PACIENTE')
})

await test('GET portal paciente1/state', async () => {
  const res = await fetch(`${BASE}/patient/portal/paciente1/state`)
  if (!res.ok) throw new Error(`status ${res.status}`)
  const data = await res.json()
  if (!data.profile?.dni) throw new Error('sin perfil')
})

await test('GET caja/overview', async () => {
  const res = await fetch(`${BASE}/patient/caja/overview`)
  if (!res.ok) throw new Error(`status ${res.status}`)
})

await test('GET admin/overview', async () => {
  const res = await fetch(`${BASE}/patient/admin/overview`)
  if (!res.ok) throw new Error(`status ${res.status}`)
  const data = await res.json()
  if (data.stats?.totalPacientes == null) throw new Error('sin stats')
})

await test('GET medico/overview hoy', async () => {
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const q = new URLSearchParams({
    doctor: 'Dr. Juan Pérez',
    specialty: 'Medicina General',
    date: iso,
  })
  const res = await fetch(`${BASE}/patient/medico/overview?${q}`)
  if (!res.ok) throw new Error(`status ${res.status}`)
})

const failed = results.filter((r) => !r.ok)
console.log(JSON.stringify({ passed: results.length - failed.length, total: results.length, results }, null, 2))
process.exit(failed.length ? 1 : 0)
