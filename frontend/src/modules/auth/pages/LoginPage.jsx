import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAppMessage } from '../../../context/AppMessageContext'
import ProfileCard from '../components/ProfileCard'
import LoginPanel from '../components/LoginPanel'
import { PROFILE_OPTIONS, THEME_BY_COLOR } from '../constants/profileOptions'
import MedicoWorkspace from '../../medico/pages/MedicoWorkspace'
import PacienteWorkspace from '../../paciente/pages/PacienteWorkspace'
import AdminWorkspace from '../../admin/pages/AdminWorkspace'
import CajaWorkspace from '../../caja/pages/CajaWorkspace'

import { apiFetch } from '../../../lib/api'
import { clearSession } from '../../../lib/session'

const profileSnapshotKey = (username) => `pacienteProfileSnapshot:${String(username).trim().toLowerCase()}`

function LoginPage() {
  const { showMessage } = useAppMessage()
  const [selectedProfileKey, setSelectedProfileKey] = useState(PROFILE_OPTIONS[0].key)
  const [isMedicoView, setIsMedicoView] = useState(false)
  const [isPacienteView, setIsPacienteView] = useState(false)
  const [isAdminView, setIsAdminView] = useState(false)
  const [isCajaView, setIsCajaView] = useState(false)
  /** Usuario del portal paciente (minúsculas); evita leer localStorage desfasado al montar el workspace. */
  const [pacientePortalUsername, setPacientePortalUsername] = useState(null)
  const [showCreatePacienteForm, setShowCreatePacienteForm] = useState(false)
  const [showRecoverPacienteForm, setShowRecoverPacienteForm] = useState(false)
  const [newPacienteAccount, setNewPacienteAccount] = useState({
    dni: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    fechaNacimiento: '',
    username: '',
    password: '',
  })
  const [recoverDni, setRecoverDni] = useState('')
  const [recoverResult, setRecoverResult] = useState(null)
  const [recoverNewPassword, setRecoverNewPassword] = useState('')
  const [recoverConfirmPassword, setRecoverConfirmPassword] = useState('')

  const selectedProfile = useMemo(
    () => PROFILE_OPTIONS.find((item) => item.key === selectedProfileKey) ?? PROFILE_OPTIONS[0],
    [selectedProfileKey],
  )

  const theme = THEME_BY_COLOR[selectedProfile.color]

  const handleLogin = async (payload) => {
    const username = payload.username.trim().toLowerCase()
    const password = payload.password.trim()

    if (!username || !password) {
      showMessage('Ingresa usuario y contraseña.', { variant: 'warning' })
      return
    }

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          role: payload.role,
        }),
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        let msg = 'Usuario o contraseña incorrecta.'
        if (errBody.message) {
          const raw = Array.isArray(errBody.message) ? errBody.message.join(' ') : String(errBody.message)
          if (raw.toLowerCase().includes('credencial')) {
            msg = 'Usuario o contraseña incorrecta.'
          } else {
            msg = raw
          }
        }
        showMessage(msg, { variant: 'warning' })
        return
      }

      const data = await response.json()
      showMessage(`Bienvenido ${data.user.username} (${data.user.role}).`, {
        variant: 'success',
        onOk: () => {
          const userNorm = String(data.user.username).trim().toLowerCase()
          localStorage.setItem('demoCurrentUsername', userNorm)
          localStorage.setItem('demoCurrentRole', data.user.role)
          localStorage.setItem('accessToken', data.accessToken)
          if (data.user.role === 'PACIENTE') {
            setPacientePortalUsername(userNorm)
          } else {
            setPacientePortalUsername(null)
          }
          if (data.user.role === 'MEDICO') setIsMedicoView(true)
          if (data.user.role === 'PACIENTE') setIsPacienteView(true)
          if (data.user.role === 'ADMINISTRADOR') setIsAdminView(true)
          if (data.user.role === 'CAJA') setIsCajaView(true)
        },
      })
    } catch {
      showMessage('No se pudo conectar con el servidor. Intenta de nuevo.', { variant: 'error' })
    }
  }

  const handleCreatePacienteAccount = () => {
    if (selectedProfile.key !== 'PACIENTE') return
    setShowRecoverPacienteForm(false)
    setRecoverResult(null)
    setRecoverDni('')
    setShowCreatePacienteForm((prev) => !prev)
  }

  const handleSubmitCreatePacienteAccount = async () => {
    const payload = {
      dni: newPacienteAccount.dni.trim(),
      nombres: newPacienteAccount.nombres.trim(),
      apellidoPaterno: newPacienteAccount.apellidoPaterno.trim(),
      apellidoMaterno: newPacienteAccount.apellidoMaterno.trim(),
      telefono: newPacienteAccount.telefono.trim(),
      fechaNacimiento: newPacienteAccount.fechaNacimiento.trim(),
      username: newPacienteAccount.username.trim().toLowerCase(),
      password: newPacienteAccount.password.trim(),
    }

    if (
      payload.dni.length !== 8 ||
      !payload.nombres ||
      !payload.apellidoPaterno ||
      !payload.apellidoMaterno ||
      !payload.username ||
      payload.password.length < 4
    ) {
      showMessage(
        'Completa los campos obligatorios: DNI (8 dígitos), nombres, apellidos, usuario y contraseña (mínimo 4 caracteres).',
        { variant: 'warning' },
      )
      return
    }

    if (payload.telefono && payload.telefono.length !== 9) {
      showMessage('El teléfono debe tener 9 dígitos.', { variant: 'warning' })
      return
    }

    try {
      const response = await apiFetch('/auth/paciente/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg =
          typeof data.message === 'string'
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join(' ')
              : 'No se pudo crear la cuenta del paciente.'
        showMessage(msg, { variant: 'error' })
        return
      }

      showMessage(
        `Cuenta de paciente creada: ${data.user.username}. Ya puedes iniciar sesión con el perfil PACIENTE.`,
        { variant: 'success' },
      )
      try {
        const snapUser = String(data.user?.username ?? payload.username)
          .trim()
          .toLowerCase()
        localStorage.removeItem(`pacienteState:${snapUser}`)
        localStorage.setItem(
          profileSnapshotKey(snapUser),
          JSON.stringify({
            username: snapUser,
            nombres: payload.nombres,
            apellidoPaterno: payload.apellidoPaterno,
            apellidoMaterno: payload.apellidoMaterno,
            dni: payload.dni,
            telefono: payload.telefono || '',
            fechaNacimiento: payload.fechaNacimiento || '',
          }),
        )
      } catch {
        // ignorar quota / modo privado
      }
      setShowCreatePacienteForm(false)
      setNewPacienteAccount({
        dni: '',
        nombres: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        telefono: '',
        fechaNacimiento: '',
        username: '',
        password: '',
      })
    } catch {
      showMessage('No se pudo crear la cuenta. Verifica conexión con el servidor.', { variant: 'error' })
    }
  }

  const handleForgotPacienteAccount = () => {
    if (selectedProfile.key !== 'PACIENTE') return
    setShowCreatePacienteForm(false)
    setRecoverResult(null)
    setRecoverDni('')
    setRecoverNewPassword('')
    setRecoverConfirmPassword('')
    setShowRecoverPacienteForm((prev) => !prev)
  }

  const handleSubmitRecoverPacienteAccount = async () => {
    if (recoverDni.length !== 8) {
      showMessage('Ingresa un DNI válido de 8 dígitos.', { variant: 'warning' })
      return
    }

    try {
      const response = await apiFetch('/auth/paciente/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: recoverDni }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg =
          typeof data.message === 'string'
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join(' ')
              : 'No se encontró ninguna cuenta con ese DNI.'
        setRecoverResult({ ok: false, msg })
        return
      }

      setRecoverResult({ ok: true, username: data.username, paciente: data.paciente })
    } catch {
      setRecoverResult({ ok: false, msg: 'No se pudo conectar con el servidor.' })
    }
  }

  const handleSubmitResetPassword = async () => {
    if (!recoverDni || recoverDni.length !== 8) {
      showMessage('Ingresa un DNI válido de 8 dígitos.', { variant: 'warning' })
      return
    }
    if (recoverNewPassword.length < 4) {
      showMessage('La nueva contraseña debe tener al menos 4 caracteres.', { variant: 'warning' })
      return
    }
    if (recoverNewPassword !== recoverConfirmPassword) {
      showMessage('Las contraseñas no coinciden.', { variant: 'warning' })
      return
    }

    try {
      const response = await apiFetch('/auth/paciente/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: recoverDni, password: recoverNewPassword }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const msg =
          typeof data.message === 'string'
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join(' ')
              : 'No se pudo restablecer la contraseña.'
        showMessage(msg, { variant: 'error' })
        return
      }

      showMessage(`Contraseña actualizada para "${data.username}". Ya puedes iniciar sesión.`, {
        variant: 'success',
      })
      setShowRecoverPacienteForm(false)
      setRecoverResult(null)
      setRecoverDni('')
      setRecoverNewPassword('')
      setRecoverConfirmPassword('')
    } catch {
      showMessage('No se pudo restablecer la contraseña. Verifica conexión con el servidor.', {
        variant: 'error',
      })
    }
  }

  if (isMedicoView) {
    return (
      <MedicoWorkspace
        onLogout={() => {
          clearSession()
          setIsMedicoView(false)
        }}
      />
    )
  }

  if (isPacienteView) {
    const portalKey =
      pacientePortalUsername ?? localStorage.getItem('demoCurrentUsername') ?? 'paciente'
    return (
      <PacienteWorkspace
        key={portalKey}
        portalUsername={portalKey}
        onLogout={() => {
          clearSession()
          setIsPacienteView(false)
          setPacientePortalUsername(null)
        }}
      />
    )
  }

  if (isAdminView) {
    return (
      <AdminWorkspace
        onLogout={() => {
          clearSession()
          setIsAdminView(false)
        }}
      />
    )
  }

  if (isCajaView) {
    return (
      <CajaWorkspace
        onLogout={() => {
          clearSession()
          setIsCajaView(false)
        }}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[#0d38c9] text-slate-900">
      <section className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <aside className="hidden text-white lg:block">
          <div className="mb-6 inline-flex rounded-2xl bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-5xl font-bold leading-tight">Sistema Tech</h1>
          <p className="mt-3 text-2xl text-white/80">
            Plataforma Integral de Gestión Médica y Facturación
          </p>

          <ul className="mt-8 space-y-3 text-lg text-white/90">
            <li>? Gestión de pacientes y citas médicas</li>
            <li>? Historial clínico electrónico completo</li>
            <li>? Facturación electrónica integrada</li>
            <li>? Reportes y análisis en tiempo real</li>
          </ul>
        </aside>

        <article className="rounded-3xl bg-white p-7 shadow-2xl">
          {showCreatePacienteForm ? (
            <>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold">Crear cuenta de Paciente</h2>
                  <p className="mt-1 text-sm text-slate-500">Completa tus datos para registrarte en el sistema</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreatePacienteForm(false)}
                  className="shrink-0 text-sm font-semibold text-blue-500 hover:underline"
                >
                  ← Volver
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <input
                  type="text"
                  placeholder="DNI (8 dígitos)"
                  value={newPacienteAccount.dni}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({
                      ...prev,
                      dni: event.target.value.replace(/\D/g, '').slice(0, 8),
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="Nombres"
                  value={newPacienteAccount.nombres}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({ ...prev, nombres: event.target.value }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="Apellido Paterno"
                  value={newPacienteAccount.apellidoPaterno}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({
                      ...prev,
                      apellidoPaterno: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="Apellido Materno"
                  value={newPacienteAccount.apellidoMaterno}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({
                      ...prev,
                      apellidoMaterno: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="Teléfono (9 dígitos)"
                  value={newPacienteAccount.telefono}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({
                      ...prev,
                      telefono: event.target.value.replace(/\D/g, '').slice(0, 9),
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="date"
                  value={newPacienteAccount.fechaNacimiento}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({
                      ...prev,
                      fechaNacimiento: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="text"
                  placeholder="Usuario"
                  value={newPacienteAccount.username}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({ ...prev, username: event.target.value }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={newPacienteAccount.password}
                  onChange={(event) =>
                    setNewPacienteAccount((prev) => ({ ...prev, password: event.target.value }))
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <button
                type="button"
                onClick={handleSubmitCreatePacienteAccount}
                className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Guardar cuenta
              </button>
            </>
          ) : showRecoverPacienteForm ? (
            <>
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold">¿Olvidaste tu contraseña?</h2>
                  <p className="mt-1 text-sm text-slate-500">Busca tu cuenta con DNI y define una nueva contraseña</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoverPacienteForm(false)
                    setRecoverResult(null)
                    setRecoverDni('')
                    setRecoverNewPassword('')
                    setRecoverConfirmPassword('')
                  }}
                  className="shrink-0 text-sm font-semibold text-amber-600 hover:underline"
                >
                  ← Volver
                </button>
              </div>

              {!recoverResult ? (
                <>
                  <input
                    type="text"
                    placeholder="DNI (8 dígitos)"
                    value={recoverDni}
                    onChange={(event) => setRecoverDni(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitRecoverPacienteAccount}
                    className="mt-3 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Buscar mi cuenta
                  </button>
                </>
              ) : recoverResult.ok ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
                    <p className="text-lg font-bold text-green-800">Cuenta encontrada</p>
                    <p className="mt-2 text-green-700">
                      Paciente: <span className="font-semibold">{recoverResult.paciente}</span>
                    </p>
                    <p className="text-green-700">
                      Usuario: <span className="font-semibold">{recoverResult.username}</span>
                    </p>
                  </div>
                  <input
                    type="password"
                    placeholder="Nueva contraseña (mín. 4 caracteres)"
                    value={recoverNewPassword}
                    onChange={(event) => setRecoverNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={recoverConfirmPassword}
                    onChange={(event) => setRecoverConfirmPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitResetPassword}
                    className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                  >
                    Restablecer contraseña
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
                  <p className="font-semibold text-red-700">{recoverResult.msg}</p>
                  <button
                    type="button"
                    onClick={() => setRecoverResult(null)}
                    className="mt-3 text-sm text-red-500 underline"
                  >
                    Intentar con otro DNI
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-4xl font-bold">Iniciar Sesión</h2>
              <p className="mt-2 text-lg text-slate-600">Selecciona tu perfil y accede al sistema</p>

              <p className="mt-6 text-sm font-semibold text-slate-700">Selecciona tu perfil</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {PROFILE_OPTIONS.map((option) => (
                  <ProfileCard
                    key={option.key}
                    option={option}
                    theme={THEME_BY_COLOR[option.color]}
                    isActive={selectedProfile.key === option.key}
                    onClick={() => setSelectedProfileKey(option.key)}
                  />
                ))}
              </div>

              <LoginPanel
                selectedProfile={selectedProfile}
                theme={theme}
                onSubmit={handleLogin}
                onCreatePacienteAccount={handleCreatePacienteAccount}
                onForgotPacienteAccount={handleForgotPacienteAccount}
              />
            </>
          )}
        </article>
      </section>
    </main>
  )
}

export default LoginPage

