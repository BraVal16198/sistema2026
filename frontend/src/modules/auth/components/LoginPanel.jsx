import { useState } from 'react'
import { Lock, ShieldCheck, User } from 'lucide-react'

function LoginPanel({
  selectedProfile,
  theme,
  onSubmit,
  onCreatePacienteAccount,
  onForgotPacienteAccount,
  onStaffAccountInfo,
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    await onSubmit({ username, password, role: selectedProfile.key })
    setIsLoading(false)
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
        <User className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          required
        />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
        <Lock className="h-4 w-4 text-slate-400" />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          required
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-3 w-3" />
          Recordar sesión
        </label>
        {selectedProfile.key === 'PACIENTE' ? (
          <button
            type="button"
            onClick={onForgotPacienteAccount}
            className="text-blue-500 hover:underline"
          >
            ¿Olvidaste tu cuenta?
          </button>
        ) : null}
      </div>

      {selectedProfile.key === 'PACIENTE' ? (
        <button
          type="button"
          onClick={onCreatePacienteAccount}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-700"
        >
          Crear cuenta de Paciente
        </button>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full rounded-lg bg-gradient-to-r py-2.5 text-sm font-semibold disabled:opacity-70 ${theme.activeButton}`}
      >
        {isLoading ? 'Validando...' : selectedProfile.cta}
      </button>

      <div className="mt-5 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
        <ShieldCheck className="mx-auto mb-1 h-4 w-4" />
        {selectedProfile.key === 'PACIENTE'
          ? 'Paciente: usa cuentas BD paciente1/paciente1 ... paciente5/paciente5.'
          : `Cuenta única: ${selectedProfile.key.toLowerCase()} / ${selectedProfile.key.toLowerCase()}`}
        {selectedProfile.key !== 'PACIENTE' && onStaffAccountInfo ? (
          <button
            type="button"
            onClick={onStaffAccountInfo}
            className="mt-2 block w-full text-[11px] font-semibold text-slate-600 underline decoration-slate-400 hover:text-slate-800"
          >
            Información sobre acceso y cuentas de este perfil
          </button>
        ) : null}
      </div>
    </form>
  )
}

export default LoginPanel

